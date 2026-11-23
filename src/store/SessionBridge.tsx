"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useMe } from "./me";
import { onSessionEvent } from "./queryClient";
import { connectRealtime } from "./realtime/client";
import { emitRealtime, invalidateFor, refetchAfterReconnect } from "./realtime";
import { endLocalSession } from "./sessions";

const RECORD_PATHS = ["/home"];

/**
 * For signed-in areas: keeps the realtime connection open for the member, maps its events to the cache, and
 * routes on session events (signed out → /login with the cache cleared; record locked on this session → /unlock).
 */
export default function SessionBridge() {
  const client = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const userId = me.data?.id;
  // The page last sent to /unlock; cleared once /unlock is reached, so a later lock redirects again.
  const redirectedFrom = useRef<string | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/unlock")) redirectedFrom.current = null;
  }, [pathname]);

  useEffect(() => {
    if (!userId) return;
    connectRealtime(userId, {
      onEvent: (event) => {
        invalidateFor(client, event);
        emitRealtime(event);
      },
      onReconnect: () => refetchAfterReconnect(client),
    }).catch(() => {
      // Realtime is best effort: screens poll their routes as a fallback.
    });
  }, [client, userId]);

  useEffect(
    () =>
      onSessionEvent((event) => {
        if (event === "signed-out") {
          endLocalSession(client);
          router.replace("/login");
          return;
        }
        if (event === "unlock-required" && RECORD_PATHS.some((path) => window.location.pathname.startsWith(path))) {
          // Once per page: the screen being left is still mounted and its queries would ask again (and lock again).
          const from = window.location.pathname + window.location.search;
          if (redirectedFrom.current === from) return;
          redirectedFrom.current = from;
          // The record locked for this session: nothing decrypted stays in memory while it's locked.
          client.removeQueries({ predicate: (query) => !["me", "unlock", "security", "notifications"].includes(String(query.queryKey[0])) });
          router.replace(`/unlock?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }
      }),
    [client, router],
  );

  // A 401 that refresh couldn't fix arrives as an error on /me.
  useEffect(() => {
    if (me.error && "status" in me.error && me.error.status === 401 && pathname !== "/login") {
      endLocalSession(client);
      router.replace("/login");
    }
  }, [client, me.error, pathname, router]);

  return null;
}
