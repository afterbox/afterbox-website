import { formatMonth } from "@/lib/onboarding/format";
import { currencySymbol, minorDigits } from "@/lib/money";

const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const list = new Intl.ListFormat("en-GB", { type: "conjunction" });

export const formatList = (items: string[]) => list.format(items);

/** "2021-03-03" to "3 March 2021". */
export function formatDate(iso: string) {
  return longDate.format(new Date(`${iso}T00:00:00Z`));
}

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** "2026-12-02" to "2 Dec", for payments coming up. */
export function formatDay(iso: string) {
  return dayMonth.format(new Date(`${iso}T00:00:00Z`));
}

/** Found items know the month ("Aug 2025"), added ones the day ("3 March 2021"). */
export const formatSince = (since: string) => (since.length === 7 ? formatMonth(since) : formatDate(since));

/** Calendar maths in UTC, so a date never slips a day across time zones. */
export function toIso(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

export function todayIso() {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth(), now.getDate());
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** "just now", "5 minutes ago", "2 hours ago", "3 days ago". */
export function timeAgo(timestamp: number, now = Date.now()) {
  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < MINUTE * 2) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} minutes ago`;
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  const days = Math.floor(elapsed / DAY);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export function daysUntil(timestamp: number, now = Date.now()) {
  return Math.max(0, Math.ceil((timestamp - now) / DAY));
}

export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/* Typing money: the currency's own symbol (Intl) plus thousands separators as you type, minor units kept apart. */

/** Digits and at most one point with the currency's decimals, from whatever was typed or pasted. */
function cleanMoney(raw: string, digits: number) {
  const kept = raw.replace(/[^\d.]/g, "");
  const point = digits === 0 ? -1 : kept.indexOf(".");
  const whole = (point === -1 ? kept.replace(/\./g, "") : kept.slice(0, point)).replace(/^0+(?=\d)/, "").slice(0, 10);
  const fraction = point === -1 ? null : kept.slice(point + 1).replace(/\./g, "").slice(0, digits);
  return { whole, fraction };
}

function groupThousands(whole: string) {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Re-formats what's in the field and puts the caret back after the same number of digits
 * (and the point), so typing in the middle of "£180,000" doesn't throw it to the end.
 */
export function formatMoneyTyping(raw: string, caret: number, currency: string) {
  const symbol = currencySymbol(currency);
  const { whole, fraction } = cleanMoney(raw, minorDigits(currency));
  if (!whole && fraction === null) return { text: "", caret: 0 };
  const text = `${symbol}${groupThousands(whole || (fraction !== null ? "0" : ""))}${fraction !== null ? `.${fraction}` : ""}`;
  const significant = raw.slice(0, caret).replace(/[^\d.]/g, "").length;
  let seen = 0;
  let position = symbol.length;
  while (position < text.length && seen < significant) {
    if (/[\d.]/.test(text[position])) seen += 1;
    position += 1;
  }
  return { text, caret: Math.max(symbol.length, position) };
}

/** The typed text in whole minor units of `currency` ("£1,150.5" → 115050). Null when empty. */
export function parseTypedMinor(text: string, currency: string) {
  const digits = minorDigits(currency);
  const { whole, fraction } = cleanMoney(text.slice(currencySymbol(currency).length), digits);
  if (!whole && !fraction) return null;
  return Number(whole || "0") * 10 ** digits + Number((fraction ?? "").padEnd(digits, "0") || "0");
}

/** A stored amount as plain typed text in `currency`: "180000" or "24.10" (`withMinor` keeps the decimals). */
export function typedFromMinor(minor: number, currency: string, withMinor: boolean) {
  const digits = minorDigits(currency);
  const unit = 10 ** digits;
  const whole = Math.floor(minor / unit);
  if (digits === 0 || (!withMinor && minor % unit === 0)) return String(whole);
  return `${whole}.${String(minor % unit).padStart(digits, "0")}`;
}

/** UK postcodes: uppercase, one space before the last three characters. */
export function formatPostcode(raw: string) {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  return compact.length > 4 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact;
}

/** UK mobiles as "+44 7700 900 123", from "07700…", "447700…" or "+44 7700…". */
export function formatMobile(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("44")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (!digits) return raw.trim().startsWith("+") ? "+" : "";
  const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7)].filter(Boolean);
  return `+44 ${parts.join(" ")}`;
}

export const isCompleteMobile = (text: string) => text === "" || /^\+44 \d{4} \d{3} \d{3}$/.test(text);
export const isCompletePostcode = (text: string) => text === "" || /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(text);

/** "just now", "5 minutes ago" from an ISO timestamp (null: ""). */
export function timeAgoIso(iso: string | null | undefined, now = Date.now()) {
  return iso ? timeAgo(Date.parse(iso), now) : "";
}

/** Days from now to an ISO timestamp, never negative. */
export function daysUntilIso(iso: string | null | undefined, now = Date.now()) {
  return iso ? daysUntil(Date.parse(iso), now) : 0;
}
