/**
 * The record key, made in the browser. No hand-written crypto: X25519 from @noble/curves, Shamir from
 * shamir-secret-sharing (split(key, 3, 2)), HPKE from @hpke/core with @hpke/dhkem-x25519 (pure JS, so it works
 * where WebCrypto has no X25519). Every buffer that held key material is wiped once it's sent.
 * Formats (API.md "Crypto formats"): HPKE base mode, single-shot, DHKEM(X25519, HKDF-SHA256) / HKDF-SHA256 /
 * AES-256-GCM, info "afterbox/v1", output enc(32) ‖ ct.
 */

import { Aes256Gcm, CipherSuite, HkdfSha256 } from "@hpke/core";
import { DhkemX25519HkdfSha256 } from "@hpke/dhkem-x25519";
import { x25519 } from "@noble/curves/ed25519.js";
import { split } from "shamir-secret-sharing";
import { toBase64url, utf8, wipe } from "@/lib/api/base64url";
import type { KeysSetupBody } from "@/lib/api/types";

export const INFO = utf8("afterbox/v1");
export const ENC_LENGTH = 32;

export function makeSuite() {
  return new CipherSuite({ kem: new DhkemX25519HkdfSha256(), kdf: new HkdfSha256(), aead: new Aes256Gcm() });
}

function concat(a: ArrayBuffer, b: ArrayBuffer) {
  const out = new Uint8Array(a.byteLength + b.byteLength);
  out.set(new Uint8Array(a), 0);
  out.set(new Uint8Array(b), a.byteLength);
  return out;
}

/** Seals `plaintext` to a raw X25519 public key: enc(32) ‖ ct. */
export async function sealTo(publicKey: Uint8Array, plaintext: Uint8Array, aad: string): Promise<Uint8Array> {
  const suite = makeSuite();
  const recipientPublicKey = await suite.kem.deserializePublicKey(publicKey);
  const { enc, ct } = await suite.seal({ recipientPublicKey, info: INFO }, plaintext as BufferSource, utf8(aad) as BufferSource);
  return concat(enc, ct);
}

export type RecordKeys = {
  /** For POST /v1/keys/setup. */
  body: KeysSetupBody;
  /** This device's member part, for the backup code envelope. The caller wipes it. */
  memberPart: Uint8Array;
};

/**
 * "Lock my record": a fresh X25519 key pair, its private key split 2-of-3, the trusted piece sealed to the record's
 * own public key with AAD `trusted-pending:<userId>`. The private key and the other pieces are wiped here.
 */
export async function createRecordKeys(userId: string): Promise<RecordKeys> {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const pieces = await split(privateKey, 3, 2);
  wipe(privateKey);
  const [member, afterbox, trusted] = pieces;
  try {
    const trustedSealed = await sealTo(publicKey, trusted, `trusted-pending:${userId}`);
    return {
      body: {
        publicKey: toBase64url(publicKey),
        memberPart: toBase64url(member),
        afterboxPart: toBase64url(afterbox),
        trustedPartSealed: toBase64url(trustedSealed),
      },
      memberPart: Uint8Array.from(member),
    };
  } finally {
    wipe(member, afterbox, trusted);
  }
}

/* Relays: a throwaway key pair for one device approval or help request. */

export type RelayKeyPair = { privateKey: Uint8Array; publicKey: string };

export async function createRelayKeyPair(): Promise<RelayKeyPair> {
  const kem = new DhkemX25519HkdfSha256();
  const pair = await kem.generateKeyPair();
  const publicKey = new Uint8Array(await kem.serializePublicKey(pair.publicKey));
  const privateKey = new Uint8Array(await kem.serializePrivateKey(pair.privateKey));
  return { privateKey, publicKey: toBase64url(publicKey) };
}

/** Opens a relayed `sealedBlob` with the relay private key; AAD `relay:<requestId>:<userId>`. The caller wipes both. */
export async function openRelay(privateKey: Uint8Array, sealed: Uint8Array, requestId: string, userId: string): Promise<Uint8Array> {
  const suite = makeSuite();
  const recipientKey = await suite.kem.deserializePrivateKey(privateKey);
  const plain = await suite.open(
    { recipientKey, enc: sealed.slice(0, ENC_LENGTH) as BufferSource, info: INFO },
    sealed.slice(ENC_LENGTH) as BufferSource,
    utf8(`relay:${requestId}:${userId}`) as BufferSource,
  );
  return new Uint8Array(plain);
}
