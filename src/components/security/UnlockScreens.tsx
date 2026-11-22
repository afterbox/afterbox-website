"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import {
  BankIcon,
  ChevronRightIcon,
  FingerprintIcon,
  HelpIcon,
  KeyIcon,
  LaptopIcon,
  MailIcon,
  PeopleIcon,
  PhoneIcon,
} from "@/components/ui/icons";
import Monogram from "@/components/ui/onboarding/Monogram";
import Spinner from "@/components/ui/Spinner";
import { Celebration, Lead, PageTitle, RoundIcon, Square } from "@/components/ui/dashboard/bits";
import { DialogTitle, Overlay, Step, useLayers } from "@/components/ui/dashboard/Layer";
import { pressable } from "@/lib/motion";
import { deviceWord, lastUsed, requestApproval, requestPersonApproval } from "@/lib/security/device";
import { get, PASSKEY_ERROR } from "@/lib/security/passkey";
import {
  CODE_LENGTH,
  GROUP_LENGTH,
  GROUPS,
  normalizeCode,
  SUPPORT_EMAIL,
  trustedPerson,
  unlockOptions,
  unlockWithCode,
  WRONG_CODE,
  type Helper,
} from "@/lib/security/recovery";
import { setUnlock, unlockStore, useAccountSecurity, type Device } from "@/lib/security/store";
import { useMotionTokens } from "@/lib/useMotionTokens";

const message = (caught: unknown) => (caught instanceof Error ? caught.message : String(caught));

export function DeviceGlyph({ kind, size }: { kind: Device["kind"]; size: number }) {
  return kind === "phone" ? <PhoneIcon size={size} /> : <LaptopIcon size={size} />;
}

/** On 04 and 06: the second option, a text link in ink directly under the main button. */
function OtherWaysLink() {
  const { open } = useLayers();
  return (
    <p className="mt-3 text-center">
      <button
        type="button"
        onClick={() => open("ways")}
        className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-[15px] font-semibold text-ink hover:text-ink-deep ${pressable}`}
      >
        Other ways to unlock
        <ChevronRightIcon size={15} />
      </button>
    </p>
  );
}

/* 05: only the options this person has; afterbox always. A sheet on phones, a modal on desktop. */

function WayRow({ icon, title, sub, last = false, onClick }: { icon: ReactNode; title: string; sub?: string; last?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full cursor-pointer items-center gap-3.5 py-5 text-left ${last ? "" : "border-b border-line"} ${pressable}`}
    >
      <Square size={40}>{icon}</Square>
      <span className="block min-w-0 flex-1">
        <span className="block text-[15px] text-ink">{title}</span>
        {sub && <span className="mt-0.5 block text-[13px] text-ink-soft">{sub}</span>}
      </span>
      <ChevronRightIcon
        size={16}
        className="flex-none text-ink-soft/70 transition-transform duration-[var(--motion-fast)] group-hover:translate-x-0.5"
      />
    </button>
  );
}

function WaysOverlay() {
  const { close, closeTo } = useLayers();
  const [{ devices, backupCode, helper }] = useState(unlockOptions);
  const go = (target: string) => closeTo(target, { push: true });

  return (
    <Overlay kind="modal" width={520} onClose={close}>
      <div className="text-center">
        <DialogTitle className="mb-7">Other ways to unlock</DialogTitle>
      </div>
      <div className="border-t border-line">
        {devices.map((device) => (
          <WayRow
            key={device.id}
            icon={<DeviceGlyph kind={device.kind} size={20} />}
            title={`Approve on your ${deviceWord(device.device)}`}
            sub={`${device.browser} · used ${lastUsed(device.lastUsedAt)}`}
            onClick={() => go(`/unlock?wait=${device.id}`)}
          />
        ))}
        {backupCode && <WayRow icon={<KeyIcon size={20} />} title="Use your backup code" onClick={() => go("/unlock/code")} />}
        {helper && (
          <WayRow icon={<PeopleIcon size={20} />} title={`Ask ${helper.first} to help`} sub="Your trusted person" onClick={() => go("/unlock/ask")} />
        )}
        <WayRow icon={<HelpIcon size={20} />} title="Get help from afterbox" last onClick={() => go("/unlock/help")} />
      </div>
    </Overlay>
  );
}

function Ways() {
  const { sheet } = useLayers();
  return <AnimatePresence>{sheet === "ways" && <WaysOverlay key="ways" />}</AnimatePresence>;
}

/* 04: unlock. One tap: Safari won't open the passkey prompt without one, so no browser does. */

function UnlockStep() {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock() {
    setChecking(true);
    setError(null);
    try {
      await get();
      setUnlock("open");
    } catch {
      setError(PASSKEY_ERROR);
      setChecking(false);
    }
  }

  return (
    <div className="text-center">
      <RoundIcon>
        <FingerprintIcon size={26} />
      </RoundIcon>
      <PageTitle className="mb-3">Unlock your record</PageTitle>
      <Lead className="mb-10">Confirm it’s you to open it here.</Lead>
      <Button variant="inkDeep" size="block" loading={checking} loadingLabel="Unlocking" onClick={() => unlock()}>
        Unlock
      </Button>
      <FormMessage message={error} gapClassName="pt-3" />
      <OtherWaysLink />
    </div>
  );
}

