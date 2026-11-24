import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { configureClient } from "@/lib/api/client";
import type { FindsList, Home, ItemView, Notifications, PeopleList, SecurityOverview } from "@/lib/api/types";
import { useMarkEventSeen } from "@/store/activity";
import { useUpdateAccount } from "@/store/account";
import { useBankCallback, useDisconnectBank, useLinkBank, takeTinkReturn } from "@/store/banks";
import { useStartEmail, useVerifyCode } from "@/store/auth";
import { useRemoveDevice } from "@/store/devices";
import { useAddFind, useChangeFindCategory, useLeaveOutFind } from "@/store/finds";
import { useHome } from "@/store/home";
import { useCategories } from "@/store/meta";
import { meKeys } from "@/store/me";
import { useUpdateNotifications, notificationKeys } from "@/store/notifications";
import { useInvitePerson } from "@/store/people";
import { makeQueryClient } from "@/store/queryClient";
import { recordKeys } from "@/store/queryKeys";
import { invalidateFor } from "@/store/realtime";
import { useAddItem, useChangeItemCategory, useSaveDetails } from "@/store/record";
import { securityKeys } from "@/store/security";
import { useSignOut } from "@/store/sessions";
import { useJoinUpdates } from "@/store/updates";
import { apiError, http, HttpResponse, json, server, url } from "./msw";


let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const item = (overrides: Record<string, unknown> = {}) => ({
  id: "i1",
  category: "insurance",
  name: "Home insurance",
  provider: "Aviva",
  monogram: "A",
  kind: "pay",
  amount: { minor: 3820, currency: "GBP" },
  frequency: "monthly",
  value: null,
  since: "2021-08",
  details: {},
  complete: false,
  bankId: null,
  cancelled: false,
  isNew: true,
  nextPayment: null,
  addedAt: "2026-11-21T10:02:11.000Z",
  ...overrides,
});

const home = (overrides: Partial<Home> = {}): Home => ({
  count: 3,
  categories: [],
  newFinds: { count: 2, line: "A pension and a gym" },
  waiting: 0,
  nextUp: [],
  whatsNew: [{ id: "0193a7b2-0000-7000-8000-00000000000a", tone: "positive", icon: "check", title: "Nest is in your record", sub: "Found in your bank", href: "/home", upcoming: false }],
  comingUp: [],
  savedSoFar: null,
  banks: [],
  ...overrides,
});

beforeEach(() => {
  client = makeQueryClient();
  configureClient({ unlock: vi.fn().mockResolvedValue(undefined), stepUp: vi.fn().mockResolvedValue(undefined), signedOut: vi.fn() });
});

