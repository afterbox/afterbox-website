/**
 * Every ceremony that touches key material, against the real API. The store hooks call these; screens never do.
 * - Passkeys go through @simplewebauthn/browser.
 * - The device blob lives in the vault: IndexedDB under non-extractable WebCrypto keys. The member part is never
 *   kept: a backup code asks the server for it, sealed to a throwaway key, and wipes it. Buffers are wiped once sent.
 * - Request bodies here are never logged.
 */

import { startAuthentication, startRegistration, WebAuthnError } from "@simplewebauthn/browser";
import { fromBase64url, toBase64url, wipe } from "@/lib/api/base64url";
import { api, seg } from "@/lib/api/client";
import { ApiError, UnlockRequiredError, isApiError } from "@/lib/api/errors";
import type { DeviceBlobReply, Envelope, SealedBlobReply, SealedPartReply } from "@/lib/api/types";
import { lockEnvelope, openEnvelope } from "./backup";
import { createRecordKeys, createRelayKeyPair, openMemberPart, openRelay } from "./crypto";
import { thisDeviceInfo } from "./deviceInfo";
import {
  deleteMatching,
  deleteSecret,
  dropLegacyMemberParts,
  forgetMember,
  getSecret,
  hasSecret,
  names,
  putSecret,
  vaultNames,
  type RelayKind,
} from "./vault";

/** What the screens show when a passkey ceremony fails or is cancelled. */
export const PASSKEY_ERROR = "That didn’t go through. Try again.";

export class PasskeyError extends Error {
  constructor(readonly reason: "cancelled" | "failed" | "unsupported" = "failed") {
    super(PASSKEY_ERROR);
    this.name = "PasskeyError";
  }
}

function toPasskeyError(error: unknown): Error {
  if (isApiError(error)) return error;
  if (error instanceof WebAuthnError && error.code === "ERROR_CEREMONY_ABORTED") return new PasskeyError("cancelled");
  if (error instanceof DOMException && error.name === "NotAllowedError") return new PasskeyError("cancelled");
  return new PasskeyError("failed");
}

/* Who's signed in: the vault is scoped per member. Set from /v1/me as soon as it loads. */

let currentUserId: string | null = null;

export function setCurrentUser(userId: string | null) {
  if (userId !== currentUserId) needsPasskey = false;
  currentUserId = userId;
  // Older builds kept the member part on the device: delete any copy left behind.
  if (userId && typeof indexedDB !== "undefined") void dropLegacyMemberParts().catch(() => undefined);
}

export const getCurrentUser = () => currentUserId;

function requireUser(userId?: string) {
  const id = userId ?? currentUserId;
  if (!id) throw new UnlockRequiredError();
  return id;
}

/* This session's passkey device (a new device registers one before asking to be let in). Not secret. */

const REGISTERED_KEY = "afterbox.passkey-session";

function markRegistered(userId: string) {
  try {
    sessionStorage.setItem(REGISTERED_KEY, userId);
  } catch {
    // Private mode: we'll just register again if asked.
  }
}

function isRegistered(userId: string) {
  try {
    return sessionStorage.getItem(REGISTERED_KEY) === userId;
  } catch {
    return false;
  }
}

export function forgetRegistration() {
  try {
    sessionStorage.removeItem(REGISTERED_KEY);
  } catch {
    // Nothing kept.
  }
}

/** Adds a passkey on this device and binds this session to its new device. */
export async function registerPasskey(userId?: string): Promise<string> {
  const id = requireUser(userId);
  try {
    const optionsJSON = await api.post<Parameters<typeof startRegistration>[0]["optionsJSON"]>("/v1/passkeys/register/options");
    const response = await startRegistration({ optionsJSON });
    const info = await thisDeviceInfo();
    const { deviceId } = await api.post<{ deviceId: string }>("/v1/passkeys/register/verify", {
      response,
      name: info.name.slice(0, 80),
      browser: info.browser.slice(0, 40),
      device: info.device.slice(0, 40),
      kind: info.kind,
    });
    markRegistered(id);
    return deviceId;
  } catch (error) {
    throw toPasskeyError(error);
  }
}

/** The passkey confirmation: step-up for 5 minutes, and binds this session to the passkey's device. */
export async function confirmPasskey(): Promise<string> {
  try {
    const optionsJSON = await api.post<Parameters<typeof startAuthentication>[0]["optionsJSON"]>("/v1/passkeys/auth/options");
    const response = await startAuthentication({ optionsJSON });
    const { deviceId } = await api.post<{ deviceId: string }>("/v1/passkeys/auth/verify", { response });
    return deviceId;
  } catch (error) {
    throw toPasskeyError(error);
  }
}

let steppingUp: Promise<void> | null = null;

/** For the API client's 403 STEP_UP_REQUIRED: one passkey prompt at a time. */
export function stepUp(): Promise<void> {
  steppingUp ??= confirmPasskey()
    .then(() => undefined)
    .finally(() => {
      steppingUp = null;
    });
  return steppingUp;
}

