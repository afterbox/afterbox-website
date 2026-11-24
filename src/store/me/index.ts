"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";
import { setDemoMode } from "@/lib/api/errors";
import { setCurrentUser } from "@/lib/security/keychain";
import { staleTimes } from "../queryClient";

export const meKeys = {
  all: ["me"] as const,
};

/** Also tells the keychain who's signed in, before anything else can ask it (the vault is per member). */
export async function fetchMe(signal?: AbortSignal) {
  const me = await api.get<Me>("/v1/me", { signal });
  setCurrentUser(me.id);
  setDemoMode(me.demo === true);
  return me;
}

/** Demo mode: no plan limits, upgrade prompts or billing, and a "Demo" badge on the account. */
export function useIsDemo() {
  return useMe().data?.demo === true;
}

/** The signed-in member. `error.status === 401` means signed out. */
export function useMe(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: meKeys.all,
    queryFn: ({ signal }) => fetchMe(signal),
    staleTime: staleTimes.default,
    enabled: options.enabled ?? true,
  });
}
