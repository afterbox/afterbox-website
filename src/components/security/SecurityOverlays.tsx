"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import Monogram from "@/components/ui/onboarding/Monogram";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import { Lead, Square } from "@/components/ui/dashboard/bits";
import { FormNote } from "@/components/ui/dashboard/fields";
import { DialogTitle, Overlay, useLayers } from "@/components/ui/dashboard/Layer";
import { showToast } from "@/components/ui/dashboard/toast";
import BackupCode from "@/components/ui/security/BackupCode";
import { DeviceGlyph } from "@/components/security/UnlockScreens";
import { pressable } from "@/lib/motion";
import { approveSignIn, declineSignIn, pendingSignIn, removeDevice } from "@/lib/security/device";
import { approveHelp, declineHelp, helpRequestFrom } from "@/lib/security/recovery";
import { useAccountSecurity } from "@/lib/security/store";

const message = (caught: unknown) => (caught instanceof Error ? caught.message : String(caught));

/** How long "Approved" shows on the button before the overlay closes. */
const APPROVED_HOLD = 900;

/** Approve: a spinner while it goes through, then "Approved" with a tick, then closes. */
function useApprove(approve: () => Promise<void>) {
  const { close } = useLayers();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function run() {
    setState("busy");
    setError(null);
    try {
      await approve();
      setState("done");
      timer.current = window.setTimeout(close, APPROVED_HOLD);
    } catch (caught) {
      setError(message(caught));
      setState("idle");
    }
  }

  const button = (
    <Button variant="inkDeep" size="block" loading={state === "busy"} loadingLabel="Approving" disabled={state === "done"} onClick={run}>
      {state === "done" ? (
        <>
          <CheckIcon size={18} strokeWidth={2.4} />
          Approved
        </>
      ) : (
        "Approve"
      )}
    </Button>
  );

  return { button, error, done: state === "done", busy: state === "busy" };
}

/** "This wasn’t me" and "I didn’t expect this": 14px, alert, under the button. */
function AlertLink({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <p className="mt-6 text-center">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`cursor-pointer text-sm/[normal] font-semibold text-alert hover:opacity-80 disabled:pointer-events-none disabled:opacity-40 ${pressable}`}
      >
        {children}
      </button>
    </p>
  );
}

function useBlock(decline: () => Promise<void>, action?: { label: string; href: string }) {
  const { close } = useLayers();
  const [busy, setBusy] = useState(false);
  async function block() {
    setBusy(true);
    try {
      await decline();
    } finally {
      close();
      showToast("We’ve blocked it", action);
    }
  }
  return { block, busy };
}

/* 07: approve a new sign-in, on a device that can already open the record. */

export function ApproveDeviceOverlay() {
  const { close } = useLayers();
  const [signIn] = useState(pendingSignIn);
  const approve = useApprove(approveSignIn);
  const { block, busy } = useBlock(declineSignIn, { label: "Review devices", href: "/home/settings/security" });

  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <DialogTitle className="mb-2">Approve new sign-in?</DialogTitle>
        <Lead className="mb-8">It will be able to open your record.</Lead>
      </div>
      <div className="mb-8 flex items-center gap-3.5 rounded-panel border border-line bg-ground px-5 py-[18px]">
        <Square size={36}>
          <DeviceGlyph kind={signIn.kind} size={18} />
        </Square>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] text-ink">{signIn.name}</p>
          <p className="mt-0.5 text-[13px] text-ink-soft">{signIn.city} · just now</p>
        </div>
      </div>
      {approve.button}
      <FormNote error={approve.error} />
      <AlertLink onClick={block} disabled={busy || approve.busy || approve.done}>
        This wasn’t me
      </AlertLink>
    </Overlay>
  );
}

/* 12: the trusted person's side of 10. */

export function HelpRequestOverlay() {
  const { close } = useLayers();
  const [from] = useState(helpRequestFrom);
  const approve = useApprove(approveHelp);
  const { block, busy } = useBlock(declineHelp);

  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <div className="mb-5 flex justify-center">
          <Monogram letters={from.initials} size="lg" />
        </div>
        <DialogTitle className="mb-2">Help {from.first} get back in?</DialogTitle>
        <Lead className="mb-9">Only approve if {from.first} asked you.</Lead>
      </div>
      {approve.button}
      <FormNote error={approve.error} />
      <AlertLink onClick={block} disabled={busy || approve.busy || approve.done}>
        I didn’t expect this
      </AlertLink>
    </Overlay>
  );
}

/* 16: remove a device. The row collapses on Devices and access once it's gone. */

export function RemoveDeviceOverlay() {
  const { close, param } = useLayers();
  const account = useAccountSecurity();
  const found = account?.devices.find((device) => device.id === param("item")) ?? null;
  const [kept] = useState(found);
  const device = found ?? kept;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!device) close();
  }, [device, close]);
  if (!device) return null;

  async function remove() {
    if (!device) return;
    setBusy(true);
    setError(null);
    try {
      await removeDevice(device.id);
      close();
      showToast("Removed");
    } catch (caught) {
      setError(message(caught));
      setBusy(false);
    }
  }

  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <span aria-hidden="true" className="mx-auto mb-5 flex size-14 items-center justify-center rounded-field bg-alert/8 text-alert">
          <DeviceGlyph kind={device.kind} size={28} />
        </span>
        <DialogTitle className="mb-2">Remove {device.name}?</DialogTitle>
        <Lead className="mb-9">It won’t be able to open your record anymore.</Lead>
      </div>
      <Button variant="alert" size="block" loading={busy} loadingLabel="Removing" onClick={remove}>
        Remove
      </Button>
      <FormNote error={error} />
      <QuietLink onClick={close} className="mt-[18px]">
        Keep it
      </QuietLink>
    </Overlay>
  );
}

/* Settings → Backup code → Add: the same step as 03, after the passkey. */

export function BackupCodeOverlay() {
  const { close } = useLayers();
  const account = useAccountSecurity();
  const [code] = useState(account?.backupCode ?? null);

  useEffect(() => {
    if (!code) close();
  }, [code, close]);
  if (!code) return null;

  return (
    <Overlay kind="modal" width={520} onClose={close} label="Backup code">
      <BackupCode code={code} onDone={close} />
    </Overlay>
  );
}
