"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import BrandMark from "@/components/ui/BrandMark";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import { MailIcon } from "@/components/ui/icons";
import { Link } from "@/components/ui/Links";
import TextField from "@/components/ui/TextField";
import { errorCopy, hasCode } from "@/lib/api/errors";
import { authHref, isOffline, isValidEmail, verifyHref, type AuthMode } from "@/lib/auth";
import { transition } from "@/lib/motion";
import { googleStartUrl, useStartEmail } from "@/store/auth";
import AuthCard from "./AuthCard";
import AuthTitle from "./AuthTitle";
import GoogleButton from "./GoogleButton";
import OrDivider from "./OrDivider";

const copy = {
  signup: {
    title: "Start your record",
    prompt: "Have an account?",
    switchLabel: "Log in",
    switchTo: "login",
  },
  login: {
    title: "Welcome back",
    prompt: "New here?",
    switchLabel: "Start your record",
    switchTo: "signup",
  },
} as const;

const messages = {
  invalid: "Enter a full email address.",
  googleFailed: "Google didn't connect. Try again.",
  offline: "You're offline.",
};

type Problem = { kind: "invalid" | "googleFailed" | "offline" } | { kind: "api"; message: string } | null;

type EmailAuthFormProps = {
  mode: AuthMode;
  initialEmail?: string | null;
  /** /login?error=google: the backend's redirect after any Google failure. */
  googleFailed?: boolean;
};

/**
 * The email step shared by /signup and /login: Google (a full-page redirect through the API), or an email that
 * gets a code. `email/start` always answers "sent", so there's no "no account" state: people without one get an
 * email inviting them to sign up.
 */
export default function EmailAuthForm({ mode, initialEmail, googleFailed = false }: EmailAuthFormProps) {
  const router = useRouter();
  const text = copy[mode];
  const [email, setEmail] = useState(initialEmail ?? "");
  const [problem, setProblem] = useState<Problem>(googleFailed ? { kind: "googleFailed" } : null);
  const [google, setGoogle] = useState(false);
  const start = useStartEmail();
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    router.prefetch("/verify");
  }, [router]);

  // Next keeps a visited page alive but hidden; coming back should find the form ready, not mid-send.
  useEffect(
    () => () => {
      setGoogle(false);
    },
    [],
  );

  const sending = start.isPending;
  const isBusy = sending || google;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isBusy || !email.trim()) return;
    if (!isValidEmail(email)) {
      setProblem({ kind: "invalid" });
      emailRef.current?.focus();
      return;
    }
    if (isOffline()) {
      setProblem({ kind: "offline" });
      return;
    }
    setProblem(null);
    start.mutate(
      { email, mode },
      {
        onSuccess: () => {
          // Going back from /verify should find the email still filled in.
          window.history.replaceState(null, "", authHref(mode, email.trim()));
          router.push(verifyHref(mode, email));
        },
        onError: (error) => {
          if (hasCode(error, "NETWORK")) setProblem({ kind: "offline" });
          else setProblem({ kind: "api", message: errorCopy(error) });
        },
      },
    );
  }

  function handleGoogle() {
    if (isBusy) return;
    if (isOffline()) {
      setProblem({ kind: "offline" });
      return;
    }
    setProblem(null);
    setGoogle(true);
    window.location.assign(googleStartUrl(mode));
  }

  const fieldError = problem?.kind === "invalid" ? messages.invalid : null;
  const formMessage = problem?.kind === "api" ? problem.message : problem?.kind === "offline" ? messages.offline : null;

  return (
    <AuthCard>
      <motion.div initial={false} animate={{ opacity: 1 }} transition={transition("fast")}>
        <form noValidate onSubmit={handleSubmit}>
          <BrandMark />
          <AuthTitle title={text.title} />

          <GoogleButton loading={google} disabled={sending} onClick={handleGoogle} />
          <FormMessage message={problem?.kind === "googleFailed" ? messages.googleFailed : null} />

          <OrDivider />

          <TextField
            ref={emailRef}
            label="Email"
            hideLabel
            icon={<MailIcon />}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Email"
            value={email}
            disabled={isBusy}
            error={fieldError}
            onChange={(event) => {
              setEmail(event.target.value);
              if (problem?.kind !== "googleFailed") setProblem(null);
            }}
          />

          <Button
            type="submit"
            variant="inkDeep"
            size="block"
            className="mt-4 sm:mt-3.5"
            loading={sending}
            loadingLabel="Sending code"
            disabled={!email.trim() || google}
          >
            Continue
          </Button>
          <FormMessage
            message={formMessage}
            icon={problem?.kind === "offline" ? "wifiOff" : problem?.kind === "api" ? "clock" : "alert"}
            gapClassName="pt-3"
          />

          <p className="mt-8 text-center text-[13px] text-ink-soft sm:mt-[22px] sm:text-sm">
            {text.prompt}{" "}
            <Link
              href={authHref(text.switchTo, email.trim())}
              name={`auth-switch-${text.switchTo}`}
              className="font-semibold text-ink-deep underline underline-offset-3"
            >
              {text.switchLabel}
            </Link>
          </p>
        </form>
      </motion.div>
    </AuthCard>
  );
}
