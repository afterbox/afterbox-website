"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { CheckIcon, PeopleIcon } from "@/components/ui/icons";
import Monogram from "@/components/ui/onboarding/Monogram";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import { Lead, Square } from "@/components/ui/dashboard/bits";
import { FormNote } from "@/components/ui/dashboard/fields";
import { DialogTitle, Overlay, useLayers } from "@/components/ui/dashboard/Layer";
import { Sk } from "@/components/ui/dashboard/Skeleton";
import { showToast } from "@/components/ui/dashboard/toast";
import BackupCode from "@/components/ui/security/BackupCode";
import { DeviceGlyph } from "@/components/security/UnlockScreens";
import { errorCopy, isApiError } from "@/lib/api/errors";
import { timeAgoIso } from "@/lib/dashboard/format";
import { pressable } from "@/lib/motion";
import { generateCode } from "@/lib/security/backup";
import { PASSKEY_ERROR, PasskeyError } from "@/lib/security/keychain";
import { useApproval, useApproveDevice, useDeclineDevice } from "@/store/approvals";
import { useRemoveDevice } from "@/store/devices";
import { useApproveHelp, useCancelHelp, useDeclineHelp, useHelpRequest } from "@/store/help";
import { useMe } from "@/store/me";
import { useSecurityOverview } from "@/store/security";

const failure = (error: unknown) => (error instanceof PasskeyError ? PASSKEY_ERROR : errorCopy(error));

/** How long "Approved" shows on the button before the overlay closes. */
const APPROVED_HOLD = 900;

/** Approve: a spinner while it goes through (passkey, re-unlock as needed), then "Approved" with a tick, then closes. */
function ApproveButton({ busy, done, onClick }: { busy: boolean; done: boolean; onClick: () => void }) {
  return (
    <Button variant="inkDeep" size="block" loading={busy} loadingLabel="Approving" disabled={done} onClick={onClick}>
      {done ? (
        <>
          <CheckIcon size={18} strokeWidth={2.4} />
          Approved
        </>
      ) : (
        "Approve"
      )}
    </Button>
  );
}

function useCloseAfter(done: boolean) {
  const { close } = useLayers();
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (done) timer.current = window.setTimeout(close, APPROVED_HOLD);
    return () => window.clearTimeout(timer.current);
  }, [close, done]);
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

function CardSkeleton() {
  return (
    <div className="mb-8 flex items-center gap-3.5 rounded-panel border border-line bg-ground px-5 py-[18px]" aria-busy="true">
      <Sk className="size-9 flex-none" />
      <div className="flex-1">
        <Sk className="mb-2 h-3.5 w-1/2" />
        <Sk className="h-3 w-1/3" />
      </div>
    </div>
  );
}

function Ended({ title }: { title: string }) {
  const { close } = useLayers();
  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <DialogTitle className="mb-2">{title}</DialogTitle>
        <Lead className="mb-8">There’s nothing to do here now.</Lead>
      </div>
      <Button variant="ground" size="block" onClick={close}>
        Close
      </Button>
    </Overlay>
  );
}

/* 07: approve a new sign-in, on a device that can already open the record. Opened by `device.approval_requested`
   or the email link (?sheet=approve-device&approval=<id>). */

export function ApproveDeviceOverlay() {
  const { close, param } = useLayers();
  const approvalId = param("approval");
  const approval = useApproval(approvalId);
  const approve = useApproveDevice();
  const decline = useDeclineDevice();
  useCloseAfter(approve.isSuccess);

  if (!approvalId || (approval.data && approval.data.status !== "pending" && !approve.isSuccess) || approval.isError) {
    return <Ended title="This request has ended" />;
  }

  function block() {
    decline.mutate(approvalId!, {
      onSettled: () => {
        close();
        showToast("We’ve blocked it", { label: "Review devices", href: "/home/settings/security" });
      },
    });
  }

  const request = approval.data;
  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <DialogTitle className="mb-2">Approve new sign-in?</DialogTitle>
        <Lead className="mb-8">It will be able to open your record.</Lead>
      </div>
      {request ? (
        <div className="mb-8 flex items-center gap-3.5 rounded-panel border border-line bg-ground px-5 py-[18px]">
          <Square size={36}>
            <DeviceGlyph kind={request.kind} size={18} />
          </Square>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-ink">{request.name}</p>
            <p className="mt-0.5 text-[13px] text-ink-soft">{timeAgoIso(request.requestedAt)}</p>
          </div>
        </div>
      ) : (
        <CardSkeleton />
      )}
      <ApproveButton busy={approve.isPending} done={approve.isSuccess} onClick={() => approve.mutate(approvalId)} />
      <FormNote error={approve.isError ? failure(approve.error) : null} />
      <AlertLink onClick={block} disabled={decline.isPending || approve.isPending || approve.isSuccess}>
        This wasn’t me
      </AlertLink>
    </Overlay>
  );
}

/* 12: the trusted person's side of 10 (?sheet=help-request&request=<id>, or `help.requested`). */

