"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, seg } from "@/lib/api/client";
import type { AddFindReply, CategoryId, FindsList, Group, Home, Item, LeaveOutReason } from "@/lib/api/types";
import { invalidateFound, invalidateRecord, recordKeys } from "../queryKeys";
import { staleTimes } from "../queryClient";

/** Finds to review one at a time, in the "Add all" order. */
export function useFinds(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: recordKeys.finds,
    queryFn: ({ signal }) => api.get<FindsList>("/v1/finds", { signal }),
    staleTime: staleTimes.short,
    enabled: options.enabled ?? true,
  });
}

type Snapshot = { finds?: FindsList; home?: Home };

/** Takes a find off the review list (and Home's banner count) at once; the snapshot restores both on failure. */
async function removeFind(client: ReturnType<typeof useQueryClient>, id: string): Promise<Snapshot> {
  // Home isn't cancelled: an aborted /v1/home keeps running on the server (BACKEND_ISSUES.md); the refetch after
  // the mutation settles corrects any answer that lands in between.
  await client.cancelQueries({ queryKey: recordKeys.finds });
  const snapshot: Snapshot = {
    finds: client.getQueryData<FindsList>(recordKeys.finds),
    home: client.getQueryData<Home>(recordKeys.home),
  };
  client.setQueryData<FindsList>(recordKeys.finds, (list) => (list ? { ...list, finds: list.finds.filter((find) => find.id !== id) } : list));
  client.setQueryData<Home>(recordKeys.home, (home) =>
    home ? { ...home, newFinds: { ...home.newFinds, count: Math.max(0, home.newFinds.count - 1) } } : home,
  );
  return snapshot;
}

function restore(client: ReturnType<typeof useQueryClient>, snapshot: Snapshot | undefined) {
  if (snapshot?.finds) client.setQueryData(recordKeys.finds, snapshot.finds);
  if (snapshot?.home) client.setQueryData(recordKeys.home, snapshot.home);
}

/** "Yes, add it": optimistic, rolled back on failure (402 LIMIT_ITEMS shows the upgrade). */
export function useAddFind() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<AddFindReply>(`/v1/finds/${seg(id)}/add`),
    onMutate: (id) => removeFind(client, id),
    onError: (_, __, snapshot) => restore(client, snapshot),
    onSettled: () => {
      invalidateRecord(client);
      invalidateFound(client);
    },
  });
}

/** "Leave it out" with the reason the API requires: optimistic, rolled back on failure. */
export function useLeaveOutFind() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: LeaveOutReason }) =>
      api.post<{ next: Item | null }>(`/v1/finds/${seg(id)}/leave-out`, { reason }),
    onMutate: ({ id }) => removeFind(client, id),
    onError: (_, __, snapshot) => restore(client, snapshot),
    onSettled: () => {
      invalidateRecord(client);
      invalidateFound(client);
    },
  });
}

/** "Not right? Change category" on a find under review: optimistic, rolled back on failure. */
export function useChangeFindCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, category, group = null }: { id: string; category: CategoryId; group?: Group | null }) =>
      api.patch<{ item: Item }>(`/v1/finds/${seg(id)}/category`, group ? { category, group } : { category }),
    onMutate: async ({ id, category }) => {
      await client.cancelQueries({ queryKey: recordKeys.finds });
      const previous = client.getQueryData<FindsList>(recordKeys.finds);
      client.setQueryData<FindsList>(recordKeys.finds, (list) =>
        list ? { ...list, finds: list.finds.map((find) => (find.id === id ? { ...find, category } : find)) } : list,
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) client.setQueryData(recordKeys.finds, context.previous);
    },
    onSuccess: ({ item }) =>
      client.setQueryData<FindsList>(recordKeys.finds, (list) =>
        list ? { ...list, finds: list.finds.map((find) => (find.id === item.id ? item : find)) } : list,
      ),
    onSettled: () => {
      invalidateRecord(client);
      invalidateFound(client);
    },
  });
}
