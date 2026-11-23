"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Country, MetaCategories } from "@/lib/api/types";
import { staleTimes } from "../queryClient";

export const metaKeys = {
  categories: ["meta", "categories"] as const,
  countries: ["meta", "countries"] as const,
};

/** Categories, the detail fields each needs, labels and the picker order. Static; needs the record unlocked. */
export function useCategories(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: metaKeys.categories,
    // Also the unlock probe (useRecordAccess): it must reach the server, whose `private, max-age=3600` would otherwise
    // let the browser answer 200 from its own cache while the record is locked. The query layer keeps it an hour.
    queryFn: ({ signal }) => api.get<MetaCategories>("/v1/meta/categories", { signal, cache: "no-store" }),
    staleTime: staleTimes.hour,
    gcTime: staleTimes.hour,
    enabled: options.enabled ?? true,
  });
}

/** The countries POST /v1/onboarding/country accepts. Public, cached a day. */
export function useCountries(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: metaKeys.countries,
    queryFn: ({ signal }) => api.get<{ countries: Country[] }>("/v1/meta/countries", { signal }),
    select: (data) => data.countries,
    staleTime: staleTimes.day,
    gcTime: staleTimes.day,
    enabled: options.enabled ?? true,
  });
}
