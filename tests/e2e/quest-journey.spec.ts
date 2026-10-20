import { expect, test } from "@playwright/test";

import { expectAccessible, expectNoHorizontalOverflow } from "./helpers/accessibility";
import { completeGuestOnboarding } from "./helpers/player-flow";

test("draft, Save Quest, Start Quest, stages, and Practice share one durable Quest", async ({
  page,
}) => {
  await completeGuestOnboarding(page);
  await page.goto("/generate");
  await page.getByRole("button", { name: "Generate Quest" }).click();
  await expect(page.getByRole("button", { name: "Start Practice" })).toHaveCount(0);
  const title = await page.locator("#generated-quest-title").innerText();
  async function inspectGeneratedReference(label: string) {
    const control = page
      .locator("dt", { hasText: label })
      .locator("..")
      .getByRole("button", { name: /^Open Codex Peek for / })
      .first();
    await expect(control).toBeVisible();
    await control.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close Codex Peek" }).last().click();
    await expect(control).toBeFocused();
  }
  // Quick Quests intentionally have no secondary or required Skill roles; those roles are
  // covered by the deterministic resolver suite and use this same reusable control.
  for (const label of ["Concepts", "Constraints"]) {
    await inspectGeneratedReference(label);
  }
  const generatedReference = page.getByRole("button", { name: /^Open Codex Peek for / }).first();
  await generatedReference.click();
  const peek = page.getByRole("dialog", { name: /.+/ });
  await expect(peek).toBeVisible();
  const peekVisuals = await peek.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      backgroundColor: styles.backgroundColor,
      opacity: styles.opacity,
      borderLeftColor: styles.borderLeftColor,
      borderTopColor: styles.borderTopColor,
    };
  });
  expect(peekVisuals.backgroundColor).toBe("rgb(28, 27, 23)");
  expect(peekVisuals.opacity).toBe("1");
  expect(
    (page.viewportSize()?.width ?? 1280) < 768
      ? peekVisuals.borderTopColor
      : peekVisuals.borderLeftColor,
  ).toBe("rgb(214, 168, 75)");
  await expect(peek.getByRole("heading", { name: "Definition" })).toBeVisible();
  await expect(peek.getByRole("heading", { name: "In this Quest" })).toBeVisible();
  await expect(peek.getByRole("link", { name: "Open Full Codex Entry" })).toHaveAttribute(
    "target",
    "_blank",
  );
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await expect(peek).toHaveAttribute("aria-modal", "true");
  } else {
    await expect(peek).not.toHaveAttribute("aria-modal", "true");
  }
  await page.keyboard.press("Escape");
  await expect(peek).toHaveCount(0);
  await expect(generatedReference).toBeFocused();
  await expect(page.locator("#generated-quest-title")).toHaveText(title);

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
  const primaryTab = page.getByRole("tab", { name: "Primary Focus" });
  await expect(primaryTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Primary focus");
  const mapReference = page.getByRole("button", { name: /^Open Codex Peek for / }).first();
  await mapReference.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(mapReference).toBeFocused();
  await expect(primaryTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await primaryTab.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Musical Concepts" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expectAccessible(page, "Quest Journey Map");

  await page.getByRole("button", { name: "Explore" }).click();
  await expect(page.getByText("Practice focus", { exact: true })).toBeVisible();
  await expectAccessible(page, "Quest Journey Explore");
  await page.reload();
  await expect(page.getByText("Practice focus", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Craft" }).click();
  await expect(
    page.getByText("Create something using what you discovered.", { exact: true }),
  ).toBeVisible();
  await expectAccessible(page, "Quest Journey Craft");
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("tab", { name: "Primary Focus" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Start Practice" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();
  const sessionReference = page.getByRole("button", { name: /^Open Codex Peek for / }).first();
  await sessionReference.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sessionReference).toBeFocused();
  await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();

  await page.goto(`/quest/${questId}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Primary Focus" })).toBeVisible();
});