/* 06: waiting for the other device. The ring pulses slowly. */

function WaitingStep({ device }: { device: Device }) {
  const { reduced } = useMotionTokens();

  useEffect(() => {
    const { pending, status } = unlockStore.get();
    if (status !== "locked" || (pending?.kind === "device" && pending.deviceId === device.id)) return;
    requestApproval(device.id).catch(() => undefined);
  }, [device.id]);

  return (
    <div className="text-center">
      <div aria-hidden="true" className="relative mx-auto mb-6 size-[72px]">
        {reduced ? (
          <span className="absolute -inset-2.5 rounded-full border-[1.5px] border-mist" />
        ) : (
          <motion.span
            animate={{ scale: [1, 1.12, 1], opacity: [1, 0.35, 1] }}
            transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
            className="absolute -inset-2.5 rounded-full border-[1.5px] border-mist"
          />
        )}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-mist text-ink-deep">
          <DeviceGlyph kind={device.kind} size={30} />
        </span>
      </div>
      <PageTitle className="mb-3">Check your {deviceWord(device.device)}</PageTitle>
      <Lead className="mb-9">Open afterbox there and tap Approve.</Lead>
      <p role="status" className="mb-7 flex items-center justify-center gap-2.5 text-sm/[normal] text-ink-soft">
        <Spinner />
        Waiting for you to approve
      </p>
      <OtherWaysLink />
    </div>
  );
}

/** /unlock: 04, 06 with `?wait=`, and 05 over either. */
export function UnlockScreen() {
  const params = useSearchParams();
  const account = useAccountSecurity();
  const waitFor = params.get("wait");
  const device = waitFor ? (account?.devices.find((candidate) => candidate.id === waitFor) ?? null) : null;

  return (
    <>
      <Step id={device ? `wait-${device.id}` : "unlock"}>{device ? <WaitingStep device={device} /> : <UnlockStep />}</Step>
      <Ways />
    </>
  );
}

/* 09: the backup code. Six boxes of four; pasting fills all six; a wrong code shakes. */

