import { expect, test, type Browser, type Page } from "@playwright/test";
import { addVirtualAuthenticator, apiFromPage, enterCode, newEmail, newLockedMember, requestCode, setPlan, waitForEmail, watchConsole } from "./helpers";

const ISSUE_COOLING_OFF = "docs/BACKEND_ISSUES.md#8";
const ISSUE_PLAN_CACHE = "docs/BACKEND_ISSUES.md#9";

test("inviting on the free plan says a trusted person comes with a paid plan", async ({ page }) => {
  const consoleWatch = watchConsole(page);
  await newLockedMember(page, "free-invite");
  await page.goto("/home/people");
  await page.getByRole("button", { name: "Choose someone" }).click();
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(newEmail("ada-free"));
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Choosing a trusted person comes with a paid plan.")).toBeVisible();
  expect((await apiFromPage<{ people: unknown[] }>(page, "/v1/people")).body.people).toHaveLength(0);
  expect(consoleWatch.cspViolations()).toEqual([]);
});

/**
 * A member on Standard (put there with the backend's dev:plan) invites Ada; Ada signs up from the invite in her own
 * browser, locks her record and accepts. Returns the member and Ada's page (her context stays open).
 */
async function memberWithTrustedPerson(page: Page, browser: Browser, tag: string) {
  const member = await newLockedMember(page, tag);
  setPlan(member.email, "standard");
  const adaEmail = newEmail(`${tag}-ada`);
  await page.goto("/home/people");
  await page.getByRole("button", { name: "Choose someone" }).click();
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(adaEmail);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByRole("heading", { name: "Invite sent to Ada" })).toBeVisible();
  const invite = await waitForEmail(adaEmail, { match: (mail) => mail.links.some((link) => link.includes("/invite/")) });
  const link = new URL(invite.links.find((candidate) => candidate.includes("/invite/"))!);

  // Ada, in her own browser: signs up from the invite, locks her record, accepts.
  const adaContext = await browser.newContext({ baseURL: "http://localhost:3000" });
  const ada = await adaContext.newPage();
  await addVirtualAuthenticator(ada);
  await ada.goto(link.pathname);
  await expect(ada.getByRole("heading", { name: /has chosen you/ })).toBeVisible();
  await ada.getByRole("button", { name: "Start your record to accept" }).click();
  await ada.getByPlaceholder("Email").fill(adaEmail);
  const mail = await requestCode(ada, adaEmail);
  await enterCode(ada, mail.codes[0]);
  await expect(ada).toHaveURL(new RegExp(link.pathname));
  await ada.getByRole("link", { name: "Lock my record" }).click();
  await ada.getByRole("button", { name: "Lock my record" }).click();
  await ada.getByRole("button", { name: "Done" }).click();
  await expect(ada).toHaveURL(new RegExp(link.pathname));
  await ada.getByRole("button", { name: "Accept" }).click();
  await expect(ada.getByRole("heading", { name: /trusted person/ })).toBeVisible();

  // The inviter sees it: the person is accepted.
  await page.goto("/home/people");
  await expect(page.getByText("Ada Lovelace")).toBeVisible();
  await expect(async () => {
    const people = (await apiFromPage<{ people: { status: string }[] }>(page, "/v1/people")).body.people;
    expect(people[0]?.status).toBe("accepted");
  }).toPass({ timeout: 30_000 });
  return { member, ada, adaContext };
}

test("invite a trusted person in a second browser context, and accept", async ({ page, browser }) => {
  test.fixme(true, `dev:plan doesn't clear the API's cached entitlements, so the invite still answers 402: ${ISSUE_PLAN_CACHE}`);
  const { adaContext } = await memberWithTrustedPerson(page, browser, "inviter");
  await adaContext.close();
});

