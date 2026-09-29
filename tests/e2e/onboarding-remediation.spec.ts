import { expect, test } from "@playwright/test";

test("anonymous Player completes onboarding and can reach Generate", async ({ page }) => {
  await page.goto("/onboarding");

  await expect(page.getByRole("heading", { name: "Set your starting point." })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel("Experience background").selectOption("SOME_EXPERIENCE");
  await page.getByLabel("Typical session length (minutes)").fill("25");
  await page.getByLabel("Challenge preference").selectOption("BALANCED");
  await page.getByLabel("Preferred tuning").selectOption({ label: "Standard Tuning" });
  await page.getByLabel("A practice goal (optional)").fill("Improve timing consistency");
  await page.getByRole("button", { name: "Save and continue" }).click();

  await expect(page.getByText("PLAYER READY")).toBeVisible();
  await expect(page.getByText("permission denied")).not.toBeVisible();

  await page.reload();
  await expect(page.getByText("PLAYER READY")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Set your starting point." })).not.toBeVisible();

  await page.getByRole("link", { name: "Enter the app" }).click();
  await page.getByRole("link", { name: /Go to Generate/ }).click();
  await expect(page).toHaveURL(/\/generate$/);
  await expect(page.getByRole("heading", { name: "Build the next quest." })).toBeVisible();
});
