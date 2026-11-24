"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { confirmPasskey, registerPasskey } from "@/lib/security/keychain";
import { securityKeys } from "../security";
import { signInMutation } from "../queryClient";

/** Adds a passkey on this device (a device that can't open the record yet). */
export function useRegisterPasskey() {
  const client = useQueryClient();
  return useMutation({
    ...signInMutation,
    mutationFn: () => registerPasskey(),
    onSuccess: () => client.invalidateQueries({ queryKey: securityKeys.all }),
  });
}

/** The passkey confirmation (step-up). Most screens never call it: the API client runs it on 403 STEP_UP_REQUIRED. */
export function useConfirmPasskey() {
  return useMutation({ ...signInMutation, mutationFn: () => confirmPasskey() });
}
