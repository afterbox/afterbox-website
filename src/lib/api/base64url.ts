/** base64url without padding, as every key, part, blob and envelope in the API. */

export function toBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export const utf8 = (text: string) => new TextEncoder().encode(text);

/** Overwrites a buffer so key material doesn't linger in memory longer than it must. */
export function wipe(...buffers: (Uint8Array | ArrayBuffer | null | undefined)[]) {
  for (const buffer of buffers) {
    if (!buffer) continue;
    (buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)).fill(0);
  }
}
