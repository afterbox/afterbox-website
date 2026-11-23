"use client";

import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAccessLine } from "@/components/dashboard/SecuritySettings";
import Button from "@/components/ui/Button";
import { AlertIcon, BellIcon, CheckIcon, ChevronRightIcon, ClockIcon, DocumentIcon, DownloadIcon, LockIcon, LogoutIcon, MailIcon, PlusIcon, ResendIcon, ShieldCheckIcon, TrashIcon } from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import Monogram from "@/components/ui/onboarding/Monogram";
import Spinner from "@/components/ui/Spinner";
import TextField from "@/components/ui/TextField";
import { BackLink, PageTitle, SectionLabel, Square, Toggle } from "@/components/ui/dashboard/bits";
import { DateField, FormNote } from "@/components/ui/dashboard/fields";
import { useLayers } from "@/components/ui/dashboard/Layer";
import Page from "@/components/ui/dashboard/Page";
import Ready from "@/components/ui/dashboard/Ready";
import { DetailRow } from "@/components/ui/dashboard/rows";
import { BankSkeleton, FormSkeleton, SettingsSkeleton } from "@/components/ui/dashboard/Skeleton";
import { showToast } from "@/components/ui/dashboard/toast";
import { anyErrorCopy, isApiError } from "@/lib/api/errors";
import type { Account, AccountPatch, Bank, BankDetail, Notifications } from "@/lib/api/types";
import { daysUntilIso, formatDate, formatPostcode, timeAgoIso, todayIso } from "@/lib/dashboard/format";
import { pressable, transition } from "@/lib/motion";
import { PASSKEY_ERROR, PasskeyError } from "@/lib/security/keychain";
import { useAccount, useExportAccount, useUpdateAccount } from "@/store/account";
import { useBank, useBanks, useRenewBank } from "@/store/banks";
import { useMe } from "@/store/me";
import { useNotifications, useUpdateNotifications } from "@/store/notifications";
import { useSignOut } from "@/store/sessions";

const failure = (error: unknown) => (error instanceof PasskeyError ? PASSKEY_ERROR : anyErrorCopy(error));

const days = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;

/** One line for a bank, by its status (reading, active, renew_due, lapsed, failed) and access (continuous, one_off). */
export function bankLine(bank: Bank): { text: string; tone: "soft" | "warn" | "alert" | "positive" } {
  if (bank.status === "reading") return { text: "Reading now", tone: "soft" };
  if (bank.status === "failed") return { text: "Didn’t connect", tone: "alert" };
  if (bank.status === "lapsed") return { text: `Reconnect ${bank.name}`, tone: "warn" };
  if (bank.status === "renew_due") {
    const left = daysUntilIso(bank.accessEndsAt);
    return { text: bank.accessEndsAt && left > 0 ? `Access ends in ${days(left)}` : `Renew ${bank.name}`, tone: "warn" };
  }
  if (bank.access === "one_off") return { text: bank.checkedAt ? `Read once · ${timeAgoIso(bank.checkedAt)}` : "Read once", tone: "soft" };
  const left = daysUntilIso(bank.accessEndsAt);
  return { text: bank.accessEndsAt ? `Connected · renew in ${days(left)}` : "Connected", tone: "soft" };
}

const toneClass = { soft: "text-ink-soft", warn: "text-warn", alert: "text-alert", positive: "text-positive" } as const;

/* 11: Settings */

const rowClasses = `group flex w-full cursor-pointer items-center gap-3.5 border-b border-line py-4 text-left ${pressable}`;

function ListLink({ href, name, icon, sub, children }: { href: string; name: string; icon: ReactNode; sub?: string | null; children: ReactNode }) {
  return (
    <Link href={href} name={name} className={rowClasses}>
      <span className="flex-none text-ink-soft">{icon}</span>
      <span className="block min-w-0 flex-1">
        <span className="block truncate text-[15px] text-ink">{children}</span>
        {sub && <span className="mt-0.5 block truncate text-[13px] text-ink-soft">{sub}</span>}
      </span>
      <ChevronRightIcon size={16} className="flex-none text-ink-soft/70 transition-transform duration-[var(--motion-fast)] group-hover:translate-x-0.5" />
    </Link>
  );
}

