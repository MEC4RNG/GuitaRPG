import { expect, test } from "@playwright/test";

import { expectAccessible, expectNoHorizontalOverflow } from "./helpers/accessibility";
import { completeGuestOnboarding } from "./helpers/player-flow";

test("draft, Save Quest, Start Quest, stages, and Practice share one durable Quest", async ({
  page,
}) => {
  await completeGuestOnboarding(page);
  await page.goto("/generate");
  await page.getByRole("button", { name: "Generate Quest" }).click();
  const title = await page.locator("#generated-quest-title").innerText();

  await page.goto("/character");
  await page.goBack();
  await expect(page.locator("#generated-quest-title")).toHaveText(title);

  await page.getByRole("button", { name: "Save Quest" }).click();
  await expect(page.getByRole("button", { name: "Quest saved" })).toBeVisible();
  await page.getByRole("button", { name: "Start Quest" }).click();

  await expect(page).toHaveURL(/\/quest\/[0-9a-f-]+$/);
  const questId = new URL(page.url()).pathname.split("/").at(-1)!;
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("In progress", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Map the territory" })).toBeVisible();
  await expectAccessible(page, "Quest Journey Map");

  await page.getByRole("button", { name: "Explore" }).click();
  await expect(page.getByRole("heading", { name: "Explore it on the instrument" })).toBeVisible();
  await expectAccessible(page, "Quest Journey Explore");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Explore it on the instrument" })).toBeVisible();
  await page.getByRole("button", { name: "Craft" }).click();
  await expect(
    page.getByRole("heading", { name: "Create something using what you discovered." }),
  ).toBeVisible();
  await expectAccessible(page, "Quest Journey Craft");
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("heading", { name: "Map the territory" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Start Practice" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();

  await page.goto(`/quest/${questId}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Map the territory" })).toBeVisible();
});
