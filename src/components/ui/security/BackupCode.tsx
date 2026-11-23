"use client";

import { useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import { CopyIcon, DownloadIcon, KeyIcon } from "@/components/ui/icons";
import QuietLink from "@/components/ui/onboarding/QuietLink";
import { showToast } from "@/components/ui/dashboard/toast";
import { errorCopy, isApiError } from "@/lib/api/errors";
import { pressable } from "@/lib/motion";
import { formatCode } from "@/lib/security/backup";
import { copyCode, downloadCode, saveToBrowser } from "@/lib/security/backupActions";
import { PASSKEY_ERROR, PasskeyError } from "@/lib/security/keychain";
import { useSaveBackupCode } from "@/store/recovery";

function Action({ icon, onClick, children }: { icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line text-[13px] font-semibold text-ink hover:bg-ground ${pressable}`}
    >
      <span className="text-ink-soft">{icon}</span>
      {children}
    </button>
  );
}

/**
 * 03's code step (and Settings' "Add"): shown once, optional, with Save, Copy and Download, then one Done.
 * Done stores the envelope only when the code was kept somewhere (S: the passkey is asked for again).
 * Not kept: Done just moves on and Ways back in shows the backup code as "Add".
 */
export default function BackupCode({ code, email, onDone }: { code: string; email: string; onDone: (saved: boolean) => void }) {
  const [kept, setKept] = useState(false);
  const save = useSaveBackupCode();

  async function copy() {
    try {
      await copyCode(code);
      setKept(true);
      showToast("Copied");
      return true;
    } catch {
      // No clipboard (an old browser, or permission refused): the code is still on screen to write down.
      return false;
    }
  }

  function download() {
    downloadCode(code);
    setKept(true);
  }

  async function toBrowser() {
    if (await saveToBrowser(code, email)) {
      setKept(true);
      showToast("Saved");
    } else if (!(await copy())) download();
  }

  function done() {
    if (!kept) {
      onDone(false);
      return;
    }
    save.mutate(code, { onSuccess: () => onDone(true) });
  }

  const message = save.isError
    ? save.error instanceof PasskeyError
      ? PASSKEY_ERROR
      : isApiError(save.error) && save.error.status === 409
        ? save.error.message
        : errorCopy(save.error)
    : null;

  return (
    <>
      <p className="mb-2.5 text-[13px] text-ink-soft">
        Backup code <span className="text-ink-soft/70">· optional</span>
      </p>
      <div className="mb-3 rounded-panel border border-line bg-ground p-5 text-center max-[379px]:px-3">
        <span
          data-testid="backup-code"
          className="text-[15px] font-semibold tracking-[0.02em] whitespace-nowrap text-ink tabular-nums select-all sm:text-[19px] sm:tracking-[0.05em]"
        >
          {formatCode(code)}
        </span>
      </div>
      <div className="mb-10 flex gap-2">
        <Action icon={<KeyIcon size={15} />} onClick={toBrowser}>
          Save
        </Action>
        <Action icon={<CopyIcon size={15} />} onClick={copy}>
          Copy
        </Action>
        <Action icon={<DownloadIcon size={15} />} onClick={download}>
          Download
        </Action>
      </div>
      <Button variant="inkDeep" size="block" loading={save.isPending} loadingLabel="Saving your code" onClick={done}>
        Done
      </Button>
      <FormMessage message={message} gapClassName="pt-3" />
      {save.isError && (
        <QuietLink onClick={() => onDone(false)} className="mt-4">
          Skip for now
        </QuietLink>
      )}
    </>
  );
}
