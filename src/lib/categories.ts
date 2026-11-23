/**
 * The nine categories as the API names them (GET /v1/meta/categories). Screens use this for labels, icons and
 * nouns, so they also work before the record is unlocked (onboarding). An id the frontend doesn't know falls back
 * to the "Something else" look rather than crashing (INTEGRATION.md "Bills").
 */

import type { CategoryIcon, CategoryId, DetailField, Kind } from "@/lib/api/types";

export type CategoryInfo = {
  id: CategoryId;
  label: string;
  icon: CategoryIcon;
  kind: Kind;
  fields: DetailField[];
  /** "3 policies" */
  unit: [singular: string, plural: string];
};

const all: CategoryInfo[] = [
  { id: "insurance", label: "Insurance", icon: "umbrella", kind: "pay", fields: ["policyNumber", "covers"], unit: ["policy", "policies"] },
  { id: "investments", label: "Investments", icon: "trend", kind: "own", fields: ["accountNumber"], unit: ["investment", "investments"] },
  { id: "property", label: "Property", icon: "home", kind: "own", fields: ["address"], unit: ["property", "properties"] },
  { id: "pensions", label: "Pensions", icon: "lock", kind: "pay", fields: ["policyNumber"], unit: ["pension", "pensions"] },
  { id: "savings", label: "Savings", icon: "card", kind: "own", fields: ["accountNumber"], unit: ["account", "accounts"] },
  { id: "subscriptions", label: "Subscriptions", icon: "repeat", kind: "pay", fields: [], unit: ["subscription", "subscriptions"] },
  { id: "bills", label: "Bills", icon: "receipt", kind: "pay", fields: [], unit: ["bill", "bills"] },
  { id: "bank-accounts", label: "Bank accounts", icon: "bank", kind: "own", fields: ["accountNumber"], unit: ["account", "accounts"] },
  { id: "other", label: "Something else", icon: "document", kind: "own", fields: [], unit: ["thing", "things"] },
];

const byId = new Map(all.map((category) => [category.id, category]));

/** The API's picker order (pickerOrder), used until /meta/categories has loaded. */
export const pickerOrder: CategoryId[] = ["property", "insurance", "pensions", "investments", "savings", "bank-accounts", "subscriptions", "bills", "other"];

export function categoryInfo(id: string): CategoryInfo {
  return byId.get(id as CategoryId) ?? { ...byId.get("other")!, id: id as CategoryId };
}

export const isCategoryId = (id: string): id is CategoryId => byId.has(id as CategoryId);

export const categories = all;

export const fieldLabels: Record<DetailField, string> = {
  policyNumber: "Policy number",
  covers: "Covers",
  address: "Address",
  renews: "Renews",
  accountNumber: "Account number",
};

/* Typing it in: a first guess at the category from the name (the member can change it). */

const guesses: { pattern: RegExp; category: CategoryId; subtype?: string }[] = [
  { pattern: /\blife\b.*\b(insurance|cover|policy)\b|\blife cover\b/, category: "insurance", subtype: "Life cover" },
  { pattern: /\b(home|house|contents|buildings)\b.*\b(insurance|cover|policy)\b/, category: "insurance", subtype: "Home insurance" },
  { pattern: /\b(car|motor|van)\b.*\b(insurance|cover|policy)\b/, category: "insurance", subtype: "Car insurance" },
  { pattern: /\bpet\b.*\b(insurance|cover|policy)\b/, category: "insurance", subtype: "Pet insurance" },
  { pattern: /\btravel\b.*\b(insurance|cover|policy)\b/, category: "insurance", subtype: "Travel insurance" },
  { pattern: /\b(insurance|insurer|cover|policy|warranty)\b/, category: "insurance" },
  { pattern: /\b(pension|sipp|annuity|retirement)\b/, category: "pensions" },
  { pattern: /\b(flat|house|home|apartment|cottage|bungalow|property|land|plot|maisonette)\b/, category: "property", subtype: "Home" },
  { pattern: /\b(mortgage)\b/, category: "property", subtype: "Mortgage" },
  { pattern: /\b(isa|shares|stocks|fund|funds|invest\w*|crypto|bitcoin|portfolio|trading)\b/, category: "investments" },
  { pattern: /\b(saver|savings|bonds?|deposit)\b/, category: "savings" },
  { pattern: /\b(council tax|water|energy|electric\w*|gas|tv licen[cs]e|car finance|loan|credit card|childcare|student loan)\b/, category: "bills" },
  { pattern: /\b(bank|current account|account)\b/, category: "bank-accounts" },
  {
    pattern: /\b(netflix|spotify|disney|prime|youtube|apple|subscription|membership|gym|phone|broadband|mobile|sky|tv)\b/,
    category: "subscriptions",
  },
];

export function guessCategory(name: string): { category: CategoryId; subtype: string | null } | null {
  const text = name.toLowerCase().trim();
  if (text.length < 2) return null;
  const match = guesses.find((guess) => guess.pattern.test(text));
  return match ? { category: match.category, subtype: match.subtype ?? null } : { category: "other", subtype: null };
}

export const relations = ["Partner", "Husband", "Wife", "Child", "Parent", "Brother", "Sister", "Friend", "Other"] as const;

export const frequencies: { id: import("@/lib/api/types").Frequency; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "weekly", label: "Weekly" },
  { id: "four-weekly", label: "Every 4 weeks" },
];
