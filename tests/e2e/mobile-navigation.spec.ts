import { expect, test } from "@playwright/test";

test("mobile menu exposes every destination and preserves focus and history", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open navigation menu" });
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  const menu = page.getByRole("dialog", { name: "Navigation menu" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link")).toHaveCount(9);
  await expect(menu.getByRole("link", { name: "Home", exact: true })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(menuButton).toBeFocused();

  await menuButton.click();
  await menu.getByRole("link", { name: "Codex", exact: true }).click();
  await expect(page).toHaveURL(/\/codex$/);
  await expect(menu).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(menuButton).toBeVisible();

  await page.setViewportSize({ width: 320, height: 700 });
  await menuButton.click();
  await expect(menu).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await menu.getByRole("button", { name: "Close navigation menu" }).click();
  await expect(menuButton).toBeFocused();
});

test("desktop keeps the full sidebar without mobile menu chrome", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  await expect(page.getByRole("complementary", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeHidden();
});
