"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import {
  BankIcon,
  ChevronRightIcon,
  ClockIcon,
  FingerprintIcon,
  HelpIcon,
  KeyIcon,
  LaptopIcon,
  MailIcon,
  PeopleIcon,
  PhoneIcon,
} from "@/components/ui/icons";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import Spinner from "@/components/ui/Spinner";
import { Celebration, Lead, PageTitle, RoundIcon, Square } from "@/components/ui/dashboard/bits";
import { DialogTitle, Overlay, Step, useLayers } from "@/components/ui/dashboard/Layer";
import { Sk } from "@/components/ui/dashboard/Skeleton";
import { errorCopy, isApiError } from "@/lib/api/errors";
import type { DeviceKind, Me } from "@/lib/api/types";
import { pressable } from "@/lib/motion";
import { CODE_LENGTH, GROUP_LENGTH, GROUPS, normalizeCode, WRONG_CODE } from "@/lib/security/backup";
import { SUPPORT_EMAIL } from "@/lib/security/backupActions";
import { deviceName, deviceWord } from "@/lib/security/deviceInfo";
import { PASSKEY_ERROR, PasskeyError } from "@/lib/security/keychain";
import { useMotionTokens } from "@/lib/useMotionTokens";
import { useApproval, useCollectApproval, useRequestApproval } from "@/store/approvals";
import { useCollectHelp, useForgetHelpRequest, useHelpRequest, useRequestHelp } from "@/store/help";
import { useMe } from "@/store/me";
import { useRealtimeEvent } from "@/store/realtime";
import { useUnlockWithCode } from "@/store/recovery";
import { useDeviceBlob, useOpenRequest, useUnlockOptions, useUnlockWithPasskey } from "@/store/unlock";
import { safeNext } from "./SecureScreen";
import YoureIn, { NEW_BACKUP_CODE } from "./YoureIn";

export function DeviceGlyph({ kind, size }: { kind: DeviceKind; size: number }) {
  return kind === "phone" ? <PhoneIcon size={size} /> : <LaptopIcon size={size} />;
}

const thisDevice = () => deviceWord(deviceName().device);

function failureCopy(error: unknown) {
  if (error instanceof PasskeyError) return PASSKEY_ERROR;
  return errorCopy(error);
}

/* 05: only the options this person has; afterbox always. A sheet on phones, a modal on desktop (and the list itself
   on a new device). Approval copy never names a device: every signed-in device is asked. */

function WayRow({ icon, title, sub, last = false, busy = false, onClick }: { icon: ReactNode; title: string; sub?: string; last?: boolean; busy?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`group flex w-full cursor-pointer items-center gap-3.5 py-5 text-left disabled:cursor-default ${last ? "" : "border-b border-line"} ${pressable}`}
    >
      <Square size={40}>{icon}</Square>
      <span className="block min-w-0 flex-1">
        <span className="block text-[15px] text-ink">{title}</span>
        {sub && <span className="mt-0.5 block text-[13px] text-ink-soft">{sub}</span>}
      </span>
      {busy ? (
        <Spinner className="text-ink-soft" />
      ) : (
        <ChevronRightIcon size={16} className="flex-none text-ink-soft/70 transition-transform duration-[var(--motion-fast)] group-hover:translate-x-0.5" />
      )}
    </button>
  );
}