describe("queries", () => {
  it("useHome reads GET /v1/home", async () => {
    server.use(http.get(url("/v1/home"), () => json(home())));
    const { result } = renderHook(() => useHome(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.newFinds.line).toBe("A pension and a gym");
  });

  it("useCategories (the unlock probe) skips the browser's HTTP cache, so a locked record answers 423", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    server.use(http.get(url("/v1/meta/categories"), () => json({ categories: [] })));
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const call = fetchSpy.mock.calls.find(([input]) => String(input).endsWith("/v1/meta/categories"));
    expect(call?.[1]?.cache).toBe("no-store");
  });

  it("doesn't retry a 4xx", async () => {
    const hits = vi.fn(() => apiError(404, "NOT_FOUND"));
    server.use(http.get(url("/v1/home"), hits));
    const { result } = renderHook(() => useHome(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(hits).toHaveBeenCalledTimes(1);
  });
});

describe("auth", () => {
  it("useStartEmail sends the trimmed email and mode", async () => {
    let body: unknown;
    server.use(
      http.post(url("/v1/auth/email/start"), async ({ request }) => {
        body = await request.json();
        return json({ status: "sent" });
      }),
    );
    const { result } = renderHook(() => useStartEmail(), { wrapper });
    await act(() => result.current.mutateAsync({ email: "  ada@example.com ", mode: "login" }));
    expect(body).toEqual({ email: "ada@example.com", mode: "login" });
  });

  it("useVerifyCode starts a clean cache with the member in it", async () => {
    client.setQueryData(recordKeys.home, home());
    const user = { id: "u1", email: "ada@example.com", keysReady: false };
    server.use(http.post(url("/v1/auth/email/verify"), () => json({ user, isNew: true })));
    const { result } = renderHook(() => useVerifyCode(), { wrapper });
    await act(() => result.current.mutateAsync({ email: "ada@example.com", code: "123456" }));
    expect(client.getQueryData(recordKeys.home)).toBeUndefined();
    expect(client.getQueryData(meKeys.all)).toEqual(user);
  });

  it("useSignOut clears the whole cache, whatever the API answers", async () => {
    client.setQueryData(recordKeys.home, home());
    server.use(http.post(url("/v1/auth/logout"), () => apiError(500, "INTERNAL")));
    const { result } = renderHook(() => useSignOut(), { wrapper });
    await act(() => result.current.mutateAsync().catch(() => undefined));
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe("finds: optimistic, rolled back on failure", () => {
  const finds = (): FindsList => ({ finds: [item({ id: "f1" }), item({ id: "f2", name: "Gym" })] as FindsList["finds"], waiting: 0 });

  it("useAddFind takes the find off the list and the banner count at once", async () => {
    client.setQueryData(recordKeys.finds, finds());
    client.setQueryData(recordKeys.home, home());
    let release!: () => void;
    server.use(
      http.post(url("/v1/finds/f1/add"), async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return json({ item: item({ id: "f1" }), count: 4, next: item({ id: "f2" }) });
      }),
    );
    const { result } = renderHook(() => useAddFind(), { wrapper });
    act(() => result.current.mutate("f1"));
    await waitFor(() => expect(client.getQueryData<FindsList>(recordKeys.finds)?.finds.map((find) => find.id)).toEqual(["f2"]));
    expect(client.getQueryData<Home>(recordKeys.home)?.newFinds.count).toBe(1);
    release();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useAddFind puts it back when the plan is full (402)", async () => {
    client.setQueryData(recordKeys.finds, finds());
    client.setQueryData(recordKeys.home, home());
    server.use(http.post(url("/v1/finds/f1/add"), () => apiError(402, "LIMIT_ITEMS", { limit: 10 })));
    const { result } = renderHook(() => useAddFind(), { wrapper });
    await act(() => result.current.mutateAsync("f1").catch(() => undefined));
    expect(client.getQueryData<FindsList>(recordKeys.finds)?.finds.map((find) => find.id)).toEqual(["f1", "f2"]);
    expect(client.getQueryData<Home>(recordKeys.home)?.newFinds.count).toBe(2);
  });

  it("useLeaveOutFind sends the reason the API requires, and rolls back on failure", async () => {
    client.setQueryData(recordKeys.finds, finds());
    let body: unknown;
    server.use(
      http.post(url("/v1/finds/f2/leave-out"), async ({ request }) => {
        body = await request.json();
        return apiError(500, "INTERNAL");
      }),
    );
    const { result } = renderHook(() => useLeaveOutFind(), { wrapper });
    await act(() => result.current.mutateAsync({ id: "f2", reason: "ended" }).catch(() => undefined));
    expect(body).toEqual({ reason: "ended" });
    expect(client.getQueryData<FindsList>(recordKeys.finds)?.finds).toHaveLength(2);
  });

  it("useChangeFindCategory moves it at once, then takes the server's item", async () => {
    client.setQueryData(recordKeys.finds, finds());
    let body: unknown;
    server.use(
      http.patch(url("/v1/finds/f1/category"), async ({ request }) => {
        body = await request.json();
        return json({ item: item({ id: "f1", category: "subscriptions", short: "gym" }) });
      }),
    );
    const { result } = renderHook(() => useChangeFindCategory(), { wrapper });
    await act(() => result.current.mutateAsync({ id: "f1", category: "subscriptions", group: "gym" }));
    expect(body).toEqual({ category: "subscriptions", group: "gym" });
    expect(client.getQueryData<FindsList>(recordKeys.finds)?.finds[0]).toMatchObject({ category: "subscriptions", short: "gym" });
  });

  it("useChangeFindCategory rolls back a refused category", async () => {
    client.setQueryData(recordKeys.finds, finds());
    server.use(http.patch(url("/v1/finds/f1/category"), () => apiError(400, "VALIDATION")));
    const { result } = renderHook(() => useChangeFindCategory(), { wrapper });
    await act(() => result.current.mutateAsync({ id: "f1", category: "bills" }).catch(() => undefined));
    expect(client.getQueryData<FindsList>(recordKeys.finds)?.finds[0].category).toBe("insurance");
  });
});

describe("record", () => {
  it("useAddItem sends amounts as {minor} with a frequency, and refreshes Home and the record", async () => {
    let body: unknown;
    server.use(
      http.post(url("/v1/items"), async ({ request }) => {
        body = await request.json();
        return json({ item: item(), count: 4 }, 201);
      }),
    );
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useAddItem(), { wrapper });
    await act(() => result.current.mutateAsync({ name: "Workplace pension", category: "pensions", amount: { minor: 12000 }, frequency: "monthly" }));
    expect(body).toEqual({ name: "Workplace pension", category: "pensions", amount: { minor: 12000 }, frequency: "monthly" });
    const keys = spy.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey));
    expect(keys).toEqual(expect.arrayContaining([JSON.stringify(recordKeys.home), JSON.stringify(recordKeys.record), JSON.stringify(recordKeys.finds)]));
  });

  it("useSaveDetails puts the server's item in the item's cache", async () => {
    const view: ItemView = { item: item() as ItemView["item"], fields: ["policyNumber"], twin: null, person: null, documents: [] };
    client.setQueryData(recordKeys.item("i1"), view);
    server.use(http.patch(url("/v1/items/i1/details"), () => json({ item: item({ details: { policyNumber: "AV-1" }, complete: true }) })));
    const { result } = renderHook(() => useSaveDetails(), { wrapper });
    await act(() => result.current.mutateAsync({ id: "i1", details: { policyNumber: "AV-1" } }));
    expect(client.getQueryData<ItemView>(recordKeys.item("i1"))?.item).toMatchObject({ complete: true, details: { policyNumber: "AV-1" } });
  });

  it("useChangeItemCategory rolls back when refused", async () => {
    const view: ItemView = { item: item() as ItemView["item"], fields: [], twin: null, person: null, documents: [] };
    client.setQueryData(recordKeys.item("i1"), view);
    server.use(http.patch(url("/v1/items/i1/category"), () => apiError(423, "UNLOCK_REQUIRED")));
    configureClient({ unlock: vi.fn().mockRejectedValue(new Error("locked")) });
    const { result } = renderHook(() => useChangeItemCategory(), { wrapper });
    await act(() => result.current.mutateAsync({ id: "i1", category: "savings" }).catch(() => undefined));
    expect(client.getQueryData<ItemView>(recordKeys.item("i1"))?.item.category).toBe("insurance");
  });

  it("useMarkEventSeen hides the card at once and brings it back on failure", async () => {
    client.setQueryData(recordKeys.home, home());
    const id = home().whatsNew[0].id;
    server.use(http.post(url(`/v1/events/${id}/seen`), () => apiError(404, "NOT_FOUND")));
    const { result } = renderHook(() => useMarkEventSeen(), { wrapper });
    act(() => result.current.mutate(id));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData<Home>(recordKeys.home)?.whatsNew).toHaveLength(1);
  });
});

describe("settings", () => {
  it("useUpdateNotifications moves the toggle at once and back on failure", async () => {
    client.setQueryData<Notifications>(notificationKeys.all, { updates: true, summary: true, recognise: true });
    let release!: () => void;
    server.use(
      http.patch(url("/v1/notifications"), async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return apiError(500, "INTERNAL");
      }),
    );
    const { result } = renderHook(() => useUpdateNotifications(), { wrapper });
    act(() => result.current.mutate({ recognise: false }));
    await waitFor(() => expect(client.getQueryData<Notifications>(notificationKeys.all)?.recognise).toBe(false));
    release();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData<Notifications>(notificationKeys.all)?.recognise).toBe(true);
  });

  it("useUpdateAccount refreshes everything after a home currency change", async () => {
    server.use(http.patch(url("/v1/account"), () => json({ email: "a@b.co", signIn: "email", name: null, dob: null, postcode: null, mobile: null, country: "NG", homeCurrency: "NGN" })));
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateAccount(), { wrapper });
    await act(() => result.current.mutateAsync({ homeCurrency: "NGN" }));
    expect(spy).toHaveBeenCalledWith();
  });

  it("useRemoveDevice takes the row out at once and puts it back on failure", async () => {
    const overview: SecurityOverview = {
      devices: [
        { id: "d1", name: "Chrome on Mac", browser: "Chrome", device: "Mac", kind: "laptop", lastUsedAt: null, thisDevice: true },
        { id: "d2", name: "Safari on iPhone", browser: "Safari", device: "iPhone", kind: "phone", lastUsedAt: null, thisDevice: false },
      ],
      backupCode: false,
      trustedPerson: null,
    };
    client.setQueryData(securityKeys.overview, overview);
    server.use(http.delete(url("/v1/devices/d2"), () => apiError(409, "CONFLICT")), http.get(url("/v1/security/overview"), () => json(overview)));
    const { result } = renderHook(() => useRemoveDevice(), { wrapper });
    await act(() => result.current.mutateAsync("d2").catch(() => undefined));
    await waitFor(() => expect(client.getQueryData<SecurityOverview>(securityKeys.overview)?.devices).toHaveLength(2));
  });

  it("useInvitePerson sends fromName and adds the person to the list", async () => {
    client.setQueryData<PeopleList>(recordKeys.people, { people: [], familyPlan: "soon" });
    let body: unknown;
    const person = { id: "p1", name: "Ada Lovelace", email: "ada@example.com", relation: "Sister", status: "invited", role: "trusted" };
    server.use(
      http.post(url("/v1/people/invite"), async ({ request }) => {
        body = await request.json();
        return json(person, 201);
      }),
    );
    const { result } = renderHook(() => useInvitePerson(), { wrapper });
    await act(() => result.current.mutateAsync({ name: "Ada Lovelace", email: "ada@example.com", relation: "Sister", fromName: "Justice Moore" }));
    expect(body).toEqual({ name: "Ada Lovelace", email: "ada@example.com", relation: "Sister", fromName: "Justice Moore" });
    expect(client.getQueryData<PeopleList>(recordKeys.people)?.people).toEqual([person]);
  });
});

