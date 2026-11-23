"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, seg } from "@/lib/api/client";
import type {
  CategoryId,
  CategoryView,
  DetailField,
  Group,
  Item,
  ItemReply,
  ItemView,
  Money,
  NewItemBody,
  RecordFilter,
  RecordView,
} from "@/lib/api/types";
import { invalidateFound, invalidateRecord, recordKeys } from "../queryKeys";
import { staleTimes } from "../queryClient";

/** The Record screen: items and finds under review, by category. The filter keeps the last list on screen while it loads. */
export function useRecord(filter: RecordFilter = "all") {
  return useQuery({
    queryKey: recordKeys.recordList(filter),
    queryFn: ({ signal }) => api.get<RecordView>(`/v1/record?filter=${filter}`, { signal }),
    staleTime: staleTimes.default,
    placeholderData: keepPreviousData,
  });
}

export function useCategoryView(id: CategoryId | string) {
  return useQuery({
    queryKey: recordKeys.category(id),
    queryFn: ({ signal }) => api.get<CategoryView>(`/v1/record/${seg(id)}`, { signal }),
    staleTime: staleTimes.default,
  });
}

export function useItem(id: string, options: { enabled?: boolean } = {}) {
  const client = useQueryClient();
  return useQuery<ItemView>({
    queryKey: recordKeys.item(id),
    enabled: (options.enabled ?? true) && Boolean(id),
    queryFn: ({ signal }) => api.get<ItemView>(`/v1/items/${seg(id)}`, { signal }),
    staleTime: staleTimes.default,
    // The item's row is already in a category or record list: show it while the rest loads.
    placeholderData: (): ItemView | undefined => {
      for (const [, view] of client.getQueriesData<CategoryView>({ queryKey: ["record", "category"] })) {
        const item = view?.items.find((candidate) => candidate.id === id);
        if (item && view) return { item, fields: view.category.fields, twin: null, person: null, documents: [] };
      }
      return undefined;
    },
  });
}

/** Prefetch on intent (hover, focus, a likely next tap). */
export function usePrefetchItem() {
  const client = useQueryClient();
  return (id: string) =>
    client.prefetchQuery({
      queryKey: recordKeys.item(id),
      queryFn: ({ signal }) => api.get<ItemView>(`/v1/items/${seg(id)}`, { signal }),
      staleTime: staleTimes.default,
    });
}

export function usePrefetchCategory() {
  const client = useQueryClient();
  return (id: string) =>
    client.prefetchQuery({
      queryKey: recordKeys.category(id),
      queryFn: ({ signal }) => api.get<CategoryView>(`/v1/record/${seg(id)}`, { signal }),
      staleTime: staleTimes.default,
    });
}

function patchItem(client: ReturnType<typeof useQueryClient>, item: Item) {
  client.setQueryData<ItemView>(recordKeys.item(item.id), (view) => (view ? { ...view, item } : view));
}

/** "Type it in". Needs `frequency` for things paid for; amounts as `{minor}` (currency defaults to homeCurrency). */
export function useAddItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: NewItemBody) => api.post<ItemReply>("/v1/items", body),
    onSuccess: () => invalidateRecord(client),
  });
}

/** Saving details: `""` clears a field. The server works out `complete` again. */
export function useSaveDetails() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, details }: { id: string; details: Partial<Record<DetailField, string>> }) =>
      api.patch<{ item: Item }>(`/v1/items/${seg(id)}/details`, { details }),
    onSuccess: ({ item }) => {
      patchItem(client, item);
      invalidateRecord(client);
    },
  });
}

/** Moves an item to another category at once; back if the API refuses. */
export function useChangeItemCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, category, group = null }: { id: string; category: CategoryId; group?: Group | null }) =>
      api.patch<{ item: Item }>(`/v1/items/${seg(id)}/category`, group ? { category, group } : { category }),
    onMutate: async ({ id, category }) => {
      await client.cancelQueries({ queryKey: recordKeys.item(id) });
      const previous = client.getQueryData<ItemView>(recordKeys.item(id));
      client.setQueryData<ItemView>(recordKeys.item(id), (view) => (view ? { ...view, item: { ...view.item, category } } : view));
      return { previous };
    },
    onError: (_, { id }, context) => {
      if (context?.previous) client.setQueryData(recordKeys.item(id), context.previous);
    },
    onSuccess: ({ item }) => patchItem(client, item),
    onSettled: () => {
      invalidateRecord(client);
      invalidateFound(client);
    },
  });
}

/** "I've cancelled it" from the record. */
export function useMarkItemCancelled() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ item: Item; monthlySaving: Money }>(`/v1/items/${seg(id)}/cancelled`),
    onSuccess: ({ item }) => {
      patchItem(client, item);
      invalidateRecord(client);
      invalidateFound(client);
    },
  });
}

export function useDeleteItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/items/${seg(id)}`),
    onSuccess: (_, id) => {
      client.removeQueries({ queryKey: recordKeys.item(id) });
      invalidateRecord(client);
    },
  });
}
