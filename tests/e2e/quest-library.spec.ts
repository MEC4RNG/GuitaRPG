import { expect, test } from "@playwright/test";

import { expectAccessible, expectNoHorizontalOverflow } from "./helpers/accessibility";
import { completeGuestOnboarding } from "./helpers/player-flow";

test("Saved and Active Quests remain actionable, archivable, and separate from History", async ({
  page,
}) => {
  await completeGuestOnboarding(page);
  await page.goto("/generate");
  await page.getByRole("button", { name: "Generate Quest" }).click();
  const savedTitle = await page.locator("#generated-quest-title").innerText();
  await page.getByRole("button", { name: "Save Quest" }).click();
  await expect(page.getByRole("link", { name: "View Saved Quests" })).toBeVisible();

  await page.getByRole("button", { name: "Generate Another" }).click();
  const activeTitle = await page.locator("#generated-quest-title").innerText();
  await page.getByRole("button", { name: "Start Quest" }).click();
  await expect(page).toHaveURL(/\/quest\/[0-9a-f-]+$/);
  const activeQuestId = new URL(page.url()).pathname.split("/").at(-1)!;

  await page.goto("/quests");
  await expect(page.getByRole("heading", { name: "Saved" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Active" })).toBeVisible();
  await expect(page.getByRole("heading", { name: savedTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: activeTitle })).toBeVisible();
  await expectAccessible(page, "Saved Quest library");
  await expectNoHorizontalOverflow(page);

  const savedCard = page.getByRole("article").filter({ hasText: savedTitle });
  await savedCard.getByRole("link", { name: "Open Quest" }).click();
  await expect(page.getByText("No Sessions yet.")).toBeVisible();
  await page.getByRole("link", { name: "All Saved Quests" }).click();
  const activeCard = page.getByRole("article").filter({ hasText: activeTitle });
  await activeCard.getByRole("link", { name: "Continue Quest" }).click();
  await expect(page).toHaveURL(new RegExp(`/quest/${activeQuestId}$`));
  await page.getByRole("link", { name: "All Saved Quests" }).click();

  await page.getByRole("button", { name: `Archive ${savedTitle}` }).click();
  await expect(page.getByRole("heading", { name: "Archived" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: activeTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: savedTitle })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View all Saved Quests" })).toBeVisible();
  await page.goto("/quests");
  await page.getByRole("button", { name: `Restore ${savedTitle}` }).click();
  await expect(page.getByRole("heading", { name: "Saved" })).toBeVisible();

  await page.goto(`/quest/${activeQuestId}`);
  await page.getByRole("button", { name: "Start Practice" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/);
  const firstSessionId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.goto(`/quest/${activeQuestId}`);
  await expect(page.getByText("1 total Session.")).toBeVisible();
  await page.getByRole("button", { name: "Practice Again" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/);
  const secondSessionId = new URL(page.url()).pathname.split("/").at(-1)!;
  expect(secondSessionId).not.toBe(firstSessionId);
  await page.goto(`/quest/${activeQuestId}`);
  await expect(page.getByText("2 total Sessions.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue Practice" })).toHaveCount(2);

  await page.goto("/history");
  await expect(page.getByText(activeTitle).first()).toBeVisible();
});
