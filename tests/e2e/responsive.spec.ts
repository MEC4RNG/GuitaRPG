import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/accessibility";

test("core public surfaces fit small phone, tablet, and mobile WebKit", async ({ page }) => {
  for (const path of ["/", "/onboarding", "/generate", "/codex", "/profile"] as const) {
    await page.goto(path);
    await page.locator("main").waitFor();
    await expectNoHorizontalOverflow(page);
  }

  await page.goto("/profile");
  const linkedEmail = page.getByLabel("Linked email");
  await expect(linkedEmail).toBeVisible();
  const emailBox = await linkedEmail.boundingBox();
  expect(emailBox).not.toBeNull();
  expect(emailBox!.height).toBeGreaterThanOrEqual(44);
  await linkedEmail.focus();
  await expect(linkedEmail).toBeFocused();
  await expectNoHorizontalOverflow(page);

  const controls = page.locator("button:visible, a:visible, input:visible, select:visible");
  const count = Math.min(await controls.count(), 20);
  for (let index = 0; index < count; index += 1) {
    const box = await controls.nth(index).boundingBox();
    if (box) expect(Math.max(box.width, box.height)).toBeGreaterThanOrEqual(44);
  }
});

test("representative content reflows at effective 200 percent zoom", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 });
  await page.addStyleTag({ content: "html { zoom: 2; }" });
  for (const path of ["/", "/codex/concepts/dorian"] as const) {
    await page.goto(path);
    await page.addStyleTag({ content: "html { zoom: 2; }" });
    await page.locator("main").waitFor();
    await expectNoHorizontalOverflow(page);
  }
});
