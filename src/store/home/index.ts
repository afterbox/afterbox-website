"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Home } from "@/lib/api/types";
import { recordKeys } from "../queryKeys";
import { staleTimes } from "../queryClient";

export const homeKeys = { all: recordKeys.home };

/** Everything Home shows, in one call (U). */
export function useHome() {
  return useQuery({
    queryKey: recordKeys.home,
    queryFn: ({ signal }) => api.get<Home>("/v1/home", { signal }),
    staleTime: staleTimes.default,
  });
}
