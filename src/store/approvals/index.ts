"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, seg } from "@/lib/api/client";
import type { Approval } from "@/lib/api/types";
import { collectApproval, requestApproval } from "@/lib/security/keychain";
import { deviceKeys } from "../devices";
import { securityKeys } from "../security";
import { unlockKeys } from "../unlock";
import { signInMutation } from "../queryClient";

export const approvalKeys = {
  one: (id: string) => ["approvals", id] as const,
};

/** The request, for either device. Polled on the new device while pending (the realtime event may be missed). */
export function useApproval(id: string | null, options: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: approvalKeys.one(id ?? "none"),
    queryFn: ({ signal }) => api.get<Approval>(`/v1/devices/approvals/${seg(id!)}`, { signal }),
    enabled: Boolean(id),
    staleTime: 0,
    refetchInterval: (query) => (options.poll && query.state.data?.status === "pending" ? 4000 : false),
  });
}

/** New device (06): a passkey on this session if needed, a relay key pair, then the request. Resolves the approval id. */
export function useRequestApproval() {
  return useMutation({ ...signInMutation, mutationFn: () => requestApproval() });
}

/** New device, once approved: collect the sealed blob, open it, keep it, unlock. */
export function useCollectApproval() {
  const client = useQueryClient();
  return useMutation({
    ...signInMutation,
    mutationFn: ({ approvalId, userId }: { approvalId: string; userId: string }) => collectApproval(approvalId, userId),
    onSuccess: (_, { userId }) => {
      client.setQueryData(unlockKeys.device(userId), true);
      client.invalidateQueries();
    },
  });
}

/** Old device (07): Approve (U + S; the client re-unlocks and runs the passkey as needed). */
export function useApproveDevice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (approvalId: string) => api.post(`/v1/devices/approvals/${seg(approvalId)}/approve`),
    onSuccess: (_, approvalId) => {
      client.invalidateQueries({ queryKey: approvalKeys.one(approvalId) });
      client.invalidateQueries({ queryKey: securityKeys.all });
      client.invalidateQueries({ queryKey: deviceKeys.all });
    },
  });
}

/** Old device (07): "This wasn't me" blocks the request and removes the asking device. */
export function useDeclineDevice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (approvalId: string) => api.post(`/v1/devices/approvals/${seg(approvalId)}/decline`),
    onSuccess: (_, approvalId) => {
      client.invalidateQueries({ queryKey: approvalKeys.one(approvalId) });
      client.invalidateQueries({ queryKey: securityKeys.all });
    },
  });
}
