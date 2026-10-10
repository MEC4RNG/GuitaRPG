import { expect, test } from "@playwright/test";

test("public entry surfaces become usable within a bounded smoke threshold", async ({ page }) => {
  for (const path of ["/", "/onboarding", "/codex"] as const) {
    const started = Date.now();
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    expect(Date.now() - started, `${path} interactive smoke duration`).toBeLessThan(15_000);
  }
});
