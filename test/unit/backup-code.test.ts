import { beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64url, toBase64url } from "@/lib/api/base64url";
import { configureClient } from "@/lib/api/client";
import type { Envelope } from "@/lib/api/types";
import { generateCode, openEnvelope } from "@/lib/security/backup";
import { openMemberPart, sealTo } from "@/lib/security/crypto";
import { saveBackupCode, setCurrentUser } from "@/lib/security/keychain";
import { dropLegacyMemberParts, hasSecret, names, putSecret, vaultNames } from "@/lib/security/vault";
import { apiError, http, HttpResponse, server, url } from "./msw";

const USER = "0193a7b2-0000-7000-8000-000000000002";
const handlers = { unlock: vi.fn(), stepUp: vi.fn(), signedOut: vi.fn() };

/** The backend's POST /v1/recovery/member-part: the part sealed with HPKE to the browser's key, AAD member-part:<userId>. */
function memberPartRoute(part: Uint8Array, { stepUpFirst = false, aadUser = USER } = {}) {
  const seen: string[] = [];
  let asked = 0;
  server.use(
    http.post(url("/v1/recovery/member-part"), async ({ request }) => {
      asked += 1;
      if (stepUpFirst && asked === 1) return apiError(403, "STEP_UP_REQUIRED");
      const { relayPublicKey } = (await request.json()) as { relayPublicKey: string };
      seen.push(relayPublicKey);
      const sealed = await sealTo(fromBase64url(relayPublicKey), part, `member-part:${aadUser}`);
      return HttpResponse.json({ sealedPart: toBase64url(sealed) });
    }),
  );
  return { seen, asked: () => asked };
}

function envelopeRoute() {
  const saved: Envelope[] = [];
  server.use(
    http.put(url("/v1/recovery/envelope"), async ({ request }) => {
      saved.push((await request.json()) as Envelope);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return saved;
}

beforeEach(() => {
  handlers.unlock.mockReset().mockResolvedValue(undefined);
  handlers.stepUp.mockReset().mockResolvedValue(undefined);
  handlers.signedOut.mockReset();
  configureClient(handlers);
});

describe("making a backup code on any unlocked device", () => {
  it("asks the server for the member part sealed to a throwaway key, locks it with the code and PUTs the envelope", async () => {
    const part = crypto.getRandomValues(new Uint8Array(33));
    const route = memberPartRoute(part);
    const saved = envelopeRoute();
    const code = generateCode();

    await saveBackupCode(code, USER);

    expect(route.seen).toHaveLength(1);
    expect(fromBase64url(route.seen[0])).toHaveLength(32);
    expect(saved).toHaveLength(1);
    await expect(openEnvelope(code, saved[0])).resolves.toEqual(part);
    // Nothing of it is kept on the device.
    expect((await names()).filter((name) => name.includes("member-part"))).toEqual([]);
  }, 30_000);

  it("uses a new key each time (it's thrown away)", async () => {
    const route = memberPartRoute(crypto.getRandomValues(new Uint8Array(33)));
    envelopeRoute();
    await saveBackupCode(generateCode(), USER);
    await saveBackupCode(generateCode(), USER);
    expect(route.seen).toHaveLength(2);
    expect(route.seen[0]).not.toBe(route.seen[1]);
  }, 60_000);

  it("runs the passkey step-up on 403 STEP_UP_REQUIRED, then asks again", async () => {
    const part = crypto.getRandomValues(new Uint8Array(33));
    const route = memberPartRoute(part, { stepUpFirst: true });
    const saved = envelopeRoute();
    const code = generateCode();
    await saveBackupCode(code, USER);
    expect(handlers.stepUp).toHaveBeenCalledTimes(1);
    expect(route.asked()).toBe(2);
    await expect(openEnvelope(code, saved[0])).resolves.toEqual(part);
  }, 30_000);

  it("refuses a part sealed for another member, and stores no envelope", async () => {
    memberPartRoute(crypto.getRandomValues(new Uint8Array(33)), { aadUser: "someone-else" });
    const saved = envelopeRoute();
    await expect(saveBackupCode(generateCode(), USER)).rejects.toThrow();
    expect(saved).toEqual([]);
  });

  it("stores no envelope when the member part can't be had (429)", async () => {
    server.use(http.post(url("/v1/recovery/member-part"), () => apiError(429, "RATE_LIMITED", { retryAfter: 600 })));
    const saved = envelopeRoute();
    await expect(saveBackupCode(generateCode(), USER)).rejects.toMatchObject({ status: 429 });
    expect(saved).toEqual([]);
  });

  it("opens only with AAD member-part:<userId>", async () => {
    const kem = await import("@/lib/security/crypto").then((m) => m.createRelayKeyPair());
    const part = crypto.getRandomValues(new Uint8Array(33));
    const sealed = await sealTo(fromBase64url(kem.publicKey), part, `member-part:${USER}`);
    await expect(openMemberPart(kem.privateKey, sealed, USER)).resolves.toEqual(part);
    await expect(openMemberPart(kem.privateKey, sealed, "other")).rejects.toThrow();
  });
});

describe("member parts stored by older builds", () => {
  it("are deleted from IndexedDB, for every member, and nothing else is", async () => {
    await putSecret(`${vaultNames.legacyMemberPartPrefix}${USER}`, new Uint8Array([1]));
    await putSecret(`${vaultNames.legacyMemberPartPrefix}other`, new Uint8Array([2]));
    await putSecret(vaultNames.deviceBlob(USER), new Uint8Array([3]));
    await dropLegacyMemberParts();
    expect(await hasSecret(`${vaultNames.legacyMemberPartPrefix}${USER}`)).toBe(false);
    expect(await hasSecret(`${vaultNames.legacyMemberPartPrefix}other`)).toBe(false);
    expect(await hasSecret(vaultNames.deviceBlob(USER))).toBe(true);
  });

  it("are deleted as soon as the signed-in member is known", async () => {
    await putSecret(`${vaultNames.legacyMemberPartPrefix}${USER}`, new Uint8Array([1]));
    setCurrentUser(USER);
    await expect.poll(() => hasSecret(`${vaultNames.legacyMemberPartPrefix}${USER}`)).toBe(false);
    setCurrentUser(null);
  });
});

describe("silent unlock after a fresh sign-in", () => {
  it("answers 403 once, then sends 423s to /unlock without spending more unlocks until one succeeds", async () => {
    const { silentUnlock } = await import("@/lib/security/keychain");
    setCurrentUser(USER);
    await putSecret(vaultNames.deviceBlob(USER), new Uint8Array(61).fill(1));
    let unlocks = 0;
    let bound = false;
    server.use(
      http.post(url("/v1/unlock"), () => {
        unlocks += 1;
        return bound ? new HttpResponse(null, { status: 204 }) : apiError(403, "FORBIDDEN");
      }),
    );
    await expect(silentUnlock()).rejects.toMatchObject({ code: "UNLOCK_REQUIRED" });
    await expect(silentUnlock()).rejects.toMatchObject({ code: "UNLOCK_REQUIRED" });
    await expect(silentUnlock()).rejects.toMatchObject({ code: "UNLOCK_REQUIRED" });
    expect(unlocks).toBe(1);
    // After the passkey binds the session, an unlock succeeds and silent unlocks work again.
    bound = true;
    const { unlockWithBlob } = await import("@/lib/security/keychain");
    await unlockWithBlob(USER);
    await expect(silentUnlock()).resolves.toBeUndefined();
    expect(unlocks).toBe(3);
    setCurrentUser(null);
  });
});
