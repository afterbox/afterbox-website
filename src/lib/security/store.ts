"use client";

import { useSyncExternalStore } from "react";
import { createSessionStore } from "@/lib/sessionStore";

/*
 * Three pieces of state, kept where the real ones will live:
 * - the account's security (the server's view: passkey, devices, backup code). Mocked in localStorage
 *   so it survives logging out, as it would on the server;
 * - this browser's member part (localStorage: it stays after logging out, still behind the passkey);
 * - this session's unlock (sessionStorage: signing in again asks for the passkey).
 */

export type DeviceKind = "laptop" | "phone";

export type Device = {
  id: string;
  /** "Chrome on MacBook Pro" */
  name: string;
  browser: string;
  /** "MacBook Pro", "iPhone": what "Check your …" and "Approve on your …" say. */
  device: string;
  kind: DeviceKind;
  city: string;
  lastUsedAt: number;
};

export type AccountSecurity = {
  credentialId: string;
  devices: Device[];
  /** Shown once on 03 (and again from Settings, after the passkey). */
  backupCode: string;
  /** They used Save, Copy or Download. Otherwise Ways back in shows the backup code as "Add". */
  backupSaved: boolean;
  /** Who can approve a request on 10, known to the server when nobody's signed in. */
  trustedPerson?: string | null;
};

export type MemberPart = { deviceId: string; part: string };

/** Someone else's approval on its way: another device (~6s in the mock) or the trusted person (~10s). */
export type Pending = { kind: "device"; deviceId: string; approveAt: number } | { kind: "person"; approveAt: number };

/** locked: needs the passkey or another way in. in: just got in on a new device (08). open: unlocked. */
export type Unlock = { status: "locked" | "in" | "open"; pending: Pending | null };

export const accountStore = createSessionStore<AccountSecurity | null>(
  "afterbox.security",
  null,
  (saved) => (saved && typeof saved === "object" && Array.isArray((saved as AccountSecurity).devices) ? (saved as AccountSecurity) : null),
  { persist: "local" },
);

export const partStore = createSessionStore<MemberPart | null>(
  "afterbox.member-part",
  null,
  (saved) => (saved && typeof saved === "object" && typeof (saved as MemberPart).part === "string" ? (saved as MemberPart) : null),
  { persist: "local" },
);

const lockedState: Unlock = { status: "locked", pending: null };

export const unlockStore = createSessionStore<Unlock>("afterbox.unlock", lockedState, (saved) => {
  const value = saved as Partial<Unlock> | null;
  return value && (value.status === "in" || value.status === "open" || value.status === "locked")
    ? { status: value.status, pending: value.pending ?? null }
    : lockedState;
});

export const useAccountSecurity = () => accountStore.useValue();
export const useMemberPart = () => partStore.useValue();
export const useUnlock = () => unlockStore.useValue();

/** Logging out locks the session; the member part stays in this browser. */
export function lockSession() {
  unlockStore.set(() => lockedState);
}

export function setUnlock(status: Unlock["status"]) {
  unlockStore.set((state) => ({ status, pending: status === "locked" ? state.pending : null }));
}

export function setPending(pending: Pending | null) {
  unlockStore.set((state) => ({ ...state, pending }));
}

export const hasPasskey = () => accountStore.get() !== null;

export type Access = "open" | "secure" | "unlock";

/** Where a signed-in person may go: set up the passkey first, then this browser needs the member part, unlocked. */
export function accessNow(): Access {
  if (!accountStore.get()) return "secure";
  if (!partStore.get()) return "unlock";
  return unlockStore.get().status === "locked" ? "unlock" : "open";
}

export const accessHref = { secure: "/secure", unlock: "/unlock", open: "/home" } as const;

function subscribeAll(listener: () => void) {
  const stops = [accountStore.subscribe(listener), partStore.subscribe(listener), unlockStore.subscribe(listener)];
  return () => stops.forEach((stop) => stop());
}

/** Live access; "pending" on the server and while hydrating, when the stores can't be read yet. */
export function useAccess(): Access | "pending" {
  return useSyncExternalStore(subscribeAll, accessNow, () => "pending");
}