/* The device blob */

export async function hasDeviceBlob(userId?: string) {
  const id = userId ?? currentUserId;
  if (!id || typeof indexedDB === "undefined") return false;
  try {
    return await hasSecret(vaultNames.deviceBlob(id));
  } catch {
    return false;
  }
}

async function storeBlob(userId: string, deviceBlob: Uint8Array) {
  await putSecret(vaultNames.deviceBlob(userId), deviceBlob);
}

/** Drops this device's blob (its unlock answered 403 after a passkey: the device can't open the record now). */
export async function dropDeviceBlob(userId?: string) {
  const id = userId ?? currentUserId;
  if (!id) return;
  await deleteSecret(vaultNames.deviceBlob(id));
}

/** POST /v1/unlock with the stored blob. Throws UnlockRequiredError when there's no blob. */
export async function unlockWithBlob(userId?: string): Promise<void> {
  const id = requireUser(userId);
  const blob = await getSecret(vaultNames.deviceBlob(id));
  if (!blob) throw new UnlockRequiredError();
  try {
    await api.post("/v1/unlock", { deviceBlob: toBase64url(blob) });
    needsPasskey = false;
  } finally {
    wipe(blob);
  }
}

let unlocking: Promise<void> | null = null;
/**
 * Set once a silent unlock answered 403 (a fresh sign-in, not bound to this device yet): until the passkey runs and
 * an unlock succeeds, a 423 goes straight to /unlock instead of spending another of the 10 unlocks per 15 minutes.
 */
let needsPasskey = false;

/**
 * For the API client's 423: a silent re-unlock in a session already bound to this device. A fresh sign-in
 * (unbound) answers 403, which means "confirm with the passkey on /unlock": UnlockRequiredError.
 */
export function silentUnlock(): Promise<void> {
  if (needsPasskey) return Promise.reject(new UnlockRequiredError());
  unlocking ??= unlockWithBlob()
    .catch((error: unknown) => {
      if (isApiError(error) && error.status === 429) throw error;
      if (isApiError(error) && error.status === 403) needsPasskey = true;
      throw new UnlockRequiredError();
    })
    .finally(() => {
      unlocking = null;
    });
  return unlocking;
}

/**
 * Screen 04 after a fresh sign-in: passkey first (binds the session to this device), then the blob.
 * A 403 after a good passkey means this device's blob no longer opens the record: drop it.
 */
export async function unlockWithPasskey(userId?: string): Promise<void> {
  const id = requireUser(userId);
  await confirmPasskey();
  try {
    await unlockWithBlob(id);
  } catch (error) {
    if (isApiError(error) && error.status === 403) await dropDeviceBlob(id);
    throw error;
  }
}

/* Locking the record (01 → 03) */

/**
 * Registers this device's passkey, makes the record key, sends the pieces, keeps the blob, then unlocks this
 * session. Returns nothing secret; the member part is not kept.
 */
export async function lockRecord(userId: string): Promise<void> {
  const keys = await createRecordKeys(userId);
  let blob: Uint8Array | null = null;
  try {
    const reply = await withSessionPasskey(userId, () => api.post<DeviceBlobReply>("/v1/keys/setup", keys.body));
    blob = fromBase64url(reply.deviceBlob);
    await storeBlob(userId, blob);
  } finally {
    wipe(blob);
    keys.body.memberPart = "";
    keys.body.afterboxPart = "";
  }
  await unlockWithBlob(userId);
}

/* The backup code */

/**
 * Makes a backup code on any unlocked device: a throwaway HPKE key, POST /v1/recovery/member-part (A · U · S: the
 * client runs the passkey on 403 STEP_UP_REQUIRED and re-unlocks on 423), the sealed part opened in memory, the
 * envelope locked with the code and PUT. The part and the private key are wiped whatever happens; nothing is kept.
 */
export async function saveBackupCode(code: string, userId?: string): Promise<void> {
  const id = requireUser(userId);
  const relay = await createRelayKeyPair();
  let sealed: Uint8Array | null = null;
  let part: Uint8Array | null = null;
  try {
    const reply = await api.post<SealedPartReply>("/v1/recovery/member-part", { relayPublicKey: relay.publicKey });
    sealed = fromBase64url(reply.sealedPart);
    part = await openMemberPart(relay.privateKey, sealed, id);
    const envelope = await lockEnvelope(code, part);
    await api.put("/v1/recovery/envelope", envelope);
  } finally {
    wipe(relay.privateKey, sealed, part);
  }
}

