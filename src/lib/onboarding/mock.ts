/**
 * Mocked onboarding data: no backend yet. The screens only read data through the
 * functions at the bottom, so the backend (and Tink webhooks) can replace them later.
 */

export type Scenario = "full" | "few" | "thin";
export const scenarios: Scenario[] = ["full", "few", "thin"];

export type Bank = { id: string; name: string; monogram: string };

export type CategoryId = "insurance" | "investments" | "property" | "pensions" | "savings" | "subscriptions";
export type CategoryIcon = "umbrella" | "trend" | "home" | "lock" | "card" | "repeat";

export type Category = {
  id: CategoryId;
  label: string;
  icon: CategoryIcon;
  /** "3 policies" */
  unit: [singular: string, plural: string];
};

export type Finding = {
  id: string;
  category: CategoryId;
  /** What it is, e.g. "Home insurance". */
  name: string;
  /** Who it's with, e.g. "Direct Line". */
  provider: string;
  monogram: string;
  monthly: number;
  /** Year and month, "2021-03". */
  since: string;
  /** Which connected bank it was found in. */
  bankId: string;
};

export type FlagId = "home-insurance" | "streaming";

export type Flag = {
  id: FlagId;
  /** "2 home insurance policies" */
  title: string;
  /** The note on each item inside its category, e.g. "2 home policies". */
  itemNote: string;
  /** What the detail screen says under the title. */
  lead: string;
  items: Finding[];
  /** Items the cancel guide walks through unless the person chooses otherwise. */
  defaultPlan: string[];
};

export type CancelGuide = {
  findingId: string;
  merchant: string;
  url: string;
  steps: string[];
  note: string;
};

export type ReadingChip = { label: string; balance: number; at: number };

export type ReadingStep = {
  id: string;
  label: string;
  icon: "bank" | "document" | "sort";
  /** Milliseconds after the screen opens. */
  doneAt: number;
  /** The line under the steps while this one is running. */
  hint: string;
  chips?: ReadingChip[];
};

const banks: Bank[] = [
  { id: "barclays", name: "Barclays", monogram: "B" },
  { id: "hsbc", name: "HSBC", monogram: "H" },
  { id: "lloyds", name: "Lloyds", monogram: "L" },
  { id: "monzo", name: "Monzo", monogram: "M" },
  { id: "nationwide", name: "Nationwide", monogram: "N" },
  { id: "natwest", name: "NatWest", monogram: "N" },
  { id: "santander", name: "Santander", monogram: "S" },
  { id: "starling", name: "Starling Bank", monogram: "S" },
];

const categories: Category[] = [
  { id: "insurance", label: "Insurance", icon: "umbrella", unit: ["policy", "policies"] },
  { id: "investments", label: "Investments", icon: "trend", unit: ["investment", "investments"] },
  { id: "property", label: "Property", icon: "home", unit: ["property", "properties"] },
  { id: "pensions", label: "Pensions", icon: "lock", unit: ["pension", "pensions"] },
  { id: "savings", label: "Savings", icon: "card", unit: ["account", "accounts"] },
  { id: "subscriptions", label: "Subscriptions", icon: "repeat", unit: ["subscription", "subscriptions"] },
];

type MockFinding = Omit<Finding, "bankId">;

