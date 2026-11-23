"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";
import { hasMemberPart, saveBackupCode, unlockWithCode } from "@/lib/security/keychain";
import { meKeys } from "../me";
import { securityKeys } from "../security";
import { unlockKeys } from "../unlock";

export const recoveryKeys = {
  canMakeCode: (userId: string | undefined) => ["recovery", "can-make-code", userId ?? "none"] as const,
};

/** Whether this device can make a backup code (it holds the member part: it locked the record or used a code). */
export function useCanMakeBackupCode(userId: string | undefined) {
  return useQuery({
    queryKey: recoveryKeys.canMakeCode(userId),
    queryFn: () => hasMemberPart(userId),
    enabled: Boolean(userId),
    staleTime: Infinity,
  });
}

function backupSaved(client: ReturnType<typeof useQueryClient>, saved: boolean) {
  client.setQueryData<Me>(meKeys.all, (me) => (me ? { ...me, hasBackupCode: saved } : me));
  client.invalidateQueries({ queryKey: meKeys.all });
  client.invalidateQueries({ queryKey: securityKeys.all });
}

/** Stores the envelope for a code made in the browser (S: the client runs the passkey on 403). */
export function useSaveBackupCode() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => saveBackupCode(code),
    onSuccess: () => backupSaved(client, true),
  });
}

export function useRemoveBackupCode() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/v1/recovery/envelope"),
    onSuccess: () => backupSaved(client, false),
  });
}

/** New device (09): open the envelope with the code, enrol, keep the blob, unlock. Resolves false for a wrong code. */
export function useUnlockWithCode() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ code, userId }: { code: string; userId: string }) => unlockWithCode(code, userId),
    onSuccess: (ok, { userId }) => {
      if (!ok) return;
      client.setQueryData(unlockKeys.device(userId), true);
      client.setQueryData(recoveryKeys.canMakeCode(userId), true);
      client.invalidateQueries();
    },
  });
}
