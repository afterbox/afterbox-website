"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Me } from "@/lib/api/types";
import { lockRecord } from "@/lib/security/keychain";
import { meKeys } from "../me";
import { securityKeys } from "../security";
import { unlockKeys } from "../unlock";

/** "Lock my record": passkey, record key made and split in the browser, POST /v1/keys/setup, then unlock. */
export function useLockRecord() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (me: Pick<Me, "id">) => lockRecord(me.id),
    onSuccess: (_, me) => {
      client.setQueryData<Me>(meKeys.all, (current) => (current ? { ...current, keysReady: true } : current));
      client.setQueryData(unlockKeys.device(me.id), true);
      client.invalidateQueries({ queryKey: meKeys.all });
      client.invalidateQueries({ queryKey: securityKeys.all });
    },
  });
}
