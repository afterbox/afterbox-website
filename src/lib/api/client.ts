import { ApiError, UnlockRequiredError, type ErrorCode, type ErrorDetails } from "./errors";

/**
 * The one API client. Screens never call fetch: they use the hooks in src/store, which call this.
 * - credentials: "include" (HttpOnly cookies; the frontend never reads a token)
 * - X-Afterbox: 1 on every non-GET (CSRF). No other custom headers: CORS allows only that and Content-Type.
 * - 401: one refresh at a time across tabs (Web Locks), then the request is retried once.
 * - 423 UNLOCK_REQUIRED: a silent re-unlock with this device's stored blob, then one retry.
 * - 403 STEP_UP_REQUIRED: the passkey confirmation, then one retry.
 * - 429: a short retryAfter on a GET is waited out once; otherwise the error carries retryAfter.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

type Handlers = {
  /** Unlocks this session with the stored device blob. Throws when this device can't unlock silently. */
  unlock: () => Promise<void>;
  /** Runs the passkey confirmation (step-up). Throws when cancelled or failed. */
  stepUp: () => Promise<void>;
  /** The refresh failed: the session is over. */
  signedOut: () => void;
  /** How long a GET may take (tests shorten it). */
  getTimeoutMs: number;
};

const handlers: Partial<Handlers> = {};

/** Wires the security layer in without the client importing it (it would be a cycle). */
export function configureClient({ getTimeoutMs, ...next }: Partial<Handlers>) {
  Object.assign(handlers, next);
  if (getTimeoutMs) GET_TIMEOUT_MS = getTimeoutMs;
}

export type RequestOptions = {
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
  /** Return the Response as it is (file downloads). */
  raw?: boolean;
};

type Recovery = "refresh" | "unlock" | "stepUp" | "wait";

const SHORT_WAIT_SECONDS = 2;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });

async function toApiError(response: Response): Promise<ApiError> {
  let code: ErrorCode = response.status >= 500 ? "INTERNAL" : "VALIDATION";
  let message = "Something went wrong. Try again.";
  let details: ErrorDetails = {};
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string; details?: ErrorDetails } };
    if (body.error?.code) code = body.error.code as ErrorCode;
    if (body.error?.message) message = body.error.message;
    if (body.error?.details) details = body.error.details;
  } catch {
    // Not JSON (a proxy's page, an empty body): keep the generic error for the status.
  }
  if (response.status === 429 && details.retryAfter === undefined) {
    const header = Number(response.headers.get("Retry-After"));
    if (Number.isFinite(header) && header > 0) details = { ...details, retryAfter: header };
  }
  return new ApiError(response.status, code, message, details);
}

/** GETs give up after this long and count as a network error (retried by the query layer). Writes wait: a scan reads for up to ~25 s. */
let GET_TIMEOUT_MS = 20_000;

async function send(method: string, path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (method !== "GET") headers["X-Afterbox"] = "1";
  if (options.form) body = options.form;
  else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const canCombine = typeof AbortSignal.any === "function" && typeof AbortSignal.timeout === "function";
  const timeout = method === "GET" && !options.raw && canCombine ? AbortSignal.timeout(GET_TIMEOUT_MS) : undefined;
  const signal = timeout && options.signal ? AbortSignal.any([options.signal, timeout]) : (timeout ?? options.signal);
  try {
    return await fetch(`${API_URL}${path}`, { method, headers, body, credentials: "include", signal });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(0, "NETWORK", "You’re offline.");
  }
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time: shared within the tab, serialised across tabs by the "ab-refresh" lock. */
export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    const run = async () => {
      const response = await send("POST", "/v1/auth/refresh", {});
      return response.ok;
    };
    refreshing = (async () => {
      try {
        const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
        return locks?.request ? await locks.request("ab-refresh", run) : await run();
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

/**
 * Routes that read the member's finds (`FindsReader.reviewable` on the backend) go one at a time from this tab:
 * two at once can hang on the backend and hold a database connection (docs/BACKEND_ISSUES.md #4).
 */
const ONE_AT_A_TIME = /^\/v1\/(home|finds|record)(\?|$)/;
let queue: Promise<unknown> = Promise.resolve();

function sendInTurn(method: string, path: string, options: RequestOptions): Promise<Response> {
  if (method !== "GET" || !ONE_AT_A_TIME.test(path)) return send(method, path, options);
  const turn = queue.then(() => send(method, path, options));
  queue = turn.catch(() => undefined);
  return turn;
}

async function request<T>(method: string, path: string, options: RequestOptions, used: Set<Recovery>): Promise<T> {
  const response = await sendInTurn(method, path, options);
  if (response.ok) {
    if (options.raw) return response as T;
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  const error = await toApiError(response);
  const retry = (recovery: Recovery) => request<T>(method, path, options, new Set([...used, recovery]));

  if (error.status === 401 && !path.startsWith("/v1/auth/") && !used.has("refresh")) {
    if (await refreshSession()) return retry("refresh");
    handlers.signedOut?.();
    throw error;
  }

  if (error.status === 423 && !used.has("unlock")) {
    if (!handlers.unlock) throw new UnlockRequiredError();
    try {
      await handlers.unlock();
    } catch (unlockError) {
      throw unlockError instanceof ApiError ? unlockError : new UnlockRequiredError();
    }
    return retry("unlock");
  }

  if (error.code === "STEP_UP_REQUIRED" && handlers.stepUp && !used.has("stepUp")) {
    await handlers.stepUp();
    return retry("stepUp");
  }

  if (error.status === 429 && method === "GET" && !used.has("wait")) {
    const seconds = error.retryAfter;
    if (seconds !== null && seconds <= SHORT_WAIT_SECONDS) {
      await sleep(seconds * 1000, options.signal);
      return retry("wait");
    }
  }

  throw error;
}

export const api = {
  get: <T>(path: string, options: Omit<RequestOptions, "body" | "form"> = {}) => request<T>("GET", path, options, new Set()),
  post: <T = void>(path: string, body?: unknown, options: Omit<RequestOptions, "body"> = {}) =>
    request<T>("POST", path, { ...options, body }, new Set()),
  put: <T = void>(path: string, body?: unknown, options: Omit<RequestOptions, "body"> = {}) =>
    request<T>("PUT", path, { ...options, body }, new Set()),
  patch: <T = void>(path: string, body?: unknown, options: Omit<RequestOptions, "body"> = {}) =>
    request<T>("PATCH", path, { ...options, body }, new Set()),
  delete: <T = void>(path: string, options: Omit<RequestOptions, "body" | "form"> = {}) =>
    request<T>("DELETE", path, options, new Set()),
  upload: <T>(path: string, form: FormData, options: Omit<RequestOptions, "body" | "form"> = {}) =>
    request<T>("POST", path, { ...options, form }, new Set()),
};

/** Encodes a path segment from a value the app holds (an id, a merchant key, a token). */
export const seg = (value: string) => encodeURIComponent(value);
