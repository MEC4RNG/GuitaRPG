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
  const overview = page.locator(".journey-header__status-strip");
  await expect(overview).toBeVisible();
  await expect(overview.locator(".journey-header__stat")).toHaveCount(5);
  await expect(page.locator(".journey-header__meta")).toHaveCount(0);
  await expect(page.locator(".journey-header__stat--status")).toHaveAttribute(
    "data-lifecycle",
    "ACTIVE",
  );
  const headerGeometry = await page.locator(".journey-header").evaluate((header) => {
    const region = (selector: string) => {
      const element = header.querySelector(selector);
      if (!element) throw new Error(`Missing header region: ${selector}`);
      return element.getBoundingClientRect();
    };
    const strip = region(".journey-header__status-strip");
    const intro = region(".journey-header__intro");
    const challenges = region(".journey-header__topics");
    return {
      stripBeforeTitle: strip.bottom < intro.top,
      titleBeforeChallenges: intro.bottom < challenges.top,
      stripFitsCard: strip.right <= header.getBoundingClientRect().right + 1,
      noStripOverflow:
        (header.querySelector(".journey-header__status-strip")?.scrollWidth ?? Infinity) <=
        (header.querySelector(".journey-header__status-strip")?.clientWidth ?? 0) + 1,
    };
  });
  expect(headerGeometry).toEqual({
    stripBeforeTitle: true,
    titleBeforeChallenges: true,
    stripFitsCard: true,
    noStripOverflow: true,
  });
  await expect(page.getByText("In progress", { exact: true })).toBeVisible();
  const primaryTopic = page.locator(".journey-header__topics button").first();
  await expect(primaryTopic).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "What it is" })).toBeVisible();
  const mapReference = page.getByRole("button", { name: /^Open Codex Peek for / }).first();
  await mapReference.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(mapReference).toBeFocused();
  await expect(primaryTopic).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".mec-stage", { hasText: "Map" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("heading", { name: "Linked pages" })).toBeVisible();
  await page.getByRole("link", { name: "Open or link a Workbook" }).click();
  await expect(page).toHaveURL(/\/workbooks\?quest=[0-9a-f-]+&stage=MAP&relationship=REFERENCE/);
  await expect(page.locator(".workbook-context")).toBeVisible();
  await page.getByRole("button", { name: "Quick Note" }).click();
  await expect(page.getByRole("button", { name: "Link current page" })).toBeEnabled();
  await page.getByRole("button", { name: "Link current page" }).click();
  await expect(page.getByText("Page linked to this Quest Journey.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Return to Journey" }).click();
  await expect(page).toHaveURL(`/quest/${questId}`);
  await expect(page.locator(".journey-practice li a").first()).toBeVisible();
  const anotherTopic = page.locator(".journey-header__topics button").nth(1);
  await anotherTopic.click();
  await expect(anotherTopic).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".mec-stage", { hasText: "Map" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("heading", { name: "How to explore" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Beginner" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("tab", { name: "Intermediate" }).click();
  await expect(page.getByRole("tab", { name: "Intermediate" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".map-topic__level-actions button")).toBeEnabled();
  await expectAccessible(page, "Quest Journey Map");

  await page.locator(".journey-header__topics button").first().click();
  await page.locator(".map-topic__level-actions button").click();
  await expect(page.getByRole("heading", { name: "Explore the Quest ingredients" })).toBeVisible();
  await expect(page.locator(".journey-tempo")).toHaveCount(0);
  const firstModule = page.locator(".explore-module").first();
  await expect(firstModule.locator(".explore-module__disclosure")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(
    firstModule.locator(".explore-module__heading .explore-module__reorder"),
  ).toBeVisible();
  await expect(
    firstModule.getByRole("combobox", { name: /Choose existing page for/ }),
  ).toBeVisible();
  const pointer = await firstModule
    .locator(".explore-module__disclosure")
    .evaluate((node) => getComputedStyle(node).cursor);
  expect(pointer).toBe("pointer");
  await expectNoHorizontalOverflow(page);

  const primaryModule = page.locator(".explore-module__disclosure").first();
  await primaryModule.click();
  await expect(primaryModule).toHaveAttribute("aria-expanded", "false");
  await primaryModule.click();
  await expect(primaryModule).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("No module-assigned pages yet.")).toBeVisible();
  await expectAccessible(page, "Quest Journey Explore");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Explore the Quest ingredients" })).toBeVisible();
  await page.getByRole("button", { name: "Craft" }).click();
  await expect(
    page.getByRole("heading", { name: "Create something using what you discovered" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "No Quest composition yet" })).toBeVisible();
  await expectAccessible(page, "Quest Journey Craft");
  await page.locator(".mec-stage", { hasText: "Map" }).click();
  await expect(page.locator(".journey-header__topics button").first()).toBeVisible();
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
  await expect(page.locator(".journey-header__topics button").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Session Workbook" })).toBeVisible();
});
