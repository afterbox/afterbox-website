"use client";

import { mockApi } from "@/lib/dashboard/api";
import { DAY, HOUR, MINUTE } from "@/lib/dashboard/format";
import { accountStore, partStore, setPending, setUnlock, unlockStore, type Device, type DeviceKind, type Pending } from "./store";

/*
 * Devices: naming this one, moving the member part to a new one, approving and removing.
 * Mocked through mockApi; the live event (Ably) and the encrypted hand-over arrive with the backend.
 */

type Hints = { brands?: { brand: string }[]; platform?: string; mobile?: boolean; model?: string };

export type DeviceInfo = { browser: string; device: string; kind: DeviceKind; name: string };

function browserFrom(ua: string, hints?: Hints) {
  const brands = hints?.brands?.map((entry) => entry.brand) ?? [];
  if (brands.includes("Microsoft Edge") || /Edg(A|iOS)?\//.test(ua)) return "Edge";
  if (brands.includes("Opera") || /OPR\/|OPT\//.test(ua)) return "Opera";
  if (/SamsungBrowser\//.test(ua)) return "Samsung Internet";
  if (/Firefox\/|FxiOS\//.test(ua)) return "Firefox";
  if (brands.includes("Google Chrome") || /Chrome\/|CriOS\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Browser";
}

function deviceFrom(ua: string, hints?: Hints): { device: string; kind: DeviceKind } {
  const platform = hints?.platform ?? "";
  if (/iPhone/.test(ua)) return { device: "iPhone", kind: "phone" };
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1)) {
    return { device: "iPad", kind: "phone" };
  }
  if (platform === "Android" || /Android/.test(ua)) return { device: "Android", kind: "phone" };
  if (platform === "macOS" || /Macintosh|Mac OS X/.test(ua)) {
    // Client hints give a model on some Macs; the user agent never does.
    return { device: hints?.model?.startsWith("Mac") ? hints.model : "Mac", kind: "laptop" };
  }
  if (platform === "Windows" || /Windows/.test(ua)) return { device: "Windows", kind: "laptop" };
  if (platform === "Chrome OS" || /CrOS/.test(ua)) return { device: "Chromebook", kind: "laptop" };
  if (/Linux/.test(ua)) return { device: "Linux", kind: "laptop" };
  return { device: "this device", kind: "laptop" };
}

/** "{Browser} on {Device}": "Chrome on Android", "Safari on iPhone", "Chrome on Mac". */
export function deviceName(ua: string = typeof navigator === "undefined" ? "" : navigator.userAgent, hints?: Hints): DeviceInfo {
  const browser = browserFrom(ua, hints);
  const { device, kind } = deviceFrom(ua, hints);
  return { browser, device, kind, name: `${browser} on ${device}` };
}

/** Reads Chrome's client hints where they exist (a model, sometimes), else the user agent alone. */
export async function thisDeviceInfo(): Promise<DeviceInfo> {
  const data = (navigator as Navigator & { userAgentData?: Hints & { getHighEntropyValues?: (keys: string[]) => Promise<Hints> } })
    .userAgentData;
  if (!data?.getHighEntropyValues) return deviceName();
  try {
    const high = await data.getHighEntropyValues(["model", "platform"]);
    return deviceName(navigator.userAgent, { ...data, ...high });
  } catch {
    return deviceName(navigator.userAgent, data);
  }
}

/** The city from the IP address, roughly. Mocked. */
export const approximateCity = () => "London";

/** "This Mac", "Check your iPhone"; generic words where the platform name doesn't read as a thing. */
export function deviceWord(device: string) {
  if (device === "Android") return "phone";
  if (device === "Windows" || device === "Linux") return "computer";
  if (device === "this device") return "device";
  return device;
}

/** "now", "today", "2 days ago", "3 weeks ago". */
export function lastUsed(timestamp: number, now = Date.now()) {
  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < MINUTE * 5) return "now";
  if (elapsed < DAY) return elapsed < HOUR * 12 || new Date(timestamp).getDate() === new Date(now).getDate() ? "today" : "yesterday";
  const days = Math.floor(elapsed / DAY);
  if (days < 14) return days === 1 ? "yesterday" : `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks < 9 ? `${weeks} weeks ago` : `${Math.floor(days / 30)} months ago`;
}

export const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

/** A random stand-in for the member's part of the key. */
export const mockPart = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");

/** This browser as a device row, used now. */
export async function currentDevice(id = newId("device")): Promise<Device> {
  const info = await thisDeviceInfo();
  return { id, ...info, city: approximateCity(), lastUsedAt: Date.now() };
}

const family = (device: string) => (device.startsWith("Mac") ? "Mac" : device);

/** An existing member's other devices, for the mock scenarios (never the same kind of device as this one). */
export function demoDevices(current: string, now = Date.now()): Device[] {
  const all: Device[] = [
    { id: "device-macbook", name: "Chrome on MacBook Pro", browser: "Chrome", device: "MacBook Pro", kind: "laptop", city: "Leeds", lastUsedAt: now - HOUR * 3 },
    { id: "device-iphone", name: "Safari on iPhone", browser: "Safari", device: "iPhone", kind: "phone", city: "Leeds", lastUsedAt: now - DAY * 2 },
    { id: "device-windows", name: "Chrome on Windows", browser: "Chrome", device: "Windows", kind: "laptop", city: "Manchester", lastUsedAt: now - DAY * 21 },
  ];
  return all.filter((device) => family(device.device) !== family(current)).slice(0, 2);
}

export function otherDevices() {
  const part = partStore.get();
  return (accountStore.get()?.devices ?? []).filter((device) => device.id !== part?.deviceId);
}

/* Moving the member part here: another device approves, or the trusted person does. */

const APPROVE_AFTER = { device: 6_000, person: 10_000 } as const;

/** Sends the live event to that device (and emails a link). The mock approves after about 6s. */
export function requestApproval(deviceId: string) {
  return mockApi(() => whileLocked({ kind: "device", deviceId, approveAt: Date.now() + APPROVE_AFTER.device }));
}

/** The trusted person gets the request (and the member a copy). The mock approves after about 10s. */
export function requestPersonApproval() {
  return mockApi(() => whileLocked({ kind: "person", approveAt: Date.now() + APPROVE_AFTER.person }));
}

/** A request that lands after they got in some other way has nothing left to do. */
function whileLocked(pending: Pending) {
  if (unlockStore.get().status === "locked") setPending(pending);
}

/** The member part arrives: this browser keeps it, joins the account's devices, and is in (08). */
export async function receivePart() {
  const device = await currentDevice();
  partStore.set(() => ({ deviceId: device.id, part: mockPart() }));
  accountStore.set((account) => (account ? { ...account, devices: [device, ...account.devices] } : account));
  setUnlock("in");
}

/** Polled while locked: completes an approval once it's due. Resolves true when it did. */
export async function settlePending(now = Date.now()) {
  const { pending, status } = unlockStore.get();
  if (!pending || status !== "locked" || pending.approveAt > now) return false;
  setPending(null);
  await receivePart();
  return true;
}

/* On a device that already has the part (07, 16). */

export type SignIn = { name: string; kind: DeviceKind; city: string; at: number };

/** The new sign-in waiting for approval. Mocked: the live event brings the real one. */
export const pendingSignIn = (): SignIn => ({ name: "Chrome on Android", kind: "phone", city: "Lagos", at: Date.now() });

export const approveSignIn = () => mockApi(() => undefined);
export const declineSignIn = () => mockApi(() => undefined);

export function removeDevice(deviceId: string) {
  return mockApi(() => {
    accountStore.set((account) => (account ? { ...account, devices: account.devices.filter((device) => device.id !== deviceId) } : account));
  });
}

/** Keeps this device's "Used now" fresh. */
export function touchThisDevice() {
  const part = partStore.get();
  if (!part) return;
  accountStore.set((account) =>
    account
      ? { ...account, devices: account.devices.map((device) => (device.id === part.deviceId ? { ...device, lastUsedAt: Date.now() } : device)) }
      : account,
  );
}
