"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";
import { saveBackupCode, unlockWithCode } from "@/lib/security/keychain";
import { meKeys } from "../me";
import { securityKeys } from "../security";
import { unlockKeys } from "../unlock";
import { signInMutation } from "../queryClient";

function backupSaved(client: ReturnType<typeof useQueryClient>, saved: boolean) {
  client.setQueryData<Me>(meKeys.all, (me) => (me ? { ...me, hasBackupCode: saved } : me));
  client.invalidateQueries({ queryKey: meKeys.all });
  client.invalidateQueries({ queryKey: securityKeys.all });
}

/** Makes the envelope for a code made in the browser (member part from the server; S: the client runs the passkey on 403). */
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
    ...signInMutation,
    mutationFn: ({ code, userId }: { code: string; userId: string }) => unlockWithCode(code, userId),
    onSuccess: (ok, { userId }) => {
      if (!ok) return;
      client.setQueryData(unlockKeys.device(userId), true);
      client.invalidateQueries();
    },
  });
}