const firstBankFindings: Record<Scenario, MockFinding[]> = {
  full: [
    { id: "aviva-life", category: "insurance", name: "Life cover", provider: "Aviva", monogram: "A", monthly: 24.1, since: "2021-03" },
    { id: "direct-line-home", category: "insurance", name: "Home insurance", provider: "Direct Line", monogram: "DL", monthly: 38.2, since: "2024-01" },
    { id: "admiral-home", category: "insurance", name: "Home insurance", provider: "Admiral", monogram: "A", monthly: 38.2, since: "2025-08" },
    { id: "vanguard-isa", category: "investments", name: "Stocks and shares ISA", provider: "Vanguard", monogram: "V", monthly: 250, since: "2019-04" },
    { id: "freetrade", category: "investments", name: "Investment account", provider: "Freetrade", monogram: "F", monthly: 150, since: "2022-06" },
    { id: "nationwide-mortgage", category: "property", name: "Mortgage", provider: "Nationwide", monogram: "N", monthly: 1150, since: "2020-09" },
    { id: "scottish-widows", category: "pensions", name: "Workplace pension", provider: "Scottish Widows", monogram: "SW", monthly: 120, since: "2018-02" },
    { id: "pensionbee", category: "pensions", name: "Personal pension", provider: "PensionBee", monogram: "P", monthly: 60, since: "2021-11" },
    { id: "marcus-savings", category: "savings", name: "Easy access saver", provider: "Marcus", monogram: "M", monthly: 200, since: "2020-07" },
    { id: "premium-bonds", category: "savings", name: "Premium Bonds", provider: "NS&I", monogram: "N", monthly: 100, since: "2019-12" },
    { id: "netflix", category: "subscriptions", name: "Streaming", provider: "Netflix", monogram: "N", monthly: 12.99, since: "2017-05" },
    { id: "disney-plus", category: "subscriptions", name: "Streaming", provider: "Disney+", monogram: "D", monthly: 9.99, since: "2020-03" },
    { id: "prime-video", category: "subscriptions", name: "Streaming", provider: "Prime Video", monogram: "PV", monthly: 8.99, since: "2022-10" },
    { id: "vodafone", category: "subscriptions", name: "Phone plan", provider: "Vodafone", monogram: "V", monthly: 24.45, since: "2023-01" },
    { id: "puregym", category: "subscriptions", name: "Gym", provider: "PureGym", monogram: "P", monthly: 24.99, since: "2023-09" },
    { id: "game-pass", category: "subscriptions", name: "Games", provider: "Xbox Game Pass", monogram: "X", monthly: 14.99, since: "2024-02" },
  ],
  few: [
    { id: "aviva-life", category: "insurance", name: "Life cover", provider: "Aviva", monogram: "A", monthly: 24.1, since: "2021-03" },
    { id: "marcus-savings", category: "savings", name: "Easy access saver", provider: "Marcus", monogram: "M", monthly: 150, since: "2020-07" },
    { id: "netflix", category: "subscriptions", name: "Streaming", provider: "Netflix", monogram: "N", monthly: 12.99, since: "2017-05" },
    { id: "apple-music", category: "subscriptions", name: "Music", provider: "Apple Music", monogram: "AM", monthly: 5.99, since: "2022-08" },
  ],
  thin: [],
};

/** Whatever the second bank is, it adds these 5. */
const secondBankFindings: MockFinding[] = [
  { id: "lv-car", category: "insurance", name: "Car insurance", provider: "LV=", monogram: "LV", monthly: 31.1, since: "2024-06" },
  { id: "nest-pension", category: "pensions", name: "Workplace pension", provider: "Nest", monogram: "N", monthly: 80, since: "2016-10" },
  { id: "regular-saver", category: "savings", name: "Regular saver", provider: "HSBC", monogram: "H", monthly: 150, since: "2025-01" },
  { id: "spotify", category: "subscriptions", name: "Music", provider: "Spotify", monogram: "S", monthly: 11.99, since: "2018-04" },
  { id: "headspace", category: "subscriptions", name: "Meditation", provider: "Headspace", monogram: "H", monthly: 12.99, since: "2025-01" },
];

const flagDefinitions: { id: FlagId; itemIds: string[]; title: (count: number) => string; itemNote: (count: number) => string; lead: string }[] = [
  {
    id: "home-insurance",
    itemIds: ["direct-line-home", "admiral-home"],
    title: (count) => `${count} home insurance policies`,
    itemNote: (count) => `${count} home policies`,
    lead: "If they cover the same home, you only need one.",
  },
  {
    id: "streaming",
    itemIds: ["netflix", "disney-plus", "prime-video"],
    title: (count) => `${count} streaming services`,
    itemNote: (count) => `${count} streaming services`,
    lead: "Choose what to keep.",
  },
];

const guides: Record<string, Omit<CancelGuide, "findingId">> = {
  netflix: {
    merchant: "Netflix",
    url: "https://www.netflix.com/account",
    steps: ["Open Netflix and sign in", "Go to Account, then Membership", "Choose Cancel membership"],
    note: "You keep it until your paid month ends",
  },
  "disney-plus": {
    merchant: "Disney+",
    url: "https://www.disneyplus.com/account",
    steps: ["Open Disney+ and sign in", "Go to Account, then Subscription", "Choose Cancel subscription"],
    note: "You keep it until your paid month ends",
  },
  "prime-video": {
    merchant: "Prime Video",
    url: "https://www.amazon.co.uk/gp/video/settings",
    steps: ["Open Prime Video and sign in", "Go to Account & Settings, then Membership", "Choose End membership"],
    note: "You keep it until your paid month ends",
  },
  "direct-line-home": {
    merchant: "Direct Line",
    url: "https://www.directline.com/home-insurance",
    steps: ["Open Direct Line and sign in", "Go to My policies, then your home policy", "Choose Cancel policy"],
    note: "Check for a cancellation fee first",
  },
  "admiral-home": {
    merchant: "Admiral",
    url: "https://www.admiral.com/home-insurance",
    steps: ["Open Admiral and sign in", "Go to My account, then your home policy", "Choose Cancel policy"],
    note: "Check for a cancellation fee first",
  },
};