function WaysList({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const options = useUnlockOptions();
  const request = useRequestApproval();
  const go = (href: string) => {
    onDone?.();
    router.push(href);
  };

  if (options.isPending) {
    return (
      <div className="border-t border-line" aria-busy="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3.5 border-b border-line py-5 last:border-b-0">
            <Sk className="size-10 flex-none" />
            <Sk className="h-3.5 w-[55%]" />
          </div>
        ))}
      </div>
    );
  }

  const { devices = [], backupCode = false, helper = null } = options.data ?? {};
  const kind = devices[0]?.kind ?? "laptop";

  return (
    <>
      <div className="border-t border-line">
        {devices.length > 0 && (
          <WayRow
            icon={<DeviceGlyph kind={kind} size={20} />}
            title="Approve on one of your other devices"
            sub="Every device you’re signed in on is asked"
            busy={request.isPending}
            onClick={() =>
              request.mutate(undefined, {
                onSuccess: (approvalId) => go(`/unlock?wait=${encodeURIComponent(approvalId)}&kind=${kind}`),
              })
            }
          />
        )}
        {backupCode && <WayRow icon={<KeyIcon size={20} />} title="Use your backup code" onClick={() => go("/unlock/code")} />}
        {helper && <WayRow icon={<PeopleIcon size={20} />} title="Ask your trusted person to help" sub="They approve it for you" onClick={() => go("/unlock/ask")} />}
        <WayRow icon={<HelpIcon size={20} />} title="Get help from afterbox" last onClick={() => go("/unlock/help")} />
      </div>
      <FormMessage message={request.isError ? failureCopy(request.error) : null} gapClassName="pt-3" />
    </>
  );
}

function WaysOverlay() {
  const { close } = useLayers();
  return (
    <Overlay kind="modal" width={520} onClose={close}>
      <div className="text-center">
        <DialogTitle className="mb-7">Other ways to unlock</DialogTitle>
      </div>
      <WaysList onDone={close} />
    </Overlay>
  );
}

function Ways() {
  const { sheet } = useLayers();
  return <AnimatePresence>{sheet === "ways" && <WaysOverlay key="ways" />}</AnimatePresence>;
}

/** On 04 and 06: the second option, directly under the main button. */
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

/* 04: unlock on a device that holds its blob. The passkey first (it binds this session to the device), then the blob. */

function UnlockStep({ me, onCantUse }: { me: Me; onCantUse: () => void }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const unlock = useUnlockWithPasskey();

  function run() {
    unlock.mutate(me, {
      onSuccess: () => router.replace(next),
      onError: (error) => {
        // This device's blob no longer opens the record (another device's help re-split the key, or it was removed).
        if (isApiError(error) && (error.status === 403 || error.code === "PASSKEY_FAILED")) onCantUse();
      },
    });
  }

  return (
    <div className="text-center">
      <RoundIcon>
        <FingerprintIcon size={26} />
      </RoundIcon>
      <PageTitle className="mb-3">Unlock your record</PageTitle>
      <Lead className="mb-10">Confirm it’s you to open it here.</Lead>
      <Button variant="inkDeep" size="block" loading={unlock.isPending} loadingLabel="Unlocking" onClick={run}>
        Unlock
      </Button>
      <FormMessage message={unlock.isError ? failureCopy(unlock.error) : null} gapClassName="pt-3" />
      <OtherWaysLink />
    </div>
  );
}

/* A device without its blob: the ways in, as the page. */

function NewDeviceStep({ dropped }: { dropped: boolean }) {
  return (
    <div>
      <div className="text-center">
        <RoundIcon>
          <KeyIcon size={26} />
        </RoundIcon>
        <PageTitle className="mb-3">Open your record here</PageTitle>
        <Lead className="mb-8">
          {dropped ? "This device can’t open your record any more. Choose another way in." : `This ${thisDevice()} is new. Choose how to let it in.`}
        </Lead>
      </div>
      <WaysList />
    </div>
  );
}

/* 06: waiting for another device. The ring pulses slowly; realtime and polling both move it on. */