function CodeBoxes({
  groups,
  onChange,
  invalid,
  labelledBy,
  describedBy,
  shake,
  disabled,
}: {
  groups: string[];
  onChange: (groups: string[]) => void;
  invalid: boolean;
  labelledBy: string;
  describedBy?: string;
  shake: number;
  disabled: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const { reduced } = useMotionTokens();

  useEffect(() => {
    if (!shake || reduced || !scope.current) return;
    animate(scope.current, { x: [0, -6, 6, -6, 6, -6, 6, 0] }, { duration: 0.42, ease: "easeInOut" });
  }, [shake, reduced, animate, scope]);

  const focus = (index: number) => refs.current[Math.max(0, Math.min(GROUPS - 1, index))]?.focus();

  /** Puts characters in from box `from` onwards, four to a box, and moves on to the next empty one. */
  function fill(from: number, raw: string) {
    const chars = normalizeCode(raw);
    const next = [...groups];
    let index = from;
    let rest = chars;
    next[index] = "";
    while (rest.length > 0 && index < GROUPS) {
      next[index] = rest.slice(0, GROUP_LENGTH);
      rest = rest.slice(GROUP_LENGTH);
      if (next[index].length === GROUP_LENGTH) index += 1;
      else break;
    }
    onChange(next);
    focus(Math.min(index, GROUPS - 1));
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    event.preventDefault();
    const chars = normalizeCode(event.clipboardData.getData("text"));
    fill(chars.length >= CODE_LENGTH ? 0 : index, chars);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    const input = event.currentTarget;
    if (event.key === "Backspace" && input.value === "" && index > 0) {
      event.preventDefault();
      focus(index - 1);
    } else if (event.key === "ArrowLeft" && input.selectionStart === 0 && index > 0) {
      event.preventDefault();
      focus(index - 1);
    } else if (event.key === "ArrowRight" && input.selectionStart === input.value.length && index < GROUPS - 1) {
      event.preventDefault();
      focus(index + 1);
    }
  }

  return (
    <div ref={scope} role="group" aria-labelledby={labelledBy} aria-describedby={describedBy} className="grid grid-cols-3 gap-2">
      {groups.map((group, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={group}
          aria-label={`Part ${index + 1} of ${GROUPS}`}
          aria-invalid={invalid || undefined}
          autoFocus={index === 0}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          onChange={(event) => fill(index, event.target.value)}
          onPaste={(event) => onPaste(event, index)}
          onKeyDown={(event) => onKeyDown(event, index)}
          className={`h-12 w-full min-w-0 rounded-field border bg-ground text-center text-[17px] font-semibold tracking-[0.06em] uppercase outline-none transition-[border-color,box-shadow,color] duration-200 focus:border-ink-deep focus:ring-3 focus:ring-ink-deep/14 disabled:opacity-60 sm:h-[52px] ${
            invalid ? "border-alert text-alert" : "border-line text-ink"
          }`}
        />
      ))}
    </div>
  );
}

export function CodeScreen() {
  const titleId = useId();
  const [groups, setGroups] = useState<string[]>(() => Array(GROUPS).fill(""));
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const complete = groups.join("").length === CODE_LENGTH;

  async function submit() {
    setChecking(true);
    setError(null);
    try {
      if (!(await unlockWithCode(groups.join("")))) {
        setError(WRONG_CODE);
        setShake((count) => count + 1);
      }
    } catch (caught) {
      setError(message(caught));
    } finally {
      setChecking(false);
    }
  }

  return (
    <form
      className="text-center"
      onSubmit={(event) => {
        event.preventDefault();
        if (complete && !checking) submit();
      }}
    >
      <RoundIcon>
        <KeyIcon size={26} />
      </RoundIcon>
      <h1 id={titleId} tabIndex={-1} className="mb-9 text-[27px]/[1.1] font-normal tracking-[-0.035em] text-ink outline-none sm:text-[32px]/[1.1]">
        Enter your backup code
      </h1>
      <CodeBoxes
        groups={groups}
        onChange={(next) => {
          setGroups(next);
          setError(null);
        }}
        invalid={error === WRONG_CODE}
        labelledBy={titleId}
        describedBy={error ? `${titleId}-message` : undefined}
        shake={shake}
        disabled={checking}
      />
      <FormMessage id={`${titleId}-message`} message={error} gapClassName="pt-3" />
      <div className="h-8" />
      <Button type="submit" variant="inkDeep" size="block" loading={checking} loadingLabel="Unlocking" disabled={!complete}>
        Unlock
      </Button>
    </form>
  );
}

/* 10 and 11: ask the trusted person. They approve with their passkey; the member gets an email too. */

function AskStep({ helper, onSent }: { helper: Helper; onSent: () => void }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      await requestPersonApproval();
      onSent();
    } catch (caught) {
      setError(message(caught));
      setSending(false);
    }
  }

  return (
    <div>
      <div className="text-center">
        <PageTitle className="mb-3">Ask {helper.first} to help</PageTitle>
        <Lead className="mb-8">{helper.first} can approve it for you.</Lead>
      </div>
      <div className="mb-8 flex items-center gap-3 rounded-panel border border-line bg-ground px-5 py-[18px]">
        <Monogram letters={helper.initials} size="row" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] text-ink">{helper.name}</p>
          <p className="mt-0.5 text-[13px] text-ink-soft">Your trusted person</p>
        </div>
      </div>
      <Button variant="inkDeep" size="block" loading={sending} loadingLabel="Sending" onClick={send}>
        Send request
      </Button>
      <FormMessage message={error} gapClassName="pt-3" />
      <p className="mt-5 flex items-center justify-center gap-[7px] text-[13px] text-ink-soft">
        <MailIcon size={14} />
        We’ll email you a copy.
      </p>
    </div>
  );
}

function SentStep({ helper }: { helper: Helper }) {
  const router = useRouter();
  return (
    <div className="text-center">
      <span role="status" className="sr-only">
        Request sent
      </span>
      <Celebration tone="deep" className="mb-5">
        <MailIcon size={32} />
      </Celebration>
      <PageTitle className="mb-3">Request sent</PageTitle>
      <Lead className="mb-9">You’ll be back in once {helper.first} approves.</Lead>
      <Button variant="inkDeep" size="block" onClick={() => router.replace("/unlock")}>
        Done
      </Button>
    </div>
  );
}

export function AskScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [helper] = useState(trustedPerson);
  const sent = params.has("sent");

  useEffect(() => {
    if (!helper) router.replace("/unlock");
  }, [helper, router]);
  if (!helper) return null;

  return (
    <Step id={sent ? "sent" : "ask"}>
      {sent ? <SentStep helper={helper} /> : <AskStep helper={helper} onSent={() => router.replace("/unlock/ask?sent=1", { scroll: false })} />}
    </Step>
  );
}

/* 13: get help from afterbox. */

export function HelpScreen() {
  return (
    <div>
      <div className="text-center">
        <RoundIcon>
          <HelpIcon size={26} />
        </RoundIcon>
        <PageTitle className="mb-3">Get help from afterbox</PageTitle>
        <Lead className="mb-8">We’ll help you get back in.</Lead>
      </div>
      <div className="mb-8 flex gap-3 rounded-panel border border-line bg-ground px-5 py-[18px]">
        <BankIcon size={18} className="mt-px text-ink-soft" />
        <p className="text-sm/normal text-ink-soft">If nothing else works, reconnecting your bank brings most of your record back.</p>
      </div>
      <Button href={`mailto:${SUPPORT_EMAIL}`} variant="inkDeep" size="block">
        Message support
      </Button>
    </div>
  );
}