export function HelpRequestOverlay() {
  const { close, param } = useLayers();
  const requestId = param("request");
  const help = useHelpRequest(requestId);
  const approve = useApproveHelp();
  const decline = useDeclineHelp();
  useCloseAfter(approve.isSuccess);

  if (!requestId || help.isError || (help.data && help.data.status !== "pending" && !approve.isSuccess)) {
    return <Ended title="This request has ended" />;
  }

  const first = help.data?.memberFirstName ?? null;
  const who = first ?? "them";

  function block() {
    decline.mutate(requestId!, {
      onSettled: () => {
        close();
        showToast("We’ve blocked it");
      },
    });
  }

  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <div className="mb-5 flex justify-center">
          {first ? <Monogram letters={first.charAt(0).toUpperCase()} size="lg" /> : <Square size={52}><PeopleIcon size={24} /></Square>}
        </div>
        <DialogTitle className="mb-2">{first ? `Help ${first} get back in?` : "Help someone get back in?"}</DialogTitle>
        <Lead className="mb-6">Only approve if {who} asked you.</Lead>
      </div>
      {help.data ? (
        <p className="mb-8 text-center text-[13px] text-ink-soft">
          {[help.data.deviceLabel, timeAgoIso(help.data.requestedAt)].filter(Boolean).join(" · ")}
        </p>
      ) : (
        <Sk className="mx-auto mb-8 h-3 w-48" />
      )}
      <ApproveButton busy={approve.isPending} done={approve.isSuccess} onClick={() => approve.mutate(requestId)} />
      <FormNote error={approve.isError ? failure(approve.error) : null} />
      <AlertLink onClick={block} disabled={decline.isPending || approve.isPending || approve.isSuccess}>
        I didn’t expect this
      </AlertLink>
    </Overlay>
  );
}

/* The member's other devices, on `help.alert` (?sheet=help-alert&request=<id>): "This wasn't me" cancels it and signs
   the asking device out. New: no design existed; it reuses 07's calm modal. */

export function HelpAlertOverlay() {
  const { close, param } = useLayers();
  const requestId = param("request");
  const help = useHelpRequest(requestId);
  const cancel = useCancelHelp();

  if (!requestId || help.isError || (help.data && !["pending", "approved"].includes(help.data.status) && !cancel.isSuccess)) {
    return <Ended title="This request has ended" />;
  }

  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <DialogTitle className="mb-2">Someone asked to get back in</DialogTitle>
        <Lead className="mb-8">A trusted person was asked to let a new device open your record. If that was you, there’s nothing to do.</Lead>
      </div>
      {help.data ? (
        <div className="mb-8 rounded-panel border border-line bg-ground px-5 py-[18px] text-center text-[13px] text-ink-soft">
          {[help.data.deviceLabel, timeAgoIso(help.data.requestedAt)].filter(Boolean).join(" · ")}
        </div>
      ) : (
        <CardSkeleton />
      )}
      <Button variant="ground" size="block" onClick={close}>
        It was me
      </Button>
      <FormNote error={cancel.isError ? failure(cancel.error) : null} />
      <AlertLink
        onClick={() =>
          cancel.mutate(
            { requestId },
            {
              onSuccess: () => {
                close();
                showToast("We’ve blocked it", { label: "Review devices", href: "/home/settings/security" });
              },
            },
          )
        }
        disabled={cancel.isPending}
      >
        This wasn’t me
      </AlertLink>
    </Overlay>
  );
}

/* 16: remove a device (S). The row collapses on Devices and access once it's gone. */

export function RemoveDeviceOverlay() {
  const { close, param } = useLayers();
  const overview = useSecurityOverview();
  const remove = useRemoveDevice();
  const found = overview.data?.devices.find((device) => device.id === param("item")) ?? null;
  const [kept] = useState(found);
  const device = found ?? kept;

  useEffect(() => {
    if (overview.isSuccess && !device) close();
  }, [close, device, overview.isSuccess]);
  if (!device) return null;

  return (
    <Overlay kind="modal" width={480} onClose={close}>
      <div className="text-center">
        <span aria-hidden="true" className="mx-auto mb-5 flex size-14 items-center justify-center rounded-field bg-alert/8 text-alert">
          <DeviceGlyph kind={device.kind} size={28} />
        </span>
        <DialogTitle className="mb-2">Remove {device.name}?</DialogTitle>
        <Lead className="mb-9">It won’t be able to open your record anymore.</Lead>
      </div>
      <Button
        variant="alert"
        size="block"
        loading={remove.isPending}
        loadingLabel="Removing"
        onClick={() =>
          remove.mutate(device.id, {
            onSuccess: () => {
              close();
              showToast("Removed");
            },
          })
        }
      >
        Remove
      </Button>
      <FormNote error={remove.isError ? failure(remove.error) : null} />
      <QuietLink onClick={close} className="mt-[18px]">
        Keep it
      </QuietLink>
    </Overlay>
  );
}

/* Settings → Backup code → Add (or a new one): the same step as 03. Any unlocked device can make one. */

export function BackupCodeOverlay() {
  const { close } = useLayers();
  const me = useMe();
  const [code] = useState(generateCode);

  if (!me.data) return null;

  return (
    <Overlay kind="modal" width={520} onClose={close} label="Backup code">
      <BackupCode
        code={code}
        email={me.data.email}
        onDone={(saved) => {
          close();
          if (saved) showToast("Saved");
        }}
      />
    </Overlay>
  );
}

export const isConflict = (error: unknown) => isApiError(error) && error.status === 409;
