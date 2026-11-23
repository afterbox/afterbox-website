/**
 * The backend's shapes, written from `afterbox-backend/docs/API.md` (it wins on every shape).
 * Dates are ISO strings (timestamps) or `YYYY-MM-DD` / `YYYY-MM` (calendar), never epoch ms.
 */

export type Money = { minor: number; currency: string };

export type Plan = "free" | "standard" | "family";

export type CategoryId =
  | "insurance"
  | "investments"
  | "property"
  | "pensions"
  | "savings"
  | "subscriptions"
  | "bills"
  | "bank-accounts"
  | "other";

export type CategoryIcon = "umbrella" | "trend" | "home" | "lock" | "card" | "repeat" | "receipt" | "bank" | "document";

export type Kind = "own" | "pay";

export type Frequency = "weekly" | "four-weekly" | "monthly" | "quarterly" | "yearly";

export type DetailField = "policyNumber" | "covers" | "address" | "renews" | "accountNumber";

export type Group =
  | "home-insurance"
  | "car-insurance"
  | "breakdown"
  | "phone"
  | "broadband"
  | "streaming"
  | "music"
  | "cloud-storage"
  | "gym"
  | "rental-income";

/* Me */

export type TrustedSummary = { name: string | null; status: "invited" | "accepted" } | null;

export type Me = {
  id: string;
  email: string;
  initials: string;
  signIn: "email" | "google";
  plan: Plan;
  onboardingStep: string | null;
  keysReady: boolean;
  hasBackupCode: boolean;
  homeCurrency: string;
  trustedPerson: TrustedSummary;
};

/* Auth */

export type AuthMode = "signup" | "login";
export type VerifyResult = { user: Me; isNew: boolean };

/* Security */

export type DeviceKind = "laptop" | "phone";

export type Device = {
  id: string;
  name: string;
  browser: string;
  device: string;
  kind: DeviceKind;
  lastUsedAt: string | null;
  thisDevice: boolean;
};

export type UnlockOptions = {
  devices: Device[];
  backupCode: boolean;
  helper: { name: null; count: number } | null;
};

export type SecurityOverview = { devices: Device[]; backupCode: boolean; trustedPerson: TrustedSummary };

export type KeysSetupBody = { publicKey: string; memberPart: string; afterboxPart: string; trustedPartSealed: string };
export type DeviceBlobReply = { deviceId: string; deviceBlob: string };
export type SealedBlobReply = { deviceId: string; sealedBlob: string };
export type SealedPartReply = { sealedPart: string };

export type ApprovalStatus = "pending" | "approved" | "declined" | "collected" | "expired";
export type Approval = {
  name: string;
  browser: string;
  device: string;
  kind: DeviceKind;
  requestedAt: string;
  status: ApprovalStatus;
};

export type Kdf = { alg: "argon2id"; memoryKiB: number; iterations: number; parallelism: number; salt: string };
export type Envelope = { lockedPart: string; kdf: Kdf };

export type DeviceDescription = { name: string; browser: string; device: string; kind: DeviceKind };

/* Help */

export type HelpStatus = "pending" | "approved" | "declined" | "cancelled" | "collected" | "expired";
export type HelpRequest = {
  memberFirstName: string | null;
  deviceLabel: string;
  requestedAt: string;
  status: HelpStatus;
  collectableAt: string | null;
};

/* Banks and onboarding */

export type BankStatus = "reading" | "active" | "renew_due" | "lapsed" | "failed";

export type Bank = {
  id: string;
  name: string;
  accounts: string[];
  checkedAt: string | null;
  accessEndsAt: string | null;
  status: BankStatus;
  access: "continuous" | "one_off";
  renewable: boolean;
  rescanAfter: string | null;
};

export type BankDetail = Bank & { found: number };

export type Provider = { id: string; name: string; logoUrl: string | null };

export type ReadStep = "accounts" | "transactions" | "sorting";
export type ReadReason = "no_accounts" | "already_connected" | "few_transactions" | null;

export type Progress = {
  bankName: string | null;
  steps: { id: ReadStep; done: boolean }[];
  chips: { label: string; balance: Money | null }[];
  status: "reading" | "done" | "failed";
  reason: ReadReason;
  another: boolean;
};

export type FlagType = "same_thing_twice" | "overlap" | "price_rise" | "trial_turned_paid" | "both_banks";

export type Flag = {
  id: string;
  type: FlagType;
  title: string;
  itemNote: string;
  lead: string;
  findIds: string[];
  finds: { id: string; monthly: Money | null }[];
  defaultPlan: string[];
  saving: { monthly: Money; yearly: Money };
};

export type FlagDetail = Flag & { items: Finding[] };

export type FoundCategory = { id: CategoryId; count: number; monthly: Money[]; newFromLatestBank: number };

export type Found = {
  count: number;
  sources: string[];
  categories: FoundCategory[];
  flags: Flag[];
  latestBank: { name: string; added: number } | null;
  failedBank?: { connectionId: string; name: string } | null;
};

export type Finding = {
  id: string;
  category: CategoryId;
  name: string;
  provider: string | null;
  monogram: string;
  monthly: Money | null;
  amount: Money | null;
  frequency: Frequency | null;
  since: string | null;
  nextPayment: string | null;
  bankId: string | null;
  bankName: string | null;
  guide: string | null;
  cancelled: boolean;
  note: string | null;
};

export type FoundCategoryView = { category: CategoryId; findings: Finding[] };

export type CancelGuide = { merchant: string; url: string; steps: string[]; note: string };

export type CancelledReply = { cancelled: boolean; flagResolved: boolean; monthlySaving: Money };

export type Country = { code: string; name: string; currency: string };

/* Record */

