"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { SecurityOverview } from "@/lib/api/types";
import { staleTimes } from "../queryClient";

export const securityKeys = {
  all: ["security"] as const,
  overview: ["security", "overview"] as const,
};

/** Devices, backup code on/off and the trusted person (name only while unlocked). Never 423. */
export function useSecurityOverview() {
  return useQuery({
    queryKey: securityKeys.overview,
    queryFn: ({ signal }) => api.get<SecurityOverview>("/v1/security/overview", { signal }),
    staleTime: staleTimes.default,
  });
}
