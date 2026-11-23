"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, seg } from "@/lib/api/client";
import type { CancelGuide, CancelledReply, Found, FlagDetail } from "@/lib/api/types";
import { invalidateFound, invalidateRecord, recordKeys } from "../queryKeys";
import { staleTimes } from "../queryClient";

/** A worth-a-look flag with the findings it's about. */
export function useFlag(id: string) {
  const client = useQueryClient();
  return useQuery<FlagDetail>({
    queryKey: recordKeys.flag(id),
    queryFn: ({ signal }) => api.get<FlagDetail>(`/v1/flags/${seg(id)}`, { signal }),
    staleTime: staleTimes.default,
    placeholderData: (): FlagDetail | undefined => {
      const flag = client.getQueryData<Found>(recordKeys.found)?.flags.find((candidate) => candidate.id === id);
      return flag ? { ...flag, items: [] } : undefined;
    },
  });
}

export function useDismissFlag() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/v1/flags/${seg(id)}/dismiss`),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: recordKeys.found });
      const previous = client.getQueryData<Found>(recordKeys.found);
      client.setQueryData<Found>(recordKeys.found, (found) =>
        found ? { ...found, flags: found.flags.filter((flag) => flag.id !== id) } : found,
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) client.setQueryData(recordKeys.found, context.previous);
    },
    onSettled: () => invalidateFound(client),
  });
}

/** "I've cancelled it" on a find (or the item it became). */
export function useMarkFindCancelled() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<CancelledReply>(`/v1/finds/${seg(id)}/cancelled`),
    onSuccess: () => {
      invalidateFound(client);
      invalidateRecord(client);
    },
  });
}

export const cancelGuideKey = (merchant: string) => ["cancel-guides", merchant] as const;

/** Static guides keyed by merchant ("netflix", "admiral"). */
export function useCancelGuide(merchant: string | null) {
  return useQuery({
    queryKey: cancelGuideKey(merchant ?? "none"),
    queryFn: ({ signal }) => api.get<CancelGuide>(`/v1/cancel-guides/${seg(merchant!)}`, { signal }),
    enabled: Boolean(merchant),
    staleTime: staleTimes.hour,
  });
}