function WaitingStep({ me, approvalId, kind, onIn }: { me: Me; approvalId: string; kind: DeviceKind; onIn: () => void }) {
  const { reduced } = useMotionTokens();
  const router = useRouter();
  const approval = useApproval(approvalId, { poll: true });
  const collect = useCollectApproval();
  const collecting = useRef(false);
  const status = approval.data?.status;

  useRealtimeEvent("device.approved", ({ approvalId: approved }) => {
    if (approved === approvalId) approval.refetch();
  });

  useEffect(() => {
    if (status !== "approved" || collecting.current) return;
    collecting.current = true;
    collect.mutate({ approvalId, userId: me.id }, { onSuccess: onIn, onError: () => (collecting.current = false) });
  }, [approvalId, collect, me.id, onIn, status]);

  const ended = status === "declined" || status === "expired" || status === "collected" || approval.isError;

  if (ended) {
    return (
      <div className="text-center">
        <RoundIcon>
          <ClockIcon size={26} />
        </RoundIcon>
        <PageTitle className="mb-3">{status === "declined" ? "That request was blocked" : "That request has ended"}</PageTitle>
        <Lead className="mb-9">Ask again, or choose another way in.</Lead>
        <Button variant="inkDeep" size="block" onClick={() => router.replace("/unlock")}>
          Choose a way in
        </Button>
      </div>
    );
  }

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
          <DeviceGlyph kind={kind} size={30} />
        </span>
      </div>
      <PageTitle className="mb-3">Approve on one of your other devices</PageTitle>
      <Lead className="mb-9">Open afterbox there and tap Approve. We’ve emailed you a link too.</Lead>
      <p role="status" className="mb-7 flex items-center justify-center gap-2.5 text-sm/[normal] text-ink-soft">
        <Spinner />
        {collect.isPending ? "Letting this device in" : "Waiting for you to approve"}
      </p>
      <FormMessage message={collect.isError ? failureCopy(collect.error) : null} gapClassName="pb-3" />
      <OtherWaysLink />
    </div>
  );
}

/** /unlock: 04 (or the ways in, on a new device), 06 with `?wait=`, 05 over either, 08 once in. */
export function UnlockScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const me = useMe();
  const blob = useDeviceBlob(me.data?.keysReady ? me.data.id : undefined);
  const open = useOpenRequest(blob.data === false ? me.data?.id : undefined);
  const [inNow, setInNow] = useState(false);
  const [dropped, setDropped] = useState(false);
  const waitFor = params.get("wait");
  const kind = (params.get("kind") === "phone" ? "phone" : "laptop") as DeviceKind;

  // A request opened before a reload or a closed tab: back to its waiting screen.
  useEffect(() => {
    if (waitFor || !open.data) return;
    router.replace(open.data.kind === "help" ? `/unlock/ask?request=${encodeURIComponent(open.data.id)}` : `/unlock?wait=${encodeURIComponent(open.data.id)}`);
  }, [open.data, router, waitFor]);

  if (!me.data || blob.isPending) return null;
  if (inNow) return <YoureIn next={safeNext(params.get("next"))} />;

  const step =
    waitFor ? (
      <WaitingStep me={me.data} approvalId={waitFor} kind={kind} onIn={() => setInNow(true)} />
    ) : blob.data && !dropped ? (
      <UnlockStep
        me={me.data}
        onCantUse={() => {
          setDropped(true);
          blob.refetch();
        }}
      />
    ) : (
      <NewDeviceStep dropped={dropped} />
    );

  return (
    <>
      <Step id={waitFor ? `wait-${waitFor}` : blob.data && !dropped ? "unlock" : "new"}>{step}</Step>
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
  const me = useMe();
  const params = useSearchParams();
  const unlock = useUnlockWithCode();
  const [groups, setGroups] = useState<string[]>(() => Array(GROUPS).fill(""));
  const [wrong, setWrong] = useState(false);
  const [shake, setShake] = useState(0);
  const [inNow, setInNow] = useState(false);
  const complete = groups.join("").length === CODE_LENGTH;

  function submit() {
    if (!me.data) return;
    setWrong(false);
    unlock.mutate(
      { code: groups.join(""), userId: me.data.id },
      {
        onSuccess: (ok) => {
          if (ok) {
            setInNow(true);
            return;
          }
          setWrong(true);
          setShake((count) => count + 1);
        },
      },
    );
  }

  if (inNow) return <YoureIn next={safeNext(params.get("next"))} />;

  const error = wrong
    ? WRONG_CODE
    : unlock.isError
      ? isApiError(unlock.error) && unlock.error.status === 404
        ? "There’s no backup code on your account. Choose another way in."
        : failureCopy(unlock.error)
      : null;

  return (
    <form
      className="text-center"
      onSubmit={(event) => {
        event.preventDefault();
        if (complete && !unlock.isPending) submit();
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
          setWrong(false);
        }}
        invalid={wrong}
        labelledBy={titleId}
        describedBy={error ? `${titleId}-message` : undefined}
        shake={shake}
        disabled={unlock.isPending}
      />
      <FormMessage id={`${titleId}-message`} message={error} gapClassName="pt-3" />
      <div className="h-8" />
      <Button type="submit" variant="inkDeep" size="block" loading={unlock.isPending} loadingLabel="Unlocking" disabled={!complete}>
        Unlock
      </Button>
    </form>
  );
}