/** The member, signed in on a new device with no blob, asks Ada; Ada approves from her own afterbox (sheet 12). */
async function helpApproved(page: Page, browser: Browser, tag: string) {
  const { member, ada, adaContext } = await memberWithTrustedPerson(page, browser, tag);
  const phoneContext = await browser.newContext({ baseURL: "http://localhost:3000" });
  const phone = await phoneContext.newPage();
  await addVirtualAuthenticator(phone);
  await phone.goto("/login");
  await phone.getByPlaceholder("Email").fill(member.email);
  const mail = await requestCode(phone, member.email);
  await enterCode(phone, mail.codes[0]);
  await phone.getByRole("button", { name: "Ask your trusted person to help" }).click();
  await phone.getByRole("button", { name: "Send request" }).click();
  await expect(phone).toHaveURL(/\/unlock\/ask\?request=/);
  const requestId = new URL(phone.url()).searchParams.get("request")!;

  // Ada approves (sheet 12, passkey).
  await ada.goto(`/home?sheet=help-request&request=${encodeURIComponent(requestId)}`);
  await expect(ada.getByRole("heading", { name: /get back in\?/ })).toBeVisible();
  await ada.getByRole("button", { name: /Approve/ }).click();

  // The cooling-off wait: "You'll be back in at …".
  await expect(phone.getByRole("heading", { name: "Your trusted person has approved" })).toBeVisible({ timeout: 60_000 });
  await expect(phone.getByText(/You’ll be back in at \d/)).toBeVisible();
  return { phone, phoneContext, adaContext };
}

test("a help request through the trusted person's approval to the cooling-off wait", async ({ page, browser }) => {
  test.fixme(true, `needs a trusted person; dev:plan doesn't clear the API's cached entitlements (402): ${ISSUE_PLAN_CACHE}`);
  const { phoneContext, adaContext } = await helpApproved(page, browser, "helped");
  await phoneContext.close();
  await adaContext.close();
});

test("a help request through the wait to being back in", async ({ page, browser }) => {
  test.fixme(true, `the cooling-off hour is a fixed 60 minutes, with no development way to shorten it: ${ISSUE_COOLING_OFF}`);
  const { phone, phoneContext, adaContext } = await helpApproved(page, browser, "helped-in");
  // Once the hour passes the device collects its sealed blob by itself.
  await expect(phone.getByRole("heading", { name: "You’re in" })).toBeVisible({ timeout: 120_000 });
  await expect(phone.getByText("Your other devices and backup code need setting up again.")).toBeVisible();
  await expect(phone.getByRole("button", { name: "Make a new backup code" })).toBeVisible();
  await phoneContext.close();
  await adaContext.close();
});

test("the invite and help links explain an expired link, signed out", async ({ page }) => {
  const consoleWatch = watchConsole(page);
  await page.goto(`/invite/${"x".repeat(43)}`);
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  await page.goto(`/help/cancel?request=00000000-0000-7000-8000-000000000000&token=${"y".repeat(43)}`);
  await expect(page.getByRole("heading", { name: "Stop this request?" })).toBeVisible();
  await page.getByRole("button", { name: "This wasn’t me" }).click();
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  expect(consoleWatch.cspViolations()).toEqual([]);
});

// The real request and the real answer: the local stack now has a Resend audience (BACKEND_ISSUES #7 fixed), so 204.
test("the landing page's Get updates form", async ({ page }) => {
  let sent: unknown = null;
  page.on("request", (request) => {
    if (request.url().endsWith("/v1/updates")) sent = request.postDataJSON();
  });
  await page.goto("/");
  const email = newEmail("updates");
  await page.getByLabel("Get updates as we launch").fill(email);
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().endsWith("/v1/updates") && candidate.request().method() === "POST"),
    page.getByRole("button", { name: "Join" }).click(),
  ]);
  expect(response.status()).toBe(204);
  await expect(page.getByRole("status").filter({ hasText: "Thanks, we’ll be in touch." })).toBeVisible();
  // The honeypot is sent, empty.
  expect(sent).toEqual({ email, website: "" });
});
