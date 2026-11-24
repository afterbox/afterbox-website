import { expect, test, type Browser, type Page } from "@playwright/test";
import { addVirtualAuthenticator, apiFromPage, enterCode, newEmail, newLockedMember, requestCode, setPlan, waitForEmail, watchConsole } from "./helpers";

/**
 * A new member's first invite. On the free plan it says a trusted person comes with a paid plan. While the backend
 * runs in demo mode (DEMO_DATA: every member is on Standard, `/v1/me` has `demo: true`) there's no plan: the invite
 * goes through, nothing mentions a plan or the Family plan, and the account shows a "Demo" badge.
 */
test("inviting on the free plan says a trusted person comes with a paid plan (in demo mode: no plan copy, a Demo badge)", async ({ page }) => {
  const consoleWatch = watchConsole(page);
  await newLockedMember(page, "free-invite");
  const demo = (await apiFromPage<{ demo?: boolean }>(page, "/v1/me")).body.demo === true;
  await page.goto("/home/people");
  if (demo) {
    await expect(page.getByRole("link", { name: "Settings, demo account" }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Family plan")).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Choose someone" }).click();
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(newEmail("ada-free"));
  if (demo) await expect(page.getByText(/Family plan/)).toHaveCount(0);
  await page.getByRole("button", { name: "Send invite" }).click();
  if (demo) {
    await expect(page.getByRole("heading", { name: "Invite sent to Ada" })).toBeVisible();
    await expect(page.getByText(/plan|upgrade/i)).toHaveCount(0);
    expect((await apiFromPage<{ people: unknown[] }>(page, "/v1/people")).body.people).toHaveLength(1);
  } else {
    await expect(page.getByText("Choosing a trusted person comes with a paid plan.")).toBeVisible();
    expect((await apiFromPage<{ people: unknown[] }>(page, "/v1/people")).body.people).toHaveLength(0);
  }
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
  // "They are your": the design system's select, chosen with the keyboard.
  const relation = page.getByRole("combobox", { name: "They are your" });
  await relation.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox", { name: "They are your" })).toBeVisible();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  const chosen = (await relation.textContent())?.trim();
  expect(chosen).toBeTruthy();
  expect(chosen).not.toBe("Partner");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByRole("heading", { name: "Invite sent to Ada" })).toBeVisible();
  expect((await apiFromPage<{ people: { relation: string }[] }>(page, "/v1/people")).body.people[0]?.relation).toBe(chosen);
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

  // Ada's copy of the trusted piece is sealed at the member's next unlock after she accepts (API.md, "The trusted
  // piece"); the unlock renews with every request, so the member signs out and back in here (one passkey tap).
  expect((await apiFromPage<{ helper: unknown }>(page, "/v1/unlock/options")).body.helper).toBeNull();
  await page.goto("/home/settings");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("Email").fill(member.email);
  await expect(page.getByPlaceholder("Email")).toHaveValue(member.email);
  const again = await requestCode(page, member.email);
  await enterCode(page, again.codes[0]);
  await expect(page.getByRole("heading", { name: "Unlock your record" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
  await expect(async () => {
    expect((await apiFromPage<{ helper: unknown }>(page, "/v1/unlock/options")).body.helper).toEqual({ name: null, count: 1 });
  }).toPass({ timeout: 30_000 });
  return { member, ada, adaEmail, adaContext };
}

test("invite a trusted person in a second browser context, and accept", async ({ page, browser }) => {
  const { adaContext } = await memberWithTrustedPerson(page, browser, "inviter");
  await adaContext.close();
});

/** The member, signed in on a new device with no blob, asks Ada for help (screens 10–11). */
async function helpRequested(page: Page, browser: Browser, tag: string) {
  const { member, ada, adaEmail, adaContext } = await memberWithTrustedPerson(page, browser, tag);
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
  return { member, ada, adaEmail, adaContext, phone, phoneContext, requestId };
}

/** Ada approves on sheet 12 (passkey); the phone shows the cooling-off wait. */
async function approveOnSheet(ada: Page, phone: Page) {
  await expect(ada.getByRole("heading", { name: /get back in\?/ })).toBeVisible();
  await ada.getByRole("button", { name: /Approve/ }).click();

  // The cooling-off wait: "You'll be back in at …".
  await expect(phone.getByRole("heading", { name: "Your trusted person has approved" })).toBeVisible({ timeout: 60_000 });
  await expect(phone.getByText(/You’ll be back in at \d/)).toBeVisible();
}

/** The member asks; Ada approves from her own afterbox, signed in (sheet 12). */
async function helpApproved(page: Page, browser: Browser, tag: string) {
  const { ada, adaContext, phone, phoneContext, requestId } = await helpRequested(page, browser, tag);
  await ada.goto(`/home?sheet=help-request&request=${encodeURIComponent(requestId)}`);
  await approveOnSheet(ada, phone);
  return { phone, phoneContext, adaContext };
}

test("a help request through the trusted person's approval to the cooling-off wait", async ({ page, browser }) => {
  const { phoneContext, adaContext } = await helpApproved(page, browser, "helped");
  await phoneContext.close();
  await adaContext.close();
});

test("a signed-out trusted person opens the help email link, signs in and lands on the request", async ({ page, browser }) => {
  test.setTimeout(300_000);
  const { ada, adaEmail, adaContext, phone, phoneContext, requestId } = await helpRequested(page, browser, "helped-link");

  // Ada has signed out; her browser keeps its device blob (behind her passkey).
  await ada.goto("/home/settings");
  await ada.getByRole("button", { name: "Log out" }).click();
  await expect(ada).toHaveURL(/\/login$/, { timeout: 30_000 });

  // The help request email ("Open afterbox to see who it is"), from the dev inbox.
  const mail = await waitForEmail(adaEmail, { match: (candidate) => candidate.links.some((link) => link.includes("sheet=help-request")) });
  const link = new URL(mail.links.find((candidate) => candidate.includes("sheet=help-request"))!);
  expect(link.searchParams.get("request")).toBe(requestId);
  const deepLink = link.pathname + link.search;

  // Signed out, the link goes to sign in, carrying where to come back to.
  await ada.goto(deepLink);
  await expect(ada).toHaveURL(/\/login\?next=/, { timeout: 30_000 });
  expect(new URL(ada.url()).searchParams.get("next")).toBe(deepLink);
  await expect(ada.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await ada.waitForLoadState("networkidle");
  await ada.getByPlaceholder("Email").fill(adaEmail);
  await expect(ada.getByPlaceholder("Email")).toHaveValue(adaEmail);
  const code = await requestCode(ada, adaEmail);
  expect(new URL(ada.url()).searchParams.get("next")).toBe(deepLink);
  await enterCode(ada, code.codes[0]);

  // A fresh sign-in on this browser: one passkey tap unlocks, then the request itself.
  await expect(ada.getByRole("heading", { name: "Unlock your record" })).toBeVisible({ timeout: 30_000 });
  expect(new URL(ada.url()).searchParams.get("next")).toBe(deepLink);
  await ada.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(ada).toHaveURL((url) => url.pathname === "/home" && url.searchParams.get("sheet") === "help-request" && url.searchParams.get("request") === requestId, {
    timeout: 30_000,
  });
  await approveOnSheet(ada, phone);
  await phoneContext.close();
  await adaContext.close();
});

test("a help request through the wait to being back in", async ({ page, browser }) => {
  // Three sign-ins (with the per-address code cooldown) and then the cooling-off (60 s on the local stack).
  test.setTimeout(360_000);
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
