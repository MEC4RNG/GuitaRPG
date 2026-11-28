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

  await page.locator(".workbook-library__list article.is-selected summary").click();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
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
  await page.locator(".workbook-library__list article.is-selected summary").click();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
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

test("JRN-UX-001 displays an accepted page without edit controls and retains its data", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.once("dialog", (dialog) => dialog.accept("Display study"));
  await page.getByRole("button", { name: "New Workbook" }).click();
  await expect(page.getByRole("heading", { name: "Display study" })).toBeVisible();
  await page.getByLabel("Page title").fill("My musical study");
  await page.getByLabel("Page title").blur();
  await page.getByRole("button", { name: "Insert tablature" }).click();
  await page
    .locator('[data-block-type="guitar-tab"]')
    .last()
    .getByRole("gridcell", { name: /^String 6, position 1,/ })
    .fill("7");
  await page.getByRole("button", { name: "Insert chord diagram" }).click();
  await page
    .locator('[data-block-type="chord-diagram"]')
    .last()
    .getByLabel("Chord name")
    .fill("Study chord");
  await page.getByRole("button", { name: "Bold", exact: true }).focus();
  await expect(page.locator(".workbook-status")).toContainText("Saved", { timeout: 10_000 });
  await page.getByRole("button", { name: "Display", exact: true }).click();
  const display = page.getByRole("article", { name: "Workbook page display" });
  await expect(display).toBeVisible();
  await expect(
    display.getByRole("table", { name: /Guitar tablature system/ }).first(),
  ).toBeVisible();
  await expect(display.getByRole("cell", { name: "7", exact: true })).toBeVisible();
  await expect(display.getByText(/Study chord/)).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "Workbook editing tools" })).toBeHidden();
  await expect(display.locator("input, textarea, button, [contenteditable=true]")).toHaveCount(0);
  await page.getByRole("button", { name: "Focus page" }).click();
  await expect(page.getByRole("complementary", { name: "Workbook library" })).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Workbook page document" })).toBeVisible();
  await expect(page.getByLabel("Page title")).toHaveValue("My musical study");
  await expect(
    page
      .locator('[data-block-type="guitar-tab"]')
      .last()
      .getByRole("gridcell", { name: /String 6, position 1, Fret 7/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show navigation" }).click();
  await page
    .getByRole("searchbox", { name: "Search Workbooks and Pages" })
    .fill("no matching title");
  await expect(page.getByText("No matching Workbooks.")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("F4A opens an exact saved page from the private library search", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.once("dialog", (dialog) => dialog.accept("Notebook search study"));
  await page.getByRole("button", { name: "New Workbook" }).click();
  await page.getByLabel("Page title").fill("Aural cadence reference");
  await page.getByLabel("Page title").blur();
  await expect(page.locator(".workbook-status")).toContainText("Saved", { timeout: 10_000 });
  await page.once("dialog", (dialog) => dialog.accept("Different notebook"));
  await page.getByRole("button", { name: "New Workbook" }).click();
  const library = page.getByRole("complementary", { name: "Workbook library" });
  await library.getByRole("searchbox").fill("aural cadence");
  const results = library.getByRole("region", { name: "Matching pages" });
  await expect(results.getByRole("heading", { name: "Matching pages (1)" })).toBeVisible();
  await results.getByRole("button", { name: /Aural cadence reference/ }).click();
  await expect(page.getByLabel("Page title")).toHaveValue("Aural cadence reference");
  await expect(
    library.getByRole("button", { name: "Notebook search study", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Display", exact: true }).click();
  await expect(page.getByRole("article", { name: "Workbook page display" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("F4A-R1 shows the notebook shelf above the editor and highlights musical focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.once("dialog", (dialog) => dialog.accept("Shelf notebook"));
  await page.getByRole("button", { name: "New Workbook" }).click();
  const shelf = page.getByRole("complementary", { name: "Workbook library" });
  await expect(shelf.getByRole("heading", { name: "Workbook shelf" })).toBeVisible();
  await expect(shelf.getByRole("button", { name: "Shelf notebook", exact: true })).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Workbook page document" });
  await expect(editor).toBeVisible();
  expect((await shelf.boundingBox())!.y).toBeLessThan((await editor.boundingBox())!.y);
  await page.getByRole("button", { name: "Hide library" }).click();
  await expect(shelf).toBeHidden();
  await page.getByRole("button", { name: "Show library" }).click();
  await expect(shelf).toBeVisible();
  await page.getByRole("button", { name: "Insert tablature" }).click();
  await page.getByRole("button", { name: "Insert chord diagram" }).click();
  const tab = page.locator('[data-block-type="guitar-tab"]').last();
  const chord = page.locator('[data-block-type="chord-diagram"]').last();
  const tabCell = tab.getByRole("gridcell", { name: /^String 6, position 1,/ });
  const activeColor = await page.locator(".app-shell").evaluate((element) => {
    const color = getComputedStyle(element).getPropertyValue("--sa-discovery").trim();
    return color ? "rgb(120, 191, 176)" : "rgb(46, 196, 182)";
  });
  await tabCell.focus();
  await expect(tab).toHaveCSS("border-top-color", activeColor);
  await expect(tab).toHaveCSS("border-left-color", activeColor);
  await chord.getByLabel("Chord name").focus();
  await expect(chord).toHaveCSS("border-top-color", activeColor);
  await expect(chord).toHaveCSS("border-left-color", activeColor);
  await expect(tab).not.toHaveCSS("border-left-color", activeColor);
  await chord.getByRole("button", { name: "Return to document" }).click();
  await expect(chord).not.toHaveCSS("border-left-color", activeColor);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(shelf).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
