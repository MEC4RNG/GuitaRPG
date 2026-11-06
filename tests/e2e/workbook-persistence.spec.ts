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

test("preserves chord fingering, barres, and SVG view after server-acknowledged save", async ({
  page,
}) => {
  page.once("dialog", (dialog) => dialog.accept("Chord notation journal"));
  await page.getByRole("button", { name: "New Workbook" }).click();
  await page.getByRole("button", { name: "Insert chord diagram" }).click();
  const chord = page.locator('[data-block-type="chord-diagram"]').last();
  await chord.getByLabel("Chord name").fill("F major");
  await chord.getByLabel("Chord name").blur();
  await chord.getByRole("gridcell", { name: "Set string 6 to fret 1" }).click();
  await chord.getByLabel("Finger for selected string").selectOption("1");
  await chord.getByText("Barres (0)").click();
  await chord.getByLabel("Barre fret").fill("1");
  await chord.getByLabel("Barre finger (optional)").selectOption("1");
  await chord.getByRole("button", { name: "Add barre" }).click();
  await expect(page.locator(".workbook-status")).toContainText("Saved", { timeout: 10_000 });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Chord notation journal" })).toBeVisible();
  const restored = page.locator('[data-block-type="chord-diagram"]').last();
  await expect(restored).toHaveAccessibleName(/F major/);
  await expect(restored).toHaveAccessibleName(/string 6 fret 1, finger 1/);
  await expect(restored).toHaveAccessibleName(/barre fret 1, strings 6 to 1, finger 1/);
  await expect(restored.locator("svg.workbook-chord__svg circle")).toHaveCount(1);
  await expect(restored.locator("svg.workbook-chord__svg rect")).toHaveCount(1);
});

test("keeps every accepted page after changing Workbooks and refreshing", async ({ page }) => {
  page.once("dialog", (dialog) => dialog.accept("Workbook A"));
  await page.getByRole("button", { name: "New Workbook" }).click();
  await expect(page.getByRole("heading", { name: "Workbook A" })).toBeVisible();

  const pageStrip = page.locator(".workbook-page-strip");
  const document = page.getByRole("textbox", { name: "Workbook page document" });
  const savePage = async (title: string, text: string) => {
    await page.getByLabel("Page title").fill(title);
    await page.getByLabel("Page title").blur();
    await document.click();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.press("Enter");
    await page.keyboard.type(text);
    await expect(page.locator(".workbook-status")).toContainText("Unsaved changes");
    await expect(page.locator(".workbook-status")).toContainText("Saved", { timeout: 10_000 });
  };

  await savePage("Page Alpha", "Alpha accepted content");
  await page.getByRole("button", { name: "+ New page" }).click();
  await expect(page.getByLabel("Page title")).toHaveValue("Page 2");
  await savePage("Page Beta", "Beta accepted content");
  await page.getByRole("button", { name: "+ New page" }).click();
  await expect(page.getByLabel("Page title")).toHaveValue("Page 3");
  await savePage("Page Gamma", "Gamma accepted content");

  page.once("dialog", (dialog) => dialog.accept("Workbook B"));
  await page.getByRole("button", { name: "New Workbook" }).click();
  await expect(page.getByRole("heading", { name: "Workbook B" })).toBeVisible();
  await page.getByRole("button", { name: "Workbook A", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Workbook A" })).toBeVisible();

  for (const [title, text] of [
    ["Page Alpha", "Alpha accepted content"],
    ["Page Beta", "Beta accepted content"],
    ["Page Gamma", "Gamma accepted content"],
  ]) {
    await pageStrip.getByRole("button", { name: title, exact: true }).click();
    await expect(page.getByLabel("Page title")).toHaveValue(title);
    await expect(document).toContainText(text);
  }

  await page.reload();
  await page.getByRole("button", { name: "Workbook A", exact: true }).click();
  await expect(pageStrip.getByRole("button", { name: "Page Alpha", exact: true })).toBeVisible();
  await expect(pageStrip.getByRole("button", { name: "Page Beta", exact: true })).toBeVisible();
  await expect(pageStrip.getByRole("button", { name: "Page Gamma", exact: true })).toBeVisible();

  await pageStrip.getByRole("button", { name: "Page Gamma", exact: true }).click();
  await expect(page.getByText("Page 3 of 3")).toBeVisible();
  await expect(page.locator(".workbook-page-order")).toHaveCount(0);
  const pageActions = page.getByRole("button", { name: "Page actions" });
  await expect(pageActions).toBeVisible();
  await expect(page.getByRole("button", { name: "Move page earlier" })).toBeHidden();
  await pageActions.click();
  await page.getByRole("button", { name: "Move page earlier" }).click();
  await expect(page.locator(".workbook-page-label")).toHaveText([
    "Page Alpha",
    "Page Gamma",
    "Page Beta",
  ]);
  await expect(page.getByText("Page 2 of 3")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Workbook A", exact: true }).click();
  await expect(page.locator(".workbook-page-label")).toHaveText([
    "Page Alpha",
    "Page Gamma",
    "Page Beta",
  ]);

  await pageStrip.getByRole("button", { name: "Page Alpha", exact: true }).click();
  await pageActions.click();
  await expect(page.getByRole("button", { name: "Move page earlier" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(pageActions).toHaveAttribute("aria-expanded", "false");
  await pageStrip.getByRole("button", { name: "Page Gamma", exact: true }).click();
  await pageActions.click();
  await page.getByRole("button", { name: "Duplicate page" }).click();
  await expect(page.getByLabel("Page title")).toHaveValue("Page Gamma copy");
  await pageActions.click();
  await page.getByRole("button", { name: "Delete page" }).click();
  await expect(pageStrip.getByRole("button", { name: "Page Gamma copy" })).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Workbook A", exact: true }).click();
  await expect(pageStrip.getByRole("button", { name: "Page Gamma copy" })).toHaveCount(0);
});

test("blocks cross-Workbook navigation while an edit is still pending", async ({ page }) => {
  page.once("dialog", (dialog) => dialog.accept("Pending A"));
  await page.getByRole("button", { name: "New Workbook" }).click();
  page.once("dialog", (dialog) => dialog.accept("Pending B"));
  await page.getByRole("button", { name: "New Workbook" }).click();
  await page.getByRole("button", { name: "Pending A", exact: true }).click();

  const document = page.getByRole("textbox", { name: "Workbook page document" });
  await document.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type("Pending navigation guard");
  await expect(page.locator(".workbook-status")).toContainText("Unsaved changes");
  await page.getByRole("button", { name: "Pending B", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pending A" })).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Wait for the current page" }),
  ).toBeVisible();
  await expect(page.locator(".workbook-status")).toContainText("Saved", { timeout: 10_000 });
  await page.getByRole("button", { name: "Pending B", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pending B" })).toBeVisible();
});

test("identifies archived Quick Notes by their accepted page titles", async ({ page }) => {
  await page.getByRole("button", { name: "Quick Note" }).click();
  await page.getByLabel("Page title").fill("Dominant voicing idea");
  await page.getByLabel("Page title").blur();
  await expect(page.locator(".workbook-status")).toContainText("Saved", { timeout: 10_000 });
  await page.getByRole("button", { name: "Archive" }).click();
  await page.getByText(/Archived Workbooks/).click();
  await expect(
    page
      .getByRole("list", { name: "Archived Quick Note pages" })
      .getByText("Dominant voicing idea"),
  ).toBeVisible();
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
