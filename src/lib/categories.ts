/**
 * The nine categories as the API names them (GET /v1/meta/categories). Screens use this for labels, icons and
 * nouns, so they also work before the record is unlocked (onboarding). An id the frontend doesn't know falls back
 * to the "Something else" look rather than crashing (INTEGRATION.md "Bills").
 */

import type { CategoryIcon, CategoryId, DetailField, Group, GroupIcon, Kind } from "@/lib/api/types";

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

/* Worth-a-look groups (PATCH /v1/finds/:id/category and /v1/items/:id/category). The API never sends a group back. */

export type GroupInfo = {
  id: Group;
  /** The categories it fits: a group sent with any other answers 400 VALIDATION. */
  categories: CategoryId[];
  label: string;
  /** "2 union memberships" */
  plural: string;
  icon: GroupIcon;
  /** When a screen lists several. */
  lead?: string;
  /** Regular giving: never suggest cancelling it or what it would save. */
  giving?: true;
};

export const groups: GroupInfo[] = [
  { id: "home-insurance", categories: ["insurance"], label: "Home insurance", plural: "home insurance policies", icon: "home" },
  { id: "car-insurance", categories: ["insurance"], label: "Car insurance", plural: "car insurance policies", icon: "car" },
  { id: "breakdown", categories: ["insurance", "subscriptions"], label: "Breakdown cover", plural: "breakdown covers", icon: "wrench" },
  { id: "phone", categories: ["subscriptions"], label: "Phone plan", plural: "phone plans", icon: "phone" },
  { id: "broadband", categories: ["subscriptions"], label: "Broadband", plural: "broadband plans", icon: "wifi" },
  { id: "streaming", categories: ["subscriptions"], label: "Streaming", plural: "streaming services", icon: "play" },
  { id: "music", categories: ["subscriptions"], label: "Music", plural: "music services", icon: "music" },
  { id: "cloud-storage", categories: ["subscriptions"], label: "Cloud storage", plural: "cloud storage plans", icon: "cloud" },
  { id: "gym", categories: ["subscriptions"], label: "Gym", plural: "gym memberships", icon: "dumbbell" },
  { id: "union", categories: ["subscriptions"], label: "Union membership", plural: "union memberships", icon: "handshake" },
  {
    id: "charity",
    categories: ["subscriptions"],
    label: "Charity",
    plural: "regular donations",
    icon: "heart-hand",
    lead: "Each goes to a charity you chose to support.",
    giving: true,
  },
  { id: "yearly-renewal", categories: ["bills"], label: "Yearly renewal", plural: "yearly renewals", icon: "calendar-repeat" },
  { id: "rental-income", categories: ["property"], label: "Rental income", plural: "rental incomes", icon: "home-key" },
];

const groupById = new Map(groups.map((group) => [group.id, group]));

/** A group the frontend doesn't know yet is null: screens show the category alone. */
export const groupInfo = (id: string | null | undefined): GroupInfo | null => (id ? (groupById.get(id as Group) ?? null) : null);

/** The groups that fit a category, in the table's order. */
export const groupsFor = (category: CategoryId) => groups.filter((group) => group.categories.includes(category));

/** The group's label where it adds something: not when the thing is already named after it ("Union membership"). */
export function groupLabelFor(thing: { group?: string | null; name: string }): string | null {
  const group = groupInfo(thing.group);
  return group && group.label.toLowerCase() !== thing.name.trim().toLowerCase() ? group.label : null;
}

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
