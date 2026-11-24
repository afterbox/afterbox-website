import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureClient } from "@/lib/api/client";
import { ApiError, anyErrorCopy, isDemoMode, setDemoMode } from "@/lib/api/errors";
import { useLockRecord } from "@/store/keys";
import { fetchMe } from "@/store/me";
import { makeQueryClient } from "@/store/queryClient";
import { recordKeys } from "@/store/queryKeys";
import { json, http, server, url } from "./msw";

vi.mock("@/lib/security/keychain", async (original) => ({
  ...(await original<typeof import("@/lib/security/keychain")>()),
  lockRecord: vi.fn().mockResolvedValue(undefined),
}));

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
  client = makeQueryClient();
  configureClient({ unlock: vi.fn().mockResolvedValue(undefined), stepUp: vi.fn().mockResolvedValue(undefined), signedOut: vi.fn() });
});

afterEach(() => setDemoMode(false));

describe("locking the record", () => {
  it("refreshes Home, the record and the finds once setup and unlock are done, so Home has the added finds", async () => {
    // What Home and the record looked like before locking (empty: the finds weren't items yet).
    client.setQueryData(recordKeys.home, { count: 0 });
    client.setQueryData(recordKeys.record, { count: 0 });
    client.setQueryData(recordKeys.finds, { finds: [] });
    client.setQueryData(recordKeys.found, { categories: [] });
    const { result } = renderHook(() => useLockRecord(), { wrapper });
    await act(() => result.current.mutateAsync({ id: "u1" }));
    for (const key of [recordKeys.home, recordKeys.record, recordKeys.finds, recordKeys.found]) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });
});

describe("demo mode", () => {
  it("is read from /v1/me", async () => {
    server.use(http.get(url("/v1/me"), () => json({ id: "u1", plan: "standard", demo: true })));
    await fetchMe();
    expect(isDemoMode()).toBe(true);
    server.use(http.get(url("/v1/me"), () => json({ id: "u1", plan: "free" })));
    await fetchMe();
    expect(isDemoMode()).toBe(false);
  });

  it("says a limit without a plan or an upgrade", () => {
    const trusted = new ApiError(402, "LIMIT_TRUSTED", "Your plan doesn’t include another trusted person.", { limit: 2 });
    expect(anyErrorCopy(trusted)).toMatch(/plan/i);
    setDemoMode(true);
    for (const code of ["LIMIT_TRUSTED", "LIMIT_ITEMS", "LIMIT_BANKS", "LIMIT_DOCUMENTS", "LIMIT_PEOPLE", "LIMIT_SHARING"] as const) {
      for (const details of [{}, { limit: 2 }, { rescanAfter: "2027-01-01" }]) {
        const copy = anyErrorCopy(new ApiError(402, code, "Your plan doesn’t include that.", details));
        expect(copy).not.toMatch(/plan|upgrade/i);
      }
    }
    expect(anyErrorCopy(trusted)).toBe("You can choose up to 2 trusted people.");
  });

  it("shows the backend's message when checkout or the portal is reached anyway", () => {
    setDemoMode(true);
    expect(anyErrorCopy(new ApiError(409, "CONFLICT", "Plans are off in the demo"))).toBe("Plans are off in the demo");
  });
});
