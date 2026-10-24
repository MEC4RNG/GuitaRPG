import { expect, test } from "@playwright/test";

import { expectAccessible, expectNoHorizontalOverflow } from "./helpers/accessibility";
import { completeGuestOnboarding } from "./helpers/player-flow";

test.beforeEach(async ({ page }) => {
  await completeGuestOnboarding(page);
  await page.goto("/workbooks");
  await expect(page.getByRole("heading", { name: "Workbooks" })).toBeVisible();
});

test("creates, autosaves, reloads, archives, restores, and creates a Quick Note", async ({
  page,
}) => {
  page.once("dialog", (dialog) => dialog.accept("Technique notebook"));
  await page.getByRole("button", { name: "New Workbook" }).click();
  await expect(page.getByRole("heading", { name: "Technique notebook" })).toBeVisible();

  await page.getByLabel("Page title").fill("Hybrid picking");
  await page.getByLabel("Page title").blur();
  const document = page.getByRole("textbox", { name: "Workbook page document" });
  await document.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Cross-device phrase notes");
  await page.getByRole("button", { name: "Insert tablature" }).click();
  await page
    .locator('[data-block-type="guitar-tab"]')
    .last()
    .getByRole("gridcell", { name: /^String 6, position 1,/ })
    .fill("7");
  await expect(page.locator(".workbook-status")).not.toContainText("Undo", { timeout: 2_000 });
  await page.waitForTimeout(1_200);
  await expect(page.locator(".workbook-status")).toContainText("Saved", { timeout: 10_000 });

  await page.reload();
  await expect(page.getByRole("button", { name: "Technique notebook", exact: true })).toBeVisible();
  await expect(page.getByLabel("Page title")).toHaveValue("Hybrid picking");
  await expect(document).toContainText("Cross-device phrase notes");
  await expect(
    page
      .locator('[data-block-type="guitar-tab"]')
      .getByRole("gridcell", { name: /String 6, position 1, Fret 7/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Archive" }).click();
  await page.getByText(/Archived Workbooks/).click();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("button", { name: "Technique notebook", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Quick Note" }).click();
  await expect(page.getByRole("heading", { name: "Quick Notes" })).toBeVisible();
  await expectAccessible(page, "persistent Workbook library");
  await expectNoHorizontalOverflow(page);
});

test("refuses a stale cross-device save without overwriting accepted content", async ({
  browser,
  context,
  page,
}) => {
  page.once("dialog", (dialog) => dialog.accept("Conflict notebook"));
  await page.getByRole("button", { name: "New Workbook" }).click();
  await expect(page.getByRole("heading", { name: "Conflict notebook" })).toBeVisible();

  const secondContext = await browser.newContext({ storageState: await context.storageState() });
  const secondPage = await secondContext.newPage();
  await secondPage.goto("/workbooks");
  await expect(secondPage.getByRole("heading", { name: "Conflict notebook" })).toBeVisible();

  await page.getByLabel("Page title").fill("Accepted on device A");
  await page.getByLabel("Page title").blur();
  await expect(page.locator(".workbook-status")).toContainText("Unsaved changes");
  await expect(page.locator(".workbook-status")).toContainText("Saved", { timeout: 10_000 });

  await secondPage.getByLabel("Page title").fill("Stale edit on device B");
  await secondPage.getByLabel("Page title").blur();
  await expect(secondPage.locator(".workbook-status")).toContainText("Unsaved changes");
  await expect(secondPage.locator(".workbook-status")).toContainText("Conflict", {
    timeout: 10_000,
  });
  await expect(secondPage.getByLabel("Page title")).toHaveValue("Stale edit on device B");

  await page.reload();
  await expect(page.getByLabel("Page title")).toHaveValue("Accepted on device A");
  await secondContext.close();
});
