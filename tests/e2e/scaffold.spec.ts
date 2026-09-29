import { expect, test } from "@playwright/test";

test("renders the production scaffold", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TURN PRACTICE INTO A QUEST." })).toBeVisible();
  await expect(page.getByText("PHASE 1 · PRODUCT FOUNDATION")).toBeVisible();
});
