"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import AuthCard from "@/components/ui/auth/AuthCard";
import AuthTitle from "@/components/ui/auth/AuthTitle";
import CodeInput, { CODE_LENGTH, type CodeInputState } from "@/components/ui/auth/CodeInput";
import ResendTimer from "@/components/ui/auth/ResendTimer";
import { onboardingHref, useHandOff } from "@/components/ui/auth/useHandOff";
import BrandMark from "@/components/ui/BrandMark";
import FormMessage, { Reveal } from "@/components/ui/FormMessage";
import { PencilIcon } from "@/components/ui/icons";
import {
  authHref,
  checkCode,
  DEMO_CODE,
  DEMO_EMAIL,
  isOffline,
  MAX_TRIES,
  readDemo,
  readMode,
  timings,
  type AuthMode,
  type Demo,
} from "@/lib/mock-auth";
import { FLOW_CARD, transition } from "@/lib/motion";

type Status = "idle" | "checking" | "wrong" | "expired" | "locked" | "offline" | "verified";

const boxState: Partial<Record<Status, CodeInputState>> = {
  checking: "checking",
  wrong: "error",
  expired: "error",
  locked: "locked",
  verified: "verified",
};

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

type VerifyScreenProps = {
  email: string;
  from: AuthMode;
  demo: Demo | null;
  /** Onboarding's `?mock=` scenario, passed on to /start. */
  mock?: string | null;
};

export function VerifyScreen({ email, from, demo, mock }: VerifyScreenProps) {
  const [code, setCode] = useState(demo === "expired" ? DEMO_CODE : "");
  const [status, setStatus] = useState<Status>(
    demo === "expired" ? "expired" : demo === "locked" ? "locked" : demo === "offline" ? "offline" : "idle",
  );
  const [lockLeft, setLockLeft] = useState<number>(timings.lockout);
  const [shakeKey, setShakeKey] = useState(0);
  const tries = useRef(0);
  const busy = useRef(false);
  const typed = useRef(false);
  const verified = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const backHref = authHref(from, email);

  const contentLeaving = useHandOff(
    status === "verified" ? onboardingHref(from === "login" ? "returning" : "new", mock) : null,
    timings.verifiedHold,
  );

  // Next keeps a visited page alive but hidden; coming back should ask for a fresh code, not reuse this one.
  useEffect(
    () => () => {
      if (!verified.current) return;
      verified.current = false;
      typed.current = false;
      setCode("");
      setStatus("idle");
    },
    [],
  );

  useEffect(() => {
    if (status !== "locked") return;
    const timer = setTimeout(() => {
      if (lockLeft > 1) {
        setLockLeft(lockLeft - 1);
        return;
      }
      tries.current = 0;
      setLockLeft(timings.lockout);
      setStatus("idle");
    }, 1000);
    return () => clearTimeout(timer);
  }, [status, lockLeft]);

  async function check(value: string) {
    if (busy.current) return;
    if (isOffline()) {
      setStatus("offline");
      return;
    }
    busy.current = true;
    setStatus("checking");
    const result = await checkCode(value);
    busy.current = false;
    if (result === "ok") {
      verified.current = true;
      setStatus("verified");
      return;
    }
    tries.current += 1;
    if (tries.current >= MAX_TRIES) {
      setCode("");
      setLockLeft(timings.lockout);
      setStatus("locked");
      return;
    }
    setStatus("wrong");
    setShakeKey((key) => key + 1);
    inputRef.current?.focus();
  }

  function handleChange(value: string) {
    if (busy.current) return;
    setCode(value);
    setStatus("idle");
    if (value.length === CODE_LENGTH) check(value);
  }

  // Mock of the email arriving and the phone offering the code.
  const autofill = useEffectEvent((length: number) => {
    if (!typed.current) handleChange(DEMO_CODE.slice(0, length));
  });

  useEffect(() => {
    if (demo) return;
    const timers = Array.from({ length: CODE_LENGTH }, (_, index) =>
      setTimeout(() => autofill(index + 1), timings.autofillDelay + index * timings.autofillStep),
    );
    return () => timers.forEach(clearTimeout);
  }, [demo]);

  function resend() {
    tries.current = 0;
    setCode("");
    setStatus("idle");
    inputRef.current?.focus();
  }

  const message =
    status === "wrong"
      ? "Wrong code. Try again."
      : status === "expired"
        ? "Code expired."
        : status === "locked"
          ? `Too many tries. Try again in ${clock(lockLeft)}.`
          : status === "offline"
            ? "You're offline."
            : null;
  const icon = status === "locked" ? "clock" : status === "offline" ? "wifiOff" : "alert";

  return (
    <AuthCard layoutId={FLOW_CARD}>
      <motion.div initial={false} animate={{ opacity: contentLeaving ? 0 : 1 }} transition={transition("fast")}>
        <BrandMark />
        <AuthTitle title="Check your email">
          <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-ground py-[3px] pr-1 pl-3 font-medium text-ink">
            <span className="truncate">{email}</span>
            <Link
              href={backHref}
              aria-label="Use a different email"
              className="flex size-[26px] flex-none items-center justify-center rounded-full text-ink-soft transition-colors duration-200 hover:bg-card hover:text-ink"
            >
              <PencilIcon size={14} />
            </Link>
          </span>
        </AuthTitle>

        <CodeInput
          ref={inputRef}
          value={code}
          onChange={(value) => {
            typed.current = true;
            handleChange(value);
          }}
          state={boxState[status] ?? "idle"}
          shakeKey={shakeKey}
          readOnly={status === "checking" || status === "expired" || status === "verified"}
          describedBy={message ? "code-message" : undefined}
        />
        <FormMessage id="code-message" message={message} icon={icon} live={status !== "locked"} />
        {status === "locked" && (
          <span role="status" className="sr-only">
            Too many tries. Try again in 10 minutes.
          </span>
        )}

        <Reveal open={status !== "locked"}>
          <div className={`transition-[padding] duration-200 ${message ? "pt-4" : "pt-7 sm:pt-[22px]"}`}>
            <ResendTimer
              onResend={resend}
              checking={status === "checking"}
              expired={status === "expired"}
              verified={status === "verified"}
            />
          </div>
        </Reveal>
      </motion.div>
    </AuthCard>
  );
}

export default function VerifyForm() {
  const params = useSearchParams();
  return (
    <VerifyScreen
      email={params.get("email") || DEMO_EMAIL}
      from={readMode(params.get("from"))}
      demo={readDemo(params.get("demo"))}
      mock={params.get("mock")}
    />
  );
}
