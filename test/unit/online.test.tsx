import { onlineManager, QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EmailAuthForm from "@/components/ui/auth/EmailAuthForm";
import OfflineNotice from "@/components/ui/OfflineNotice";
import { api, configureClient } from "@/lib/api/client";
import { ApiError, errorCopy } from "@/lib/api/errors";
import { useStartEmail, useVerifyCode } from "@/store/auth";
import { makeQueryClient } from "@/store/queryClient";
import { useAddItem } from "@/store/record";
import { http, HttpResponse, json, server, url } from "./msw";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(),
}));

// next/image can't size an imported SVG under jsdom.
vi.mock("@/components/ui/BrandMark", () => ({ default: () => <span>afterbox</span> }));

vi.mock("@/components/ui/Links", () => ({
  Link: ({ children, href, className }: { children: ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const OFFLINE = "You’re offline. Check your connection and try again.";
const UNREACHABLE = "Can’t reach afterbox right now. Try again in a moment.";

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

/** What the browser reports in navigator.onLine (wrong on some networks and VPNs). */
const reportOnLine = (value: boolean) => vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(value);

beforeEach(() => {
  client = makeQueryClient();
  configureClient({ unlock: vi.fn().mockResolvedValue(undefined), stepUp: vi.fn().mockResolvedValue(undefined), signedOut: vi.fn() });
});

afterEach(() => {
  act(() => onlineManager.setOnline(true));
});

describe("the online state is TanStack's default: the browser's online and offline events only", () => {
  it("starts online even when navigator.onLine says offline, and follows the browser's events after that", () => {
    reportOnLine(false);
    render(<OfflineNotice />);
    expect(onlineManager.isOnline()).toBe(true);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent("You’re offline.");

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    return waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("clears the offline notice on the first request that gets an answer", async () => {
    server.use(http.get(url("/v1/me"), () => json({ id: "u1" })));
    render(<OfflineNotice />);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    await act(() => api.get("/v1/me"));
    expect(onlineManager.isOnline()).toBe(true);
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("a failed request doesn't mark the app offline, and reads \"Can't reach afterbox\"", async () => {
    server.use(http.post(url("/v1/auth/email/start"), () => HttpResponse.error()));
    const error = (await api.post("/v1/auth/email/start", {}).catch((caught: unknown) => caught)) as ApiError;
    expect(error).toMatchObject({ status: 0, code: "NETWORK", message: UNREACHABLE, details: { offline: false } });
    expect(errorCopy(error)).toBe(UNREACHABLE);
    expect(onlineManager.isOnline()).toBe(true);
  });

  it("a timed-out GET doesn't mark the app offline either", async () => {
    configureClient({ getTimeoutMs: 100 });
    server.use(http.get(url("/v1/banks"), () => new Promise<never>(() => {})));
    const error = await api.get("/v1/banks").catch((caught: unknown) => caught);
    configureClient({ getTimeoutMs: 20_000 });
    expect(errorCopy(error)).toBe(UNREACHABLE);
    expect(onlineManager.isOnline()).toBe(true);
  });

  it("says offline only while the browser says so", async () => {
    server.use(http.post(url("/v1/auth/email/start"), () => HttpResponse.error()));
    act(() => onlineManager.setOnline(false));
    const error = await api.post("/v1/auth/email/start", {}).catch((caught: unknown) => caught);
    expect(errorCopy(error)).toBe(OFFLINE);
  });

  it("a 5xx reads \"Can't reach afterbox\"", async () => {
    server.use(http.get(url("/v1/home"), () => new HttpResponse("<html>bad gateway</html>", { status: 502 })));
    expect(errorCopy(await api.get("/v1/home").catch((caught: unknown) => caught))).toBe(UNREACHABLE);
    expect(errorCopy(new ApiError(503, "SERVICE_UNAVAILABLE", "x"))).toBe(UNREACHABLE);
  });
});

describe("sign-in mutations are never paused", () => {
  it("email start and verify run while onlineManager says offline", async () => {
    server.use(
      http.post(url("/v1/auth/email/start"), () => json({ status: "sent" })),
      http.post(url("/v1/auth/email/verify"), () => json({ user: { id: "u1", email: "a@b.co" }, isNew: false })),
    );
    act(() => onlineManager.setOnline(false));
    const start = renderHook(() => useStartEmail(), { wrapper });
    await act(() => start.result.current.mutateAsync({ email: "a@b.co", mode: "login" }));
    await waitFor(() => expect(start.result.current.isSuccess).toBe(true));

    act(() => onlineManager.setOnline(false));
    const verify = renderHook(() => useVerifyCode(), { wrapper });
    await act(() => verify.result.current.mutateAsync({ email: "a@b.co", code: "123456" }));
    await waitFor(() => expect(verify.result.current.isSuccess).toBe(true));
  });

  it("an ordinary change still waits while the browser is offline (so the notice's promise holds)", async () => {
    act(() => onlineManager.setOnline(false));
    const { result } = renderHook(() => useAddItem(), { wrapper });
    act(() => {
      result.current.mutate({ category: "property", name: "Flat" } as unknown as Parameters<typeof result.current.mutate>[0]);
    });
    await waitFor(() => expect(result.current.isPaused).toBe(true));
  });
});

describe("the sign-in form", () => {
  it("sends the code even when navigator.onLine says offline", async () => {
    reportOnLine(false);
    let sent = 0;
    server.use(
      http.post(url("/v1/auth/email/start"), () => {
        sent++;
        return json({ status: "sent" });
      }),
    );
    render(<EmailAuthForm mode="login" initialEmail="ada@example.com" />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(sent).toBe(1));
    expect(screen.queryByText("You're offline.")).not.toBeInTheDocument();
  });

  it("shows \"Can't reach afterbox\" when the request fails while online, and Continue stays usable", async () => {
    server.use(http.post(url("/v1/auth/email/start"), () => HttpResponse.error()));
    render(<EmailAuthForm mode="login" initialEmail="ada@example.com" />, { wrapper });
    const button = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(button);
    expect(await screen.findByText(UNREACHABLE)).toBeInTheDocument();
    expect(screen.queryByText("You're offline.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(onlineManager.isOnline()).toBe(true);
  });
});