export type Item = {
  id: string;
  category: CategoryId;
  name: string;
  provider: string | null;
  monogram: string;
  kind: Kind;
  amount: Money | null;
  frequency: Frequency | null;
  value: Money | null;
  since: string | null;
  details: Partial<Record<DetailField, string>>;
  complete: boolean;
  bankId: string | null;
  cancelled: boolean;
  isNew: boolean;
  nextPayment: string | null;
  short?: string;
  addedAt: string;
};

export type CategoryMeta = { id: CategoryId; label: string; icon: CategoryIcon; kind: Kind; fields: DetailField[] };

export type MetaCategories = {
  categories: CategoryMeta[];
  fieldLabels: Record<DetailField, string>;
  pickerOrder: CategoryId[];
};

export type HomeTile = {
  id: CategoryId;
  label: string;
  icon: CategoryIcon;
  count: number;
  monthly: Money[];
  worth: Money[];
  missing: number;
  monograms: string[];
  providers: string[];
  plusOne?: number;
};

export type Task = { kind: "person" } | { kind: "item"; item: Item; title: string; body: string };

export type HomeEvent = {
  id: string;
  tone: "positive" | "warn";
  icon: "check" | "resend" | "flag";
  title: string;
  sub: string;
  href: string;
  upcoming: boolean;
};

export type HomeBank = { id: string; name: string; checkedAt: string | null; status: BankStatus };

export type Home = {
  count: number;
  categories: HomeTile[];
  newFinds: { count: number; line: string | null };
  waiting: number;
  nextUp: Task[];
  whatsNew: HomeEvent[];
  comingUp: HomeEvent[];
  savedSoFar: { monthly: Money[]; yearly: Money[] } | null;
  banks: HomeBank[];
};

export type RecordFilter = "all" | "needs-details" | "new";
export type RecordRow = { item: Item; status: "new" | "complete" | "missing"; find: boolean };
export type RecordView = {
  sections: { category: { id: CategoryId; label: string; icon: CategoryIcon; kind: Kind }; rows: RecordRow[] }[];
  all: number;
  missing: number;
  fresh: number;
};

export type CategoryView = {
  category: CategoryMeta;
  items: Item[];
  monthly: Money[];
  worth: Money[];
};

export type ItemDocument = { id: string; type: string; size: number; addedAt: string };

export type ItemView = {
  item: Item;
  fields: DetailField[];
  twin: Item | null;
  person: { name: string | null; status: "invited" | "accepted" } | null;
  documents: ItemDocument[];
};

export type NewItemBody = {
  name: string;
  category: CategoryId;
  amount?: { minor: number; currency?: string } | null;
  frequency?: Frequency | null;
  value?: { minor: number; currency?: string } | null;
  since?: string | null;
};

export type ItemReply = { item: Item; count: number };

export type FindsList = { finds: Item[]; waiting: number };
export type AddFindReply = { item: Item; count: number; next: Item | null };
export type LeaveOutReason = "not-mine" | "ended";

/* Documents */

export type ScanField = { key: DetailField; value: string };
export type ScanResult = {
  documentId: string;
  provider: string | null;
  category: CategoryId | null;
  fields: ScanField[];
  amount?: Money;
  frequency?: Frequency;
};

export type ConfirmBody =
  | {
      item: {
        name: string;
        category: CategoryId;
        provider?: string;
        amount?: { minor: number; currency?: string };
        frequency?: Frequency;
        value?: { minor: number; currency?: string };
        since?: string;
      };
      fields: ScanField[];
    }
  | { itemId: string; fields: ScanField[] }
  | { fields: ScanField[] };

/* People */

export type Relation = "Partner" | "Husband" | "Wife" | "Child" | "Parent" | "Brother" | "Sister" | "Friend" | "Other";

export type Person = {
  id: string;
  name: string;
  email: string;
  relation: Relation;
  status: "invited" | "accepted";
  role: "trusted" | "family_member";
};

export type PeopleList = { people: Person[]; familyPlan: "active" | "soon" };

export type InviteBody = { name: string; email: string; relation: Relation; fromName?: string };

export type InviteStatus = "sent" | "accepted" | "expired" | "revoked";
export type Invite = { inviterFirstName: string | null; role: "trusted" | "family_member"; status: InviteStatus };

/* Settings */

export type Account = {
  email: string;
  signIn: "email" | "google";
  name: string | null;
  dob: string | null;
  postcode: string | null;
  mobile: string | null;
  country: string | null;
  homeCurrency: string;
};

export type AccountPatch = Partial<Record<"name" | "dob" | "postcode" | "mobile" | "homeCurrency", string | null>>;

export type Notifications = { updates: boolean; summary: boolean; recognise: boolean };

export type DisconnectReply = { stopped: string[]; kept: { items: number }; removed: { finds: number } };

/* Realtime */

export type RealtimeEvent =
  | { name: "scan.progress"; data: { connectionId: string; status: Progress["status"]; done: ReadStep[]; accounts: number; reason?: ReadReason } }
  | { name: "finds.new"; data: { connectionId: string; count: number; total: number } }
  | { name: "bank.status"; data: { connectionId: string; status: string; reason?: string; access?: string } }
  | { name: "categories.updated"; data: { finds: number; items: number } }
  | { name: "saving.result"; data: { entryId: string; result: "saved" | "charged_again" } }
  | { name: "device.approval_requested"; data: { approvalId: string } }
  | { name: "device.approved"; data: { approvalId: string } }
  | { name: "person.accepted"; data: { personId: string } }
  | { name: "person.removed"; data: { personId: string } }
  | { name: "help.requested"; data: { requestId: string } }
  | { name: "help.alert"; data: { requestId: string } }
  | { name: "help.cancelled"; data: { requestId: string } }
  | { name: "plan.changed"; data: { plan: Plan } };

export type RealtimeName = RealtimeEvent["name"];
