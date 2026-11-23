import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { addVirtualAuthenticator, apiFromPage, connectDemoBank, enterCode, requestCode, signUpWithPasskey, waitForEmail, watchConsole } from "./helpers";

/**
 * One member's journey on one page, in order: the device blob lives in this page's IndexedDB under a
 * non-extractable key, which no storage-state file can carry between tests.
 *
 * GET /v1/home is answered in the browser with an abort in every test but the one about Home: on this backend it
 * hangs after locking a record with items and each hung request holds a database connection until the API is
 * restarted (docs/BACKEND_ISSUES.md #4). Every flow here is asserted through the screens that work.
 */
test.describe.configure({ mode: "serial" });

const ISSUE_HOME = "docs/BACKEND_ISSUES.md#4";
const ISSUE_STORAGE = "docs/BACKEND_ISSUES.md#6";

let context: BrowserContext;
let page: Page;
let consoleWatch: ReturnType<typeof watchConsole>;
let member: Awaited<ReturnType<typeof signUpWithPasskey>>;

const blockHome = (target: Page) => target.route("http://localhost:8000/v1/home", (route) => route.abort());

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({ baseURL: "http://localhost:3000", permissions: ["clipboard-read", "clipboard-write"] });
  page = await context.newPage();
  consoleWatch = watchConsole(page);
  await blockHome(page);
});

test.afterAll(async () => {
  await context?.close();
});

test.afterEach(() => {
  expect(consoleWatch.cspViolations()).toEqual([]);
});

test("sign up → passkey → connect a bank via Tink → reading progress → found → add all → lock record → the record holds the finds", async () => {
  member = await signUpWithPasskey(page, "journey");

  await page.getByRole("link", { name: "Find mine" }).click();
  await page.getByRole("link", { name: "Choose your bank" }).click();
  await expect(page).toHaveURL(/\/connect\/bank/);
  await connectDemoBank(page);

  // Reading progress: the bank is named from the start, the steps tick off, the accounts appear as chips.
  await expect(page).toHaveURL(/\/connect\/reading\?connection=/);
  await expect(page.getByRole("heading", { name: "Reading Tink Demo Bank" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Finding your accounts" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Current account" }).first()).toBeVisible({ timeout: 60_000 });

  // Found: the count and the categories are what the API found.
  await expect(page).toHaveURL(/\/found$/, { timeout: 150_000 });
  const found = (await apiFromPage<{ count: number; categories: { id: string }[] }>(page, "/v1/onboarding/found")).body;
  expect(found.count).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: new RegExp(`${found.count} things?`) })).toBeVisible();
  for (const category of found.categories) await expect(page.locator(`a[href="/found/${category.id}"]`)).toBeVisible();

  // A category opens with its findings.
  await page.locator(`a[href="/found/${found.categories[0].id}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/found/${found.categories[0].id}$`));
  await expect(page.locator("ul li").first()).toBeVisible();
  await page.getByRole("link", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/found$/);

  // Add all, then lock the record (passkey; the record key is made and split in the browser).
  await page.getByRole("button", { name: "Add all to my record" }).click();
  await expect(page).toHaveURL(/\/secure$/, { timeout: 30_000 });
  await page.getByRole("button", { name: "Lock my record" }).click();
  await expect(page.getByText("Your record is locked")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("backup-code")).toHaveText(/^([0-9A-HJKMNP-TV-Z]{4}-){5}[0-9A-HJKMNP-TV-Z]{4}$/);
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 30_000 });
  expect((await apiFromPage<{ keysReady: boolean }>(page, "/v1/me")).body.keysReady).toBe(true);

  // The accepted finds become items (a job after locking): the Record screen lists them.
  await expect(async () => {
    const record = (await apiFromPage<{ all: number }>(page, "/v1/record")).body;
    expect(record.all).toBeGreaterThan(0);
  }).toPass({ timeout: 60_000, intervals: [2000] });
  const record = (await apiFromPage<{ all: number; sections: { category: { label: string } }[] }>(page, "/v1/record")).body;
  await page.goto("/home/record");
  await expect(page.getByRole("heading", { name: "Record" })).toBeVisible();
  await expect(page.getByRole("button", { name: `All ${record.all}` })).toBeVisible();
  for (const section of record.sections) await expect(page.getByRole("region", { name: section.category.label })).toBeVisible();
});

test("home shows the finds", async () => {
  test.fixme(true, `GET /v1/home fails then hangs after locking a record with items: ${ISSUE_HOME}`);
  await page.unroute("http://localhost:8000/v1/home");
  // Compared with the record (not /v1/home itself: a second Home request from the test would overlap the screen's).
  const record = (await apiFromPage<{ all: number; sections: { category: { id: string } }[] }>(page, "/v1/record")).body;
  await page.goto("/home");
  await expect(page.getByTestId("home-count")).toContainText(String(record.all), { timeout: 45_000 });
  for (const section of record.sections) await expect(page.locator(`a[href="/home/record/${section.category.id}?from=home"]`)).toBeVisible();
  await expect(page.getByText(/Checked with Tink Demo Bank|Saved and encrypted/).first()).toBeVisible();
  await blockHome(page);
});

