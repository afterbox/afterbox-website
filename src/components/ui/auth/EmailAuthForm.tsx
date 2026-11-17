"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import {
  authHref,
  continueWithGoogle,
  DEMO_EMAIL,
  isOffline,
  isValidEmail,
  sendCode,
  verifyHref,
  type AuthMode,
  type Demo,
} from "@/lib/mock-auth";
import BrandMark from "@/components/ui/BrandMark";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import { MailIcon } from "@/components/ui/icons";
import TextField from "@/components/ui/TextField";
import AuthCard from "./AuthCard";
import AuthSuccess from "./AuthSuccess";
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
  noAccount: "No account found.",
  googleFailed: "Google didn't connect. Try again.",
  offline: "You're offline.",
};

type Status = "idle" | "sending" | "google" | "success";
type Problem = "invalid" | "noAccount" | "googleFailed" | "offline" | null;

type EmailAuthFormProps = {
  mode: AuthMode;
  initialEmail?: string | null;
  demo?: Demo | null;
};

/** The email step shared by /signup and /login: Google, or an email that gets a code. */
export default function EmailAuthForm({ mode, initialEmail, demo = null }: EmailAuthFormProps) {
  const router = useRouter();
  const text = copy[mode];
  const [email, setEmail] = useState(initialEmail ?? DEMO_EMAIL);
  const [status, setStatus] = useState<Status>("idle");
  const [problem, setProblem] = useState<Problem>(
    demo === "google-fail" ? "googleFailed" : demo === "offline" ? "offline" : null,
  );
  const busy = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const isBusy = status === "sending" || status === "google";
  const fieldError = problem === "invalid" || problem === "noAccount" ? messages[problem] : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy.current || !email.trim()) return;
    if (!isValidEmail(email)) {
      setProblem("invalid");
      emailRef.current?.focus();
      return;
    }
    if (isOffline()) {
      setProblem("offline");
      return;
    }
    busy.current = true;
    setProblem(null);
    setStatus("sending");
    const result = await sendCode(mode, email);
    if (result === "no-account") {
      busy.current = false;
      setStatus("idle");
      setProblem("noAccount");
      emailRef.current?.focus();
      return;
    }
    router.push(verifyHref(mode, email));
  }

  async function handleGoogle() {
    if (busy.current) return;
    if (isOffline()) {
      setProblem("offline");
      return;
    }
    busy.current = true;
    setProblem(null);
    setStatus("google");
    const result = await continueWithGoogle(demo);
    busy.current = false;
    if (result === "failed") {
      setStatus("idle");
      setProblem("googleFailed");
      return;
    }
    setStatus("success");
  }

  return (
    <AuthCard>
      {status === "success" ? (
        <AuthSuccess />
      ) : (
        <form noValidate onSubmit={handleSubmit}>
          <BrandMark />
          <AuthTitle title={text.title} />

          <GoogleButton loading={status === "google"} disabled={status === "sending"} onClick={handleGoogle} />
          <FormMessage message={problem === "googleFailed" ? messages.googleFailed : null} />

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
            errorLink={
              problem === "noAccount" ? { href: authHref("signup", email), label: "Start your record" } : undefined
            }
            onChange={(event) => {
              setEmail(event.target.value);
              if (problem !== "googleFailed") setProblem(null);
            }}
          />

          <Button
            type="submit"
            variant="inkDeep"
            size="block"
            className="mt-3.5"
            loading={status === "sending"}
            loadingLabel="Sending code"
            disabled={!email.trim() || status === "google"}
          >
            Continue
          </Button>
          <FormMessage
            message={problem === "offline" ? messages.offline : null}
            icon="wifiOff"
            gapClassName="pt-3"
          />

          <p className="mt-[22px] text-center text-sm text-ink-soft">
            {text.prompt}{" "}
            <Link
              href={authHref(text.switchTo, email)}
              className="font-semibold text-ink-deep underline underline-offset-3"
            >
              {text.switchLabel}
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
