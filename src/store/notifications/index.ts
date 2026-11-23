"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Notifications } from "@/lib/api/types";
import { staleTimes } from "../queryClient";

export const notificationKeys = { all: ["notifications"] as const };

/** `{updates, summary, recognise}`. Not U: nothing here is sealed. */
export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: ({ signal }) => api.get<Notifications>("/v1/notifications", { signal }),
    staleTime: staleTimes.settings,
  });
}

/** A toggle moves at once; it moves back if the save fails. */
export function useUpdateNotifications() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Notifications>) => api.patch<Notifications>("/v1/notifications", patch),
    onMutate: async (patch) => {
      await client.cancelQueries({ queryKey: notificationKeys.all });
      const previous = client.getQueryData<Notifications>(notificationKeys.all);
      client.setQueryData<Notifications>(notificationKeys.all, (current) => (current ? { ...current, ...patch } : current));
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) client.setQueryData(notificationKeys.all, context.previous);
    },
    onSuccess: (saved) => client.setQueryData(notificationKeys.all, saved),
  });
}
