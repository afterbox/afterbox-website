"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, seg } from "@/lib/api/client";
import type { Invite } from "@/lib/api/types";
import { meKeys } from "../me";

export const inviteKeys = { one: (token: string) => ["invites", token] as const };

/** The invite page (public). */
export function useInvite(token: string) {
  return useQuery({
    queryKey: inviteKeys.one(token),
    queryFn: ({ signal }) => api.get<Invite>(`/v1/invites/${seg(token)}`, { signal }),
    staleTime: 0,
  });
}

/** Signed in as the invited email, with your own record locked (409 KEYS_REQUIRED otherwise). */
export function useAcceptInvite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => api.post<Invite>(`/v1/invites/${seg(token)}/accept`),
    onSuccess: (invite, token) => {
      client.setQueryData(inviteKeys.one(token), invite);
      client.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}