test("add and edit an item", async () => {
  await page.goto("/home/record");
  await page.getByRole("button", { name: "Add something" }).click();
  await page.getByRole("button", { name: /Type it in/ }).click();
  await page.getByLabel("What is it?").fill("Workplace pension");
  await expect(page.getByText("Goes in")).toBeVisible();
  await expect(page.getByText(/^Pensions/)).toBeVisible();
  await page.getByLabel("Amount").fill("120");
  await page.getByRole("button", { name: "Add to my record" }).click();
  await expect(page.getByRole("heading", { name: "Saved to your record" })).toBeVisible();
  await page.getByRole("button", { name: "Done for now" }).click();

  const pensions = (await apiFromPage<{ items: { id: string; name: string; amount: { minor: number } | null; frequency: string }[] }>(page, "/v1/record/pensions")).body;
  const item = pensions.items.find((candidate) => candidate.name === "Workplace pension");
  expect(item).toBeTruthy();
  expect(item!.amount?.minor).toBe(12000);
  expect(item!.frequency).toBe("monthly");

  // Edit: add the policy number from the item screen.
  await page.goto(`/home/record/pensions/${item!.id}`);
  await expect(page.getByRole("heading", { name: "Workplace pension" })).toBeVisible();
  await expect(page.getByText("£120.00 a month")).toBeVisible();
  await page.getByRole("button", { name: "Edit details" }).click();
  await page.getByLabel("Policy number").fill("WP-123456");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("WP-123456")).toBeVisible();
  const saved = (await apiFromPage<{ item: { details: { policyNumber?: string }; complete: boolean } }>(page, `/v1/items/${item!.id}`)).body;
  expect(saved.item.details.policyNumber).toBe("WP-123456");
  expect(saved.item.complete).toBe(true);

  // Change its category: it moves at once and the URL follows.
  await page.getByRole("button", { name: "Not right? Change category" }).click();
  await page.getByRole("radio", { name: "Savings" }).click();
  await expect(page).toHaveURL(new RegExp(`/home/record/savings/${item!.id}$`));
  expect((await apiFromPage<{ item: { category: string } }>(page, `/v1/items/${item!.id}`)).body.item.category).toBe("savings");
});

test("scan a document and confirm it", async ({ browser }) => {
  test.fixme(true, `the local API can't store document files (503 from DocumentFiles.put): ${ISSUE_STORAGE}`);
  // A readable insurance schedule, rendered to a PNG.
  const scratch = await browser.newPage();
  await scratch.setViewportSize({ width: 900, height: 1100 });
  await scratch.setContent(`<div style="font:22px/1.6 Arial;padding:60px;color:#111">
    <h1 style="font-size:34px">Aviva Home Insurance</h1><h2>Policy schedule</h2>
    <p><b>Policy number:</b> AV-HM-2290417</p><p><b>Cover:</b> Buildings and contents</p>
    <p><b>Insured address:</b> 14 Elm Road, Leeds LS6 2AB</p><p><b>Renewal date:</b> 14 August 2027</p>
    <p><b>Premium:</b> £31.40 per month by direct debit</p></div>`);
  const image = await scratch.screenshot({ type: "png" });
  await scratch.close();

  await page.goto("/home/record");
  await page.getByRole("button", { name: "Add something" }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Snap or upload a document/ }).click();
  await (await chooser).setFiles({ name: "schedule.png", mimeType: "image/png", buffer: image });
  await expect(page.getByRole("heading", { name: "Finding the details" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Check the details" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel("Policy number")).toHaveValue(/AV-HM-2290417/);
  if (!(await page.getByLabel("What is it?").inputValue())) await page.getByLabel("What is it?").fill("Home insurance");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Saved to your record" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Done for now" }).click();

  const insurance = (await apiFromPage<{ items: { id: string; details: { policyNumber?: string } }[] }>(page, "/v1/record/insurance")).body;
  const scanned = insurance.items.find((candidate) => candidate.details.policyNumber?.includes("AV-HM-2290417"));
  expect(scanned).toBeTruthy();
  const view = (await apiFromPage<{ documents: { id: string }[] }>(page, `/v1/items/${scanned!.id}`)).body;
  expect(view.documents).toHaveLength(1);

  // Open it: fetched with credentials and shown from a blob: URL.
  await page.goto(`/home/record/insurance/${scanned!.id}`);
  await page.getByRole("button", { name: /Photo/ }).click();
  await expect(page.getByRole("img", { name: "Your document" })).toBeVisible();
  expect(await page.getByRole("img", { name: "Your document" }).getAttribute("src")).toMatch(/^blob:/);
});