describe("banks", () => {
  it("useLinkBank asks the backend for the Tink link, and remembers where to come back", async () => {
    let body: unknown;
    server.use(
      http.post(url("/v1/banks/link"), async ({ request }) => {
        body = await request.json();
        return json({ url: "https://link.tink.com/1.0/credentials/add?state=s" });
      }),
    );
    const { result } = renderHook(() => useLinkBank(), { wrapper });
    const link = await act(() => result.current.mutateAsync({ providerId: "uk-monzo-oauth2", another: true }));
    expect(link).toContain("link.tink.com");
    expect(body).toEqual({ providerId: "uk-monzo-oauth2", another: true });
    expect(takeTinkReturn()).toEqual({ kind: "connect", another: true });
  });

  it("useBankCallback sends state and credentialsId only (never code)", async () => {
    let body: unknown;
    server.use(
      http.post(url("/v1/banks/callback"), async ({ request }) => {
        body = await request.json();
        return json({ connectionId: "c1" }, 201);
      }),
    );
    const { result } = renderHook(() => useBankCallback(), { wrapper });
    await act(() => result.current.mutateAsync({ state: "s", credentialsId: "cred" }));
    expect(body).toEqual({ state: "s", credentialsId: "cred" });
  });

  it("useDisconnectBank drops the bank from the list", async () => {
    client.setQueryData(recordKeys.banks, [{ id: "b1", name: "Monzo" }, { id: "b2", name: "HSBC" }]);
    server.use(
      http.post(url("/v1/banks/b1/disconnect"), () => json({ stopped: [], kept: { items: 3 }, removed: { finds: 0 } })),
      http.get(url("/v1/banks"), () => json([{ id: "b2", name: "HSBC" }])),
    );
    const { result } = renderHook(() => useDisconnectBank(), { wrapper });
    await act(() => result.current.mutateAsync("b1"));
    expect(client.getQueryData<{ id: string }[]>(recordKeys.banks)?.map((bank) => bank.id)).toEqual(["b2"]);
  });
});

