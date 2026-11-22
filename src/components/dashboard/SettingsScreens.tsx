"use client";

import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAccessLine } from "@/components/dashboard/SecuritySettings";
import Button from "@/components/ui/Button";
import {
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentIcon,
  LockIcon,
  LogoutIcon,
  MailIcon,
  PlusIcon,
  ResendIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@/components/ui/icons";
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
import { showErrorToast } from "@/components/ui/dashboard/toast";
import { applyRenewal, getBankView, logOut, saveAccount, setCategorise, setPref, startRenewal } from "@/lib/dashboard/api";
import {
  daysUntil,
  formatMobile,
  formatPostcode,
  isCompleteMobile,
  isCompletePostcode,
  timeAgo,
  todayIso,
} from "@/lib/dashboard/format";
import type { DashboardState } from "@/lib/dashboard/mock";
import { clearSession } from "@/lib/dashboard/store";
import { pressable, transition } from "@/lib/motion";

const message = (caught: unknown) => (caught instanceof Error ? caught.message : String(caught));

const days = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;

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

function Settings({ state }: { state: DashboardState }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accessLine = useAccessLine(state);

  useEffect(() => {
    router.prefetch("/login");
  }, [router]);

  async function onLogOut() {
    setLeaving(true);
    setError(null);
    try {
      await logOut();
      clearSession();
      router.replace("/login");
    } catch (caught) {
      setError(message(caught));
      setLeaving(false);
    }
  }

  return (
    <Page settings>
      <PageTitle className="mb-8 sm:mb-10">Settings</PageTitle>

      <SectionLabel className="mb-1">CONNECTED BANKS</SectionLabel>
      <div className="border-t border-line">
        <AnimatePresence initial={false}>
          {state.banks.map((bank) => {
            const left = daysUntil(bank.accessEndsAt);
            return (
              <motion.div key={bank.id} exit={{ opacity: 0, height: 0 }} transition={transition("base")}>
                <Link href={`/home/settings/banks/${bank.id}`} name={`settings-bank-${bank.id}`} className={rowClasses}>
                  <Monogram letters={bank.monogram} size="row" />
                  <span className="block min-w-0 flex-1">
                    <span className="block text-[15px] text-ink">{bank.name}</span>
                    <span className={`mt-0.5 block text-[13px] ${left <= 14 ? "text-warn" : "text-ink-soft"}`}>
                      {left <= 14 ? `Access ends in ${days(left)}` : `Connected · renew in ${days(left)}`}
                    </span>
                  </span>
                  <span className="text-sm/[normal] font-semibold text-ink-soft group-hover:text-ink">Manage</span>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
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
          {state.account.email}
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
        <button type="button" onClick={onLogOut} disabled={leaving} className={`${rowClasses} border-b-0 text-alert`}>
          <span className="flex size-[18px] flex-none items-center justify-center">
            {leaving ? <Spinner /> : <LogoutIcon size={18} />}
          </span>
          <span className="flex-1 text-[15px]">Log out</span>
        </button>
      </div>
      <FormNote error={error} />
    </Page>
  );
}

export function SettingsScreen() {
  return <Ready skeleton={<SettingsSkeleton title="Settings" />}>{(state) => <Settings state={state} />}</Ready>;
}

/* 23: Account */

function Account({ state }: { state: DashboardState }) {
  const { account } = state;
  const [name, setName] = useState(account.name);
  const [dob, setDob] = useState<string | null>(account.dob);
  const [postcode, setPostcode] = useState(account.postcode);
  const [mobile, setMobile] = useState(account.mobile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ postcode?: string; mobile?: string }>({});

  const edited = () => {
    setSaved(false);
    setError(null);
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = {
      postcode: isCompletePostcode(postcode) ? undefined : "Enter a full UK postcode.",
      mobile: isCompleteMobile(mobile) ? undefined : "Enter a full UK mobile number.",
    };
    setErrors(next);
    if (next.postcode || next.mobile) return;
    setSaving(true);
    setError(null);
    try {
      await saveAccount({ name: name.trim(), dob, postcode, mobile });
      setSaved(true);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page settings>
      <BackLink href="/home/settings" name="account-back" label="Settings" className="max-sm:hidden" />
      <PageTitle className="mb-8 sm:mb-10">Account</PageTitle>
      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={saving} className="min-w-0 space-y-5">
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
            onChange={(event) => {
              setName(event.target.value);
              edited();
            }}
          />
          <div className="grid grid-cols-1 gap-5 min-[400px]:grid-cols-2 min-[400px]:gap-3">
            <DateField
              name="dob"
              label="Date of birth"
              placeholder="DD / MM / YYYY"
              value={dob}
              initial="1985-01-01"
              max={todayIso()}
              overPage
              align="left"
              disabled={saving}
              onChange={(iso) => {
                setDob(iso);
                edited();
              }}
            />
            <TextField
              label="Postcode"
              labelStyle="form"
              value={postcode}
              autoComplete="postal-code"
              autoCapitalize="characters"
              error={errors.postcode}
              onChange={(event) => {
                setPostcode(formatPostcode(event.target.value));
                setErrors((current) => ({ ...current, postcode: undefined }));
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
            value={mobile}
            error={errors.mobile}
            onChange={(event) => {
              setMobile(formatMobile(event.target.value));
              setErrors((current) => ({ ...current, mobile: undefined }));
              edited();
            }}
          />
        </fieldset>
        <p className="mt-5 mb-6 flex items-center gap-2 text-[13px] text-ink-soft">
          <ShieldCheckIcon size={15} className="flex-none" />
          Helps us confirm it’s really you, and reach you if we need to.
        </p>
        <Button type="submit" variant="inkDeep" className="h-12 min-w-[120px]" loading={saving} loadingLabel="Saving" disabled={!name.trim()}>
          Save
        </Button>
        <FormNote error={error} saved={saved ? "Saved" : null} />
      </form>
      <div className="mt-10 border-t border-line pt-6">
        <button
          type="button"
          disabled
          className="inline-flex min-h-11 items-center gap-2 text-sm/[normal] font-semibold text-alert disabled:cursor-default disabled:opacity-60"
        >
          <TrashIcon size={16} />
          Delete my account
        </button>
      </div>
    </Page>
  );
}

export function AccountScreen() {
  return <Ready skeleton={<FormSkeleton title="Account" />}>{(state) => <Account state={state} />}</Ready>;
}

/* 24: Notifications */

function Notifications({ state }: { state: DashboardState }) {
  const [note, setNote] = useState<{ error: string | null; saved: boolean }>({ error: null, saved: false });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function toggle(key: "updates" | "summary", value: boolean) {
    clearTimeout(timer.current);
    setNote({ error: null, saved: false });
    try {
      await setPref(key, value);
      setNote({ error: null, saved: true });
      timer.current = setTimeout(() => setNote({ error: null, saved: false }), 2000);
    } catch (caught) {
      setNote({ error: message(caught), saved: false });
    }
  }

  const rows = [
    { key: "updates" as const, title: "Updates", sub: "New finds, payments coming up, cancellations" },
    { key: "summary" as const, title: "Monthly summary", sub: "One email a month" },
  ];

  return (
    <Page settings>
      <BackLink href="/home/settings" name="notifications-back" label="Settings" className="max-sm:hidden" />
      <PageTitle className="mb-2">Notifications</PageTitle>
      <p className="mb-7 text-sm/normal text-ink-soft sm:text-[15px]/normal">By email to {state.account.email}</p>
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
            <Toggle
              checked={state.prefs[row.key]}
              label={row.title}
              describedBy={`pref-${row.key}-sub`}
              onChange={(next) => toggle(row.key, next)}
            />
          </div>
        ))}
      </div>
      <FormMessage note={note} />
    </Page>
  );
}

function FormMessage({ note }: { note: { error: string | null; saved: boolean } }) {
  return <FormNote error={note.error} saved={note.saved ? "Saved" : null} />;
}

export function NotificationsScreen() {
  return <Ready skeleton={<SettingsSkeleton title="Notifications" />}>{(state) => <Notifications state={state} />}</Ready>;
}

/* Privacy */

function Privacy({ state }: { state: DashboardState }) {
  async function toggle(value: boolean) {
    try {
      await setCategorise(value);
    } catch (caught) {
      showErrorToast(message(caught));
    }
  }

  return (
    <Page settings>
      <BackLink href="/home/settings" name="privacy-back" label="Settings" className="max-sm:hidden" />
      <PageTitle className="mb-7">Privacy</PageTitle>
      <div className="border-t border-line">
        <div className="flex items-center gap-3.5 border-b border-line py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-ink">Help categorise my payments</p>
            <p id="privacy-categorise-sub" className="mt-0.5 text-[13px] text-ink-soft">
              Lets afterbox send cleaned-up merchant names (never amounts or personal details) to our AI provider to sort your
              payments into categories.
            </p>
          </div>
          <Toggle
            checked={state.privacy.categorise}
            label="Help categorise my payments"
            describedBy="privacy-categorise-sub"
            onChange={toggle}
          />
        </div>
        <ListLink href="/privacy" name="settings-privacy-policy" icon={<DocumentIcon size={18} />}>
          Privacy policy
        </ListLink>
      </div>
    </Page>
  );
}

export function PrivacyScreen() {
  return <Ready skeleton={<SettingsSkeleton title="Privacy" />}>{(state) => <Privacy state={state} />}</Ready>;
}

/* 25 and 28: a connected bank */

function Bank({ id, state }: { id: string; state: DashboardState }) {
  const view = getBankView(state, id);
  const router = useRouter();
  const params = useSearchParams();
  const { open } = useLayers();
  const [renewing, setRenewing] = useState(false);
  const justRenewed = params.get("renewed") === "1";
  const [renewed] = useState(justRenewed);

  useEffect(() => {
    router.prefetch("/connect/opening");
    router.prefetch("/home/settings");
  }, [router]);

  useEffect(() => {
    if (!justRenewed) return;
    applyRenewal(id);
    router.replace(`/home/settings/banks/${id}`, { scroll: false });
  }, [justRenewed, id, router]);

  // Disconnected: Settings is already on its way.
  if (!view) return null;
  const { bank, found, ending } = view;
  const left = view.days;

  function renew() {
    setRenewing(true);
    startRenewal(id);
    router.push("/connect/opening");
  }

  return (
    <Page settings>
      <BackLink href="/home/settings" name="bank-back" label="Settings" className="max-sm:hidden" />
      <div className="mb-7 flex items-center gap-4">
        <Monogram letters={bank.monogram} size="lg" />
        <div className="min-w-0">
          <PageTitle size="item" className="mb-1">
            {bank.name}
          </PageTitle>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={ending ? "ending" : renewed ? "renewed" : "connected"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition("fast")}
              className={`flex items-center gap-1.5 text-sm/[normal] ${ending ? "text-warn" : "text-positive"}`}
            >
              {ending ? <ClockIcon size={14} /> : <CheckIcon size={14} strokeWidth={2.4} />}
              {ending ? `Access ends in ${days(left)}` : renewed ? "Renewed" : `Connected · checked ${timeAgo(bank.checkedAt)}`}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {ending && (
          <motion.div key="renew" exit={{ opacity: 0, height: 0 }} transition={transition("base")} style={{ clipPath: "inset(-4px)" }}>
            <div className="mb-7 rounded-card bg-card p-6 ring-1 ring-line">
              <Square size={44} tone="warn">
                <ResendIcon size={22} />
              </Square>
              <div className="h-4" />
              <h2 className="mb-1.5 text-[22px]/[1.1] tracking-[-0.035em] text-ink">Renew {bank.name}</h2>
              <p className="mb-5 text-sm/normal text-ink-soft sm:text-[15px]/normal">
                Banks ask every 90 days. Without it, we stop spotting new things and payments coming up here.
              </p>
              <Button variant="inkDeep" size="block" loading={renewing} loadingLabel="Opening" onClick={renew}>
                Renew at {bank.name}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8 border-t border-line">
        <DetailRow label="Accounts">{bank.accounts.join(", ")}</DetailRow>
        <DetailRow label="Found here">{found} in your record</DetailRow>
        <DetailRow label="Access renews" last>
          in {days(left)}
        </DetailRow>
      </div>

      <Button variant="alertOutline" className="h-12" onClick={() => open("disconnect", { item: id })}>
        Disconnect {bank.name}
      </Button>
    </Page>
  );
}

function BankFromParams({ state }: { state: DashboardState }) {
  // Kept from the first render: while this page fades out, the params already belong to the next one.
  const [bankId] = useState(useParams<{ bankId: string }>().bankId);
  return <Bank id={bankId} state={state} />;
}

export function BankScreen() {
  return <Ready skeleton={<BankSkeleton />}>{(state) => <BankFromParams state={state} />}</Ready>;
}
