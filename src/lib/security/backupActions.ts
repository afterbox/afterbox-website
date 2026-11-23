"use client";

import { formatCode } from "./backup";

/** Saves the code to the browser's password manager (Chrome's PasswordCredential). False where that isn't there. */
export async function saveToBrowser(code: string, email: string) {
  const Credential = (window as Window & { PasswordCredential?: new (data: { id: string; password: string; name: string }) => Credential })
    .PasswordCredential;
  if (!Credential || !navigator.credentials?.store) return false;
  try {
    await navigator.credentials.store(new Credential({ id: email, password: formatCode(code), name: "afterbox backup code" }));
    return true;
  } catch {
    return false;
  }
}

export async function copyCode(code: string) {
  await navigator.clipboard.writeText(formatCode(code));
}

export function downloadCode(code: string) {
  const blob = new Blob([`afterbox backup code\n\n${formatCode(code)}\n`], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: "afterbox-backup-code.txt" });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const SUPPORT_EMAIL = "hello@afterbox.co.uk";
