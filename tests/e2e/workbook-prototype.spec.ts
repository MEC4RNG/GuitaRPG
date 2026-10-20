import { expect, test } from "@playwright/test";

import { expectAccessible, expectNoHorizontalOverflow } from "./helpers/accessibility";

test.beforeEach(async ({ page }) => {
  await page.goto("/prototype/workbook");
  await expect(page.getByRole("heading", { name: "Interactive Workbook Editor" })).toBeVisible();
});

test("edits one mixed document and round trips the owned JSON format", async ({
  browserName,
  page,
}) => {
  const document = page.getByRole("textbox", { name: "Workbook page document" });
  await document.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("A new phrase");
  await page.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.type(" with emphasis");

  await page.getByRole("button", { name: "Insert tablature" }).click();
  const tab = page.locator('[data-block-type="guitar-tab"]').last();
  await tab.getByRole("gridcell", { name: /^String 6, position 1,/ }).click();
  if (browserName === "webkit") {
    await tab.getByText("Position and block actions").click();
    await tab.getByLabel("Direct fret entry").fill("7");
  } else await page.keyboard.type("7");
  await tab.getByRole("gridcell", { name: /^String 5, position 1,/ }).click();
  if (browserName === "webkit") await tab.getByLabel("Direct fret entry").fill("0");
  else await page.keyboard.type("0");
  await tab.getByRole("button", { name: "Add position" }).click();
  await expect(tab.getByRole("gridcell", { name: /String 6, position 1, Fret 7/ })).toBeVisible();
  await expect(tab.getByRole("gridcell", { name: /String 6, position 17/ })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(tab.getByRole("gridcell", { name: /String 6, position 17/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(tab.getByRole("gridcell", { name: /String 6, position 17/ })).toBeVisible();

  await page.getByRole("button", { name: "Insert chord diagram" }).click();
  const chord = page.locator('[data-block-type="chord-diagram"]').last();
  await expect(chord).toHaveAccessibleName(/Untitled chord/);
  await chord.getByLabel("Chord name").fill("G major");
  await expect(chord.getByLabel("Chord name")).toHaveValue("G major");
  await chord.getByLabel("Chord name").press("Tab");
  await expect(chord).toHaveAccessibleName(/G major/);
  await chord.getByRole("button", { name: /Select string 6/ }).click();
  await chord.getByRole("button", { name: "Open", exact: true }).click();
  await expect(chord).toHaveAccessibleName(/G major/);

  await page.getByRole("button", { name: "Display document JSON" }).click();
  const json = page.getByLabel("Workbook document JSON");
  const exported = await json.inputValue();
  expect(JSON.parse(exported).type).toBe("GUITARPG_WORKBOOK_DOCUMENT_V1");

  await page.getByRole("button", { name: "Reset prototype" }).click();
  await json.fill(exported);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Import JSON text" }).click();
  await expect(page.getByRole("status")).toContainText("restored and remains editable");
  await expect(page.locator('[data-block-type="guitar-tab"]')).toHaveCount(1);
  await expect(page.getByLabel("Chord name")).toHaveValue("G major");
});

test("keeps rich-text toolbar state reactive and lists visibly editable", async ({ page }) => {
  const document = page.getByRole("textbox", { name: "Workbook page document" });
  await document.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Section title");
  await document.press("Home");
  await document.press("Shift+End");
  await page.getByRole("button", { name: "Bold" }).click();
  await expect(page.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Italic" }).click();
  await expect(page.getByRole("button", { name: "Italic" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Heading" }).click();
  await expect(page.getByRole("button", { name: "Heading" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(document.locator("h2", { hasText: "Section title" })).toBeVisible();
  await expect(document.locator("h2 strong", { hasText: "Section title" })).toBeVisible();
  await expect(document.locator("h2 em", { hasText: "Section title" })).toBeVisible();

  await document.press("End");
  await document.press("Enter");
  await document.pressSequentially("First item");
  await page.getByRole("button", { name: "Bullets" }).click();
  await expect(page.getByRole("button", { name: "Bullets" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await document.press("Enter");
  await document.pressSequentially("Second item");
  await expect(document.locator("ul > li")).toHaveCount(2);
  expect(
    await document.locator("ul").evaluate((node) => getComputedStyle(node).listStyleType),
  ).toBe("disc");
  await page.getByRole("button", { name: "Numbered" }).click();
  await expect(page.getByRole("button", { name: "Numbered" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(document.locator("ol > li")).toHaveCount(2);
  await page.getByRole("button", { name: "Bullets" }).click();
  await expect(document.locator("ul > li")).toHaveCount(2);
  await document.press("Enter");
  await document.press("Enter");
  await document.pressSequentially("After list");
  await expect(document.locator("p", { hasText: "After list" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Paragraph" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "Display document JSON" }).click();
  const exported = JSON.parse(await page.getByLabel("Workbook document JSON").inputValue());
  expect(exported.blocks.some((block: { type: string }) => block.type === "bullet_list")).toBe(
    true,
  );
});

test("groups one continuous tab passage into configurable systems", async ({ page }, testInfo) => {
  const useContextualInput = testInfo.project.name.includes("webkit");
  await page.getByRole("button", { name: "Insert tablature" }).click();
  const tab = page.locator('[data-block-type="guitar-tab"]').last();
  await expect(tab.getByLabel("Positions per line")).toHaveValue("16");
  await expect(tab.getByRole("columnheader")).toHaveCount(16);
  const firstCell = tab.getByRole("gridcell", { name: /^String 6, position 1,/ });
  if (useContextualInput) {
    await firstCell.click();
    await tab.getByText("Position and block actions").click();
    await tab.getByLabel("Direct fret entry").fill("12");
  } else {
    await firstCell.focus();
    await page.keyboard.type("12");
  }
  await expect(tab.getByRole("gridcell", { name: /String 6, position 1, Fret 12/ })).toBeVisible();
  if (useContextualInput) {
    await tab.getByRole("button", { name: "Clear", exact: true }).click();
  } else {
    await page.keyboard.press("Backspace");
    await tab.getByText("Position and block actions").click();
  }
  await expect(tab.getByRole("gridcell", { name: /String 6, position 1, Empty/ })).toBeVisible();
  await tab.getByLabel("Direct fret entry").fill("99");
  await expect(tab.getByRole("status")).toContainText("0 to 36");

  await tab.getByLabel("Positions per line").selectOption("4");
  await expect(tab.locator(".workbook-tab-system")).toHaveCount(4);
  await tab.getByRole("gridcell", { name: /^String 6, position 1,/ }).focus();
  if (useContextualInput) await tab.getByLabel("Direct fret entry").fill("7");
  else await page.keyboard.type("7");
  await tab.getByLabel("Positions per line").selectOption("8");
  await expect(tab.locator(".workbook-tab-system")).toHaveCount(2);
  await expect(tab.getByRole("gridcell", { name: /String 6, position 1, Fret 7/ })).toBeVisible();
  const slowEntryCell = tab.getByRole("gridcell", { name: /^String 6, position 2,/ });
  if (useContextualInput) await slowEntryCell.click();
  else await slowEntryCell.focus();
  if (useContextualInput) await tab.getByLabel("Direct fret entry").fill("2");
  else {
    await page.keyboard.type("1");
    await page.waitForTimeout(1000);
    await page.keyboard.type("2");
  }
  await expect(tab.getByRole("gridcell", { name: /String 6, position 2, Fret 2/ })).toBeVisible();
  const mutedCell = tab.getByRole("gridcell", { name: /^String 6, position 3,/ });
  if (useContextualInput) await mutedCell.click();
  else await mutedCell.focus();
  if (useContextualInput) await tab.getByRole("button", { name: "Mute", exact: true }).click();
  else await page.keyboard.type("x");
  await expect(tab.getByRole("gridcell", { name: /String 6, position 3, Muted/ })).toBeVisible();
  await tab.getByLabel("Positions per line").selectOption("12");
  await expect(tab.locator(".workbook-tab-system")).toHaveCount(2);
  await tab.getByLabel("Positions per line").selectOption("16");
  await expect(tab.locator(".workbook-tab-system")).toHaveCount(1);
  await tab.getByRole("button", { name: "Add position" }).click();
  await expect(tab.locator(".workbook-tab-system")).toHaveCount(2);
  await expect(tab.getByText(/System 2 · Positions 17–32/)).toBeVisible();
  const position20 = tab.getByRole("gridcell", { name: /^String 6, position 20,/ });
  await position20.click();
  await position20.click();
  if (useContextualInput) await tab.getByLabel("Direct fret entry").fill("5");
  else await page.keyboard.type("5");
  await expect(tab.getByRole("gridcell", { name: /String 6, position 20, Fret 5/ })).toBeVisible();
  const position16 = tab.getByRole("gridcell", { name: /^String 6, position 16,/ });
  await position16.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab.getByRole("gridcell", { name: /^String 6, position 17,/ })).toBeFocused();
  await page.waitForTimeout(1000);
  await position20.click();
  await tab.getByRole("button", { name: "Remove position" }).click();
  await expect(tab.getByRole("button", { name: "Confirm remove position" })).toBeVisible();
  await tab.getByRole("button", { name: "Confirm remove position" }).click();
  await expect(tab.getByRole("gridcell", { name: /String 6, position 20, Empty/ })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(tab.getByRole("gridcell", { name: /String 6, position 20, Fret 5/ })).toBeVisible();
});

test("aligns direct chord editing with its visible strings and preserves absolute frets", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Insert chord diagram" }).click();
  const chord = page.locator('[data-block-type="chord-diagram"]').last();
  await chord.getByRole("gridcell", { name: "Set string 6 to fret 3" }).click();
  await expect(chord.getByRole("button", { name: /Select string 6, Fret 3/ })).toBeVisible();
  const alignment = await chord
    .locator(".workbook-chord__fret button.is-fretted")
    .evaluate((cell) => {
      const marker = cell.querySelector("span")!.getBoundingClientRect();
      const hitbox = cell.getBoundingClientRect();
      return Math.abs(marker.left + marker.width / 2 - (hitbox.left + hitbox.width / 2));
    });
  expect(alignment).toBeLessThan(1);
  await expect(chord.locator(".workbook-chord__states small")).toHaveCount(6);
  await chord.getByLabel("Displayed frets start at").fill("8");
  await expect(chord.getByRole("status")).toContainText("string 6, fret 3");
  await chord.getByLabel("Displayed frets start at").fill("1");
  await expect(chord.getByRole("gridcell", { name: "Set string 6 to fret 3" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("manages temporary pages without leaking edits between pages", async ({ page }) => {
  await page.getByLabel("Page title").fill("Riff notebook");
  await page.getByRole("button", { name: "New page" }).click();
  await expect(page.getByLabel("Page title")).toHaveValue("Page 2");
  await page.getByLabel("Page title").fill("Harmony");
  await page.getByRole("button", { name: "Riff notebook" }).click();
  await expect(page.getByLabel("Page title")).toHaveValue("Riff notebook");
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByLabel("Page title")).toHaveValue("Riff notebook copy");
});

test("rejects malformed imports and safely treats pasted markup as text", async ({
  browserName,
  page,
}) => {
  await page.getByLabel("Workbook document JSON").fill('{"type":"wrong"}');
  await page.getByRole("button", { name: "Import JSON text" }).click();
  await expect(page.getByRole("status")).toContainText("not a valid");

  const document = page.getByRole("textbox", { name: "Workbook page document" });
  await document.click();
  if (browserName === "firefox") {
    // Firefox intentionally ignores synthetic ClipboardEvent payloads. Its real keyboard-input path
    // must still treat markup as text and never execute it.
    await page.keyboard.insertText("Safe text <script>window.__unsafe = true</script>");
  } else {
    await page.evaluate(() => {
      const data = new DataTransfer();
      data.setData("text/html", "<p>Safe text</p><script>window.__unsafe = true</script>");
      globalThis.document.activeElement?.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
      );
    });
  }
  await expect(document).toContainText("Safe text");
  expect(
    await page.evaluate(() => (window as typeof window & { __unsafe?: boolean }).__unsafe),
  ).toBeUndefined();
});

test("imports a validated local JSON file without uploading or losing failed-import content", async ({
  browserName,
  page,
}) => {
  await page.getByRole("button", { name: "Insert tablature" }).click();
  const tab = page.locator('[data-block-type="guitar-tab"]').last();
  await tab.getByLabel("Positions per line").selectOption("4");
  await tab.getByRole("gridcell", { name: /^String 6, position 1,/ }).focus();
  if (browserName === "webkit") {
    await tab.getByText("Position and block actions").click();
    await tab.getByLabel("Direct fret entry").fill("12");
  } else await page.keyboard.type("12");
  await page.getByRole("button", { name: "Display document JSON" }).click();
  const json = page.getByLabel("Workbook document JSON");
  const exported = await json.inputValue();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON file" }).click();
  expect((await download).suggestedFilename()).toBe("guitarpg-workbook.json");

  await page.getByRole("button", { name: "Reset prototype" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Import JSON file").setInputFiles({
    name: "workbook.json",
    mimeType: "application/json",
    buffer: Buffer.from(exported),
  });
  await expect(page.getByRole("status")).toContainText("restored and remains editable");
  const restored = page.locator('[data-block-type="guitar-tab"]').last();
  await expect(restored.getByLabel("Positions per line")).toHaveValue("4");
  await expect(
    restored.getByRole("gridcell", { name: /String 6, position 1, Fret 12/ }),
  ).toBeVisible();

  await json.fill("");
  await page.getByRole("button", { name: "Import JSON text" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Enter JSON text or select a JSON file to import.",
  );
  await expect(restored).toBeVisible();
  await json.fill("{broken");
  await page.getByRole("button", { name: "Import JSON text" }).click();
  await expect(page.getByRole("status")).toContainText("malformed");
  await expect(restored).toBeVisible();

  await page.getByLabel("Import JSON file").setInputFiles({
    name: "workbook.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(exported),
  });
  await expect(page.getByRole("status")).toContainText(".json workbook file");
  await expect(restored).toBeVisible();
  await page.getByLabel("Import JSON file").setInputFiles({
    name: "oversized.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(1024 * 1024 + 1, " "),
  });
  await expect(page.getByRole("status")).toContainText("1 MB");
  await expect(restored).toBeVisible();
});

test("ordinary text entry after musical editing never replaces the musical block", async ({
  page,
}) => {
  const document = page.getByRole("textbox", { name: "Workbook page document" });
  await page.getByRole("button", { name: "Insert tablature" }).click();
  const tab = page.locator('[data-block-type="guitar-tab"]').last();
  await tab.getByRole("gridcell", { name: /^String 6, position 1,/ }).focus();
  await page.keyboard.type("7");
  await tab.getByRole("button", { name: "Return to document" }).click();
  await expect(document).toBeFocused();
  await page.keyboard.type("Text after tab");
  await expect(tab.getByRole("gridcell", { name: /String 6, position 1, Fret 7/ })).toBeVisible();
  await expect(document).toContainText("Text after tab");

  await page.getByRole("button", { name: "Insert chord diagram" }).click();
  const chord = page.locator('[data-block-type="chord-diagram"]').last();
  await chord.getByRole("gridcell", { name: "Set string 6 to fret 3" }).click();
  await chord.getByRole("button", { name: "Return to document" }).click();
  await expect(document).toBeFocused();
  await page.keyboard.type("Text after chord");
  await expect(chord.getByRole("button", { name: /Select string 6, Fret 3/ })).toBeVisible();
  await expect(document).toContainText("Text after chord");

  await tab.getByText("Position and block actions").click();
  await tab.getByRole("button", { name: "Delete tab" }).click();
  await expect(page.locator('[data-block-type="guitar-tab"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator('[data-block-type="guitar-tab"]')).toHaveCount(1);
});

test("meets the automated accessibility and responsive overflow gates", async ({ page }) => {
  await page.getByRole("button", { name: "Insert tablature" }).click();
  await page.getByRole("button", { name: "Insert chord diagram" }).click();
  await expectAccessible(page, "workbook prototype");
  await expectNoHorizontalOverflow(page);
});
