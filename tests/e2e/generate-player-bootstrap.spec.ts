import { expect, test } from "@playwright/test";

import { expectAccessible, expectNoHorizontalOverflow } from "./helpers/accessibility";

test("fresh Generate entry completes onboarding and generates a Quest", async ({ page }) => {
  await page.goto("/generate");
  await expect(page).toHaveURL(/\/onboarding\?next=(?:%2F|\/)generate/, { timeout: 15_000 });
  await expect(page.getByText("A Quest could not be generated")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Set your starting point." })).toBeVisible({
    timeout: 30_000,
  });
  await expectAccessible(page, "Generate onboarding entry");
  await page.getByLabel("Preferred tuning").selectOption({ label: "Standard Tuning" });
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText("PLAYER READY")).toBeVisible();
  await expectAccessible(page, "Generate onboarding completion");
  await page.getByRole("link", { name: "Continue to Generate" }).click();
  await expect(page).toHaveURL(/\/generate$/);
  await page.getByRole("button", { name: "Generate Quest" }).click();
  await expect(page.locator("#generated-quest-title")).toBeVisible();
  await expectAccessible(page, "Generate Quest preview");
  await expectNoHorizontalOverflow(page);
});
