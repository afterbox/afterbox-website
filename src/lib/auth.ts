/** Sign-in helpers shared by /signup, /login and /verify. The API calls live in src/store/auth. */

import type { AuthMode } from "@/lib/api/types";

export type { AuthMode };

export const timings = {
  /** The API allows one code every 59 seconds per email. */
  resendCooldown: 59,
  /** The tick after a resend, before the countdown restarts. */
  resentTick: 1200,
  /** The verified state on the code screen, before moving on. */
  verifiedHold: 600,
};

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
  return email ? `/${mode}?email=${encodeURIComponent(email)}` : `/${mode}`;
}

export function verifyHref(mode: AuthMode, email: string) {
  return `/verify?email=${encodeURIComponent(email.trim())}&from=${mode}`;
}

/** "9:59" */
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;
