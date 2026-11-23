import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, type BrowserContext, type CDPSession, type Page } from "@playwright/test";

export const API = "http://localhost:8000";

/** A fresh address per test that Resend accepts and drops: delivered+e2e-<run>-<tag>@resend.dev. */
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const newEmail = (tag: string) => `delivered+e2e-${RUN}-${tag}@resend.dev`;

/** Puts a test account on a plan through the backend's development-only script (it builds first: ~30 s). */
export function setPlan(email: string, plan: "free" | "standard" | "family") {
  execFileSync("npm", ["--prefix", "../afterbox-backend", "run", "dev:plan", "--", email, plan], { stdio: "pipe", timeout: 120_000 });
}

type DevEmail = { to: string; subject: string; text: string; links: string[]; codes: string[]; sentAt: string };

/** The backend's dev inbox (development only): newest first. Waits for an email sent after `since`. */
export async function waitForEmail(email: string, { since = 0, match }: { since?: number; match?: (mail: DevEmail) => boolean } = {}) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${API}/v1/dev/emails?to=${encodeURIComponent(email)}`);
    if (response.ok) {
      const { emails } = (await response.json()) as { emails: DevEmail[] };
      const found = emails.find((mail) => Date.parse(mail.sentAt) >= since - 2000 && (!match || match(mail)));
      if (found) return found;
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  throw new Error(`No email for ${email}`);
}

/** Chromium's virtual authenticator (the CDP WebAuthn domain): a platform passkey that always verifies the user. */
export async function addVirtualAuthenticator(page: Page): Promise<{ cdp: CDPSession; authenticatorId: string }> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable", { enableUI: false });
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return { cdp, authenticatorId };
}

/** Types the 6-digit code into the code boxes. */
export async function enterCode(page: Page, code: string) {
  const input = page.locator('input[autocomplete="one-time-code"]').first();
  await input.click();
  await input.fill(code);
}

/** Signs up (or in) with an email code. Lands on /start (new) or wherever the app sends a returning member. */
export async function signInWithEmail(page: Page, email: string, mode: "signup" | "login" = "signup") {
  await page.goto(`/${mode}`);
  await page.getByPlaceholder("Email").fill(email);
  const since = Date.now();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/verify/);
  const mail = await waitForEmail(email, { since, match: (candidate) => candidate.codes.length > 0 });
  await enterCode(page, mail.codes[0]);
}

/** Collects console errors and page errors on our own pages (not Tink's), for asserting no CSP violations. */
export function watchConsole(page: Page) {
  const errors: string[] = [];
  const ours = () => page.url().startsWith("http://localhost:3000");
  page.on("console", (message) => {
    if (message.type() === "error" && ours()) errors.push(message.text());
  });
  page.on("pageerror", (error) => {
    if (ours()) errors.push(error.message);
  });
  return {
    errors,
    cspViolations: () => errors.filter((text) => /Content Security Policy/i.test(text)),
  };
}

/** A logged-in API call from the page's own cookies (for state the UI shows only indirectly). */
export async function apiFromPage<T>(page: Page, path: string): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ([base, route]) => {
      const response = await fetch(`${base}${route}`, { credentials: "include" });
      return { status: response.status, body: (await response.json().catch(() => null)) as T };
    },
    [API, path] as const,
  );
}

export async function newContext(page: Page): Promise<BrowserContext> {
  const browser = page.context().browser();
  if (!browser) throw new Error("No browser");
  return browser.newContext({ baseURL: "http://localhost:3000" });
}

/* Tink sandbox: Tink Demo Bank (redirect), user "Lifelike transactions", credentials from .env.test.local. */

function tinkCredentials() {
  let username = process.env.E2E_TINK_USERNAME;
  let password = process.env.E2E_TINK_PASSWORD;
  if (!username || !password) {
    const text = readFileSync(".env.test.local", "utf8");
    for (const line of text.split("\n")) {
      const [key, ...rest] = line.split("=");
      if (key === "E2E_TINK_USERNAME") username = rest.join("=").trim();
      if (key === "E2E_TINK_PASSWORD") password = rest.join("=").trim();
    }
  }
  if (!username || !password) throw new Error("Set E2E_TINK_USERNAME and E2E_TINK_PASSWORD in .env.test.local");
  return { username, password };
}

/** From the bank picker: Tink Demo Bank (the redirect one), Tink Link consent, the demo bank login, Authorize. */
export async function connectDemoBank(page: Page) {
  const { username, password } = tinkCredentials();
  // Tink's provider list can take a while when the API's cache is cold.
  await expect(page.getByPlaceholder("Search banks")).toBeVisible({ timeout: 90_000 });
  await page.getByPlaceholder("Search banks").fill("Tink Demo Bank");
  // Tink's sandbox lists several "Tink Demo Bank" providers; the second is the redirect flow with a login.
  await page.getByRole("button", { name: "Tink Demo Bank", exact: true }).nth(1).click();
  await expect(page.getByRole("heading", { name: /Opening Tink Demo Bank/ })).toBeVisible();
  await page.waitForURL(/link\.tink\.com/, { timeout: 45_000 });
  await page.getByRole("button", { name: "Accept" }).click();
  await page.getByRole("link", { name: /Open Tink Demo Bank/i }).click();
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.locator('input[name="authorize"]').click();
  await page.waitForURL(/localhost:3000\/connect\/(reading|callback)/, { timeout: 90_000 });
}

/** A fresh member signed up with a passkey on this page's virtual authenticator, record locked, on /home. */
export async function newLockedMember(page: Page, tag: string) {
  const email = newEmail(tag);
  const authenticator = await addVirtualAuthenticator(page);
  await signInWithEmail(page, email);
  await expect(page).toHaveURL(/\/start/, { timeout: 30_000 });
  await page.goto("/secure");
  await page.getByRole("button", { name: "Lock my record" }).click();
  await expect(page.getByText("Your record is locked")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 30_000 });
  return { email, ...authenticator };
}

/** A fresh member signed up, with a virtual authenticator ready for their passkey, on /start. */
export async function signUpWithPasskey(page: Page, tag: string) {
  const email = newEmail(tag);
  const authenticator = await addVirtualAuthenticator(page);
  await signInWithEmail(page, email);
  await expect(page).toHaveURL(/\/start/, { timeout: 30_000 });
  return { email, ...authenticator };
}

/**
 * Asks for a sign-in code from the email form already on screen. The API sends one code per address every 59 s:
 * on a 429 the form says "Too many tries"; wait the answer's retryAfter and ask again, as a person would.
 */
export async function requestCode(page: Page, email: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const since = Date.now();
    const [response] = await Promise.all([
      page.waitForResponse((candidate) => candidate.url().endsWith("/v1/auth/email/start") && candidate.request().method() === "POST"),
      page.getByRole("button", { name: "Continue", exact: true }).click(),
    ]);
    if (response.ok()) {
      await page.waitForURL(/\/verify/);
      return waitForEmail(email, { since, match: (candidate) => candidate.codes.length > 0 });
    }
    if (response.status() !== 429) throw new Error(`email/start answered ${response.status()}`);
    await expect(page.getByText(/Too many tries/)).toBeVisible();
    const body = (await response.json().catch(() => null)) as { error?: { details?: { retryAfter?: number } } } | null;
    await page.waitForTimeout(((body?.error?.details?.retryAfter ?? 60) + 1) * 1000);
  }
  throw new Error("No code could be sent");
}
