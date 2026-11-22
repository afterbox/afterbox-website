"use client";

import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import { CopyIcon, DownloadIcon, KeyIcon } from "@/components/ui/icons";
import { showToast } from "@/components/ui/dashboard/toast";
import { pressable } from "@/lib/motion";
import { copyCode, downloadCode, formatCode, markBackupSaved, saveToBrowser } from "@/lib/security/recovery";

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

/** 03's code step: shown once, optional, with Save, Copy and Download, then one Done. */
export default function BackupCode({ code, onDone }: { code: string; onDone: () => void }) {
  async function copy() {
    try {
      await copyCode(code);
      markBackupSaved();
      showToast("Copied");
      return true;
    } catch {
      // No clipboard (an old browser, or permission refused): the code is still on screen to write down.
      return false;
    }
  }

  function download() {
    downloadCode(code);
    markBackupSaved();
  }

  async function save() {
    if (await saveToBrowser(code)) {
      markBackupSaved();
      showToast("Saved");
    } else if (!(await copy())) download();
  }

  return (
    <>
      <p className="mb-2.5 text-[13px] text-ink-soft">
        Backup code <span className="text-ink-soft/70">· optional</span>
      </p>
      <div className="mb-3 rounded-panel border border-line bg-ground p-5 text-center max-[379px]:px-3">
        <span className="text-[15px] font-semibold tracking-[0.02em] whitespace-nowrap text-ink tabular-nums select-all sm:text-[19px] sm:tracking-[0.05em]">
          {formatCode(code)}
        </span>
      </div>
      <div className="mb-10 flex gap-2">
        <Action icon={<KeyIcon size={15} />} onClick={save}>
          Save
        </Action>
        <Action icon={<CopyIcon size={15} />} onClick={copy}>
          Copy
        </Action>
        <Action icon={<DownloadIcon size={15} />} onClick={download}>
          Download
        </Action>
      </div>
      <Button variant="inkDeep" size="block" onClick={onDone}>
        Done
      </Button>
    </>
  );
}
