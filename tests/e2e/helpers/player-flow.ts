import { expect, type Page } from "@playwright/test";

export async function completeGuestOnboarding(page: Page) {
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Set your starting point." })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel("Experience background").selectOption("SOME_EXPERIENCE");
  await page.getByLabel("Typical session length (minutes)").fill("20");
  await page.getByLabel("Challenge preference").selectOption("BALANCED");
  await page.getByLabel("Preferred tuning").selectOption({ label: "Standard Tuning" });
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText("PLAYER READY")).toBeVisible();
}

export async function generateAndStartPractice(page: Page) {
  await page.goto("/generate");
  await page.getByRole("button", { name: "Generate Quest" }).click();
  await expect(page.locator("#generated-quest-title")).toBeVisible();
  await page.getByRole("button", { name: "Start Practice" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/, { timeout: 15_000 });
  return new URL(page.url()).pathname.split("/").at(-1)!;
}
