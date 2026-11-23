/** Naming this device from the user agent (Chrome's client hints where available): "{Browser} on {Device}". */

import type { DeviceKind } from "@/lib/api/types";

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
    return { device: hints?.model?.startsWith("Mac") ? hints.model : "Mac", kind: "laptop" };
  }
  if (platform === "Windows" || /Windows/.test(ua)) return { device: "Windows", kind: "laptop" };
  if (platform === "Chrome OS" || /CrOS/.test(ua)) return { device: "Chromebook", kind: "laptop" };
  if (/Linux/.test(ua)) return { device: "Linux", kind: "laptop" };
  return { device: "this device", kind: "laptop" };
}

export function deviceName(ua: string = typeof navigator === "undefined" ? "" : navigator.userAgent, hints?: Hints): DeviceInfo {
  const browser = browserFrom(ua, hints);
  const { device, kind } = deviceFrom(ua, hints);
  return { browser, device, kind, name: `${browser} on ${device}` };
}

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

/** "Check your Mac", "Approve on your phone": generic words where the platform name doesn't read as a thing. */
export function deviceWord(device: string) {
  if (device === "Android") return "phone";
  if (device === "Windows" || device === "Linux") return "computer";
  if (device === "this device") return "device";
  return device;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "now", "today", "yesterday", "2 days ago", "3 weeks ago" from an ISO timestamp. */
export function lastUsed(iso: string | null, now = Date.now()) {
  if (!iso) return "not yet";
  const timestamp = Date.parse(iso);
  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < MINUTE * 5) return "now";
  if (elapsed < DAY) return elapsed < HOUR * 12 || new Date(timestamp).getDate() === new Date(now).getDate() ? "today" : "yesterday";
  const days = Math.floor(elapsed / DAY);
  if (days < 14) return days === 1 ? "yesterday" : `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks < 9 ? `${weeks} weeks ago` : `${Math.floor(days / 30)} months ago`;
}
