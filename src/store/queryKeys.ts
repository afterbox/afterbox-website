/**
 * Query keys for the record, in one place so invalidations stay precise and every area agrees.
 * (Areas with no dependants keep their keys next to their hooks.)
 */

import type { QueryClient } from "@tanstack/react-query";
import type { CategoryId, RecordFilter } from "@/lib/api/types";

export const recordKeys = {
  home: ["home"] as const,
  record: ["record"] as const,
  recordList: (filter: RecordFilter) => ["record", "list", filter] as const,
  category: (id: CategoryId | string) => ["record", "category", id] as const,
  items: ["items"] as const,
  item: (id: string) => ["items", id] as const,
  finds: ["finds"] as const,
  found: ["onboarding", "found"] as const,
  foundCategory: (id: string) => ["onboarding", "found", id] as const,
  flags: ["flags"] as const,
  flag: (id: string) => ["flags", id] as const,
  banks: ["banks"] as const,
  bank: (id: string) => ["banks", id] as const,
  people: ["people"] as const,
};

/**
 * Totals per category move whenever something is added, left out, recategorised, cancelled or deleted.
 * Home is refreshed without cancelling a request already on its way: the backend can hang on two concurrent
 * /v1/home calls for one member (BACKEND_ISSUES.md), and an aborted fetch keeps running on the server.
 */
export function invalidateRecord(client: QueryClient) {
  client.invalidateQueries({ queryKey: recordKeys.home }, { cancelRefetch: false });
  client.invalidateQueries({ queryKey: recordKeys.record });
  client.invalidateQueries({ queryKey: recordKeys.items });
  client.invalidateQueries({ queryKey: recordKeys.finds });
}

/** The found screens (onboarding) and their flags. */
export function invalidateFound(client: QueryClient) {
  client.invalidateQueries({ queryKey: recordKeys.found });
  client.invalidateQueries({ queryKey: recordKeys.flags });
}
