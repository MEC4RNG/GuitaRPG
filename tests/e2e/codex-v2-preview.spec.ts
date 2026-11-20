import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalOverflow } from "./helpers/accessibility";

test("CODEX-V2-A isolated preview keeps navigation and dictionary in place", async ({ page }) => {
  await page.goto("/prototype/codex-v2");
  await expect(page.getByRole("heading", { name: "Explore the musical library." })).toBeVisible();
  await expect(page.locator(".cv2-card")).toHaveCount(3);
  await expect(page.getByText("Design review only")).toBeVisible();

  await page.getByRole("button", { name: "Explore this Skill" }).first().click();
  await expect(page.getByRole("heading", { name: "Scale Degree Recognition" })).toBeVisible();
  const define = page.getByRole("button", { name: "Define Tonic" });
  await define.click();
  await expect(page.getByRole("dialog", { name: "Tonic" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Related Codex entry" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(define).toBeFocused();

  await define.click();
  await page.getByRole("button", { name: "Read full dictionary entry" }).click();
  await expect(page.getByRole("heading", { name: "Music Dictionary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tonic" })).toBeVisible();

  await page.getByRole("button", { name: "Codex Library" }).click();
  await page.getByLabel("Learning material").selectOption("intermediate");
  await expect(page.locator(".cv2-card")).toHaveCount(3);
  await page.getByLabel("Search Skills").fill("triad");
  await expect(page.locator(".cv2-card")).toHaveCount(1);
  await expectAccessible(page, "Codex V2 library preview");
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A preserves published V1 Skill routes", async ({ page }) => {
  await page.goto("/codex/skills/triad_construction");
  await expect(page.getByRole("heading", { name: "Triad Construction" })).toBeVisible();
  await expect(page.getByText(/trainable ability/i)).toBeVisible();
});
