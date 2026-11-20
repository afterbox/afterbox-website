"use client";

import { onboardingActions } from "@/lib/onboarding/store";
import { daysUntil, DAY, formatList, formatPence } from "./format";
import {
  categoryRank,
  detailFields,
  getCategories,
  getCategory,
  scannedNewItem,
  type CategoryId,
  type DashboardState,
  type DashEvent,
  type DetailField,
  type Frequency,
  type Item,
  type Kind,
  type Person,
} from "./mock";
import { dashboardStore, mockFlags, update } from "./store";

export class MockApiError extends Error {}

export const MOCK_ERROR = "Something went wrong. Try again.";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Stands in for the backend: 600–1200ms (3s with ?mock=slow); ?mock=fail fails the next call. */
export async function mockApi<T>(fn: () => T): Promise<T> {
  const { slow } = mockFlags.get();
  await wait(slow ? 3000 : 600 + Math.random() * 600);
  if (mockFlags.get().fail) {
    mockFlags.set((flags) => ({ ...flags, fail: false }));
    throw new MockApiError(MOCK_ERROR);
  }
  return fn();
}

/** The first load's delay, which never fails (that would leave nothing to show). */
export async function loadDelay() {
  await wait(mockFlags.get().slow ? 3000 : 600 + Math.random() * 600);
}

const current = () => {
  const state = dashboardStore.get();
  if (!state) throw new MockApiError(MOCK_ERROR);
  return state;
};

/* Reading */

const perMonth: Record<Frequency, number> = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

/** Pence a month, whatever the frequency. */
export const monthlyOf = (item: Item) =>
  item.amount !== null && item.frequency ? Math.round(item.amount * perMonth[item.frequency]) : 0;

export const isActive = (item: Item) => !item.cancelled;
export const needsDetails = (item: Item) => !item.complete && !item.cancelled;
export const itemTitle = (item: Item) => item.provider ?? item.name;

/** "£24.10 a month", "£300.00 a year", "£180,000". */
export function amountText(item: Item) {
  if (item.kind === "own" && item.value !== null) return formatPence(item.value).replace(/\.00$/, "");
  if (item.amount === null || !item.frequency) return null;
  const every = { weekly: "a week", monthly: "a month", quarterly: "a quarter", yearly: "a year" }[item.frequency];
  return `${formatPence(item.amount)} ${every}`;
}

export type CategorySummary = {
  id: CategoryId;
  label: string;
  icon: ReturnType<typeof getCategories>[number]["icon"];
  count: number;
  monthly: number;
  worth: number;
  missing: number;
  monograms: string[];
  providers: string[];
};

export function summarise(items: Item[]): CategorySummary[] {
  return getCategories().flatMap((category) => {
    const inside = items.filter((item) => item.category === category.id && isActive(item));
    if (inside.length === 0) return [];
    return {
      id: category.id,
      label: category.label,
      icon: category.icon,
      count: inside.length,
      monthly: inside.reduce((total, item) => total + monthlyOf(item), 0),
      worth: inside.reduce((total, item) => total + (item.kind === "own" ? (item.value ?? 0) : 0), 0),
      missing: inside.filter(needsDetails).length,
      monograms: inside.slice(0, 3).map((item) => item.monogram),
      providers: inside.map(itemTitle),
    };
  });
}

export type Task =
  | { kind: "person" }
  | { kind: "item"; item: Item; title: string; body: string };

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** Next up: choose someone first; then items missing details, most important first, at most 3. */
export function tasksFor(state: DashboardState): Task[] {
  const person = state.people[0];
  if (!person) return [{ kind: "person" }];
  const who = person.name.split(" ")[0];
  return state.items
    .filter(needsDetails)
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category))
    .slice(0, 3)
    .map((item) => ({
      kind: "item",
      item,
      title: item.provider ? `Finish your ${item.provider} ${lower(item.name)}` : `Finish your ${lower(item.name)}`,
      body:
        item.category === "insurance" || item.category === "pensions"
          ? `Add the policy document so ${who} can claim it.`
          : `Add a document so ${who} can claim it.`,
    }));
}

/** Banks running out of access come up as a What's new card. */
function renewEvents(state: DashboardState, now: number): DashEvent[] {
  return state.banks.flatMap((bank) => {
    const days = daysUntil(bank.accessEndsAt, now);
    if (days > 14) return [];
    return {
      id: `renew-${bank.id}`,
      tone: "warn" as const,
      icon: "resend" as const,
      title: `Renew ${bank.name} in ${days} ${days === 1 ? "day" : "days"}`,
      sub: "So we keep spotting things",
      href: `/settings/banks/${bank.id}`,
      upcoming: false,
    };
  });
}

