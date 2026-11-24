"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Me } from "@/lib/api/types";
import { lockRecord } from "@/lib/security/keychain";
import { meKeys } from "../me";
import { signInMutation } from "../queryClient";
import { invalidateAfterReseal } from "../queryKeys";
import { securityKeys } from "../security";
import { unlockKeys } from "../unlock";

/**
 * "Lock my record": passkey, record key made and split in the browser, POST /v1/keys/setup, then unlock. The setup
 * request re-seals the finds and turns the accepted ones into items, so once it answers Home, the record and the
 * finds are refreshed (anything cached from before locking is out of date) before the member moves on.
 */
export function useLockRecord() {
  const client = useQueryClient();
  return useMutation({
    ...signInMutation,
    mutationFn: (me: Pick<Me, "id">) => lockRecord(me.id),
    onSuccess: (_, me) => {
      client.setQueryData<Me>(meKeys.all, (current) => (current ? { ...current, keysReady: true } : current));
      client.setQueryData(unlockKeys.device(me.id), true);
      client.invalidateQueries({ queryKey: meKeys.all });
      client.invalidateQueries({ queryKey: securityKeys.all });
      void invalidateAfterReseal(client);
    },
  });
}
