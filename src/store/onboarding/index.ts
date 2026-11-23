"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, seg } from "@/lib/api/client";
import type { Found, FoundCategoryView, Me } from "@/lib/api/types";
import { invalidateFound, invalidateRecord, recordKeys } from "../queryKeys";
import { meKeys } from "../me";
import { staleTimes } from "../queryClient";

/** The found screen (U once locked: works with just a session before the record is locked). */
export function useFound(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: recordKeys.found,
    queryFn: ({ signal }) => api.get<Found>("/v1/onboarding/found", { signal }),
    staleTime: staleTimes.short,
    enabled: options.enabled ?? true,
  });
}

export function useFoundCategory(category: string) {
  return useQuery({
    queryKey: recordKeys.foundCategory(category),
    queryFn: ({ signal }) => api.get<FoundCategoryView>(`/v1/onboarding/found/${seg(category)}`, { signal }),
    staleTime: staleTimes.short,
  });
}

export function usePrefetchFoundCategory() {
  const client = useQueryClient();
  return (category: string) =>
    client.prefetchQuery({
      queryKey: recordKeys.foundCategory(category),
      queryFn: ({ signal }) => api.get<FoundCategoryView>(`/v1/onboarding/found/${seg(category)}`, { signal }),
      staleTime: staleTimes.short,
    });
}

/** "Add all to my record": `{added, waiting}`; never 402 (a full plan adds 0). */
export function useAcceptAll() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ added: number; waiting: number }>("/v1/onboarding/accept-all"),
    onSuccess: () => {
      invalidateFound(client);
      invalidateRecord(client);
    },
  });
}

/** "Not in the UK?": the ISO code; sets homeCurrency. */
export function useSetCountry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (country: string) => api.post("/v1/onboarding/country", { country }),
    onSuccess: () => client.invalidateQueries({ queryKey: meKeys.all }),
  });
}

export type { Me };
