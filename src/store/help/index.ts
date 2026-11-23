"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, seg } from "@/lib/api/client";
import type { HelpRequest } from "@/lib/api/types";
import { collectHelp, dropRelay, requestHelp } from "@/lib/security/keychain";
import { recoveryKeys } from "../recovery";
import { unlockKeys } from "../unlock";

export const helpKeys = {
  one: (id: string) => ["help", id] as const,
};

/** The request: for the member's waiting screen (polled) and the trusted person's sheet. Never 423. */
export function useHelpRequest(id: string | null, options: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: helpKeys.one(id ?? "none"),
    queryFn: ({ signal }) => api.get<HelpRequest>(`/v1/recovery/help-requests/${seg(id!)}`, { signal }),
    enabled: Boolean(id),
    staleTime: 0,
    refetchInterval: (query) => {
      if (!options.poll) return false;
      const status = query.state.data?.status;
      return status === "pending" || status === "approved" ? 15_000 : false;
    },
  });
}

/** New device (10): passkey on this session, a relay key pair kept in the vault, then the request. Resolves the id. */
export function useRequestHelp() {
  return useMutation({ mutationFn: () => requestHelp() });
}

/** New device, after the cooling-off hour: collect, open, keep the blob, unlock. */
export function useCollectHelp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, userId }: { requestId: string; userId: string }) => collectHelp(requestId, userId),
    onSuccess: (_, { userId }) => {
      client.setQueryData(unlockKeys.device(userId), true);
      client.setQueryData(recoveryKeys.canMakeCode(userId), false);
      client.invalidateQueries();
    },
  });
}

/** Trusted person (12): approve (U + S). Answers when the member can collect. */
export function useApproveHelp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => api.post<{ collectableAt: string }>(`/v1/recovery/help-requests/${seg(requestId)}/approve`),
    onSuccess: (_, requestId) => client.invalidateQueries({ queryKey: helpKeys.one(requestId) }),
  });
}

/** Trusted person (12): "I don't know about this". */
export function useDeclineHelp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => api.post(`/v1/recovery/help-requests/${seg(requestId)}/decline`),
    onSuccess: (_, requestId) => client.invalidateQueries({ queryKey: helpKeys.one(requestId) }),
  });
}

/** "This wasn't me": signed in (no body) or from the email link (with its token). */
export function useCancelHelp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, token }: { requestId: string; token?: string }) =>
      api.post(`/v1/recovery/help-requests/${seg(requestId)}/cancel`, token ? { token } : undefined),
    onSuccess: (_, { requestId }) => client.invalidateQueries({ queryKey: helpKeys.one(requestId) }),
  });
}

/** The asking device's own cancel (its request ended): forget the relay key. */
export function useForgetHelpRequest() {
  return useMutation({ mutationFn: (requestId: string) => dropRelay("help", requestId) });
}
