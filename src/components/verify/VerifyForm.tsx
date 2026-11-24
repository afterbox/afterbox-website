"use client";

import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AuthCard from "@/components/ui/auth/AuthCard";
import AuthTitle from "@/components/ui/auth/AuthTitle";
import CodeInput, { CODE_LENGTH, type CodeInputState } from "@/components/ui/auth/CodeInput";
import ResendTimer from "@/components/ui/auth/ResendTimer";
import { useHandOff } from "@/components/ui/auth/useHandOff";
import BrandMark from "@/components/ui/BrandMark";
import FormMessage, { Reveal } from "@/components/ui/FormMessage";
import { PencilIcon } from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import { errorCopy, isApiError, isOfflineError } from "@/lib/api/errors";
import { safePath, takeAfterSignIn, withNext } from "@/lib/afterSignIn";
import { authHref, clock, readMode, timings, type AuthMode } from "@/lib/auth";
import { FLOW_CARD, transition } from "@/lib/motion";
import { useStartEmail, useVerifyCode } from "@/store/auth";

type Status = "idle" | "checking" | "wrong" | "expired" | "locked" | "offline" | "failed" | "verified";

const boxState: Partial<Record<Status, CodeInputState>> = {
  checking: "checking",
  wrong: "error",
  expired: "error",
  locked: "locked",
  verified: "verified",
};

type VerifyScreenProps = {
  email: string;
  from: AuthMode;
  /** `?next=` from /login: the page that sent them to sign in (a help request or approval link). */
  after?: string | null;
};

export function VerifyScreen({ email, from, after = null }: VerifyScreenProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [lockLeft, setLockLeft] = useState(0);
  const [triesLeft, setTriesLeft] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const verify = useVerifyCode();
  const resendCode = useStartEmail();
  const backHref = withNext(authHref(from, email), after);

  // New members start onboarding; returning ones go to Home, whose gate unlocks or resumes onboarding.
  const contentLeaving = useHandOff(status === "verified" ? next : null, timings.verifiedHold);

  // Next keeps a visited page alive but hidden; coming back should ask for a fresh code, not reuse this one.
  useEffect(
    () => () => {
      setCode("");
      setStatus("idle");
      setNext(null);
    },
    [],
  );

  useEffect(() => {
    if (status !== "locked") return;
    const timer = setTimeout(() => {
      if (lockLeft > 1) setLockLeft(lockLeft - 1);
      else setStatus("idle");
    }, 1000);
    return () => clearTimeout(timer);
  }, [status, lockLeft]);

  function check(value: string) {
    if (verify.isPending) return;
    setStatus("checking");
    verify.mutate(
      { email, code: value },
      {
        onSuccess: ({ isNew }) => {
          // A page that sent them here (a help request, approval or invite link) comes first. Home's gate unlocks
          // on the way (/unlock?next=…), so they land on it with the record open.
          const remembered = takeAfterSignIn();
          setNext(after ?? remembered ?? (isNew ? "/start" : "/home"));
          setStatus("verified");
        },
        onError: (error) => {
          if (isApiError(error) && (error.code === "LOCKED" || error.code === "RATE_LIMITED")) {
            setCode("");
            setLockLeft(error.retryAfter ?? 599);
            setStatus("locked");
            return;
          }
          if (isApiError(error) && error.code === "CODE_EXPIRED") {
            setStatus("expired");
            return;
          }
          if (isApiError(error) && error.code === "CODE_WRONG") {
            setTriesLeft(error.details.triesLeft ?? null);
            setStatus("wrong");
            setShakeKey((key) => key + 1);
            inputRef.current?.focus();
            return;
          }
          if (isOfflineError(error)) {
            setStatus("offline");
            return;
          }
          setFailure(errorCopy(error));
          setStatus("failed");
        },
      },
    );
  }

  function handleChange(value: string) {
    if (verify.isPending) return;
    setCode(value);
    setStatus("idle");
    if (value.length === CODE_LENGTH) check(value);
  }

  function resend() {
    setCode("");
    setStatus("idle");
    setTriesLeft(null);
    inputRef.current?.focus();
    resendCode.mutate(
      { email, mode: from },
      {
        onError: (error) => {
          setFailure(errorCopy(error));
          setStatus("failed");
        },
      },
    );
  }

  const message =
    status === "wrong"
      ? triesLeft === 1
        ? "Wrong code. One more try."
        : "Wrong code. Try again."
      : status === "expired"
        ? "Code expired. Send a new one."
        : status === "locked"
          ? `Too many tries. Try again in ${clock(lockLeft)}.`
          : status === "offline"
            ? "You're offline."
            : status === "failed"
              ? failure
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
              name="verify-change-email"
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
          onChange={handleChange}
          state={boxState[status] ?? "idle"}
          shakeKey={shakeKey}
          readOnly={status === "checking" || status === "verified" || status === "locked"}
          describedBy={message ? "code-message" : undefined}
        />
        <FormMessage id="code-message" message={message} icon={icon} live={status !== "locked"} />
        {status === "locked" && (
          <span role="status" className="sr-only">
            Too many tries. Try again in {Math.ceil(lockLeft / 60)} minutes.
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
  return <VerifyScreen email={params.get("email") ?? ""} from={readMode(params.get("from"))} after={safePath(params.get("next"))} />;
}
