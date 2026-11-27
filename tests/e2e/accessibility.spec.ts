import { expect, test } from "@playwright/test";

import { expectAccessible, expectNoHorizontalOverflow } from "./helpers/accessibility";
import { completeGuestOnboarding, generateAndStartPractice } from "./helpers/player-flow";

test("public and guest entry states meet the automated WCAG 2.2 AA gate", async ({ page }) => {
  for (const [path, heading] of [
    ["/", "TURN PRACTICE INTO A QUEST."],
    ["/codex", "Musical reference"],
    ["/codex/concepts/dorian", "Dorian"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expectAccessible(page, path);
  }

  await page.goto("/profile");
  const linkedEmail = page.getByLabel("Linked email");
  await expect(linkedEmail).toBeVisible();
  await linkedEmail.focus();
  await expect(linkedEmail).toBeFocused();
  await expectAccessible(page, "/profile account access");
});

test("desktop navigation exposes natural names with presentation-only uppercase", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "Sound Uncharted home, Practice operating system" }),
  ).toBeVisible();
  for (const name of ["Play", "Development", "Learn", "System"] as const) {
    const heading = page.getByRole("heading", { name, exact: true });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveCSS("text-transform", "uppercase");
  }
  await expect(page.getByText("Practice OS", { exact: true })).toHaveAttribute(
    "aria-hidden",
    "true",
  );
});

test("authenticated practice surfaces meet the automated WCAG gate", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Set your starting point." })).toBeVisible({
    timeout: 15_000,
  });
  await expectAccessible(page, "/onboarding");
  await completeGuestOnboarding(page);

  for (const path of [
    "/character",
    "/skills",
    "/generate",
    "/training",
    "/profile",
    "/history",
  ] as const) {
    await page.goto(path);
    await page.locator("main").waitFor();
    await expectAccessible(page, path);
  }

  await page.goto("/profile");
  const deleteTrigger = page.getByRole("button", { name: "Delete this Player" });
  await deleteTrigger.click();
  await expect(
    page.getByRole("heading", { name: "Permanently delete this Player?" }),
  ).toBeFocused();
  await expectAccessible(page, "deletion confirmation");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(deleteTrigger).toBeFocused();

  const sessionId = await generateAndStartPractice(page);
  await expectAccessible(page, "active Session");
  await page.getByRole("button", { name: "+1 rep" }).click();
  await page.getByRole("button", { name: "End Session" }).click();
  await page.getByRole("link", { name: "Record Result" }).click();
  await expectAccessible(page, "Result entry");
  await page.getByLabel("Challenge fit").selectOption("GOOD_CHALLENGE");
  await page.getByLabel("Notes").fill("UX-005 accessibility flow");
  await page.getByRole("button", { name: "Record Result" }).click();
  await expect(page.getByLabel("Final Result")).toBeVisible();
  await expectAccessible(page, "Result complete");
  await page.goto(`/history/${sessionId}`);
  await expectAccessible(page, "History detail");
});

test("Studio Atlas preview has readable responsive components and keyboard dialog recovery", async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 820, height: 1180 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/prototype/studio-atlas");
    await expect(
      page.getByRole("heading", { name: "A world of musical discovery." }),
    ).toBeVisible();
    await expect(page.locator(".sa-domain")).toHaveCount(6);
    await expect(page.locator(".sa-cover-item")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Unavailable", exact: true })).toBeDisabled();
    const trigger = page.getByRole("button", { name: "Preview contextual panel" });
    expect((await trigger.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expectAccessible(page, `Studio Atlas ${viewport.width}`);
    await expectNoHorizontalOverflow(page);
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Scale-Degree Recognition" });
    await expect(dialog).toBeVisible();
    await expectAccessible(page, "Studio Atlas contextual panel");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    const toggle = page.getByRole("button", { name: "Dark reading surface" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".sa-reading")).not.toHaveClass(/sa-reading--paper/);
    await expectAccessible(page, "Studio Atlas dark reading surface");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".studio-atlas")).toHaveCSS("--sa-motion", /^0(?:ms|s)$/);
  await expect(page.getByRole("button", { name: "Preview contextual panel" })).toHaveCSS(
    "transition-duration",
    /^0s(?:, 0s)*$/,
  );
});

