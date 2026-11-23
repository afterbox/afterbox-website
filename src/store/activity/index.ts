"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, seg } from "@/lib/api/client";
import type { Home } from "@/lib/api/types";
import { recordKeys } from "../queryKeys";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only written events (UUID ids) can be marked seen; `payment-…` and `renew-…` cards are worked out each time. */
export const canMarkSeen = (eventId: string) => UUID.test(eventId);

/** Hides a What's new card at once; it comes back if the API refuses. */
export function useMarkEventSeen() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.post(`/v1/events/${seg(eventId)}/seen`),
    onMutate: async (eventId) => {
      const previous = client.getQueryData<Home>(recordKeys.home);
      client.setQueryData<Home>(recordKeys.home, (home) =>
        home ? { ...home, whatsNew: home.whatsNew.filter((event) => event.id !== eventId) } : home,
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) client.setQueryData(recordKeys.home, context.previous);
    },
  });
}
