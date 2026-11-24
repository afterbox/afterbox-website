import { onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, configureClient, refreshSession } from "@/lib/api/client";
import { ApiError, UnlockRequiredError, errorCopy, retryAfterText } from "@/lib/api/errors";
import { apiError, http, HttpResponse, json, server, url } from "./msw";

const handlers = { unlock: vi.fn(), stepUp: vi.fn(), signedOut: vi.fn() };

beforeEach(() => {
  handlers.unlock.mockReset().mockResolvedValue(undefined);
  handlers.stepUp.mockReset().mockResolvedValue(undefined);
  handlers.signedOut.mockReset();
  configureClient(handlers);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("requests", () => {
  it("sends cookies, and no CSRF header on GET", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    server.use(http.get(url("/v1/me"), () => json({ id: "u1" })));
    await expect(api.get("/v1/me")).resolves.toEqual({ id: "u1" });
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.credentials).toBe("include");
    expect((init?.headers as Record<string, string>)["X-Afterbox"]).toBeUndefined();
  });

  it("sends X-Afterbox: 1 and JSON on every non-GET", async () => {
    let seen: { csrf: string | null; type: string | null; body: unknown } | null = null;
    server.use(
      http.post(url("/v1/items"), async ({ request }) => {
        seen = { csrf: request.headers.get("X-Afterbox"), type: request.headers.get("Content-Type"), body: await request.json() };
        return json({ ok: true }, 201);
      }),
    );
    await api.post("/v1/items", { name: "Flat" });
    expect(seen).toEqual({ csrf: "1", type: "application/json", body: { name: "Flat" } });
  });

  it("answers undefined for 204", async () => {
    server.use(http.delete(url("/v1/items/1"), () => new HttpResponse(null, { status: 204 })));
    await expect(api.delete("/v1/items/1")).resolves.toBeUndefined();
  });

  it("sends FormData uploads without forcing a content type", async () => {
    let type: string | null = null;
    server.use(
      http.post(url("/v1/documents/scan"), ({ request }) => {
        type = request.headers.get("Content-Type");
        return json({ documentId: "d1" }, 201);
      }),
    );
    const form = new FormData();
    form.append("file", new Blob(["x"], { type: "image/jpeg" }), "photo.jpg");
    await api.upload("/v1/documents/scan", form);
    expect(type).toMatch(/^multipart\/form-data; boundary=/);
  });
});

describe("error mapping", () => {
  it("turns the error envelope into a typed ApiError", async () => {
    server.use(http.post(url("/v1/auth/email/verify"), () => apiError(400, "CODE_WRONG", { triesLeft: 3 }, "That code didn’t work.")));
    const error = await api.post("/v1/auth/email/verify", { email: "a@b.co", code: "000000" }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: "CODE_WRONG", message: "That code didn’t work.", details: { triesLeft: 3 } });
  });

  it("keeps a generic error when the body isn't JSON", async () => {
    server.use(http.get(url("/v1/home"), () => new HttpResponse("<html>bad gateway</html>", { status: 502 })));
    await expect(api.get("/v1/home")).rejects.toMatchObject({ status: 502, code: "INTERNAL" });
  });

  it("maps a failed fetch to NETWORK", async () => {
    server.use(http.get(url("/v1/home"), () => HttpResponse.error()));
    await expect(api.get("/v1/home")).rejects.toMatchObject({ status: 0, code: "NETWORK" });
  });

  it("reads retryAfter from the Retry-After header when details lack it", async () => {
    server.use(
      http.post(url("/v1/updates"), () =>
        HttpResponse.json({ error: { code: "RATE_LIMITED", message: "Slow down." } }, { status: 429, headers: { "Retry-After": "120" } }),
      ),
    );
    const error = (await api.post("/v1/updates", {}).catch((caught: unknown) => caught)) as ApiError;
    expect(error.retryAfter).toBe(120);
    expect(errorCopy(error)).toBe("Too many tries. Try again in 2 minutes.");
  });

  it("writes calm copy for each code", () => {
    expect(errorCopy(new ApiError(413, "FILE_TOO_LARGE", "x"))).toBe("This file is too large. Try a photo or a shorter PDF.");
    expect(errorCopy(new ApiError(504, "SCAN_FAILED", "x"))).toBe("That took too long. Try again.");
    expect(errorCopy(new ApiError(422, "SCAN_FAILED", "x"))).toBe("We couldn’t read this one. Type it in instead?");
    expect(errorCopy(new ApiError(409, "CONFLICT", "Already answered."))).toBe("Already answered.");
    expect(errorCopy(new ApiError(503, "SERVICE_UNAVAILABLE", "x"))).toBe("Can’t reach afterbox right now. Try again in a moment.");
    expect(errorCopy(new ApiError(500, "INTERNAL", "x"))).toBe("Can’t reach afterbox right now. Try again in a moment.");
    expect(errorCopy(new Error("boom"))).toBe("Something went wrong. Try again.");
    expect(retryAfterText(599)).toBe("Try again in 10 minutes.");
    expect(retryAfterText(30)).toBe("Try again in 30 seconds.");
  });
});

