"use client";

import { mockApi } from "@/lib/dashboard/api";
import { dashboardStore } from "@/lib/dashboard/store";
import { mockAccount, seedScenario } from "@/lib/dashboard/mock";
import { currentDevice, demoDevices, deviceName, mockPart, otherDevices } from "./device";
import { create } from "./passkey";
import { accountStore, partStore, setUnlock, unlockStore, type Device } from "./store";

/*
 * Ways back in: the backup code, the trusted person and afterbox. With the backend, the backup code
 * unwraps a recovery copy of the member part, and the trusted person's approval sends theirs.
 */

/* Backup code: 24 Crockford base32 characters, shown as six groups of four. */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const GROUPS = 6;
export const GROUP_LENGTH = 4;
export const CODE_LENGTH = GROUPS * GROUP_LENGTH;

export function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (byte) => ALPHABET[byte % 32]).join("");
}

/** Uppercase, lookalikes corrected (O is 0, I and L are 1), everything else dropped. */
export function normalizeCode(input: string) {
  return input
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/[^0-9A-HJKMNP-TV-Z]/g, "");
}

/** "K7QM-4XRT-9WPA-H2LD-6NVE-3CJB" */
export const formatCode = (code: string) => code.match(new RegExp(`.{1,${GROUP_LENGTH}}`, "g"))?.join("-") ?? code;

export const markBackupSaved = () => accountStore.set((account) => (account ? { ...account, backupSaved: true } : account));

/** Saves it to the browser's password manager (Chrome's PasswordCredential). False where that isn't there. */
export async function saveToBrowser(code: string) {
  const Credential = (window as Window & { PasswordCredential?: new (data: { id: string; password: string; name: string }) => Credential })
    .PasswordCredential;
  if (!Credential || !navigator.credentials?.store) return false;
  try {
    const email = dashboardStore.get()?.account.email ?? mockAccount().email;
    await navigator.credentials.store(new Credential({ id: email, password: formatCode(code), name: "afterbox backup code" }));
    return true;
  } catch {
    return false;
  }
}

export async function copyCode(code: string) {
  await navigator.clipboard.writeText(formatCode(code));
}

export function downloadCode(code: string) {
  const blob = new Blob([`afterbox backup code\n\n${formatCode(code)}\n`], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: "afterbox-backup-code.txt" });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A fresh code to show from Settings (after the passkey). Replaces the old one. */
export function newBackupCode() {
  const code = generateCode();
  accountStore.set((account) => (account ? { ...account, backupCode: code, backupSaved: false } : account));
  return code;
}

export const WRONG_CODE = "That code didn’t work.";

/** Unlocks with the backup code. Resolves false for a wrong code. */
export async function unlockWithCode(input: string) {
  const ok = await mockApi(() => normalizeCode(input) === accountStore.get()?.backupCode);
  if (!ok) return false;
  const device = await currentDevice();
  partStore.set(() => ({ deviceId: device.id, part: mockPart() }));
  accountStore.set((account) => (account ? { ...account, devices: [device, ...account.devices] } : account));
  setUnlock("in");
  return true;
}

/* Setting up (01 → 03). */

/** Runs the passkey, keeps the member part here and makes the backup code. Resolves with the code. */
export async function lockRecord() {
  const { credentialId } = await create();
  const device = await currentDevice();
  const backupCode = generateCode();
  partStore.set(() => ({ deviceId: device.id, part: mockPart() }));
  accountStore.set(() => ({ credentialId, devices: [device], backupCode, backupSaved: false, trustedPerson: trustedName() }));
  unlockStore.set(() => ({ status: "open", pending: null }));
  return backupCode;
}

/* What 05 offers. Only what this person has, and afterbox always. */

export type Helper = { name: string; first: string; initials: string };

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join("");

const trustedName = () => {
  const state = dashboardStore.get();
  return state ? (state.people[0]?.name ?? null) : (accountStore.get()?.trustedPerson ?? null);
};

/** Their trusted person or family member, if they have one. */
export function trustedPerson(): Helper | null {
  const name = trustedName();
  if (!name) return null;
  return { name, first: name.split(" ")[0], initials: initialsOf(name) };
}

/** Keeps the account's copy of the name, so it's still there after logging out clears the dashboard. */
export function syncTrustedPerson() {
  const state = dashboardStore.get();
  const name = state?.people[0]?.name ?? null;
  if (state && accountStore.get() && accountStore.get()?.trustedPerson !== name) {
    accountStore.set((account) => (account ? { ...account, trustedPerson: name } : account));
  }
}

export type UnlockOptions = { devices: Device[]; backupCode: boolean; helper: Helper | null };

export function unlockOptions(): UnlockOptions {
  return { devices: otherDevices(), backupCode: Boolean(accountStore.get()?.backupSaved), helper: trustedPerson() };
}

/** Who's asking, on the trusted person's side (12). Mocked as this account's member. */
export function helpRequestFrom() {
  const name = dashboardStore.get()?.account.name ?? mockAccount().name;
  return { first: name.split(" ")[0], initials: initialsOf(name) };
}

export const approveHelp = () => mockApi(() => undefined);
export const declineHelp = () => mockApi(() => undefined);

export const SUPPORT_EMAIL = "hello@afterbox.co.uk";

/* ?mock= on /home, /secure and /unlock. */

export const securityMocks = ["nopasskey", "newdevice"] as const;
export type SecurityMock = (typeof securityMocks)[number];

/** Applies any security tokens in `?mock=` (comma separated). Returns the ones it used. */
let appliedMock: string | null = null;

/**
 * True the first time a `?mock=` value is seen. Mocks are applied before first paint and again by the
 * shells' Boot when the URL changes; this keeps them from running twice for the same link.
 */
export function freshMock(params: URLSearchParams) {
  const mock = params.get("mock");
  const fresh = mock !== null && mock !== appliedMock;
  appliedMock = mock;
  return fresh;
}

export function bootSecurity(params: URLSearchParams) {
  const tokens = (params.get("mock") ?? "").split(",").map((token) => token.trim());
  const used = securityMocks.filter((token) => tokens.includes(token));
  used.forEach(applySecurityMock);
  return used;
}

/** nopasskey: nothing set up (to /secure). newdevice: an existing member on a browser without the member part (to /unlock). */
export function applySecurityMock(token: SecurityMock) {
  if (token === "nopasskey") {
    accountStore.set(() => null);
    partStore.set(() => null);
    unlockStore.set(() => ({ status: "locked", pending: null }));
    return;
  }
  const info = deviceName();
  accountStore.set((account) => {
    const others = account?.devices.filter((device) => device.name !== info.name) ?? [];
    return {
      credentialId: account?.credentialId ?? "credential-demo",
      devices: others.length > 0 ? others : demoDevices(info.device),
      backupCode: account?.backupCode ?? generateCode(),
      backupSaved: true,
      trustedPerson: account?.trustedPerson ?? dashboardStore.get()?.people[0]?.name ?? seedScenario("day2").people[0]?.name ?? null,
    };
  });
  partStore.set(() => null);
  unlockStore.set(() => ({ status: "locked", pending: null }));
}

/** Scenarios for existing members (day2, accepted) come with their other devices. */
export function addDemoDevices() {
  const account = accountStore.get();
  if (!account || account.devices.length > 1) return;
  const current = account.devices[0];
  accountStore.set((latest) => (latest ? { ...latest, devices: [...latest.devices, ...demoDevices(current?.device ?? "")] } : latest));
}