/* 10 and 11: ask the trusted person (never named before unlock), then the cooling-off hour, then back in. */

function AskStep({ onSent }: { onSent: (requestId: string) => void }) {
  const request = useRequestHelp();
  return (
    <div>
      <div className="text-center">
        <RoundIcon>
          <PeopleIcon size={26} />
        </RoundIcon>
        <PageTitle className="mb-3">Ask your trusted person to help</PageTitle>
        <Lead className="mb-8">They can approve it for you from their own afterbox.</Lead>
      </div>
      <Button variant="inkDeep" size="block" loading={request.isPending} loadingLabel="Sending" onClick={() => request.mutate(undefined, { onSuccess: onSent })}>
        Send request
      </Button>
      <FormMessage
        message={
          request.isError
            ? isApiError(request.error) && request.error.status === 409
              ? "Your trusted person can’t help yet. Choose another way in."
              : failureCopy(request.error)
            : null
        }
        gapClassName="pt-3"
      />
      <p className="mt-5 flex items-center justify-center gap-[7px] text-[13px] text-ink-soft">
        <MailIcon size={14} />
        We’ll email you a copy.
      </p>
    </div>
  );
}

const timeOfDay = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });

/** "3:42pm" */
const backAt = (iso: string) => timeOfDay.format(new Date(iso)).replace(" ", "").toLowerCase();

