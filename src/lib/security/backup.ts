/**
 * The backup code: 24 Crockford base32 characters (six groups of four), made and Argon2id-derived in the browser.
 * Only the locked envelope reaches the API; the code is never sent or stored.
 * Envelope: lockedPart = iv(12) ‖ AES-256-GCM(memberPart), the key from Argon2id(code) with the stored kdf params.
 */

import { argon2id } from "hash-wasm";
import { fromBase64url, toBase64url, utf8, wipe } from "@/lib/api/base64url";
import type { Envelope, Kdf } from "@/lib/api/types";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const GROUPS = 6;
export const GROUP_LENGTH = 4;
export const CODE_LENGTH = GROUPS * GROUP_LENGTH;

/** 24 characters from 32 symbols: 256 is a multiple of 32, so `byte % 32` has no bias. */
export function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  const code = Array.from(bytes, (byte) => ALPHABET[byte % 32]).join("");
  wipe(bytes);
  return code;
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

/** OWASP's recommended Argon2id setting, above the backend's floors (19 MiB, 2 passes). */
const KDF_DEFAULTS = { alg: "argon2id", memoryKiB: 65536, iterations: 3, parallelism: 1 } as const;

async function deriveKey(code: string, kdf: Kdf): Promise<CryptoKey> {
  const password = utf8(normalizeCode(code));
  const salt = fromBase64url(kdf.salt);
  const raw = await argon2id({
    password,
    salt,
    parallelism: kdf.parallelism,
    iterations: kdf.iterations,
    memorySize: kdf.memoryKiB,
    hashLength: 32,
    outputType: "binary",
  });
  try {
    return await crypto.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
  } finally {
    wipe(raw, password);
  }
}

/** Locks the member part with the code. The caller wipes `memberPart`. */
export async function lockEnvelope(code: string, memberPart: Uint8Array): Promise<Envelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const kdf: Kdf = { ...KDF_DEFAULTS, salt: toBase64url(salt) };
  const key = await deriveKey(code, kdf);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, memberPart as BufferSource));
  const locked = new Uint8Array(iv.length + sealed.length);
  locked.set(iv, 0);
  locked.set(sealed, iv.length);
  wipe(sealed);
  return { lockedPart: toBase64url(locked), kdf };
}

/** The member part, or null for a wrong code. The caller wipes it. */
export async function openEnvelope(code: string, envelope: Envelope): Promise<Uint8Array | null> {
  if (normalizeCode(code).length !== CODE_LENGTH) return null;
  const locked = fromBase64url(envelope.lockedPart);
  try {
    const key = await deriveKey(code, envelope.kdf);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: locked.slice(0, 12) as BufferSource }, key, locked.slice(12) as BufferSource);
    return new Uint8Array(plain);
  } catch {
    return null;
  } finally {
    wipe(locked);
  }
}

export const WRONG_CODE = "That code didn’t work.";
