"use client";

import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import { CheckIcon, FingerprintIcon, LockIcon } from "@/components/ui/icons";
import { Lead, PageTitle, RoundIcon } from "@/components/ui/dashboard/bits";
import { Step } from "@/components/ui/dashboard/Layer";
import BackupCode from "@/components/ui/security/BackupCode";
import { errorCopy, isApiError } from "@/lib/api/errors";
import { safePath } from "@/lib/afterSignIn";
import { transition } from "@/lib/motion";
import { generateCode } from "@/lib/security/backup";
import { PASSKEY_ERROR, PasskeyError } from "@/lib/security/keychain";
import { useMotionTokens } from "@/lib/useMotionTokens";
import { useLockRecord } from "@/store/keys";
import { useMe } from "@/store/me";

/** Where to go after locking or unlocking: only our own record or invite pages (see safePath), else Home. */
export function safeNext(next: string | null) {
  return safePath(next) ?? "/home";
}

/** 03's check: springs in over a soft green glow. */
function LockedCheck() {
  const { grow, reduced } = useMotionTokens();
  return (
    <div aria-hidden="true" className="relative mx-auto mb-6 flex size-14 items-center justify-center">
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={transition("slow", 0.1)}
        className="absolute top-1/2 left-1/2 size-[140px] -translate-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-positive)_28%,transparent),transparent_65%)]"
      />
      <motion.span
        initial={{ scale: grow(0.6), opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduced ? transition("base") : { type: "spring", stiffness: 420, damping: 20, opacity: transition("fast") }}
        className="relative flex size-14 items-center justify-center rounded-full bg-positive text-on-night"
      >
        <CheckIcon size={26} strokeWidth={2.6} />
      </motion.span>
    </div>
  );
}

/**
 * 01 Keep your record yours, 02 locking, 03 locked with the optional backup code. Can't be skipped.
 * The record key is made and split in this browser; only the pieces the API needs leave it.
 */
export default function SecureScreen() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const me = useMe();
  const lock = useLockRecord();
  const [code, setCode] = useState<string | null>(null);
  // Read on arrival only: once 03 shows, the record is locked and this screen stays.
  const [setUpAlready, setSetUpAlready] = useState<boolean | null>(null);
  if (setUpAlready === null && me.data) setSetUpAlready(me.data.keysReady);

  useEffect(() => {
    router.prefetch(next);
    if (setUpAlready) router.replace(next);
  }, [next, router, setUpAlready]);

  function start() {
    if (!me.data) return;
    lock.mutate(me.data, { onSuccess: () => setCode(generateCode()) });
  }

  const error = lock.isError
    ? lock.error instanceof PasskeyError
      ? PASSKEY_ERROR
      : isApiError(lock.error) && lock.error.status === 409
        ? "Your record is already locked."
        : errorCopy(lock.error)
    : null;

  if (setUpAlready !== false) return null;

  return (
    <Step id={code ? "locked" : "keep"}>
      {code && me.data ? (
        <div>
          <span role="status" className="sr-only">
            Record locked
          </span>
          <LockedCheck />
          <PageTitle className="mb-9 text-center">Your record is locked</PageTitle>
          <BackupCode code={code} email={me.data.email} onDone={() => router.replace(next)} />
        </div>
      ) : (
        <div className="text-center">
          <RoundIcon>
            <FingerprintIcon size={26} />
          </RoundIcon>
          <PageTitle className="mb-3">Keep your record yours</PageTitle>
          <Lead className="mb-10 text-balance">Only you, and the people you choose, can open it.</Lead>
          <Button variant="inkDeep" size="block" loading={lock.isPending} loadingLabel="Locking" disabled={!me.data} onClick={start}>
            Lock my record
          </Button>
          <FormMessage message={error} gapClassName="pt-3" />
          <p className="mt-5 flex items-center justify-center gap-[7px] text-[13px] text-ink-soft">
            <LockIcon size={14} />
            Uses your face, fingerprint or device PIN.
          </p>
        </div>
      )}
    </Step>
  );
}