test("F2 guest-free dashboard and compact navigation are accessible", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  let signups = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/auth/v1/signup")) signups += 1;
  });
  await page.goto("/prototype/studio-atlas/home");
  await expect(page.getByRole("link", { name: "Start playing" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Your progress" })).toHaveCount(0);
  expect(signups).toBe(0);
  await expect(page.locator(".sa-visitor-feature")).toHaveCount(6);
  await expect(page.getByRole("link", { name: "Create your Player" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent Quests" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Boredom Buster" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Explore Sound Uncharted" })).toHaveCount(0);
  const sidebar = page.getByRole("complementary", { name: "Primary navigation" });
  await expect(sidebar.getByRole("link", { name: "Workbooks" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Home", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const collapse = sidebar.getByRole("button", { name: "Collapse sidebar" });
  await collapse.click();
  await expect(sidebar.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(sidebar.getByRole("link", { name: "Workbooks" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectAccessible(page, "F2 compact desktop shell");
  await sidebar.getByRole("button", { name: "Expand sidebar" }).click();
  await expectAccessible(page, "F2 expanded desktop shell");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sidebar).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await expectAccessible(page, "F2 mobile landing");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const menu = page.getByRole("dialog", { name: "Navigation menu" });
  await expect(menu.getByRole("link", { name: "Workbooks" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("F2 dashboard uses real guest data and prioritizes an open Session", async ({ page }) => {
  test.setTimeout(90_000);
  await completeGuestOnboarding(page);
  await page.goto("/prototype/studio-atlas/home");
  const home = page.locator(".sa-home");
  await expect(home.getByRole("heading", { name: "Your progress" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(home.getByRole("link", { name: "Protect your progress" })).toBeVisible();
  await expect(home.getByRole("heading", { name: "Character Level 1" })).toBeVisible();
  await expect(home.getByText("0 practice XP", { exact: true })).toBeVisible();
  await expect(home.getByRole("heading", { name: "Recent Workbooks" })).toBeVisible();
  await expect(home.getByRole("heading", { name: "Recent Quests" })).toBeVisible();
  await expect(home.getByRole("heading", { name: "Boredom Buster" })).toBeVisible();
  await expect(home.getByRole("link", { name: "Explore today\'s challenge" })).toHaveAttribute("href", "/generate?daily=1");
  await expect(home.getByRole("link", { name: "Read Codex entry" })).toHaveAttribute("href", /^\/codex\/(skills|concepts)\//);
  await expect(home.getByRole("heading", { name: "Practice setup" })).toBeVisible();
  await expect(home.getByRole("heading", { name: "Learning path" })).toBeVisible();
  await expect(home.locator(".sa-visitor-feature")).toHaveCount(0);
  await expect(home.getByRole("link", { name: "Quick Quest", exact: true })).toBeVisible();
  await expectAccessible(page, "F2 new Player");
  const sessionId = await generateAndStartPractice(page);
  await page.goto("/prototype/studio-atlas/home");
  await expect(home.getByRole("link", { name: "Resume Session" })).toHaveAttribute(
    "href",
    `/session/${sessionId}`,
    { timeout: 20_000 },
  );
  await expect(home.getByRole("link", { name: "Quick Quest", exact: true })).toHaveCount(0);
  await expect(home.getByRole("link", { name: "Explore today\'s challenge" })).toHaveCount(0);
  await expect(home.locator(".sa-home-quest-card").first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await expectAccessible(page, "F2 active Session dashboard");
  await home.getByRole("link", { name: "Resume Session" }).click();
  await expect(page).toHaveURL(new RegExp(`/session/${sessionId}$`));
});

test("F2-R1 daily challenge uses explicit generation and preserves an existing draft", async ({ page }) => {
  test.setTimeout(60_000);
  await completeGuestOnboarding(page);
  await page.goto("/generate?daily=1");
  await expect(page.getByRole("heading", { name: "Boredom Buster" })).toBeVisible();
  await expect(page.locator("#generated-quest-title")).toHaveCount(0);
  await page.getByRole("button", { name: "Generate Quest" }).click();
  const title = page.locator("#generated-quest-title");
  await expect(title).toBeVisible();
  const generated = await title.innerText();
  await page.reload();
  await expect(title).toHaveText(generated);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Generate Another" }).click();
  await expect(title).toHaveText(generated);
  await expectAccessible(page, "F2-R1 daily challenge");
});
