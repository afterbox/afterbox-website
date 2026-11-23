/**
 * Money from the API: `{ minor, currency }`, never converted. Totals that mix currencies are `Money[]` (home
 * currency first) and read "£34.97 a month + $15.49 a month". A Money is never added to one in another currency.
 */

import type { Frequency, Money } from "@/lib/api/types";

/** Minor-unit digits per ISO 4217 code, as the API stores them (API.md "Money"). */
export function minorDigits(currency: string) {
  if (currency === "JPY") return 0;
  if (currency === "KWD" || currency === "BHD" || currency === "OMR") return 3;
  return 2;
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, whole: boolean) {
  const key = `${currency}:${whole}`;
  let found = formatters.get(key);
  if (!found) {
    const digits = minorDigits(currency);
    try {
      found = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
        minimumFractionDigits: whole ? 0 : digits,
        maximumFractionDigits: whole ? 0 : digits,
      });
    } catch {
      found = new Intl.NumberFormat("en-GB", { minimumFractionDigits: whole ? 0 : digits, maximumFractionDigits: whole ? 0 : digits });
    }
    formatters.set(key, found);
  }
  return found;
}

export const toMajor = (money: Money) => money.minor / 10 ** minorDigits(money.currency);

/** "£24.10", "$15.49", "¥1,200". A true minus sign for money owed. */
export function formatMoney(money: Money) {
  return formatter(money.currency, false).format(toMajor(money)).replace("-", "−");
}

/** Values and balances without pence when they're whole: "£180,000", "£180,000.50". */
export function formatValue(money: Money) {
  const whole = money.minor % 10 ** minorDigits(money.currency) === 0;
  return formatter(money.currency, whole).format(toMajor(money)).replace("-", "−");
}

/** Balances on the reading chips: whole units, "−£320". */
export function formatBalance(money: Money) {
  return formatter(money.currency, true).format(toMajor(money)).replace("-", "−");
}

export const everyWord: Record<Frequency, string> = {
  weekly: "a week",
  "four-weekly": "every 4 weeks",
  monthly: "a month",
  quarterly: "a quarter",
  yearly: "a year",
};

/** "£34.97 a month + $15.49 a month"; null when empty or all zero. */
export function formatMoneyList(list: Money[] | null | undefined, suffix = "", format: (money: Money) => string = formatMoney) {
  const shown = (list ?? []).filter((money) => money.minor !== 0);
  if (shown.length === 0) return null;
  return shown.map((money) => `${format(money)}${suffix ? ` ${suffix}` : ""}`).join(" + ");
}

/** "£34.97/mo + $15.49/mo" for tight rows. */
export function formatMonthlyShort(list: Money[] | null | undefined) {
  const shown = (list ?? []).filter((money) => money.minor !== 0);
  if (shown.length === 0) return null;
  return shown.map((money) => formatMoney(money)).join(" + ");
}

/** For a typed amount: whole minor units from "£1,150.5" in `currency`. Null when empty. */
export function parseMinor(text: string, currency: string) {
  const digits = minorDigits(currency);
  const kept = text.replace(/[^\d.]/g, "");
  if (!kept) return null;
  const [whole, fraction = ""] = kept.split(".");
  const minorPart = digits === 0 ? "" : fraction.replace(/\./g, "").slice(0, digits).padEnd(digits, "0");
  return Number(whole || "0") * 10 ** digits + Number(minorPart || "0");
}

/** The currency's symbol, for the "£" prefix in money fields. */
export function currencySymbol(currency: string) {
  try {
    const parts = new Intl.NumberFormat("en-GB", { style: "currency", currency }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}