function Settings({ banks }: { banks: Bank[] }) {
  const router = useRouter();
  const me = useMe();
  const signOut = useSignOut();
  const accessLine = useAccessLine();

  useEffect(() => {
    router.prefetch("/login");
  }, [router]);

  return (
    <Page settings>
      <PageTitle className="mb-8 sm:mb-10">Settings</PageTitle>

      <SectionLabel className="mb-1">CONNECTED BANKS</SectionLabel>
      <div className="border-t border-line">
        <AnimatePresence initial={false}>
          {banks.map((bank) => {
            const line = bankLine(bank);
            return (
              <motion.div key={bank.id} exit={{ opacity: 0, height: 0 }} transition={transition("base")}>
                <Link href={`/home/settings/banks/${bank.id}`} name={`settings-bank-${bank.id}`} className={rowClasses}>
                  <Monogram letters={bank.name.charAt(0).toUpperCase()} size="row" />
                  <span className="block min-w-0 flex-1">
                    <span className="block text-[15px] text-ink">{bank.name}</span>
                    <span className={`mt-0.5 block text-[13px] ${toneClass[line.tone]}`}>{line.text}</span>
                  </span>
                  <span className="text-sm/[normal] font-semibold text-ink-soft group-hover:text-ink">Manage</span>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {banks.length === 0 && <p className="border-b border-line py-4 text-[15px] text-ink-soft">No banks connected.</p>}
      </div>
      <Link
        href="/connect/bank?another=1"
        name="settings-add-bank"
        className={`mt-3.5 inline-flex min-h-11 items-center gap-1.5 text-sm/[normal] font-semibold text-ink-soft hover:text-ink ${pressable}`}
      >
        <PlusIcon size={15} strokeWidth={2.2} />
        Add another bank
      </Link>

      <SectionLabel className="mt-10 mb-1">ACCOUNT</SectionLabel>
      <div className="border-t border-line">
        <ListLink href="/home/settings/security" name="settings-security" icon={<ShieldCheckIcon size={18} />} sub={accessLine}>
          Devices and access
        </ListLink>
        <ListLink href="/home/settings/account" name="settings-account" icon={<MailIcon size={18} />}>
          {me.data?.email ?? "Account"}
        </ListLink>
        <ListLink href="/home/settings/notifications" name="settings-notifications" icon={<BellIcon size={18} />}>
          Notifications
        </ListLink>
        <ListLink href="/terms" name="settings-terms" icon={<DocumentIcon size={18} />}>
          Terms
        </ListLink>
        <ListLink href="/home/settings/privacy" name="settings-privacy" icon={<ShieldCheckIcon size={18} />}>
          Privacy
        </ListLink>
        <button type="button" onClick={() => signOut.mutate(undefined, { onSettled: () => router.replace("/login") })} disabled={signOut.isPending} className={`${rowClasses} border-b-0 text-alert`}>
          <span className="flex size-[18px] flex-none items-center justify-center">{signOut.isPending ? <Spinner /> : <LogoutIcon size={18} />}</span>
          <span className="flex-1 text-[15px]">Log out</span>
        </button>
      </div>
    </Page>
  );
}

export function SettingsScreen() {
  const query = useBanks();
  return (
    <Ready query={query} skeleton={<SettingsSkeleton title="Settings" />}>
      {(banks) => <Settings banks={banks} />}
    </Ready>
  );
}

/* 23: Account. Only changed fields are sent; a refused field shows under that field and keeps what was typed. */

/** "+447700900123" → "+44 7700 900123"; other countries keep the code apart from the rest. */
export function formatE164(mobile: string | null) {
  if (!mobile) return "";
  if (mobile.startsWith("+44") && mobile.length === 13) return `+44 ${mobile.slice(3, 7)} ${mobile.slice(7)}`;
  const match = /^(\+\d{1,3})(\d+)$/.exec(mobile);
  return match ? `${match[1]} ${match[2]}` : mobile;
}

type Field = "name" | "dob" | "postcode" | "mobile";

function AccountForm({ account }: { account: Account }) {
  const { open } = useLayers();
  const update = useUpdateAccount();
  const exportData = useExportAccount();
  const uk = account.country === "GB" || account.country === null;
  const initial = { name: account.name ?? "", dob: account.dob, postcode: account.postcode ?? "", mobile: formatE164(account.mobile) };
  const [name, setName] = useState(initial.name);
  const [dob, setDob] = useState<string | null>(initial.dob);
  const [postcode, setPostcode] = useState(initial.postcode);
  const [mobile, setMobile] = useState(initial.mobile);
  const [fieldError, setFieldError] = useState<{ field: Field; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  const edited = () => {
    setSaved(false);
    setFieldError(null);
    update.reset();
  };

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const patch: AccountPatch = {};
    if (name.trim() !== initial.name) patch.name = name.trim();
    if (dob !== initial.dob) patch.dob = dob ?? "";
    if (postcode.trim() !== initial.postcode) patch.postcode = postcode.trim();
    if (mobile.trim() !== initial.mobile) patch.mobile = mobile.trim();
    if (Object.keys(patch).length === 0) {
      setSaved(true);
      return;
    }
    update.mutate(patch, {
      onSuccess: (next) => {
        setMobile(formatE164(next.mobile));
        setPostcode(next.postcode ?? "");
        setSaved(true);
      },
      onError: (error) => {
        const field = isApiError(error) ? (error.details.field as Field | undefined) : undefined;
        if (field) setFieldError({ field, message: error.message });
      },
    });
  }

  const errorFor = (field: Field) => (fieldError?.field === field ? fieldError.message : null);

  return (
    <Page settings>
      <BackLink href="/home/settings" name="account-back" label="Settings" className="max-sm:hidden" />
      <PageTitle className="mb-8 sm:mb-10">Account</PageTitle>
      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={update.isPending} className="min-w-0 space-y-5">
          <div>
            <TextField label="Email" labelStyle="form" value={account.email} readOnly />
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-soft">
              <LockIcon size={13} />
              Signed in with {account.signIn === "google" ? "Google" : "email"}
            </p>
          </div>
          <TextField
            label="Full legal name"
            labelStyle="form"
            value={name}
            autoComplete="name"
            error={errorFor("name")}
            onChange={(event) => {
              setName(event.target.value);
              edited();
            }}
          />
          <div className="grid grid-cols-1 gap-5 min-[400px]:grid-cols-2 min-[400px]:gap-3">
            <div>
              <DateField
                name="dob"
                label="Date of birth"
                placeholder="DD / MM / YYYY"
                value={dob}
                initial="1985-01-01"
                max={todayIso()}
                overPage
                align="left"
                disabled={update.isPending}
                onChange={(iso) => {
                  setDob(iso);
                  edited();
                }}
              />
              <FormNote error={errorFor("dob")} />
            </div>
            <TextField
              label="Postcode"
              labelStyle="form"
              value={postcode}
              autoComplete="postal-code"
              autoCapitalize="characters"
              error={errorFor("postcode")}
              onChange={(event) => {
                setPostcode(uk ? formatPostcode(event.target.value) : event.target.value.slice(0, 16));
                edited();
              }}
            />
          </div>
          <TextField
            label="Mobile"
            labelStyle="form"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={uk ? "07700 900123" : "+234 …"}
            value={mobile}
            error={errorFor("mobile")}
            onChange={(event) => {
              setMobile(event.target.value);
              edited();
            }}
          />
        </fieldset>
        <p className="mt-5 mb-6 flex items-center gap-2 text-[13px] text-ink-soft">
          <ShieldCheckIcon size={15} className="flex-none" />
          Helps us confirm it’s really you, and reach you if we need to.
        </p>
        <Button type="submit" variant="inkDeep" className="h-12 min-w-[120px]" loading={update.isPending} loadingLabel="Saving">
          Save
        </Button>
        <FormNote error={update.isError && !fieldError ? failure(update.error) : null} saved={saved ? "Saved" : null} />
      </form>

      <SectionLabel className="mt-10 mb-1">YOUR DATA</SectionLabel>
      <div className="border-t border-line">
        <button
          type="button"
          disabled={exportData.isPending}
          onClick={() => exportData.mutate(undefined, { onSuccess: () => showToast("Downloaded") })}
          className={`${rowClasses} disabled:opacity-60`}
        >
          <span className="flex size-[18px] flex-none items-center justify-center text-ink-soft">{exportData.isPending ? <Spinner /> : <DownloadIcon size={18} />}</span>
          <span className="block min-w-0 flex-1">
            <span className="block text-[15px] text-ink">Download a copy of your record</span>
            <span className="mt-0.5 block text-[13px] text-ink-soft">A file with everything in it. Documents open from the app.</span>
          </span>
        </button>
      </div>
      <FormNote error={exportData.isError ? failure(exportData.error) : null} />

      <div className="mt-10 border-t border-line pt-6">
        <button
          type="button"
          onClick={() => open("delete-account")}
          className={`inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm/[normal] font-semibold text-alert hover:opacity-80 ${pressable}`}
        >
          <TrashIcon size={16} />
          Delete my account
        </button>
      </div>
    </Page>
  );
}

export function AccountScreen() {
  const query = useAccount();
  return (
    <Ready query={query} skeleton={<FormSkeleton title="Account" />}>
      {(account) => <AccountForm account={account} />}
    </Ready>
  );
}

/* 24: Notifications, and "Help recognise payments". Each toggle moves at once and moves back if the save fails. */

type Pref = keyof Notifications;

const recogniseCopy =
  "When a regular payment isn’t one we know, we may send its cleaned-up company name (never amounts, dates or anything about you) to an AI model to find its category. Turning this off keeps the categories you already have.";

function PrefRows({ prefs, rows }: { prefs: Notifications; rows: { key: Pref; title: string; sub: string }[] }) {
  const update = useUpdateNotifications();
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function toggle(key: Pref, value: boolean) {
    clearTimeout(timer.current);
    setSaved(false);
    update.mutate(
      { [key]: value },
      {
        onSuccess: () => {
          setSaved(true);
          timer.current = setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  }

  return (
    <>
      <div className="border-t border-line">
        {rows.map((row, index) => (
          <div key={row.key} className={`flex items-center gap-3.5 py-4 ${index < rows.length - 1 ? "border-b border-line" : ""}`}>
            <div className="min-w-0 flex-1">
              <p id={`pref-${row.key}`} className="text-[15px] text-ink">
                {row.title}
              </p>
              <p id={`pref-${row.key}-sub`} className="mt-0.5 text-[13px] text-ink-soft">
                {row.sub}
              </p>
            </div>
            <Toggle checked={prefs[row.key]} label={row.title} describedBy={`pref-${row.key}-sub`} onChange={(next) => toggle(row.key, next)} />
          </div>
        ))}
      </div>
      <FormNote error={update.isError ? failure(update.error) : null} saved={saved ? "Saved" : null} />
    </>
  );
}

function NotificationsView({ prefs }: { prefs: Notifications }) {
  const me = useMe();
  return (
    <Page settings>
      <BackLink href="/home/settings" name="notifications-back" label="Settings" className="max-sm:hidden" />
      <PageTitle className="mb-2">Notifications</PageTitle>
      <p className="mb-7 text-sm/normal text-ink-soft sm:text-[15px]/normal">By email{me.data ? ` to ${me.data.email}` : ""}</p>
      <PrefRows
        prefs={prefs}
        rows={[
          { key: "updates", title: "Updates", sub: "Reminders before yearly and quarterly payments. Bank renewal emails always come." },
          { key: "summary", title: "Monthly summary", sub: "One email a month" },
          { key: "recognise", title: "Help recognise payments", sub: recogniseCopy },
        ]}
      />
    </Page>
  );
}

export function NotificationsScreen() {
  const query = useNotifications();
  return (
    <Ready query={query} skeleton={<SettingsSkeleton title="Notifications" />}>
      {(prefs) => <NotificationsView prefs={prefs} />}
    </Ready>
  );
}

/* Privacy: the same "Help recognise payments" setting, where people look for it. */

function PrivacyView({ prefs }: { prefs: Notifications }) {
  return (
    <Page settings>
      <BackLink href="/home/settings" name="privacy-back" label="Settings" className="max-sm:hidden" />
      <PageTitle className="mb-7">Privacy</PageTitle>
      <PrefRows prefs={prefs} rows={[{ key: "recognise", title: "Help recognise payments", sub: recogniseCopy }]} />
      <div className="mt-2 border-t border-line">
        <ListLink href="/privacy" name="settings-privacy-policy" icon={<DocumentIcon size={18} />}>
          Privacy policy
        </ListLink>
      </div>
    </Page>
  );
}

export function PrivacyScreen() {
  const query = useNotifications();
  return (
    <Ready query={query} skeleton={<SettingsSkeleton title="Privacy" />}>
      {(prefs) => <PrivacyView prefs={prefs} />}
    </Ready>
  );
}

/* 25 and 28: a connected bank. The renew card shows only when `renewable`. */

const problems: Record<string, string> = {
  already: "This bank is already connected.",
  limit: "Your plan reads this bank once every 90 days.",
  failed: "That didn’t go through. Try again.",
};

function BankView({ bank }: { bank: BankDetail }) {
  const router = useRouter();
  const params = useSearchParams();
  const { open } = useLayers();
  const renew = useRenewBank();
  const [renewed] = useState(params.get("renewed") === "1");
  const [problem] = useState(params.get("problem"));
  const line = renewed ? { text: "Renewed", tone: "positive" as const } : bankLine(bank);
  const warn = line.tone === "warn" || line.tone === "alert";

  useEffect(() => {
    router.prefetch("/home/settings");
    if (params.has("renewed") || params.has("problem")) router.replace(`/home/settings/banks/${bank.id}`, { scroll: false });
  }, [bank.id, params, router]);

  const renewTitle = bank.status === "lapsed" ? `Reconnect ${bank.name}` : bank.status === "failed" ? `Try ${bank.name} again` : bank.access === "one_off" ? `Read ${bank.name} again` : `Renew ${bank.name}`;
  const renewBody =
    bank.status === "lapsed"
      ? "Access has ended, so we stopped checking it. Reconnect to keep spotting things."
      : bank.access === "one_off"
        ? "Read it again to find anything new since last time."
        : "Banks ask every 90 days. Without it, we stop spotting new things and payments coming up here.";

  return (
    <Page settings>
      <BackLink href="/home/settings" name="bank-back" label="Settings" className="max-sm:hidden" />
      <div className="mb-7 flex items-center gap-4">
        <Monogram letters={bank.name.charAt(0).toUpperCase()} size="lg" />
        <div className="min-w-0">
          <PageTitle size="item" className="mb-1">
            {bank.name}
          </PageTitle>
          <p className={`flex items-center gap-1.5 text-sm/[normal] ${toneClass[line.tone === "soft" ? "positive" : line.tone]}`}>
            {warn ? <ClockIcon size={14} /> : <CheckIcon size={14} strokeWidth={2.4} />}
            {line.text}
            {!warn && !renewed && bank.checkedAt && bank.access !== "one_off" ? ` · checked ${timeAgoIso(bank.checkedAt)}` : ""}
          </p>
        </div>
      </div>

      {problem && problems[problem] && (
        <p className="mb-7 flex items-center gap-2.5 rounded-panel border border-alert/16 bg-alert/6 px-4 py-3.5 text-sm/normal text-ink">
          <AlertIcon size={17} className="flex-none text-alert" />
          <span className="flex-1">{problems[problem]}</span>
        </p>
      )}

      <AnimatePresence initial={false}>
        {bank.renewable && !renewed && (
          <motion.div key="renew" exit={{ opacity: 0, height: 0 }} transition={transition("base")} style={{ clipPath: "inset(-4px)" }}>
            <div className="mb-7 rounded-card bg-card p-6 ring-1 ring-line">
              <Square size={44} tone="warn">
                <ResendIcon size={22} />
              </Square>
              <div className="h-4" />
              <h2 className="mb-1.5 text-[22px]/[1.1] tracking-[-0.035em] text-ink">{renewTitle}</h2>
              <p className="mb-5 text-sm/normal text-ink-soft sm:text-[15px]/normal">{renewBody}</p>
              <Button
                variant="inkDeep"
                size="block"
                loading={renew.isPending || renew.isSuccess}
                loadingLabel="Opening"
                onClick={() => renew.mutate(bank.id, { onSuccess: (url) => window.location.assign(url) })}
              >
                {bank.status === "lapsed" ? "Reconnect" : "Renew"} at {bank.name}
              </Button>
              <FormNote error={renew.isError ? failure(renew.error) : null} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8 border-t border-line">
        <DetailRow label="Accounts">{bank.accounts.length > 0 ? bank.accounts.join(", ") : "None read yet"}</DetailRow>
        <DetailRow label="Found here">{bank.found} in your record</DetailRow>
        <DetailRow label={bank.access === "one_off" ? "Read again" : "Access renews"} last>
          {bank.access === "one_off"
            ? bank.rescanAfter
              ? `from ${formatDate(bank.rescanAfter)}`
              : "any time"
            : bank.accessEndsAt
              ? `in ${days(daysUntilIso(bank.accessEndsAt))}`
              : "—"}
        </DetailRow>
      </div>

      <Button variant="alertOutline" className="h-12" onClick={() => open("disconnect", { item: bank.id })}>
        Disconnect {bank.name}
      </Button>
    </Page>
  );
}

export function BankScreen() {
  // Kept from the first render: while this page fades out, the params already belong to the next one.
  const [bankId] = useState(useParams<{ bankId: string }>().bankId);
  const query = useBank(bankId);
  return (
    <Ready query={query} skeleton={<BankSkeleton />}>
      {(bank) => <BankView bank={bank} />}
    </Ready>
  );
}
