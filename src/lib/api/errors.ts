/** Typed errors from the backend's `{ error: { code, message, details? } }`. */

export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "STEP_UP_REQUIRED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "LIMIT_BANKS"
  | "LIMIT_ITEMS"
  | "LIMIT_DOCUMENTS"
  | "LIMIT_TRUSTED"
  | "LIMIT_PEOPLE"
  | "LIMIT_SHARING"
  | "PAYLOAD_TOO_LARGE"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE"
  | "UNLOCK_REQUIRED"
  | "CODE_WRONG"
  | "CODE_EXPIRED"
  | "PASSKEY_FAILED"
  | "RATE_LIMITED"
  | "LOCKED"
  | "SCAN_FAILED"
  | "KEYS_REQUIRED"
  | "BANK_LINK_FAILED"
  | "BANK_ALREADY_CONNECTED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL"
  | "NETWORK";

export type ErrorDetails = {
  issues?: { path: string; message: string }[];
  field?: string;
  triesLeft?: number;
  retryAfter?: number;
  limit?: number;
  rescanAfter?: string;
  maxBytes?: number;
  service?: string;
  collectableAt?: string;
  /** NETWORK only: the browser said it was offline when the request failed. */
  offline?: boolean;
  [key: string]: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: ErrorDetails;

  constructor(status: number, code: ErrorCode, message: string, details: ErrorDetails = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get retryAfter(): number | null {
    return typeof this.details.retryAfter === "number" ? this.details.retryAfter : null;
  }

  get isLimit() {
    return this.status === 402;
  }
}

/** A U route answered 423 and the silent re-unlock couldn't help: this device must unlock on /unlock. */
export class UnlockRequiredError extends ApiError {
  constructor() {
    super(423, "UNLOCK_REQUIRED", "Unlock to carry on.");
    this.name = "UnlockRequiredError";
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export const hasCode = (error: unknown, ...codes: ErrorCode[]) => isApiError(error) && codes.includes(error.code);

const GENERIC = "Something went wrong. Try again.";

/** A request that got no answer: offline only when the browser says so, otherwise afterbox couldn't be reached. */
export const NETWORK_MESSAGES = {
  offline: "You’re offline. Check your connection and try again.",
  unreachable: "Can’t reach afterbox right now. Try again in a moment.",
} as const;

/** NETWORK while the browser said it was offline (never from a failed request alone). */
export const isOfflineError = (error: unknown) => hasCode(error, "NETWORK") && (error as ApiError).details.offline === true;

/** "Try again in 3 minutes." from seconds. */
export function retryAfterText(seconds: number | null) {
  if (seconds === null) return "Try again soon.";
  if (seconds < 60) return seconds <= 1 ? "Try again in a second." : `Try again in ${seconds} seconds.`;
  const minutes = Math.ceil(seconds / 60);
  return `Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
}

/**
 * Calm copy for an error, from the backend's API_REVIEW section 6. Codes with screen-specific copy
 * (CODE_WRONG, SCAN_FAILED…) are handled by their screens; this is the fallback everywhere else.
 */
export function errorCopy(error: unknown): string {
  if (!isApiError(error)) return GENERIC;
  switch (error.code) {
    case "RATE_LIMITED":
    case "LOCKED":
      return `Too many tries. ${retryAfterText(error.retryAfter)}`;
    case "FILE_TOO_LARGE":
    case "PAYLOAD_TOO_LARGE":
      return "This file is too large. Try a photo or a shorter PDF.";
    case "UNSUPPORTED_FILE":
      return "We can read photos and PDFs.";
    case "SCAN_FAILED":
      return error.status === 504 ? "That took too long. Try again." : "We couldn’t read this one. Type it in instead?";
    case "SERVICE_UNAVAILABLE":
      return NETWORK_MESSAGES.unreachable;
    case "INTERNAL":
      return error.status >= 500 ? NETWORK_MESSAGES.unreachable : GENERIC;
    case "KEYS_REQUIRED":
      return "Lock your record first, then accept.";
    case "CONFLICT":
    case "BANK_ALREADY_CONNECTED":
      return error.message || GENERIC;
    case "NOT_FOUND":
      return "This link has expired or was already used.";
    case "NETWORK":
      return error.details.offline ? NETWORK_MESSAGES.offline : NETWORK_MESSAGES.unreachable;
    case "VALIDATION":
      return error.details.issues?.[0]?.message ?? error.message ?? GENERIC;
    default:
      return GENERIC;
  }
}

/**
 * Demo mode (GET /v1/me `demo: true`): every member is on Standard and plans are off, so no copy mentions a plan or
 * an upgrade. Set from /v1/me as it loads (src/store/me).
 */
let demoMode = false;
export function setDemoMode(on: boolean) {
  demoMode = on;
}
export const isDemoMode = () => demoMode;

/** A limit said without a plan (demo mode). */
function demoLimitCopy(error: ApiError): string {
  const limit = error.details.limit;
  switch (error.code) {
    case "LIMIT_ITEMS":
      return limit ? `Your record holds up to ${limit} things.` : "Your record is full.";
    case "LIMIT_DOCUMENTS":
      return limit ? `You can read ${limit} documents a month.` : "You’ve read all the documents you can this month.";
    case "LIMIT_TRUSTED":
      return limit ? `You can choose up to ${limit} trusted people.` : "You can’t add another trusted person.";
    case "LIMIT_BANKS":
      return error.details.rescanAfter ? "You can read this bank again later." : limit ? `You can connect up to ${limit} banks.` : "You can’t connect another bank.";
    default:
      return "That isn’t available in the demo.";
  }
}

/**
 * 402 LIMIT_*: plan limits. The upgrade screens are billing work (not built here), so this says what the plan holds,
 * calmly, without a raw error.
 */
export function limitCopy(error: unknown): string | null {
  if (!isApiError(error) || error.status !== 402) return null;
  if (demoMode) return demoLimitCopy(error);
  const limit = error.details.limit;
  switch (error.code) {
    case "LIMIT_ITEMS":
      return limit ? `Your plan has room for ${limit} things in your record.` : "Your record is full on your plan.";
    case "LIMIT_DOCUMENTS":
      return limit ? `Your plan reads ${limit} documents.` : "Your plan has read all the documents it includes.";
    case "LIMIT_TRUSTED":
      return limit === 0 || limit === undefined ? "Choosing a trusted person comes with a paid plan." : `Your plan has room for ${limit} trusted people.`;
    case "LIMIT_BANKS":
      return error.details.rescanAfter ? "Your plan reads one bank, once every 90 days." : "Your plan has room for one bank.";
    default:
      return "That needs a different plan.";
  }
}

/** The copy to show for any error: plan limits first, then everything else. */
export const anyErrorCopy = (error: unknown) => limitCopy(error) ?? errorCopy(error);