export function getHome(state: DashboardState, now = Date.now()) {
  const active = state.items.filter(isActive);
  const news = state.events.filter((event) => !event.upcoming);
  const upcoming = state.events.filter((event) => event.upcoming);
  const events = [...news, ...renewEvents(state, now), ...upcoming];
  const savedYearly = state.items.filter((item) => item.cancelled).reduce((total, item) => total + monthlyOf(item) * 12, 0);
  return {
    count: active.length,
    banks: state.banks,
    finds: state.finds,
    categories: summarise(state.items),
    tasks: tasksFor(state),
    events,
    eventsTitle: events.some((event) => !event.upcoming) ? "What’s new" : "Coming up",
    savedYearly,
  };
}

export function findsLine(finds: Item[]) {
  const text = formatList(finds.map((find) => `a ${find.short ?? lower(find.name)}`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type RecordRow = { item: Item; status: "complete" | "missing" | "new"; find: boolean };

/** Everything, with new finds in their category marked New. */
export function getRecord(state: DashboardState) {
  const rows: RecordRow[] = [
    ...state.items.filter(isActive).map((item) => ({
      item,
      status: item.isNew ? ("new" as const) : item.complete ? ("complete" as const) : ("missing" as const),
      find: false,
    })),
    ...state.finds.map((item) => ({ item, status: "new" as const, find: true })),
  ];
  const rank = (id: string) => (id === "insurance" ? 0 : id === "pensions" ? 1 : 2);
  const ordered = [...getCategories()].sort((a, b) => rank(a.id) - rank(b.id));
  const sections = ordered.flatMap((category) => {
    const inside = rows.filter((row) => row.item.category === category.id);
    return inside.length > 0 ? [{ category, rows: inside }] : [];
  });
  return {
    sections,
    all: rows.length,
    missing: rows.filter((row) => row.status === "missing" || (row.find && !row.item.complete)).length,
    fresh: rows.filter((row) => row.status === "new").length,
  };
}

export function getCategoryView(state: DashboardState, id: CategoryId) {
  const category = getCategory(id);
  const items = state.items.filter((item) => item.category === id && isActive(item));
  return {
    category,
    items,
    monthly: items.reduce((total, item) => total + monthlyOf(item), 0),
    worth: items.reduce((total, item) => total + (item.kind === "own" ? (item.value ?? 0) : 0), 0),
  };
}

export function getItem(state: DashboardState, id: string) {
  const item = state.items.find((candidate) => candidate.id === id) ?? null;
  if (!item) return null;
  const twin =
    item.category === "insurance" && item.name === "Home insurance" && !item.cancelled
      ? (state.items.find(
          (other) => other.id !== item.id && other.category === "insurance" && other.name === "Home insurance" && !other.cancelled,
        ) ?? null)
      : null;
  return { item, fields: detailFields[item.category], twin, person: state.people[0] ?? null };
}

export const getPeople = (state: DashboardState) => state.people;

export function getBankView(state: DashboardState, id: string, now = Date.now()) {
  const bank = state.banks.find((candidate) => candidate.id === id) ?? null;
  if (!bank) return null;
  return {
    bank,
    found: state.items.filter((item) => item.bankId === id && isActive(item)).length,
    days: daysUntil(bank.accessEndsAt, now),
    ending: daysUntil(bank.accessEndsAt, now) <= 14,
  };
}

/* Writing: every change goes through mockApi. */

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "item";

const uniqueId = (base: string) => `${base}-${Math.random().toString(36).slice(2, 7)}`;

export type NewItemInput = {
  name: string;
  category: CategoryId;
  kind: Kind;
  amount: number | null;
  frequency: Frequency | null;
  value: number | null;
  since: string | null;
};

/** Adds a typed-in item. Resolves with it, and the new count. */
export function addItem(input: NewItemInput) {
  return mockApi(() => {
    const now = Date.now();
    const item: Item = {
      id: uniqueId(slug(input.name)),
      category: input.category,
      name: input.name.trim(),
      provider: null,
      monogram: input.name.trim().charAt(0).toUpperCase(),
      kind: input.kind,
      amount: input.kind === "pay" ? input.amount : null,
      frequency: input.kind === "pay" ? (input.frequency ?? "monthly") : null,
      value: input.kind === "own" ? input.value : null,
      since: input.kind === "own" ? input.since : null,
      details: {},
      complete: detailFields[input.category].length === 0,
      bankId: null,
      cancelled: false,
      isNew: false,
      nextPayment: null,
      addedAt: now,
    };
    update((state) => ({ ...state, items: [...state.items, item] }));
    return item;
  });
}

/** Saves what was read from a document: onto an item, or as a new one. */
export function saveDetails(itemId: string | null, details: Partial<Record<DetailField, string>>) {
  return mockApi(() => {
    if (itemId) {
      let saved: Item | null = null;
      update((state) => ({
        ...state,
        items: state.items.map((item) => {
          if (item.id !== itemId) return item;
          const merged = { ...item.details, ...details };
          const complete = detailFields[item.category].every((field) => Boolean(merged[field]?.trim()));
          saved = { ...item, details: merged, complete };
          return saved;
        }),
      }));
      return saved as Item | null;
    }
    const item: Item = {
      ...scannedNewItem,
      id: uniqueId("aviva-home"),
      kind: "pay",
      value: null,
      since: null,
      details,
      complete: detailFields[scannedNewItem.category].every((field) => Boolean(details[field]?.trim())),
      bankId: null,
      cancelled: false,
      isNew: false,
      nextPayment: null,
      addedAt: Date.now(),
    };
    update((state) => ({ ...state, items: [...state.items, item] }));
    return item;
  });
}

/** Yes, add it: the find joins the record, marked New. */
export function addFind(findId: string) {
  return mockApi(() => {
    const state = current();
    const find = state.finds.find((candidate) => candidate.id === findId);
    if (!find) throw new MockApiError(MOCK_ERROR);
    const item = { ...find, isNew: true, addedAt: Date.now() };
    update((latest) => ({
      ...latest,
      finds: latest.finds.filter((candidate) => candidate.id !== findId),
      items: [...latest.items, item],
    }));
    return item;
  });
}

/** Leave it out: not mine, or it's ended. */
export function leaveOutFind(findId: string) {
  return mockApi(() => {
    update((state) => ({ ...state, finds: state.finds.filter((candidate) => candidate.id !== findId) }));
  });
}

export const markFindsPrompted = () => update((state) => ({ ...state, findsPrompted: true }));

export type InviteInput = { name: string; email: string; relation: string };

/** Sends the invite. With `replacing`, the new person takes over from them. Accepts after ~10s in the mock. */
export function invite(input: InviteInput, replacing?: string) {
  return mockApi(() => {
    const person: Person = {
      id: uniqueId(slug(input.name)),
      name: input.name.trim(),
      email: input.email.trim(),
      relation: input.relation,
      status: "invited",
      acceptAt: Date.now() + 10_000,
      celebrated: false,
      resent: false,
    };
    update((state) => ({
      ...state,
      people: [...state.people.filter((other) => other.id !== replacing), person],
    }));
    return person;
  });
}

export function resendInvite(personId: string) {
  return mockApi(() => {
    update((state) => ({
      ...state,
      people: state.people.map((person) => (person.id === personId ? { ...person, resent: true } : person)),
    }));
  });
}

export const acceptDue = (now = Date.now()) =>
  update((state) =>
    state.people.some((person) => person.status === "invited" && person.acceptAt !== null && person.acceptAt <= now)
      ? {
          ...state,
          people: state.people.map((person) =>
            person.status === "invited" && person.acceptAt !== null && person.acceptAt <= now
              ? { ...person, status: "accepted" as const }
              : person,
          ),
        }
      : state,
  );

export const markCelebrated = (personId: string) =>
  update((state) => ({
    ...state,
    people: state.people.map((person) => (person.id === personId ? { ...person, celebrated: true } : person)),
  }));

export function saveAccount(fields: { name: string; dob: string | null; postcode: string; mobile: string }) {
  return mockApi(() => {
    update((state) => ({
      ...state,
      account: {
        ...state.account,
        ...fields,
        initials: fields.name
          .split(/\s+/)
          .filter(Boolean)
          .map((part) => part[0].toUpperCase())
          .slice(0, 2)
          .join("") || state.account.initials,
      },
    }));
  });
}

/** Optimistic: the toggle has already moved; this saves it, or throws so it can move back. */
export function setPref(key: "updates" | "summary", value: boolean) {
  update((state) => ({ ...state, prefs: { ...state.prefs, [key]: value } }));
  return mockApi(() => undefined).catch((error: unknown) => {
    update((state) => ({ ...state, prefs: { ...state.prefs, [key]: !value } }));
    throw error;
  });
}

/** Stops reading the bank. What it found stays. */
export function disconnectBank(bankId: string) {
  return mockApi(() => {
    update((state) => ({
      ...state,
      banks: state.banks.filter((bank) => bank.id !== bankId),
      items: state.items.map((item) => (item.bankId === bankId ? { ...item, bankId: null } : item)),
    }));
    onboardingActions.removeBank(bankId);
  });
}

/** Back from Tink Link with a fresh 90 days. */
export function applyRenewal(bankId: string) {
  const now = Date.now();
  update((state) => ({
    ...state,
    banks: state.banks.map((bank) =>
      bank.id === bankId ? { ...bank, accessEndsAt: now + 90 * DAY, checkedAt: now, renewedAt: now } : bank,
    ),
  }));
}

/** Sends the bank back through Tink Link (the same redirect as onboarding). */
export function startRenewal(bankId: string) {
  onboardingActions.renewBank(bankId);
}

export function logOut() {
  return mockApi(() => undefined);
}
