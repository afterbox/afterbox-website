"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { forgetRegistration, setCurrentUser } from "@/lib/security/keychain";
import { disconnectRealtime } from "../realtime/client";

/** Clears everything held in memory for the member: the query cache and the realtime connection. */
export function endLocalSession(client: QueryClient) {
  disconnectRealtime();
  client.cancelQueries();
  client.clear();
  forgetRegistration();
  setCurrentUser(null);
}

/** Sign out. The device blob stays in this browser (behind the passkey); the next sign-in asks for the passkey. */
export function useSignOut() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/v1/auth/logout"),
    onSettled: () => endLocalSession(client),
  });
}
