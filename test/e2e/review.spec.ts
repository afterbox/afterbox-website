import { expect, test } from "@playwright/test";
import { apiFromPage, connectDemoBank, newLockedMember, watchConsole } from "./helpers";

type Find = { id: string; name: string; provider: string | null; category: string };

/**
 * Review, one find at a time: change its category, add it, leave one out (with the reason the API requires).
 * The member locks first and then connects a bank, so the finds arrive for review rather than staged.
 * GET /v1/home is aborted in the browser (docs/BACKEND_ISSUES.md #4); the finds are reviewed from the Record screen.
 */
test("review: change category, add, leave out", async ({ page }) => {
  const consoleWatch = watchConsole(page);
  await page.route("http://localhost:8000/v1/home", (route) => route.abort());
  await newLockedMember(page, "review");

  await page.goto("/connect/bank?another=1");
  await connectDemoBank(page);
  await expect(page).toHaveURL(/\/found$/, { timeout: 150_000 });

  await expect(async () => {
    const list = (await apiFromPage<{ finds: Find[] }>(page, "/v1/finds")).body;
    expect(list.finds.length).toBeGreaterThanOrEqual(3);
  }).toPass({ timeout: 60_000, intervals: [2000] });
  const before = (await apiFromPage<{ finds: Find[] }>(page, "/v1/finds")).body.finds;
  const [first] = before;

  // The finds are on the Record screen, marked New; opening one starts the review there.
  await page.goto("/home/record");
  await page.getByRole("button", { name: "New", exact: false }).filter({ hasText: /^New \d+$/ }).click();
  await page.getByRole("button", { name: new RegExp(first.provider ?? first.name) }).first().click();
  const review = page.getByRole("dialog");
  await expect(review.getByText(/^New/).first()).toBeVisible();

  // Not right? Change category: it moves at once.
  const target = first.category === "other" ? "Subscriptions" : "Something else";
  const targetId = first.category === "other" ? "subscriptions" : "other";
  await review.getByRole("button", { name: "Not right? Change category" }).click();
  await page.getByRole("radio", { name: target }).click();
  await expect(review.getByText(target, { exact: true })).toBeVisible();
  await expect(async () => {
    const list = (await apiFromPage<{ finds: Find[] }>(page, "/v1/finds")).body;
    expect(list.finds.find((find) => find.id === first.id)?.category).toBe(targetId);
  }).toPass({ timeout: 15_000 });

  // Yes, add it: it leaves the finds and joins the record, keeping the chosen category.
  await review.getByRole("button", { name: "Yes, add it" }).click();
  await expect(page.getByRole("heading", { name: "Saved to your record" })).toBeVisible();
  const item = (await apiFromPage<{ item: { category: string; isNew: boolean } }>(page, `/v1/items/${first.id}`)).body.item;
  expect(item.category).toBe(targetId);
  expect(item.isNew).toBe(true);

  // Next one: Not mine → Leave it out.
  await page.getByRole("button", { name: /^Next: / }).click();
  const remaining = (await apiFromPage<{ finds: Find[] }>(page, "/v1/finds")).body.finds;
  await page.getByRole("button", { name: "Not mine" }).click();
  await expect(page.getByText("Not yours? We’ll leave it out.")).toBeVisible();
  await page.getByRole("button", { name: "Leave it out" }).click();
  await expect(async () => {
    const after = (await apiFromPage<{ finds: Find[] }>(page, "/v1/finds")).body.finds;
    expect(after.length).toBe(remaining.length - 1);
    expect(after.some((find) => find.id === first.id)).toBe(false);
  }).toPass({ timeout: 15_000 });
  expect(consoleWatch.cspViolations()).toEqual([]);
});
