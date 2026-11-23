"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, seg } from "@/lib/api/client";
import type { Bank, BankDetail, DisconnectReply, Progress, Provider } from "@/lib/api/types";
import { invalidateFound, invalidateRecord, recordKeys } from "../queryKeys";
import { staleTimes } from "../queryClient";

export const bankKeys = {
  all: recordKeys.banks,
  one: recordKeys.bank,
  providers: ["banks", "providers"] as const,
  progress: (connectionId: string) => ["banks", "progress", connectionId] as const,
};

export function useBanks() {
  return useQuery({
    queryKey: bankKeys.all,
    queryFn: ({ signal }) => api.get<Bank[]>("/v1/banks", { signal }),
    staleTime: staleTimes.minute,
  });
}

export function useBank(id: string) {
  return useQuery({
    queryKey: bankKeys.one(id),
    queryFn: ({ signal }) => api.get<BankDetail>(`/v1/banks/${seg(id)}`, { signal }),
    staleTime: staleTimes.minute,
  });
}

/** The bank picker. An empty list means Tink's list was unavailable: link without a providerId. */
export function useProviders() {
  return useQuery({
    queryKey: bankKeys.providers,
    queryFn: ({ signal }) => api.get<{ providers: Provider[] }>("/v1/banks/providers", { signal }),
    select: (data) => data.providers,
    staleTime: staleTimes.hour,
  });
}

/* Across the Tink redirect: only where to come back to (never record data). */

const RETURN_KEY = "afterbox.tink-return";
export type TinkReturn = { kind: "connect"; another: boolean } | { kind: "renew"; bankId: string };

export function rememberTinkReturn(value: TinkReturn) {
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify(value));
  } catch {
    // Without it the callback falls back to the reading screen.
  }
}

export function takeTinkReturn(): TinkReturn | null {
  try {
    const saved = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return saved ? (JSON.parse(saved) as TinkReturn) : null;
  } catch {
    return null;
  }
}

/** POST /v1/banks/link: the backend builds the Tink Link URL. The caller sends the browser there. */
export function useLinkBank() {
  return useMutation({
    mutationFn: async ({ providerId, another = false }: { providerId?: string; another?: boolean }) => {
      const body: Record<string, unknown> = {};
      if (providerId) body.providerId = providerId;
      if (another) body.another = true;
      const { url } = await api.post<{ url: string }>("/v1/banks/link", body);
      rememberTinkReturn({ kind: "connect", another });
      return url;
    },
  });
}

/** Back from Tink: `{state, credentialsId}` only (never `code`). */
export function useBankCallback() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { state: string; credentialsId: string }) => api.post<{ connectionId: string }>("/v1/banks/callback", body),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: bankKeys.all });
      invalidateFound(client);
    },
  });
}

/** The reading screen. Called on open and on every realtime reconnect; polls while reading as a fallback. */
export function useProgress(connectionId: string | null, options: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: bankKeys.progress(connectionId ?? "none"),
    queryFn: ({ signal }) => api.get<Progress>(`/v1/banks/connections/${seg(connectionId!)}/progress`, { signal }),
    enabled: Boolean(connectionId),
    staleTime: 0,
    refetchInterval: (query) => (options.poll !== false && query.state.data?.status === "reading" ? 5000 : false),
  });
}

/** Renew or rescan: POST /v1/banks/:id/renew → Tink. Remembers the bank to come back to. */
export function useRenewBank() {
  return useMutation({
    mutationFn: async (bankId: string) => {
      const { url } = await api.post<{ url: string }>(`/v1/banks/${seg(bankId)}/renew`);
      rememberTinkReturn({ kind: "renew", bankId });
      return url;
    },
  });
}

/** Disconnect (S). 503 means Tink couldn't be reached and nothing changed. */
export function useDisconnectBank() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (bankId: string) => api.post<DisconnectReply>(`/v1/banks/${seg(bankId)}/disconnect`),
    onSuccess: (_, bankId) => {
      client.setQueryData<Bank[]>(bankKeys.all, (banks) => banks?.filter((bank) => bank.id !== bankId));
      client.removeQueries({ queryKey: bankKeys.one(bankId) });
      client.invalidateQueries({ queryKey: bankKeys.all });
      invalidateRecord(client);
      invalidateFound(client);
    },
  });
}
