"use client";

import { mockFlags } from "@/lib/dashboard/store";
import { newId } from "./device";
import { partStore } from "./store";

/*
 * The passkey ceremonies. Mocked for now; the real ones are
 *   create: navigator.credentials.create({ publicKey: { …, extensions: { prf: { eval: { first: salt } } } } })
 *   get:    navigator.credentials.get({ publicKey: { …, extensions: { prf: { eval: { first: salt } } } } })
 * where the PRF output wraps the member part on this device. The screens only see these functions.
 */

export class PasskeyError extends Error {}

/** What the screens show when a ceremony fails or is cancelled. */
export const PASSKEY_ERROR = "That didn’t go through. Try again.";

const CEREMONY_MS = 1200;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The device prompt, mocked: `?mock=fail` makes the next one fail, `?mock=slow` makes it 3s. */
async function devicePrompt() {
  const { slow, fail } = mockFlags.get();
  await wait(slow ? 3000 : CEREMONY_MS);
  if (fail) {
    mockFlags.set((flags) => ({ ...flags, fail: false }));
    throw new PasskeyError(PASSKEY_ERROR);
  }
}

/** Creates the passkey that protects the member part on this device. */
export async function create(): Promise<{ credentialId: string }> {
  await devicePrompt();
  return { credentialId: newId("credential") };
}

/** Confirms it's them with this device's passkey. Fails where this browser doesn't hold the member part. */
export async function get(): Promise<void> {
  await devicePrompt();
  if (!partStore.get()) throw new PasskeyError(PASSKEY_ERROR);
}
