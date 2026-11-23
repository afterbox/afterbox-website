import { x25519 } from "@noble/curves/ed25519.js";
import { combine } from "shamir-secret-sharing";
import { beforeEach, describe, expect, it } from "vitest";
import { fromBase64url } from "@/lib/api/base64url";
import { formatCode, generateCode, lockEnvelope, normalizeCode, openEnvelope } from "@/lib/security/backup";
import { ENC_LENGTH, INFO, createRecordKeys, createRelayKeyPair, makeSuite, openRelay, sealTo } from "@/lib/security/crypto";
import { closeVault, deleteSecret, forgetMember, getSecret, hasSecret, putSecret, vaultNames } from "@/lib/security/vault";

const USER = "0193a7b2-0000-7000-8000-000000000001";

async function openWith(privateKey: Uint8Array, sealed: Uint8Array, aad: string) {
  const suite = makeSuite();
  const recipientKey = await suite.kem.deserializePrivateKey(privateKey);
  const plain = await suite.open(
    { recipientKey, enc: sealed.slice(0, ENC_LENGTH), info: INFO },
    sealed.slice(ENC_LENGTH),
    new TextEncoder().encode(aad),
  );
  return new Uint8Array(plain);
}

describe("record keys (POST /v1/keys/setup)", () => {
  it("sends parts that rebuild the private key for publicKey, at the sizes the API checks", async () => {
    const keys = await createRecordKeys(USER);
    const { body } = keys;
    const publicKey = fromBase64url(body.publicKey);
    const member = fromBase64url(body.memberPart);
    const afterbox = fromBase64url(body.afterboxPart);
    const sealed = fromBase64url(body.trustedPartSealed);
    expect(publicKey).toHaveLength(32);
    expect(member).toHaveLength(33);
    expect(afterbox).toHaveLength(33);
    expect(sealed).toHaveLength(81);
    // Nothing but the request body leaves createRecordKeys: the member part isn't kept for later.
    expect(Object.keys(keys)).toEqual(["body"]);
    const rebuilt = await combine([member, afterbox]);
    expect(x25519.getPublicKey(rebuilt)).toEqual(publicKey);
  });

  it("seals the third piece to the record's own key with AAD trusted-pending:<userId>", async () => {
    const { body } = await createRecordKeys(USER);
    const member = fromBase64url(body.memberPart);
    const afterbox = fromBase64url(body.afterboxPart);
    const privateKey = await combine([member, afterbox]);
    const trusted = await openWith(privateKey, fromBase64url(body.trustedPartSealed), `trusted-pending:${USER}`);
    expect(trusted).toHaveLength(33);
    // Any two of three rebuild the key: the trusted piece with either other one.
    expect(await combine([trusted, member])).toEqual(privateKey);
    await expect(openWith(privateKey, fromBase64url(body.trustedPartSealed), "trusted-pending:someone-else")).rejects.toThrow();
  });

  it("makes a different key every time", async () => {
    const [a, b] = await Promise.all([createRecordKeys(USER), createRecordKeys(USER)]);
    expect(a.body.publicKey).not.toBe(b.body.publicKey);
  });
});

describe("relays (device approval and help)", () => {
  it("opens what the server sealed to the relay key with AAD relay:<id>:<userId>", async () => {
    const relay = await createRelayKeyPair();
    expect(fromBase64url(relay.publicKey)).toHaveLength(32);
    const deviceBlob = crypto.getRandomValues(new Uint8Array(61));
    const sealed = await sealTo(fromBase64url(relay.publicKey), deviceBlob, `relay:approval-1:${USER}`);
    expect(sealed).toHaveLength(109);
    await expect(openRelay(relay.privateKey, sealed, "approval-1", USER)).resolves.toEqual(deviceBlob);
  });

  it("refuses a relay for another request or member", async () => {
    const relay = await createRelayKeyPair();
    const sealed = await sealTo(fromBase64url(relay.publicKey), new Uint8Array(61), `relay:approval-1:${USER}`);
    await expect(openRelay(relay.privateKey, sealed, "approval-2", USER)).rejects.toThrow();
    await expect(openRelay(relay.privateKey, sealed, "approval-1", "another-user")).rejects.toThrow();
  });
});

describe("backup code", () => {
  it("is 24 Crockford base32 characters in six groups of four", () => {
    const code = generateCode();
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{24}$/);
    expect(formatCode(code)).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){5}[0-9A-HJKMNP-TV-Z]{4}$/);
  });

  it("corrects lookalikes and drops separators", () => {
    expect(normalizeCode("k7qm-4xrt o1il")).toBe("K7QM4XRT0111");
  });

  it("locks the member part so only the same code opens it, with kdf params inside the API's floors", async () => {
    const memberPart = crypto.getRandomValues(new Uint8Array(33));
    const code = generateCode();
    const envelope = await lockEnvelope(code, memberPart);
    expect(envelope.kdf).toMatchObject({ alg: "argon2id", memoryKiB: 65536, iterations: 3, parallelism: 1 });
    expect(fromBase64url(envelope.kdf.salt)).toHaveLength(16);
    const locked = fromBase64url(envelope.lockedPart);
    expect(locked.length).toBeGreaterThanOrEqual(32);
    expect(locked.length).toBeLessThanOrEqual(512);
    await expect(openEnvelope(formatCode(code).toLowerCase(), envelope)).resolves.toEqual(memberPart);
    await expect(openEnvelope(generateCode(), envelope)).resolves.toBeNull();
    await expect(openEnvelope("short", envelope)).resolves.toBeNull();
  }, 30_000);
});

describe("vault (IndexedDB under non-extractable keys)", () => {
  beforeEach(async () => {
    await forgetMember(USER);
  });

  it("stores, reads and deletes a secret", async () => {
    const blob = crypto.getRandomValues(new Uint8Array(61));
    await putSecret(vaultNames.deviceBlob(USER), blob);
    expect(await hasSecret(vaultNames.deviceBlob(USER))).toBe(true);
    expect(await getSecret(vaultNames.deviceBlob(USER))).toEqual(blob);
    await deleteSecret(vaultNames.deviceBlob(USER));
    expect(await getSecret(vaultNames.deviceBlob(USER))).toBeNull();
  });

  it("never stores the secret in the clear, and its key can't be exported", async () => {
    const blob = new Uint8Array(61).fill(7);
    await putSecret(vaultNames.deviceBlob(USER), blob);
    const raw = await new Promise<{ key: CryptoKey; data: ArrayBuffer }>((resolve) => {
      const open = indexedDB.open("afterbox", 1);
      open.onsuccess = () => {
        const request = open.result.transaction("secrets").objectStore("secrets").get(vaultNames.deviceBlob(USER));
        request.onsuccess = () => {
          resolve(request.result);
          open.result.close();
        };
      };
    });
    expect(new Uint8Array(raw.data)).not.toEqual(blob);
    expect(raw.key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("raw", raw.key)).rejects.toThrow();
  });

  it("forgets everything of one member and nothing of another", async () => {
    await putSecret(vaultNames.deviceBlob(USER), new Uint8Array([1]));
    await putSecret(vaultNames.relay(USER, "help", "r1"), new Uint8Array([2]));
    await putSecret(vaultNames.deviceBlob("other"), new Uint8Array([3]));
    await forgetMember(USER);
    expect(await hasSecret(vaultNames.deviceBlob(USER))).toBe(false);
    expect(await hasSecret(vaultNames.relay(USER, "help", "r1"))).toBe(false);
    expect(await getSecret(vaultNames.deviceBlob("other"))).toEqual(new Uint8Array([3]));
    await closeVault();
  });
});
