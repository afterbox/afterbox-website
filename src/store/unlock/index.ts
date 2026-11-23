"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { UnlockRequiredError } from "@/lib/api/errors";
import type { Me, UnlockOptions } from "@/lib/api/types";
import { findOpenRequest, hasDeviceBlob, unlockWithPasskey } from "@/lib/security/keychain";
import { metaKeys, useCategories } from "../meta";
import { staleTimes } from "../queryClient";

export const unlockKeys = {
  options: ["unlock", "options"] as const,
  /** Whether this browser holds a device blob for the member. Local only: nothing from the record. */
  device: (userId: string | undefined) => ["unlock", "device", userId ?? "none"] as const,
};

/** The ways in other than this device: other devices, the backup code, a trusted person (never named). */
export function useUnlockOptions(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: unlockKeys.options,
    queryFn: ({ signal }) => api.get<UnlockOptions>("/v1/unlock/options", { signal }),
    staleTime: staleTimes.live,
    enabled: options.enabled ?? true,
  });
}

export function useDeviceBlob(userId: string | undefined) {
  return useQuery({
    queryKey: unlockKeys.device(userId),
    queryFn: () => hasDeviceBlob(userId),
    enabled: Boolean(userId),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}

export type RecordAccess = "loading" | "open" | "unlock" | "new-device" | "secure";

/**
 * Where a signed-in member may go. No keys yet: onboarding. Keys but no blob here: a new device. A blob: the record
 * is opened with a cheap U request (the categories, needed anyway); the client's silent re-unlock runs on 423, and a
 * fresh sign-in that can't unlock silently lands on "unlock" (the passkey on screen 04).
 */
export function useRecordAccess(me: Me | undefined): RecordAccess {
  const blob = useDeviceBlob(me?.keysReady ? me.id : undefined);
  const probe = useCategories({ enabled: blob.data === true });
  if (!me) return "loading";
  if (!me.keysReady) return "secure";
  if (blob.isPending) return "loading";
  if (!blob.data) return "new-device";
  if (probe.data) return "open";
  if (probe.error instanceof UnlockRequiredError) return "unlock";
  if (probe.error) return "unlock";
  return "loading";
}

/** Screen 04: passkey, then the stored blob. */
export function useUnlockWithPasskey() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (me: Pick<Me, "id">) => unlockWithPasskey(me.id),
    onSuccess: () => {
      client.resetQueries({ queryKey: metaKeys.categories });
      client.invalidateQueries();
    },
    onError: (_, me) => client.invalidateQueries({ queryKey: unlockKeys.device(me.id) }),
  });
}

/** A device approval or help request this browser opened and hasn't finished (its relay key is still in the vault). */
export function useOpenRequest(userId: string | undefined) {
  return useQuery({
    queryKey: ["unlock", "open-request", userId ?? "none"] as const,
    queryFn: () => findOpenRequest(userId),
    enabled: Boolean(userId),
    staleTime: 0,
    retry: false,
  });
}