describe("updates (landing page)", () => {
  it("sends the honeypot empty", async () => {
    let body: unknown;
    server.use(
      http.post(url("/v1/updates"), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result } = renderHook(() => useJoinUpdates(), { wrapper });
    await act(() => result.current.mutateAsync({ email: " ada@example.com ", website: "" }));
    expect(body).toEqual({ email: "ada@example.com", website: "" });
  });
});

describe("realtime: each event invalidates exactly what it changes", () => {
  const invalidated = (event: Parameters<typeof invalidateFor>[1]) => {
    const spy = vi.spyOn(client, "invalidateQueries");
    invalidateFor(client, event);
    const keys = spy.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey));
    spy.mockRestore();
    return keys;
  };
  const key = (value: readonly unknown[]) => JSON.stringify(value);

  it("scan.progress refreshes that read's progress, and the found screens once it ends", () => {
    expect(invalidated({ name: "scan.progress", data: { connectionId: "c1", status: "reading", done: [], accounts: 0 } })).toEqual([key(["banks", "progress", "c1"])]);
    expect(invalidated({ name: "scan.progress", data: { connectionId: "c1", status: "done", done: ["accounts", "transactions", "sorting"], accounts: 2 } })).toEqual(
      expect.arrayContaining([key(["banks", "progress", "c1"]), key(recordKeys.found), key(recordKeys.flags), key(recordKeys.banks)]),
    );
  });

  it("finds.new refreshes the found screens and the record", () => {
    expect(invalidated({ name: "finds.new", data: { connectionId: "c1", count: 3, total: 9 } })).toEqual(
      expect.arrayContaining([key(recordKeys.found), key(recordKeys.finds), key(recordKeys.home), key(recordKeys.record)]),
    );
  });

  it("categories.updated refreshes the found screens, Home and the record", () => {
    expect(invalidated({ name: "categories.updated", data: { finds: 2, items: 1 } })).toEqual(
      expect.arrayContaining([key(recordKeys.found), key(recordKeys.home), key(recordKeys.record), key(recordKeys.items)]),
    );
  });

  it("bank.status refreshes the banks and Home", () => {
    expect(invalidated({ name: "bank.status", data: { connectionId: "c1", status: "lapsed" } })).toEqual(expect.arrayContaining([key(recordKeys.banks), key(recordKeys.home)]));
  });

  it("saving.result refreshes Home and that item", () => {
    expect(invalidated({ name: "saving.result", data: { entryId: "i1", result: "saved" } })).toEqual([key(recordKeys.home), key(recordKeys.item("i1"))]);
  });

  it("device.approved refreshes the approval and the help request", () => {
    expect(invalidated({ name: "device.approved", data: { approvalId: "a1" } })).toEqual(expect.arrayContaining([key(["approvals", "a1"]), key(["help", "a1"])]));
  });

  it("person.accepted and person.removed refresh People, Home and /me", () => {
    for (const name of ["person.accepted", "person.removed"] as const) {
      expect(invalidated({ name, data: { personId: "p1" } })).toEqual(expect.arrayContaining([key(recordKeys.people), key(recordKeys.home), key(meKeys.all)]));
    }
  });

  it("help events refresh that request", () => {
    for (const name of ["help.requested", "help.alert", "help.cancelled"] as const) {
      expect(invalidated({ name, data: { requestId: "r1" } })).toEqual([key(["help", "r1"])]);
    }
  });

  it("record.updated (the re-seal fallback) refreshes Home, the record, the finds and the found screens", () => {
    expect(invalidated({ name: "record.updated", data: { reason: "resealed" } })).toEqual(
      expect.arrayContaining([key(recordKeys.home), key(recordKeys.record), key(recordKeys.items), key(recordKeys.finds), key(recordKeys.found), key(recordKeys.flags)]),
    );
  });

  it("plan.changed refreshes /me, Home and the banks (not billing: that's the owner's)", () => {
    expect(invalidated({ name: "plan.changed", data: { plan: "standard" } })).toEqual([key(meKeys.all), key(recordKeys.home), key(recordKeys.banks)]);
  });
});
