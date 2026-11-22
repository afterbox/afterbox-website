/**
 * Mocked dashboard data: no backend yet. Screens read it through the getters in api.ts,
 * so the backend can replace this file later.
 */

import { getBank, getFindings, type Finding, type Scenario as OnboardingScenario } from "@/lib/onboarding/mock";
import { DAY } from "./format";

export type CategoryId =
  | "insurance"
  | "investments"
  | "property"
  | "pensions"
  | "savings"
  | "subscriptions"
  | "bank-accounts"
  | "other";

export type CategoryIcon = "umbrella" | "trend" | "home" | "lock" | "card" | "repeat" | "bank" | "document";

/** Own: something worth an amount (Worth about + Since). Pay: something paid for (Amount + How often). */
export type Kind = "own" | "pay";

export type Category = { id: CategoryId; label: string; icon: CategoryIcon; kind: Kind };

export type Frequency = "weekly" | "monthly" | "quarterly" | "yearly";

export type DetailField = "policyNumber" | "covers" | "address" | "renews" | "accountNumber";

export type Item = {
  id: string;
  category: CategoryId;
  /** What it is: "Home insurance". */
  name: string;
  /** Who it's with: "Admiral". Typed-in items have none. */
  provider: string | null;
  monogram: string;
  kind: Kind;
  /** Pence per `frequency`, for things paid for. */
  amount: number | null;
  frequency: Frequency | null;
  /** Pence, for things owned. */
  value: number | null;
  /** "2021-03" when found in a bank, "2021-03-03" when typed in. */
  since: string | null;
  details: Partial<Record<DetailField, string>>;
  complete: boolean;
  /** The connected bank it was found in; null when added by hand or from a document. */
  bankId: string | null;
  cancelled: boolean;
  /** Came from a new find: shows the "New" pill. */
  isNew: boolean;
  /** "2 Dec" */
  nextPayment: string | null;
  /** Short noun for the new-finds banner: "pension" in "A pension and a gym". */
  short?: string;
  addedAt: number;
};

export type Person = {
  id: string;
  name: string;
  email: string;
  relation: string;
  status: "invited" | "accepted";
  /** When the mock flips the invite to accepted; null when it waits for ?mock=accepted. */
  acceptAt: number | null;
  /** The "Ada accepted" celebration has been shown. */
  celebrated: boolean;
  resent: boolean;
};

export type ConnectedBank = {
  id: string;
  name: string;
  monogram: string;
  accounts: string[];
  checkedAt: number;
  accessEndsAt: number;
  /** Set for a moment after renewing, for the "Renewed" status. */
  renewedAt: number | null;
};

export type EventTone = "positive" | "warn";
export type EventIcon = "check" | "resend" | "flag";

/** A card in What's new / Coming up. `upcoming` ones are payments still to come. */
export type DashEvent = {
  id: string;
  tone: EventTone;
  icon: EventIcon;
  title: string;
  sub: string;
  href: string;
  upcoming: boolean;
};

export type Prefs = { updates: boolean; summary: boolean };

/** Settings → Privacy. `categorise`: merchant names may be sent, cleaned, to the AI provider for categories. */
export type PrivacyPrefs = { categorise: boolean };

export type Account = {
  name: string;
  initials: string;
  email: string;
  signIn: "google" | "email";
  dob: string | null;
  postcode: string;
  mobile: string;
};

export type DashboardState = {
  items: Item[];
  /** New finds waiting for review. Not counted until added. */
  finds: Item[];
  people: Person[];
  banks: ConnectedBank[];
  events: DashEvent[];
  prefs: Prefs;
  privacy: PrivacyPrefs;
  account: Account;
  /** The new-finds modal has opened this session. */
  findsPrompted: boolean;
};

export type Scenario = "day1" | "day2" | "accepted" | "empty";
export const dashboardScenarios: Scenario[] = ["day1", "day2", "accepted", "empty"];

const categories: Category[] = [
  { id: "insurance", label: "Insurance", icon: "umbrella", kind: "pay" },
  { id: "investments", label: "Investments", icon: "trend", kind: "own" },
  { id: "property", label: "Property", icon: "home", kind: "own" },
  { id: "pensions", label: "Pensions", icon: "lock", kind: "pay" },
  { id: "savings", label: "Savings", icon: "card", kind: "own" },
  { id: "subscriptions", label: "Subscriptions", icon: "repeat", kind: "pay" },
  { id: "bank-accounts", label: "Bank accounts", icon: "bank", kind: "own" },
  { id: "other", label: "Something else", icon: "document", kind: "own" },
];

/** The order of the "Where does it go?" grid (26). */
const pickerOrder: CategoryId[] = ["property", "insurance", "pensions", "investments", "savings", "bank-accounts", "subscriptions", "other"];

/** Next up works through these first. */
const importance: CategoryId[] = ["insurance", "pensions", "property", "investments", "savings", "bank-accounts", "other", "subscriptions"];

export const getCategories = () => categories;
export const getPickerCategories = () => pickerOrder.map((id) => getCategory(id)!);
export const getCategory = (id: string | null | undefined) => categories.find((category) => category.id === id) ?? null;
export const categoryRank = (id: CategoryId) => importance.indexOf(id);