test("settings toggles", async () => {
  await page.goto("/home/settings/notifications");
  const updates = page.getByRole("switch", { name: "Updates" });
  const recognise = page.getByRole("switch", { name: "Help recognise payments" });
  await expect(updates).toHaveAttribute("aria-checked", "true");
  await updates.click();
  await expect(updates).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("Saved")).toBeVisible();
  await recognise.click();
  await expect(recognise).toHaveAttribute("aria-checked", "false");
  await expect(async () => {
    const prefs = (await apiFromPage<{ updates: boolean; summary: boolean; recognise: boolean }>(page, "/v1/notifications")).body;
    expect(prefs).toEqual({ updates: false, summary: true, recognise: false });
  }).toPass({ timeout: 10_000 });
  await page.reload();
  await expect(page.getByRole("switch", { name: "Updates" })).toHaveAttribute("aria-checked", "false");
  await page.goto("/home/settings/privacy");
  await expect(page.getByRole("switch", { name: "Help recognise payments" })).toHaveAttribute("aria-checked", "false");
});

test("set a backup code", async () => {
  await page.goto("/home/settings/security");
  await expect(page.getByRole("heading", { name: "Devices and access" })).toBeVisible();
  await page.getByRole("button", { name: "Add" }).click();
  const code = (await page.getByTestId("backup-code").textContent())!.trim();
  expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){5}[0-9A-HJKMNP-TV-Z]{4}$/);
  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.getByText("Copied")).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click(); // stores the envelope: the passkey is asked for again
  await expect(page.getByText("Saved")).toBeVisible({ timeout: 30_000 });
  expect((await apiFromPage<{ hasBackupCode: boolean }>(page, "/v1/me")).body.hasBackupCode).toBe(true);
  // Ways back in: the backup code row's "Add" has turned into "On".
  await expect(page.getByRole("button", { name: "Add", exact: true })).toHaveCount(0);
});

test("approve a new device from an unlocked one", async ({ browser }) => {
  const second = await browser.newContext({ baseURL: "http://localhost:3000" });
  const phone = await second.newPage();
  await blockHome(phone);
  await addVirtualAuthenticator(phone);

  // The new device signs in, has no blob, and asks to be approved.
  await phone.goto("/login");
  await phone.getByPlaceholder("Email").fill(member.email);
  const since = Date.now();
  await phone.getByRole("button", { name: "Continue", exact: true }).click();
  const mail = await waitForEmail(member.email, { since, match: (candidate) => candidate.codes.length > 0 });
  await enterCode(phone, mail.codes[0]);
  await expect(phone).toHaveURL(/\/unlock/, { timeout: 30_000 });
  await expect(phone.getByRole("heading", { name: "Open your record here" })).toBeVisible();
  await phone.getByRole("button", { name: /Approve on one of your other devices/ }).click();
  await expect(phone).toHaveURL(/\/unlock\?wait=/, { timeout: 30_000 });
  await expect(phone.getByRole("heading", { name: "Approve on one of your other devices" })).toBeVisible();
  const approvalId = new URL(phone.url()).searchParams.get("wait")!;

  // The unlocked device approves (the approve sheet opens from realtime, or from the email's link).
  const sheet = page.getByRole("dialog").filter({ hasText: "Approve new sign-in?" });
  if (!(await sheet.isVisible().catch(() => false))) await page.goto(`/home/settings?sheet=approve-device&approval=${approvalId}`);
  await expect(page.getByRole("dialog").filter({ hasText: "Approve new sign-in?" })).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("button", { name: "Approved" })).toBeVisible({ timeout: 30_000 });

  // The new device collects its sealed blob, opens it, and is in.
  await expect(phone.getByRole("heading", { name: "You’re in" })).toBeVisible({ timeout: 45_000 });
  await phone.getByRole("button", { name: "Go to my record" }).click();
  await expect(phone).toHaveURL(/\/home/);
  await phone.goto("/home/record");
  await expect(phone.getByRole("heading", { name: "Record" })).toBeVisible();
  const devices = (await apiFromPage<{ devices: unknown[] }>(page, "/v1/security/overview")).body.devices;
  expect(devices).toHaveLength(2);
  await second.close();
});

test("sign out and back in", async () => {
  await page.goto("/home/settings");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  expect((await apiFromPage(page, "/v1/me")).status).toBe(401);

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("Email").fill(member.email);
  await expect(page.getByPlaceholder("Email")).toHaveValue(member.email);
  const mail = await requestCode(page, member.email);
  await enterCode(page, mail.codes[0]);
  // This browser kept its blob: one passkey tap unlocks the record.
  await expect(page).toHaveURL(/\/unlock/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Unlock your record" })).toBeVisible();
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
  await page.goto("/home/record");
  await expect(page.getByRole("heading", { name: "Record" })).toBeVisible();
});

test("delete the account", async () => {
  await page.goto("/home/settings/account");
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
  await page.getByRole("button", { name: "Delete my account" }).click();
  const dialog = page.getByRole("dialog").filter({ hasText: "Delete your account?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Your account is closed now and permanently deleted within 30 days.")).toBeVisible();
  await dialog.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  expect((await apiFromPage(page, "/v1/me")).status).toBe(401);
  // Nothing of the member stays in this browser.
  const left = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open("afterbox", 1);
        open.onsuccess = () => {
          const count = open.result.transaction("secrets").objectStore("secrets").count();
          count.onsuccess = () => resolve(count.result);
        };
      }),
  );
  expect(left).toBe(0);
});
