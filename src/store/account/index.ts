"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Account, AccountPatch } from "@/lib/api/types";
import { forgetEverything } from "@/lib/security/keychain";
import { meKeys } from "../me";
import { staleTimes } from "../queryClient";
import { endLocalSession } from "../sessions";

export const accountKeys = { all: ["account"] as const };

export function useAccount() {
  return useQuery({
    queryKey: accountKeys.all,
    queryFn: ({ signal }) => api.get<Account>("/v1/account", { signal }),
    staleTime: staleTimes.settings,
  });
}

/** Only the fields that changed (`""` clears one). A refused field answers 400 with `details.field`. */
export function useUpdateAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: AccountPatch) => api.patch<Account>("/v1/account", patch),
    onSuccess: (account, patch) => {
      client.setQueryData(accountKeys.all, account);
      if ("homeCurrency" in patch) client.invalidateQueries();
      else client.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}

/** Delete my account (S). 204 clears the cookies; then nothing of the member stays in this browser. */
export function useDeleteAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/v1/account"),
    onSuccess: async () => {
      await forgetEverything();
      endLocalSession(client);
    },
  });
}

/** The JSON export (U + S), saved as a file. Never kept in the query cache. */
export function useExportAccount() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<Response>("/v1/account/export", undefined, { raw: true });
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `afterbox-export-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement("a"), { href: url, download: name });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return name;
    },
  });
}