/** Which details make an item complete, by category. */
export const detailFields: Record<CategoryId, DetailField[]> = {
  insurance: ["policyNumber", "covers"],
  pensions: ["policyNumber"],
  property: ["address"],
  investments: ["accountNumber"],
  savings: ["accountNumber"],
  "bank-accounts": ["accountNumber"],
  subscriptions: [],
  other: [],
};

export const detailLabels: Record<DetailField, string> = {
  policyNumber: "Policy number",
  covers: "Covers",
  address: "Address",
  renews: "Renews",
  accountNumber: "Account number",
};

/* Typing it in: guess the category from the name. */

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

/* Scanning a document: what the mock "reads". */

export type ScanResult = { provider: string; fields: { key: DetailField; value: string }[] };

export function scanFor(item: Item | null): ScanResult {
  if (!item) {
    return {
      provider: "Aviva",
      fields: [
        { key: "policyNumber", value: "AV-HM-2290417" },
        { key: "covers", value: "Buildings and contents" },
        { key: "address", value: "14 Elm Road, Leeds LS6 2AB" },
        { key: "renews", value: "2026-08-14" },
      ],
    };
  }
  const provider = item.provider ?? item.name;
  const code = provider.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  switch (item.category) {
    case "insurance":
      return {
        provider,
        fields: [
          { key: "policyNumber", value: `${code}-HH-4471902` },
          { key: "covers", value: "Buildings and contents" },
          { key: "address", value: "14 Elm Road, Leeds LS6 2AB" },
          { key: "renews", value: "2026-08-14" },
        ],
      };
    case "pensions":
      return { provider, fields: [{ key: "policyNumber", value: `${code}-PP-3307715` }] };
    case "property":
      return { provider, fields: [{ key: "address", value: "14 Elm Road, Leeds LS6 2AB" }] };
    default:
      return { provider, fields: [{ key: "accountNumber", value: "40-12-19 · 31926819" }] };
  }
}

/** A new document read without an item: becomes this. */
export const scannedNewItem = {
  category: "insurance" as CategoryId,
  name: "Home insurance",
  provider: "Aviva",
  monogram: "A",
  amount: 3140,
  frequency: "monthly" as Frequency,
};

/* Seeds */

const accountSeed: Account = {
  name: "Justice Eziefule",
  initials: "JE",
  email: "justice.e@gmail.com",
  signIn: "google",
  dob: null,
  postcode: "LS6 2AB",
  mobile: "+44 7700 900 123",
};

/** The demo account, for screens that show it before the dashboard has seeded (or after logging out). */
export const mockAccount = () => accountSeed;

const prefsSeed: Prefs = { updates: true, summary: false };

const privacySeed: PrivacyPrefs = { categorise: true };

const nextPayments: Record<string, string> = { "admiral-home": "2026-12-02", "direct-line-home": "2026-12-09" };

const filledDetails = (finding: { category: CategoryId; provider: string | null; name: string }) => {
  const result = scanFor({ ...(finding as Item), provider: finding.provider });
  return Object.fromEntries(result.fields.map((field) => [field.key, field.value])) as Item["details"];
};

function fromFinding(finding: Finding, complete: boolean, now: number): Item {
  const category = finding.category as CategoryId;
  return {
    id: finding.id,
    category,
    name: finding.name,
    provider: finding.provider,
    monogram: finding.monogram,
    kind: "pay",
    amount: Math.round(finding.monthly * 100),
    frequency: "monthly",
    value: null,
    since: finding.since,
    details: complete ? filledDetails({ category, provider: finding.provider, name: finding.name }) : {},
    complete,
    bankId: finding.bankId,
    cancelled: false,
    isNew: false,
    nextPayment: nextPayments[finding.id] ?? null,
    addedAt: now,
  };
}

function bankFor(id: string, now: number, overrides: Partial<ConnectedBank> = {}): ConnectedBank {
  const bank = getBank(id);
  return {
    id,
    name: bank?.name ?? id,
    monogram: bank?.monogram ?? id[0].toUpperCase(),
    accounts: ["Current", "Savings"],
    checkedAt: now,
    accessEndsAt: now + 90 * DAY,
    renewedAt: null,
    ...overrides,
  };
}

const disneyComingUp: DashEvent = {
  id: "disney-coming-up",
  tone: "warn",
  icon: "flag",
  title: "Disney+ takes £9.99 on Saturday",
  sub: "Cancel before then to save it",
  href: "/found/look/streaming",
  upcoming: true,
};

function base(): DashboardState {
  return {
    items: [],
    finds: [],
    people: [],
    banks: [],
    events: [],
    prefs: prefsSeed,
    privacy: privacySeed,
    account: accountSeed,
    findsPrompted: false,
  };
}

