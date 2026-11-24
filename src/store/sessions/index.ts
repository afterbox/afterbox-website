"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { forgetRegistration, setCurrentUser } from "@/lib/security/keychain";
import { disconnectRealtime } from "../realtime/client";
import { signInMutation } from "../queryClient";

/** Clears everything held in memory for the member: the query cache and the realtime connection. */
export function endLocalSession(client: QueryClient) {
  disconnectRealtime();
  client.cancelQueries();
  client.clear();
  forgetRegistration();
  setCurrentUser(null);
}

let leftOnPurpose = false;

/**
 * True after Log out or Delete account in this tab, until the next sign-in: /login then carries no `next`
 * (a session that simply ended keeps the page it was on, to come back to after signing in).
 */
export const signedOutOnPurpose = () => leftOnPurpose;
export function setSignedOutOnPurpose(value: boolean) {
  leftOnPurpose = value;
}

/** Sign out. The device blob stays in this browser (behind the passkey); the next sign-in asks for the passkey. */
export function useSignOut() {
  const client = useQueryClient();
  return useMutation({
    ...signInMutation,
    mutationFn: () => {
      setSignedOutOnPurpose(true);
      return api.post("/v1/auth/logout");
    },
    onSettled: () => endLocalSession(client),
  });
}
