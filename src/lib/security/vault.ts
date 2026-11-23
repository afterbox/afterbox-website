/**
 * Secrets kept on this device: the device blob, and relay private keys while a device approval or help request
 * is open. The member part is never kept: a backup code asks POST /v1/recovery/member-part for it each time.
 *
 * Each secret is encrypted with its own AES-GCM key created by WebCrypto with `extractable: false`, and the
 * CryptoKey object is stored next to the ciphertext in IndexedDB. Script on the page can ask the browser to use
 * the key but can never read it out. Never localStorage, sessionStorage or cookies.
 */

const DB_NAME = "afterbox";
const STORE = "secrets";
const VERSION = 1;

type Sealed = { key: CryptoKey; iv: Uint8Array; data: ArrayBuffer };

let opening: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          opening = null;
        };
        resolve(database);
      };
      request.onerror = () => {
        opening = null;
        reject(request.error);
      };
    });
  }
  return opening;
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await db();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const request = work(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/** Encrypts `secret` under a fresh non-extractable key and stores both. The caller wipes `secret`. */
export async function putSecret(name: string, secret: Uint8Array): Promise<void> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, secret as BufferSource);
  await run("readwrite", (store) => store.put({ key, iv, data } satisfies Sealed, name));
}

/** The secret's bytes, or null when there's none (or it no longer opens). The caller wipes them after use. */
export async function getSecret(name: string): Promise<Uint8Array | null> {
  const sealed = (await run("readonly", (store) => store.get(name))) as Sealed | undefined;
  if (!sealed?.key || !sealed.data) return null;
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: sealed.iv as BufferSource }, sealed.key, sealed.data));
  } catch {
    return null;
  }
}

export async function hasSecret(name: string): Promise<boolean> {
  const count = await run("readonly", (store) => store.count(name));
  return count > 0;
}

export async function deleteSecret(name: string): Promise<void> {
  await run("readwrite", (store) => store.delete(name));
}

/** Every key name, for clearing a member's secrets and finding open requests. */
export async function names(): Promise<string[]> {
  return (await run("readonly", (store) => store.getAllKeys())).map(String);
}

export async function deleteMatching(prefix: string): Promise<void> {
  const matching = (await names()).filter((name) => name.startsWith(prefix));
  await Promise.all(matching.map(deleteSecret));
}

/* Names, scoped to the member so two accounts on one browser never mix. */

export type RelayKind = "device" | "help";

export const vaultNames = {
  deviceBlob: (userId: string) => `device-blob:${userId}`,
  /** Old builds kept an encrypted member part under `member-part:<userId>`. Only ever deleted now. */
  legacyMemberPartPrefix: "member-part:",
  relay: (userId: string, kind: RelayKind, requestId: string) => `relay:${userId}:${kind}:${requestId}`,
  relayPrefix: (userId: string) => `relay:${userId}:`,
};

/** Everything this browser holds for the member (account deleted). */
export async function forgetMember(userId: string) {
  await Promise.all([
    deleteSecret(vaultNames.deviceBlob(userId)),
    deleteMatching(vaultNames.relayPrefix(userId)),
  ]);
}

/** Deletes every member part an older build stored on this device. */
export async function dropLegacyMemberParts() {
  await deleteMatching(vaultNames.legacyMemberPartPrefix);
}

/** Only for tests: closes the connection so the database can be deleted. */
export async function closeVault() {
  if (!opening) return;
  const database = await opening.catch(() => null);
  database?.close();
  opening = null;
}