describe("401: refresh once, then retry", () => {
  it("refreshes and retries the request", async () => {
    let calls = 0;
    const refresh = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(
      http.get(url("/v1/home"), () => (++calls === 1 ? apiError(401, "UNAUTHENTICATED") : json({ count: 3 }))),
      http.post(url("/v1/auth/refresh"), refresh),
    );
    await expect(api.get("/v1/home")).resolves.toEqual({ count: 3 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toBe(2);
  });

  it("makes one refresh for many requests that fail together", async () => {
    let refreshed = false;
    const refresh = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      refreshed = true;
      return new HttpResponse(null, { status: 204 });
    });
    server.use(
      http.get(url("/v1/home"), () => (refreshed ? json({ ok: "home" }) : apiError(401, "UNAUTHENTICATED"))),
      http.get(url("/v1/finds"), () => (refreshed ? json({ ok: "finds" }) : apiError(401, "UNAUTHENTICATED"))),
      http.get(url("/v1/people"), () => (refreshed ? json({ ok: "people" }) : apiError(401, "UNAUTHENTICATED"))),
      http.post(url("/v1/auth/refresh"), refresh),
    );
    const results = await Promise.all([api.get("/v1/home"), api.get("/v1/finds"), api.get("/v1/people")]);
    expect(results).toEqual([{ ok: "home" }, { ok: "finds" }, { ok: "people" }]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("serialises refreshes across tabs with the ab-refresh Web Lock", async () => {
    const request = vi.fn((_name: string, callback: () => Promise<boolean>) => callback());
    Object.defineProperty(navigator, "locks", { value: { request }, configurable: true });
    server.use(http.post(url("/v1/auth/refresh"), () => new HttpResponse(null, { status: 204 })));
    await expect(refreshSession()).resolves.toBe(true);
    expect(request).toHaveBeenCalledWith("ab-refresh", expect.any(Function));
    Object.defineProperty(navigator, "locks", { value: undefined, configurable: true });
  });

  it("signs out when the refresh fails, and doesn't retry", async () => {
    let calls = 0;
    server.use(
      http.get(url("/v1/home"), () => {
        calls += 1;
        return apiError(401, "UNAUTHENTICATED");
      }),
      http.post(url("/v1/auth/refresh"), () => apiError(401, "UNAUTHENTICATED")),
    );
    await expect(api.get("/v1/home")).rejects.toMatchObject({ status: 401 });
    expect(handlers.signedOut).toHaveBeenCalledTimes(1);
    expect(calls).toBe(1);
  });

  it("never refreshes for the auth routes themselves", async () => {
    const refresh = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.post(url("/v1/auth/email/verify"), () => apiError(401, "UNAUTHENTICATED")), http.post(url("/v1/auth/refresh"), refresh));
    await expect(api.post("/v1/auth/email/verify", {})).rejects.toMatchObject({ status: 401 });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("retries only once if the retry is 401 again", async () => {
    let calls = 0;
    server.use(
      http.get(url("/v1/home"), () => {
        calls += 1;
        return apiError(401, "UNAUTHENTICATED");
      }),
      http.post(url("/v1/auth/refresh"), () => new HttpResponse(null, { status: 204 })),
    );
    await expect(api.get("/v1/home")).rejects.toMatchObject({ status: 401 });
    expect(calls).toBe(2);
  });
});

describe("423: silent unlock, then retry", () => {
  it("unlocks with the stored blob and retries once", async () => {
    let calls = 0;
    server.use(http.get(url("/v1/home"), () => (++calls === 1 ? apiError(423, "UNLOCK_REQUIRED") : json({ count: 1 }))));
    await expect(api.get("/v1/home")).resolves.toEqual({ count: 1 });
    expect(handlers.unlock).toHaveBeenCalledTimes(1);
  });

  it("throws UnlockRequiredError when this device can't unlock silently", async () => {
    handlers.unlock.mockRejectedValue(new Error("no blob"));
    server.use(http.get(url("/v1/home"), () => apiError(423, "UNLOCK_REQUIRED")));
    await expect(api.get("/v1/home")).rejects.toBeInstanceOf(UnlockRequiredError);
  });

  it("passes a rate limit from the unlock through", async () => {
    handlers.unlock.mockRejectedValue(new ApiError(429, "RATE_LIMITED", "Slow down.", { retryAfter: 600 }));
    server.use(http.get(url("/v1/home"), () => apiError(423, "UNLOCK_REQUIRED")));
    await expect(api.get("/v1/home")).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" });
  });

  it("doesn't loop when the retry is locked again", async () => {
    let calls = 0;
    server.use(
      http.get(url("/v1/home"), () => {
        calls += 1;
        return apiError(423, "UNLOCK_REQUIRED");
      }),
    );
    await expect(api.get("/v1/home")).rejects.toMatchObject({ status: 423 });
    expect(calls).toBe(2);
    expect(handlers.unlock).toHaveBeenCalledTimes(1);
  });
});

describe("403 STEP_UP_REQUIRED: passkey, then retry", () => {
  it("runs the step-up and retries once", async () => {
    let calls = 0;
    server.use(http.delete(url("/v1/devices/d1"), () => (++calls === 1 ? apiError(403, "STEP_UP_REQUIRED") : new HttpResponse(null, { status: 204 }))));
    await expect(api.delete("/v1/devices/d1")).resolves.toBeUndefined();
    expect(handlers.stepUp).toHaveBeenCalledTimes(1);
  });

  it("stops when the passkey is cancelled", async () => {
    handlers.stepUp.mockRejectedValue(new Error("cancelled"));
    server.use(http.delete(url("/v1/devices/d1"), () => apiError(403, "STEP_UP_REQUIRED")));
    await expect(api.delete("/v1/devices/d1")).rejects.toThrow("cancelled");
  });

  it("leaves a plain 403 alone", async () => {
    server.use(http.post(url("/v1/invites/t/accept"), () => apiError(403, "FORBIDDEN")));
    await expect(api.post("/v1/invites/t/accept")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(handlers.stepUp).not.toHaveBeenCalled();
  });

  it("handles a locked record and a step-up on the same request", async () => {
    let calls = 0;
    server.use(
      http.post(url("/v1/devices/approvals/a1/approve"), () => {
        calls += 1;
        if (calls === 1) return apiError(403, "STEP_UP_REQUIRED");
        if (calls === 2) return apiError(423, "UNLOCK_REQUIRED");
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await expect(api.post("/v1/devices/approvals/a1/approve")).resolves.toBeUndefined();
    expect(handlers.stepUp).toHaveBeenCalledTimes(1);
    expect(handlers.unlock).toHaveBeenCalledTimes(1);
  });
});

describe("429: respect retryAfter", () => {
  it("waits out a short retryAfter on a GET, once", async () => {
    let calls = 0;
    server.use(http.get(url("/v1/home"), () => (++calls === 1 ? apiError(429, "RATE_LIMITED", { retryAfter: 1 }) : json({ count: 2 }))));
    const started = Date.now();
    await expect(api.get("/v1/home")).resolves.toEqual({ count: 2 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(900);
  });

  it("throws with retryAfter when the wait is long", async () => {
    server.use(http.get(url("/v1/home"), () => apiError(429, "RATE_LIMITED", { retryAfter: 600 })));
    const error = (await api.get("/v1/home").catch((caught: unknown) => caught)) as ApiError;
    expect(error.retryAfter).toBe(600);
  });

  it("never repeats a write on its own", async () => {
    let calls = 0;
    server.use(
      http.post(url("/v1/auth/email/start"), () => {
        calls += 1;
        return apiError(429, "RATE_LIMITED", { retryAfter: 1 });
      }),
    );
    await expect(api.post("/v1/auth/email/start", {})).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(calls).toBe(1);
  });
});

describe("a refresh that can't reach afterbox keeps the session (only a 401 from refresh signs out)", () => {
  const UNREACHABLE = "Can’t reach afterbox right now. Try again in a moment.";
  const expired = () => http.get(url("/v1/home"), () => apiError(401, "UNAUTHENTICATED"));

  afterEach(() => {
    onlineManager.setOnline(true);
    configureClient({ getTimeoutMs: 20_000 });
  });

  it("a 401 from refresh signs out", async () => {
    server.use(expired(), http.post(url("/v1/auth/refresh"), () => apiError(401, "UNAUTHENTICATED")));
    const error = await api.get("/v1/home").catch((caught: unknown) => caught);
    expect(error).toMatchObject({ status: 401 });
    expect(handlers.signedOut).toHaveBeenCalledTimes(1);
  });

  it("a fetch error on refresh keeps the session and says afterbox can't be reached", async () => {
    server.use(expired(), http.post(url("/v1/auth/refresh"), () => HttpResponse.error()));
    const error = await api.get("/v1/home").catch((caught: unknown) => caught);
    expect(error).toMatchObject({ status: 0, code: "NETWORK" });
    expect(errorCopy(error)).toBe(UNREACHABLE);
    expect(handlers.signedOut).not.toHaveBeenCalled();
    await expect(refreshSession()).resolves.toBe(false);
    expect(handlers.signedOut).not.toHaveBeenCalled();
  });

  it("a 5xx from refresh keeps the session and says afterbox can't be reached", async () => {
    for (const status of [500, 502, 503]) {
      server.use(expired(), http.post(url("/v1/auth/refresh"), () => new HttpResponse("<html>down</html>", { status })));
      const error = await api.get("/v1/home").catch((caught: unknown) => caught);
      expect(error).toMatchObject({ status });
      expect(errorCopy(error)).toBe(UNREACHABLE);
    }
    expect(handlers.signedOut).not.toHaveBeenCalled();
  });

  it("a refresh that times out keeps the session", async () => {
    configureClient({ getTimeoutMs: 100 });
    server.use(
      http.post(url("/v1/home"), () => apiError(401, "UNAUTHENTICATED")),
      http.post(url("/v1/auth/refresh"), () => new Promise<never>(() => {})),
    );
    const error = await api.post("/v1/home").catch((caught: unknown) => caught);
    expect(error).toMatchObject({ status: 0, code: "NETWORK" });
    expect(errorCopy(error)).toBe(UNREACHABLE);
    expect(handlers.signedOut).not.toHaveBeenCalled();
  });

  it("tries the refresh again on the next request, and carries on once it works", async () => {
    let up = false;
    let refreshed = false;
    const refresh = vi.fn(() => {
      if (!up) return new HttpResponse(null, { status: 503 });
      refreshed = true;
      return new HttpResponse(null, { status: 204 });
    });
    server.use(
      http.get(url("/v1/home"), () => (refreshed ? json({ ok: true }) : apiError(401, "UNAUTHENTICATED"))),
      http.post(url("/v1/auth/refresh"), refresh),
    );
    await expect(api.get("/v1/home")).rejects.toMatchObject({ status: 503 });
    up = true;
    await expect(api.get("/v1/home")).resolves.toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(handlers.signedOut).not.toHaveBeenCalled();
  });

  it("tries the refresh again when the connection comes back", async () => {
    const refresh = vi.fn(() => HttpResponse.error());
    server.use(expired(), http.post(url("/v1/auth/refresh"), refresh));
    await expect(api.get("/v1/home")).rejects.toMatchObject({ code: "NETWORK" });
    expect(refresh).toHaveBeenCalledTimes(1);

    // The connection drops, then comes back: the refresh runs again by itself, with no request asking.
    refresh.mockImplementation(() => new HttpResponse(null, { status: 204 }));
    onlineManager.setOnline(false);
    expect(refresh).toHaveBeenCalledTimes(1);
    onlineManager.setOnline(true);
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
    expect(handlers.signedOut).not.toHaveBeenCalled();
  });
});

describe("GET timeout", () => {
  it("gives up on a GET that never answers, as a network error", async () => {
    configureClient({ getTimeoutMs: 200 });
    server.use(http.get(url("/v1/banks"), () => new Promise<never>(() => {})));
    await expect(api.get("/v1/banks")).rejects.toMatchObject({ code: "NETWORK" });
    configureClient({ getTimeoutMs: 20_000 });
  });
});