const firstBankChips: ReadingChip[] = [
  { label: "Current account", balance: 2184, at: 1200 },
  { label: "Savings", balance: 6410, at: 1500 },
  { label: "Credit card", balance: -320, at: 2600 },
];

const secondBankChips: ReadingChip[] = [
  { label: "Current account", balance: 940, at: 1200 },
  { label: "Savings", balance: 2050, at: 1500 },
];

const countries = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "India",
  "Pakistan",
  "Ireland",
  "France",
  "Germany",
  "Netherlands",
  "Spain",
  "United States",
  "Canada",
  "Australia",
];

/* ---- What the screens call ---- */

export function getBanks() {
  return banks;
}

export function getBank(id: string | null | undefined) {
  return banks.find((bank) => bank.id === id) ?? null;
}

export function getCategories() {
  return categories;
}

export function getCategory(id: string) {
  return categories.find((category) => category.id === id) ?? null;
}

/** Everything found across the connected banks, in the order they were connected. */
export function getFindings(bankIds: string[], scenario: Scenario): Finding[] {
  return bankIds.flatMap((bankId, index) => {
    const found = index === 0 ? firstBankFindings[scenario] : index === 1 ? secondBankFindings : [];
    return found.map((finding) => ({ ...finding, bankId }));
  });
}

/** Worth a look, from what was found. A flag needs at least 2 of its items to be there. */
export function getFlags(findings: Finding[]): Flag[] {
  return flagDefinitions.flatMap((definition) => {
    const items = definition.itemIds.flatMap((id) => findings.find((finding) => finding.id === id) ?? []);
    if (items.length < 2) return [];
    const oldestFirst = [...items].sort((a, b) => a.since.localeCompare(b.since));
    const mostExpensive = [...items].sort((a, b) => b.monthly - a.monthly)[0];
    return {
      id: definition.id,
      title: definition.title(items.length),
      itemNote: definition.itemNote(items.length),
      lead: definition.lead,
      items,
      // Two of the same policy: the older one is the one usually left running.
      // Overlapping services: keep the priciest, suggest the rest.
      defaultPlan:
        definition.id === "home-insurance"
          ? [oldestFirst[0].id]
          : items.filter((item) => item !== mostExpensive).map((item) => item.id),
    };
  });
}

export function getFlagIds(): FlagId[] {
  return flagDefinitions.map((definition) => definition.id);
}

/** Every flag and item that has a cancel guide. */
export function getCancelGuideRoutes() {
  return flagDefinitions.flatMap((definition) =>
    definition.itemIds.filter((id) => id in guides).map((id) => ({ flag: definition.id, merchant: id })),
  );
}

export function getCancelGuide(findingId: string): CancelGuide | null {
  const guide = guides[findingId];
  return guide ? { findingId, ...guide } : null;
}

/** The reading stages. Timers for now; Tink webhooks will drive them later. */
export function getReadingSteps(another: boolean): ReadingStep[] {
  return [
    { id: "accounts", label: "Finding your accounts", icon: "bank", doneAt: 1200, hint: "Usually under a minute", chips: another ? secondBankChips : firstBankChips },
    { id: "transactions", label: "Reading 2 years of transactions", icon: "document", doneAt: 3500, hint: "Usually under a minute" },
    { id: "sorting", label: another ? "Adding to what we found" : "Sorting what we find", icon: "sort", doneAt: 5000, hint: "Almost there" },
  ];
}

/** The example statement lines on the hook screen. */
export function getHookLines() {
  const streaming = flagDefinitions.find((flag) => flag.id === "streaming")!;
  const streamingItems = firstBankFindings.full.filter((finding) => streaming.itemIds.includes(finding.id));
  return {
    lines: [
      { reference: "AVIVA LIFE DD", label: "Life cover", icon: "umbrella" as const },
      { reference: "VANGUARD ISA", label: "Investments", icon: "trend" as const },
      { reference: "NATIONWIDE BS", label: "Mortgage", icon: "home" as const },
    ],
    flagged: {
      reference: streamingItems.map((item) => item.provider.split(" ")[0].toUpperCase()).join(" · "),
      label: streaming.title(streamingItems.length),
      monthly: streamingItems.map((item) => item.monthly),
    },
  };
}

export function getCountries() {
  return countries;
}