/** Runs `action` with a passkey registered on this session, registering one first when needed (or asked to). */
async function withSessionPasskey<T>(userId: string, action: () => Promise<T>): Promise<T> {
  if (!isRegistered(userId)) await registerPasskey(userId);
  try {
    return await action();
  } catch (error) {
    // 409: the session's passkey device is gone (another tab, an old session): register again, once.
    if (isApiError(error) && error.status === 409 && /passkey/i.test(error.message)) {
      forgetRegistration();
      await registerPasskey(userId);
      return action();
    }
    throw error;
  }
}

/** Unlocks a new device with the backup code. Resolves false for a wrong code. */
export async function unlockWithCode(code: string, userId?: string): Promise<boolean> {
  const id = requireUser(userId);
  const envelope = await api.get<Envelope>("/v1/recovery/envelope");
  const part = await openEnvelope(code, envelope);
  if (!part) return false;
  let blob: Uint8Array | null = null;
  try {
    const reply = await withSessionPasskey(id, () => api.post<DeviceBlobReply>("/v1/devices/enrol", { memberPart: toBase64url(part) }));
    blob = fromBase64url(reply.deviceBlob);
    await storeBlob(id, blob);
  } finally {
    wipe(part, blob);
  }
  await unlockWithBlob(id);
  return true;
}

/* Relays: device approval (06) and trusted-person help (10–11) */

async function openRequest(userId: string, kind: RelayKind, path: string): Promise<string> {
  const relay = await createRelayKeyPair();
  try {
    const reply = await withSessionPasskey(userId, () =>
      api.post<{ approvalId?: string; requestId?: string }>(path, { relayPublicKey: relay.publicKey }),
    );
    const id = reply.approvalId ?? reply.requestId;
    if (!id) throw new ApiError(500, "INTERNAL", "Something went wrong. Try again.");
    // Survives a closed tab: the help wait is an hour, an approval up to 10 minutes.
    await putSecret(vaultNames.relay(userId, kind, id), relay.privateKey);
    return id;
  } finally {
    wipe(relay.privateKey);
  }
}

export const requestApproval = (userId?: string) => openRequest(requireUser(userId), "device", "/v1/devices/approvals");
export const requestHelp = (userId?: string) => openRequest(requireUser(userId), "help", "/v1/recovery/help-request");

/** A request this browser opened and hasn't finished: reopen its waiting screen after a reload or a closed tab. */
export async function findOpenRequest(userId?: string): Promise<{ kind: RelayKind; id: string } | null> {
  const id = userId ?? currentUserId;
  if (!id || typeof indexedDB === "undefined") return null;
  try {
    const prefix = vaultNames.relayPrefix(id);
    const open = (await names()).filter((name) => name.startsWith(prefix)).map((name) => name.slice(prefix.length));
    // Help outlives approvals (an hour against ten minutes): prefer it.
    const help = open.find((name) => name.startsWith("help:"));
    const device = open.find((name) => name.startsWith("device:"));
    const found = help ?? device;
    if (!found) return null;
    const [kind, ...rest] = found.split(":");
    return { kind: kind as RelayKind, id: rest.join(":") };
  } catch {
    return null;
  }
}

export async function hasRelay(kind: RelayKind, requestId: string, userId?: string) {
  const id = userId ?? currentUserId;
  return id ? hasSecret(vaultNames.relay(id, kind, requestId)) : false;
}

export async function dropRelay(kind: RelayKind, requestId: string, userId?: string) {
  const id = userId ?? currentUserId;
  if (id) await deleteSecret(vaultNames.relay(id, kind, requestId));
}

async function collect(userId: string, kind: RelayKind, requestId: string, path: string): Promise<void> {
  const privateKey = await getSecret(vaultNames.relay(userId, kind, requestId));
  if (!privateKey) throw new ApiError(400, "VALIDATION", "Ask again from this device.");
  let sealed: Uint8Array | null = null;
  let blob: Uint8Array | null = null;
  try {
    const reply = await api.post<SealedBlobReply>(path);
    sealed = fromBase64url(reply.sealedBlob);
    blob = await openRelay(privateKey, sealed, requestId, userId);
    await storeBlob(userId, blob);
  } finally {
    wipe(privateKey, sealed, blob);
  }
  await dropRelay(kind, requestId, userId);
  await unlockWithBlob(userId);
}

export const collectApproval = (approvalId: string, userId?: string) =>
  collect(requireUser(userId), "device", approvalId, `/v1/devices/approvals/${seg(approvalId)}/collect`);

export const collectHelp = (requestId: string, userId?: string) =>
  collect(requireUser(userId), "help", requestId, `/v1/recovery/help-requests/${seg(requestId)}/collect`);

/* Leaving */

/** Account deleted: nothing of this member stays in the browser. */
export async function forgetEverything(userId?: string) {
  const id = userId ?? currentUserId;
  forgetRegistration();
  if (id) await forgetMember(id);
}

/** Relays left from requests that ended (cancelled, declined, expired). */
export async function dropAllRelays(userId?: string) {
  const id = userId ?? currentUserId;
  if (id) await deleteMatching(vaultNames.relayPrefix(id));
}
