import { expect, test } from "@playwright/test";

test("pages load under the strict CSP with no violations", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  for (const path of ["/", "/login", "/signup", "/privacy"]) {
    const response = await page.goto(path);
    expect(response?.headers()["content-security-policy"]).toContain("'strict-dynamic'");
    await page.waitForLoadState("networkidle");
  }
  expect(problems.filter((text) => /Content Security Policy|Refused to|TrustedHTML|TrustedScript/i.test(text))).toEqual([]);
});
