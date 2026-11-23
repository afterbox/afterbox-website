import { expect, test } from "@playwright/test";
import { addVirtualAuthenticator, apiFromPage, enterCode, newEmail, newLockedMember, requestCode, waitForEmail, watchConsole } from "./helpers";

const ISSUE_PLAN = "docs/BACKEND_ISSUES.md#5";

/* GET /v1/home is answered with an abort in the browser (docs/BACKEND_ISSUES.md #4). */
test.beforeEach(async ({ page }) => {
  await page.route("http://localhost:8000/v1/home", (route) => route.abort());
});

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

test("invite a trusted person in a second browser context, and accept", async ({ page, browser }) => {
  test.fixme(true, `a free member can't invite a trusted person (402 LIMIT_TRUSTED) and there's no dev way to set a plan: ${ISSUE_PLAN}`);
  await newLockedMember(page, "inviter");
  const adaEmail = newEmail("ada");
  await page.goto("/home/people");
  await page.getByRole("button", { name: "Choose someone" }).click();
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(adaEmail);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByRole("heading", { name: "Invite sent to Ada" })).toBeVisible();
  const invite = await waitForEmail(adaEmail, { match: (mail) => mail.links.some((link) => link.includes("/invite/")) });
  const link = new URL(invite.links.find((candidate) => candidate.includes("/invite/"))!);

  // Ada, in her own browser: signs up from the invite, locks her record, accepts.
  const second = await browser.newContext({ baseURL: "http://localhost:3000" });
  const ada = await second.newPage();
  await ada.route("http://localhost:8000/v1/home", (route) => route.abort());
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
  await second.close();
});

test("a help request through the wait to being back in", async ({ page, browser }) => {
  test.fixme(true, `help needs an accepted trusted person holding a share, which a free member can't have: ${ISSUE_PLAN}`);
  // With a Standard member whose trusted person has accepted (the test above), on a new device:
  const member = await newLockedMember(page, "helped");
  const second = await browser.newContext({ baseURL: "http://localhost:3000" });
  const phone = await second.newPage();
  await addVirtualAuthenticator(phone);
  await phone.goto("/login");
  await phone.getByPlaceholder("Email").fill(member.email);
  const mail = await requestCode(phone, member.email);
  await enterCode(phone, mail.codes[0]);
  await phone.getByRole("button", { name: "Ask your trusted person to help" }).click();
  await phone.getByRole("button", { name: "Send request" }).click();
  await expect(phone.getByRole("heading", { name: "Request sent" })).toBeVisible();
  // The trusted person approves (sheet 12, passkey), then the cooling-off wait shows "You'll be back in at …",
  // and once it passes the device collects its sealed blob by itself.
  await expect(phone.getByRole("heading", { name: "Your trusted person has approved" })).toBeVisible({ timeout: 120_000 });
  await expect(phone.getByRole("heading", { name: "You’re in" })).toBeVisible({ timeout: 120_000 });
  await expect(phone.getByText("Your other devices and backup code need setting up again.")).toBeVisible();
  await second.close();
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

// The local stack has no Resend audience, so POST /v1/updates answers 503 (docs/BACKEND_ISSUES.md #7). The success
// copy is covered by the unit tests; here the real request and the real answer's copy.
test("the landing page's Get updates form", async ({ page }) => {
  let sent: unknown = null;
  page.on("request", (request) => {
    if (request.url().endsWith("/v1/updates")) sent = request.postDataJSON();
  });
  await page.goto("/");
  const email = newEmail("updates");
  await page.getByLabel("Get updates as we launch").fill(email);
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Something’s not available right now. Please try again soon." })).toBeVisible();
  // The honeypot is sent, empty.
  expect(sent).toEqual({ email, website: "" });
});
