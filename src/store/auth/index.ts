"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_URL, api } from "@/lib/api/client";
import type { AuthMode, VerifyResult } from "@/lib/api/types";
import { setCurrentUser } from "@/lib/security/keychain";
import { meKeys } from "../me";
import { setSignedOutOnPurpose } from "../sessions";

export function useStartEmail() {
  return useMutation({
    mutationFn: ({ email, mode }: { email: string; mode: AuthMode }) =>
      api.post<{ status: "sent" }>("/v1/auth/email/start", { email: email.trim(), mode }),
  });
}

export function useVerifyCode() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      api.post<VerifyResult>("/v1/auth/email/verify", { email: email.trim(), code }),
    onSuccess: ({ user }) => {
      // A different member may have used this tab before: start from an empty cache.
      client.clear();
      setSignedOutOnPurpose(false);
      setCurrentUser(user.id);
      client.setQueryData(meKeys.all, user);
    },
  });
}

/** Google sign-in is a full-page navigation, never fetch: the backend redirects back to /start, /home or /login. */
export const googleStartUrl = (mode: AuthMode) => `${API_URL}/v1/auth/google/start?mode=${mode}`;
