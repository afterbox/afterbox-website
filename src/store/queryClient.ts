import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isApiError, UnlockRequiredError } from "@/lib/api/errors";

/**
 * One QueryClient per browser tab, in memory only. The cache is never persisted (no localStorage, sessionStorage
 * or IndexedDB persister): record data never touches disk. It's cleared on sign-out, lock and account deletion.
 */

type SessionEvent = "unlock-required" | "signed-out";
const listeners = new Set<(event: SessionEvent) => void>();

export function onSessionEvent(listener: (event: SessionEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSessionEvent(event: SessionEvent) {
  listeners.forEach((listener) => listener(event));
}

function handleError(error: unknown) {
  if (error instanceof UnlockRequiredError) emitSessionEvent("unlock-required");
}

/** No retries on 4xx (they won't change by asking again), at most two on 5xx and network errors. */
export function shouldRetry(failureCount: number, error: unknown) {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export const staleTimes = {
  live: 0,
  short: 15_000,
  default: 30_000,
  minute: 60_000,
  settings: 5 * 60_000,
  hour: 60 * 60_000,
  day: 24 * 60 * 60_000,
} as const;

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        staleTime: staleTimes.default,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
        networkMode: "online",
      },
      mutations: {
        retry: false,
        // Paused while offline and sent when the connection comes back.
        networkMode: "online",
      },
    },
  });
}

let browserClient: QueryClient | null = null;

/** The tab's client (a fresh one per server render, never shared between requests). */
export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}
