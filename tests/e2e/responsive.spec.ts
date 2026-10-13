import { test } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers/accessibility";

test("core public surfaces fit small phone, tablet, and mobile WebKit", async ({
  page,
}, testInfo) => {
  for (const path of ["/", "/profile", "/onboarding", "/generate", "/codex"] as const) {
    await page.goto(path);
    await page.locator("main").waitFor();
    await expectNoHorizontalOverflow(page);
  }

  const controls = page.locator(
    "button:visible, input:visible, select:visible, a.action-button:visible, a.nav-link:visible",
  );
  const count = Math.min(await controls.count(), 20);
  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    const box = await control.boundingBox();
    if (!box || Math.max(box.width, box.height) >= 44) continue;

    const identity = await control.evaluate((element) => ({
      tag: element.tagName.toLowerCase(),
      accessibleName: element.getAttribute("aria-label") ?? "",
      text: element.textContent?.trim() ?? "",
      computedMinHeight: getComputedStyle(element).minHeight,
      touchTargetToken: getComputedStyle(element).getPropertyValue("--touch-target-min"),
    }));
    throw new Error(
      `Touch target below 44px: route=${page.url()} project=${testInfo.project.name} ` +
        `tag=${identity.tag} accessibleName=${JSON.stringify(identity.accessibleName)} ` +
        `text=${JSON.stringify(identity.text)} width=${box.width} height=${box.height} ` +
        `computedMinHeight=${identity.computedMinHeight} ` +
        `touchTargetToken=${JSON.stringify(identity.touchTargetToken)}`,
    );
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
