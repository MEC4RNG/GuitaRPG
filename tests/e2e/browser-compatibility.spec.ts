import { expect, test } from "@playwright/test";

import { completeGuestOnboarding, generateAndStartPractice } from "./helpers/player-flow";

test("critical public navigation and quest entry work across engines", async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TURN PRACTICE INTO A QUEST." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Generate Quest" })).toHaveAttribute(
    "href",
    "/generate",
  );
  await page.goto("/generate");
  await expect(page.getByRole("button", { name: "Generate Quest" })).toBeVisible();
  await page.goto("/codex");
  await page.getByLabel("Search the Codex").fill("Dorian");
  await expect(page.getByRole("link", { name: "Dorian", exact: true })).toHaveAttribute(
    "href",
    "/codex/concepts/dorian",
  );
  await page.goto("/codex/concepts/dorian");
  await expect(page.getByText("CONCEPT", { exact: true })).toBeVisible();

  await completeGuestOnboarding(page);
  await page.goto("/profile");
  await page.getByLabel("Display name (optional)").fill("Cross-browser Player");
  await page.getByRole("button", { name: "Save Profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");

  await page.goto("/training");
  await expect(page.getByLabel("Training target", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  await generateAndStartPractice(page);
  await page.getByRole("button", { name: "+1 rep" }).click();
  await page.getByRole("button", { name: "End Session" }).click();
  await page.getByRole("link", { name: "Record Result" }).click();
  await page.getByLabel("Challenge fit").selectOption("GOOD_CHALLENGE");
  await page.getByRole("button", { name: "Record Result" }).click();
  await expect(page.getByLabel("Final Result")).toBeVisible();
});
