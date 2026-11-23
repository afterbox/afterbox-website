/** Reading an Item from the API for display. */

import type { Item } from "@/lib/api/types";
import { everyWord, formatMoney, formatValue } from "@/lib/money";

export const itemTitle = (item: Pick<Item, "provider" | "name">) => item.provider ?? item.name;

/**
 * The company itself, for sentences about it ("Cancel Lebara", "You also pay Lebara for …"): a merchant's second
 * regular payment comes as "Lebara (second payment)" (third, fourth …), which titles show as sent.
 */
export const merchantName = (provider: string) => provider.replace(/\s*\((?:[a-z]+|\d+(?:st|nd|rd|th)) payment\)\s*$/i, "") || provider;

/** "£24.10 a month", "£300.00 a year", "£180,000" (things owned show their value). */
export function itemAmount(item: Pick<Item, "kind" | "value" | "amount" | "frequency">) {
  if (item.kind === "own") return item.value ? formatValue(item.value) : null;
  if (!item.amount || !item.frequency) return null;
  return `${formatMoney(item.amount)} ${everyWord[item.frequency]}`;
}

export const needsDetails = (item: Item) => !item.complete && !item.cancelled;