/** From what onboarding found: everything added, subscriptions complete (nothing to add for them). */
export function seedFromOnboarding(
  bankIds: string[],
  scenario: OnboardingScenario,
  cancelled: string[],
  now = Date.now(),
): DashboardState {
  const items = getFindings(bankIds, scenario).map((finding) => {
    const item = fromFinding(finding, finding.category === "subscriptions", now);
    return { ...item, cancelled: cancelled.includes(item.id) };
  });
  const active = items.filter((item) => !item.cancelled);
  return {
    ...base(),
    items,
    banks: bankIds.map((id) => bankFor(id, now)),
    events: active.some((item) => item.id === "disney-plus") ? [disneyComingUp] : [],
  };
}

/** Day 1, outside the UK: nothing found, so the record starts empty. */
export const seedManual = () => base();

/** What each dashboard scenario implies onboarding did. */
export const onboardingFor: Record<Scenario, { banks: string[]; cancelled: string[] }> = {
  day1: { banks: ["monzo"], cancelled: [] },
  day2: { banks: ["monzo", "hsbc"], cancelled: ["disney-plus"] },
  accepted: { banks: ["monzo", "hsbc"], cancelled: ["disney-plus"] },
  empty: { banks: [], cancelled: [] },
};

/** Day 2: what's done by then. */
const completeOnDay2 = new Set([
  "aviva-life",
  "direct-line-home",
  "vanguard-isa",
  "scottish-widows",
  "regular-saver",
  "netflix",
  "prime-video",
  "vodafone",
  "game-pass",
  "spotify",
  "headspace",
]);

/** On day 2 these aren't in the record yet: PureGym is a new find, LV= isn't in this story. */
const notOnDay2 = new Set(["puregym", "lv-car"]);

function day2(now: number, accepted: boolean): DashboardState {
  const items = getFindings(["monzo", "hsbc"], "full")
    .filter((finding) => !notOnDay2.has(finding.id))
    .map((finding) => ({
      ...fromFinding(finding, completeOnDay2.has(finding.id), now - DAY),
      cancelled: finding.id === "disney-plus",
    }));

  const finds: Item[] = [
    {
      ...fromFinding(
        { id: "royal-london", category: "pensions", name: "Personal pension", provider: "Royal London", monogram: "RL", monthly: 80, since: "2019-05", bankId: "hsbc" },
        false,
        now,
      ),
      short: "pension",
    },
    {
      ...fromFinding(
        { id: "puregym", category: "subscriptions", name: "Gym membership", provider: "PureGym", monogram: "P", monthly: 24.99, since: "2023-09", bankId: "monzo" },
        true,
        now,
      ),
      short: "gym",
    },
  ];

  return {
    ...base(),
    items,
    finds,
    banks: [
      bankFor("monzo", now, { checkedAt: now - 2 * 60 * 60_000, accessEndsAt: now + 6 * DAY - 60_000 }),
      bankFor("hsbc", now, { checkedAt: now - 2 * 60 * 60_000, accessEndsAt: now + 89 * DAY - 60_000 }),
    ],
    people: [
      {
        id: "ada",
        name: "Ada Okafor",
        email: "ada.okafor@gmail.com",
        relation: "Partner",
        status: accepted ? "accepted" : "invited",
        acceptAt: null,
        celebrated: false,
        resent: false,
      },
    ],
    events: [
      {
        id: "disney-saved",
        tone: "positive",
        icon: "check",
        title: "Disney+ didn’t charge you",
        sub: "£119.88 a year saved",
        href: "/home/record/subscriptions/disney-plus",
        upcoming: false,
      },
      {
        id: "admiral-payment",
        tone: "warn",
        icon: "flag",
        title: "Admiral takes £38.20 on 2 Dec",
        sub: "2 home policies",
        href: "/found/look/home-insurance",
        upcoming: true,
      },
    ],
  };
}

function empty(now: number): DashboardState {
  return {
    ...base(),
    items: [
      {
        id: "flat-manchester",
        category: "property",
        name: "Flat in Manchester",
        provider: null,
        monogram: "F",
        kind: "own",
        amount: null,
        frequency: null,
        value: 18_000_000,
        since: "2021-03-03",
        details: {},
        complete: false,
        bankId: null,
        cancelled: false,
        isNew: false,
        nextPayment: null,
        addedAt: now,
      },
      {
        id: "aviva-life-insurance",
        category: "insurance",
        name: "Aviva life insurance",
        provider: null,
        monogram: "A",
        kind: "pay",
        amount: 2410,
        frequency: "monthly",
        value: null,
        since: null,
        details: {},
        complete: false,
        bankId: null,
        cancelled: false,
        isNew: false,
        nextPayment: null,
        addedAt: now,
      },
    ],
  };
}

export function seedScenario(scenario: Scenario, now = Date.now()): DashboardState {
  switch (scenario) {
    case "day1":
      return seedFromOnboarding(["monzo"], "full", [], now);
    case "day2":
      return day2(now, false);
    case "accepted":
      return day2(now, true);
    case "empty":
      return empty(now);
  }
}

/** Relationship choices for "They are your". */
export const relations = ["Partner", "Husband", "Wife", "Child", "Parent", "Brother", "Sister", "Friend", "Other"];

export const frequencies: { id: Frequency; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "weekly", label: "Weekly" },
];
