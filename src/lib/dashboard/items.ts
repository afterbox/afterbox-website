/** Reading an Item from the API for display. */

import type { Item } from "@/lib/api/types";
import { everyWord, formatMoney, formatValue } from "@/lib/money";

export const itemTitle = (item: Pick<Item, "provider" | "name">) => item.provider ?? item.name;

/** "£24.10 a month", "£300.00 a year", "£180,000" (things owned show their value). */
export function itemAmount(item: Pick<Item, "kind" | "value" | "amount" | "frequency">) {
  if (item.kind === "own") return item.value ? formatValue(item.value) : null;
  if (!item.amount || !item.frequency) return null;
  return `${formatMoney(item.amount)} ${everyWord[item.frequency]}`;
}

export const needsDetails = (item: Item) => !item.complete && !item.cancelled;