function HelpWait({ me, requestId, onIn }: { me: Me; requestId: string; onIn: () => void }) {
  const router = useRouter();
  const help = useHelpRequest(requestId, { poll: true });
  const collect = useCollectHelp();
  const forget = useForgetHelpRequest();
  const collecting = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const data = help.data;
  const due = data?.collectableAt ? Date.parse(data.collectableAt) : null;
  const ready = data?.status === "approved" && due !== null && now >= due;

  useRealtimeEvent("device.approved", ({ approvalId }) => {
    if (approvalId === requestId) help.refetch();
  });

  // Move on by ourselves when the hour is up, even without the event.
  useEffect(() => {
    if (!due || ready) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(1000, due - Date.now() + 500), 60_000));
    return () => clearTimeout(timer);
  }, [due, now, ready]);

  useEffect(() => {
    if (!ready || collecting.current) return;
    collecting.current = true;
    collect.mutate(
      { requestId, userId: me.id },
      {
        onSuccess: onIn,
        onError: (error) => {
          // Early (clocks disagree): wait for the server's time.
          if (isApiError(error) && error.status === 409 && error.details.collectableAt) setNow(Date.now());
          collecting.current = false;
        },
      },
    );
  }, [collect, me.id, onIn, ready, requestId]);

  const ended = data && ["declined", "cancelled", "expired", "collected"].includes(data.status);
  useEffect(() => {
    if (ended) forget.mutate(requestId);
    // Once per ending.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, requestId]);

  if (help.isPending) {
    return (
      <div className="text-center" aria-busy="true">
        <Sk round className="mx-auto mb-5 size-16" />
        <Sk className="mx-auto mb-3 h-8 w-56" />
        <Sk className="mx-auto mb-9 h-4 w-64" />
        <Sk round className="h-[52px] w-full" />
      </div>
    );
  }

  if (help.isError || ended) {
    const declined = data?.status === "declined";
    return (
      <div className="text-center">
        <RoundIcon>
          <ClockIcon size={26} />
        </RoundIcon>
        <PageTitle className="mb-3">{declined ? "Your trusted person didn’t approve" : "That request has ended"}</PageTitle>
        <Lead className="mb-9">Choose another way in, or ask again later.</Lead>
        <Button variant="inkDeep" size="block" onClick={() => router.replace("/unlock")}>
          Choose a way in
        </Button>
      </div>
    );
  }

  if (data?.status === "approved" && data.collectableAt) {
    return (
      <div className="text-center">
        <span role="status" className="sr-only">
          Approved
        </span>
        <Celebration tone="positive" className="mb-5">
          <ClockIcon size={32} />
        </Celebration>
        <PageTitle className="mb-3">Your trusted person has approved</PageTitle>
        <Lead className="mb-3">You’ll be back in at {backAt(data.collectableAt)}.</Lead>
        <p className="mb-9 text-[13px] text-ink-soft">We wait an hour to keep your record safe. You can close this page and come back.</p>
        <p role="status" className="flex items-center justify-center gap-2.5 text-sm/[normal] text-ink-soft">
          <Spinner />
          {collect.isPending ? "Letting this device in" : "Waiting"}
        </p>
        <FormMessage message={collect.isError ? failureCopy(collect.error) : null} gapClassName="pt-3" />
      </div>
    );
  }

  return (
    <div className="text-center">
      <span role="status" className="sr-only">
        Request sent
      </span>
      <Celebration tone="deep" className="mb-5">
        <MailIcon size={32} />
      </Celebration>
      <PageTitle className="mb-3">Request sent</PageTitle>
      <Lead className="mb-9">You’ll be back in once your trusted person approves. We’ve emailed you too.</Lead>
      <p role="status" className="flex items-center justify-center gap-2.5 text-sm/[normal] text-ink-soft">
        <Spinner />
        Waiting for them to approve
      </p>
    </div>
  );
}

/** After help: the key was split again, so the other devices and the backup code need setting up again. */
function SetUpAgain({ next }: { next: string }) {
  const router = useRouter();
  return (
    <div className="text-center">
      <span role="status" className="sr-only">
        Unlocked
      </span>
      <Celebration tone="positive" className="mb-5">
        <PeopleIcon size={32} />
      </Celebration>
      <PageTitle className="mb-3">You’re in</PageTitle>
      <Lead className="mb-9">Your other devices and backup code need setting up again.</Lead>
      <Button variant="inkDeep" size="block" onClick={() => router.replace("/home/settings/security")}>
        Approve another device
      </Button>
      <Button variant="ground" size="block" className="mt-3" onClick={() => router.replace(NEW_BACKUP_CODE)}>
        Make a new backup code
      </Button>
      <QuietLink onClick={() => router.replace(next)} className="mt-4">
        Go to my record
      </QuietLink>
    </div>
  );
}

export function AskScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const me = useMe();
  const options = useUnlockOptions();
  const requestId = params.get("request");
  const [inNow, setInNow] = useState(false);
  const next = safeNext(params.get("next"));

  useEffect(() => {
    if (!requestId && options.data && !options.data.helper) router.replace("/unlock");
  }, [options.data, requestId, router]);

  if (!me.data) return null;
  if (inNow) return <SetUpAgain next={next} />;

  return (
    <Step id={requestId ? "sent" : "ask"}>
      {requestId ? (
        <HelpWait me={me.data} requestId={requestId} onIn={() => setInNow(true)} />
      ) : (
        <AskStep onSent={(id) => router.replace(`/unlock/ask?request=${encodeURIComponent(id)}`, { scroll: false })} />
      )}
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
