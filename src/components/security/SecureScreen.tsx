"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import { CheckIcon, FingerprintIcon, LockIcon } from "@/components/ui/icons";
import { Lead, PageTitle, RoundIcon } from "@/components/ui/dashboard/bits";
import { Step } from "@/components/ui/dashboard/Layer";
import BackupCode from "@/components/ui/security/BackupCode";
import { transition } from "@/lib/motion";
import { PASSKEY_ERROR } from "@/lib/security/passkey";
import { lockRecord } from "@/lib/security/recovery";
import { accessHref, accessNow, hasPasskey } from "@/lib/security/store";
import { useMotionTokens } from "@/lib/useMotionTokens";

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

/** 01 Keep your record yours, 02 locking, 03 locked with the optional backup code. Can't be skipped. */
export default function SecureScreen() {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read on arrival only: once 03 shows, the passkey exists and this screen stays.
  const [setUpAlready] = useState(hasPasskey);

  useEffect(() => {
    router.prefetch("/home");
    if (setUpAlready) router.replace(accessHref[accessNow()]);
  }, [setUpAlready, router]);

  async function lock() {
    setLocking(true);
    setError(null);
    try {
      setCode(await lockRecord());
    } catch {
      setError(PASSKEY_ERROR);
    } finally {
      setLocking(false);
    }
  }

  return (
    <Step id={code ? "locked" : "keep"}>
      {code ? (
        <div>
          <span role="status" className="sr-only">
            Record locked
          </span>
          <LockedCheck />
          <PageTitle className="mb-9 text-center">Your record is locked</PageTitle>
          <BackupCode code={code} onDone={() => router.replace("/home")} />
        </div>
      ) : (
        <div className="text-center">
          <RoundIcon>
            <FingerprintIcon size={26} />
          </RoundIcon>
          <PageTitle className="mb-3">Keep your record yours</PageTitle>
          <Lead className="mb-10 text-balance">Only you, and the people you choose, can open it.</Lead>
          <Button variant="inkDeep" size="block" loading={locking} loadingLabel="Locking" onClick={lock}>
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
