"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { CheckIcon, ResendIcon } from "@/components/ui/icons";
import { useReveal } from "@/components/ui/onboarding/Motion";
import Spinner from "@/components/ui/Spinner";
import { timings } from "@/lib/auth";

type ResendTimerProps = {
  onResend: () => void;
  /** The spinner replaces the timer while a code is checked. */
  checking?: boolean;
  /** The code expired: start on the resend icon, in ink-deep. */
  expired?: boolean;
  /** The code checked out: a tick and "Verified" take the timer's place. */
  verified?: boolean;
};

/** "0:59" counting down, then a bare resend icon; a tap shows a tick, then the countdown restarts. */
export default function ResendTimer({ onResend, checking = false, expired = false, verified = false }: ResendTimerProps) {
  const reveal = useReveal();
  const [seconds, setSeconds] = useState(expired ? 0 : timings.resendCooldown);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (sent || seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [sent, seconds]);

  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => {
      setSent(false);
      setSeconds(timings.resendCooldown);
    }, timings.resentTick);
    return () => clearTimeout(timer);
  }, [sent]);

  function resend() {
    setSent(true);
    onResend();
  }

  let content;
  if (verified) {
    content = (
      <span className="flex items-center gap-1.5 text-sm font-medium text-positive">
        <motion.span {...reveal.pop()} className="flex">
          <CheckIcon size={18} />
        </motion.span>
        Verified
      </span>
    );
  } else if (checking) {
    content = <Spinner className="text-ink-soft" />;
  } else if (sent) {
    content = <CheckIcon size={20} className="text-positive" />;
  } else if (seconds > 0) {
    content = (
      <span role="timer" className="text-sm font-medium text-ink-soft/70 tabular-nums">
        {`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
        <span className="sr-only"> until you can resend the code</span>
      </span>
    );
  } else {
    content = (
      <button
        type="button"
        aria-label="Resend code"
        onClick={resend}
        className={`flex size-11 items-center justify-center rounded-full transition-colors duration-200 ${
          expired ? "text-ink-deep" : "text-ink-soft hover:text-ink"
        }`}
      >
        <ResendIcon size={20} />
      </button>
    );
  }

  return (
    <div className="flex h-11 items-center justify-center">
      <span key={verified ? "verified" : checking ? "checking" : sent ? "sent" : seconds > 0 ? "timer" : "resend"} className="auth-fade flex min-w-11 items-center justify-center">
        {content}
      </span>
      <span role="status" className="sr-only">
        {verified ? "Verified" : checking ? "Checking" : sent ? "New code sent" : ""}
      </span>
    </div>
  );
}
