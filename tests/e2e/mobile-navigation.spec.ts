import { expect, test } from "@playwright/test";

import { expectAccessible, expectNoHorizontalOverflow } from "./helpers/accessibility";

test("integrated mobile menu exposes all destinations while retaining Codex shortcut", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 740, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Open navigation menu" });
    await expect(trigger).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link"),
    ).toHaveCount(5);
    await trigger.click();
    const menu = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link")).toHaveCount(9);
    await expect(menu.getByRole("link", { name: "Home", exact: true })).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await expectAccessible(page, "Integrated mobile navigation");
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await menu.getByRole("link", { name: "Codex", exact: true }).click();
    await expect(page).toHaveURL(/\/codex$/);
    await expect(menu).toBeHidden();
    await page.goBack();
    await expect(trigger).toBeVisible();
    await trigger.click();
    await menu.getByRole("button", { name: "Close navigation menu" }).click();
    await expect(trigger).toBeFocused();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeHidden();
  await expect(page.getByRole("complementary", { name: "Primary navigation" })).toBeVisible();
});
