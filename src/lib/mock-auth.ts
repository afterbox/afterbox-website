/** Mocked auth: no real API yet. Every timing and piece of demo data lives here. */

export const DEMO_EMAIL = "alex.morgan@gmail.com";
export const DEMO_CODE = "482910";
export const MAX_TRIES = 5;

export const timings = {
  sendCode: 1200,
  google: 1500,
  check: 1000,
  autofillDelay: 1000,
  autofillStep: 60,
  resendCooldown: 59, // seconds
  resentTick: 1200, // the tick after a resend, before the countdown restarts
  lockout: 599, // seconds after too many tries ("9:59")
  verifiedHold: 600, // the verified state on the code screen, before onboarding
};

export type AuthMode = "signup" | "login";
export type Demo = "google-fail" | "offline" | "expired" | "locked";

const demos: Demo[] = ["google-fail", "offline", "expired", "locked"];

export function readDemo(value: string | null): Demo | null {
  return demos.find((demo) => demo === value) ?? null;
}

export function readMode(value: string | null): AuthMode {
  return value === "login" ? "login" : "signup";
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function authHref(mode: AuthMode, email: string) {
  return `/${mode}?email=${encodeURIComponent(email)}`;
}

export function verifyHref(mode: AuthMode, email: string) {
  return `/verify?email=${encodeURIComponent(email.trim())}&from=${mode}`;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendCode(mode: AuthMode, email: string): Promise<"sent" | "no-account"> {
  await wait(timings.sendCode);
  if (mode === "login" && email.trim().toLowerCase() !== DEMO_EMAIL) return "no-account";
  return "sent";
}

/** The mocked Google account is new when you come from sign up, and returning from log in. */
export async function continueWithGoogle(mode: AuthMode, demo: Demo | null): Promise<"new" | "returning" | "failed"> {
  await wait(timings.google);
  if (demo === "google-fail") return "failed";
  return mode === "login" ? "returning" : "new";
}

export async function checkCode(code: string): Promise<"ok" | "wrong"> {
  await wait(timings.check);
  return code === DEMO_CODE ? "ok" : "wrong";
}
