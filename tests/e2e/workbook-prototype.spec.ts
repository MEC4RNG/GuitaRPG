import { expect, test } from "@playwright/test";

import { expectAccessible, expectNoHorizontalOverflow } from "./helpers/accessibility";

test.beforeEach(async ({ page }) => {
  await page.goto("/prototype/workbook");
  await expect(page.getByRole("heading", { name: "Interactive Workbook Editor" })).toBeVisible();
});

test("edits one mixed document and round trips the owned JSON format", async ({ page }) => {
  const document = page.getByRole("textbox", { name: "Workbook page document" });
  await document.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("A new phrase");
  await page.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.type(" with emphasis");

  await page.getByRole("button", { name: "Insert tablature" }).click();
  const tab = page.locator('[data-block-type="guitar-tab"]').last();
  await tab.getByRole("gridcell", { name: /String 6, position 1/ }).click();
  await tab.getByLabel("Fret").fill("7");
  await tab.getByRole("button", { name: "Set fret" }).click();
  await tab.getByRole("gridcell", { name: /String 5, position 1/ }).click();
  await tab.getByRole("button", { name: "Open", exact: true }).click();
  await tab.getByRole("button", { name: "Add position" }).click();
  await expect(tab.getByRole("gridcell", { name: /String 6, position 1, Fret 7/ })).toBeVisible();
  await expect(tab.getByRole("gridcell", { name: /String 6, position 5/ })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(tab.getByRole("gridcell", { name: /String 6, position 5/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(tab.getByRole("gridcell", { name: /String 6, position 5/ })).toBeVisible();

  await page.getByRole("button", { name: "Insert chord diagram" }).click();
  const chord = page.locator('[data-block-type="chord-diagram"]').last();
  await chord.getByLabel("Chord name").fill("G major");
  await chord.getByRole("button", { name: /String 6/ }).click();
  await chord.getByRole("button", { name: "Open", exact: true }).click();
  await expect(chord).toHaveAccessibleName(/G major/);

  await page.getByRole("button", { name: "Export document JSON" }).click();
  const json = page.getByLabel("Workbook document JSON");
  const exported = await json.inputValue();
  expect(JSON.parse(exported).type).toBe("GUITARPG_WORKBOOK_DOCUMENT_V1");

  await page.getByRole("button", { name: "Reset prototype" }).click();
  await json.fill(exported);
  await page.getByRole("button", { name: "Import document JSON" }).click();
  await expect(page.getByRole("status")).toContainText("restored and remains editable");
  await expect(page.locator('[data-block-type="guitar-tab"]')).toHaveCount(1);
  await expect(page.getByLabel("Chord name")).toHaveValue("G major");
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

test("rejects malformed imports and safely treats pasted markup as text", async ({ page }) => {
  await page.getByLabel("Workbook document JSON").fill('{"type":"wrong"}');
  await page.getByRole("button", { name: "Import document JSON" }).click();
  await expect(page.getByRole("status")).toContainText("not a valid");

  const document = page.getByRole("textbox", { name: "Workbook page document" });
  await document.click();
  await page.evaluate(() => {
    const data = new DataTransfer();
    data.setData("text/html", "<p>Safe text</p><script>window.__unsafe = true</script>");
    globalThis.document.activeElement?.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
  });
  await expect(document).toContainText("Safe text");
  expect(
    await page.evaluate(() => (window as typeof window & { __unsafe?: boolean }).__unsafe),
  ).toBeUndefined();
});

test("meets the automated accessibility and responsive overflow gates", async ({ page }) => {
  await page.getByRole("button", { name: "Insert tablature" }).click();
  await page.getByRole("button", { name: "Insert chord diagram" }).click();
  await expectAccessible(page, "workbook prototype");
  const overflowing = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
      .map((element) => ({
        className: element.className,
        right: Math.round(element.getBoundingClientRect().right),
        tag: element.tagName,
      }))
      .slice(0, 10),
  );
  expect(overflowing, "elements must remain within the page viewport").toEqual([]);
  await expectNoHorizontalOverflow(page);
});
