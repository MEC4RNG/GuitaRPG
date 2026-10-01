import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("public launch shell and Codex remain truthful", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TURN PRACTICE INTO A QUEST." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  await page.goto("/codex");
  const search = page.getByLabel("Search the Codex");
  await search.fill("Dorian");
  await page.getByRole("link", { name: "Dorian", exact: true }).click();
  await expect(page).toHaveURL(/\/codex\/concepts\/dorian$/);
  await expect(page.getByText("CONCEPT", { exact: true })).toBeVisible();
  await page.goBack();
  await search.fill("Barre Chords");
  await expect(page.getByRole("link", { name: "Barre-Chord Fretting", exact: true })).toBeVisible();
  const response = await page.goto("/codex/skills/dorian");
  expect(response?.status()).toBe(404);
  expect(isMobile ? await page.viewportSize()?.width : 1280).toBeTruthy();
});

test("fresh Player Profile feeds Training and Quest references reach Session", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Set your starting point." })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel("Experience background").selectOption("SOME_EXPERIENCE");
  await page.getByLabel("Typical session length (minutes)").fill("20");
  await page.getByLabel("Challenge preference").selectOption("BALANCED");
  await page.getByLabel("Preferred tuning").selectOption({ label: "Standard Tuning" });
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText("PLAYER READY")).toBeVisible();

  await page.goto("/profile");
  await page.getByLabel("Challenge preference").selectOption("PUSH_ME");
  await page.getByLabel("Default tuning").selectOption({ label: "DADGAD" });
  await page.getByRole("button", { name: "Add goal" }).click();
  await page
    .getByRole("group", { name: "Goal 1" })
    .getByRole("combobox")
    .nth(1)
    .selectOption({ label: "Alternate Picking" });
  await page.getByRole("button", { name: "Save Profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");

  await page.goto("/training");
  const target = page.getByLabel("Training target", { exact: true });
  await expect(target).toBeVisible({ timeout: 15_000 });
  const alternatePicking = target.getByRole("option", { name: /Alternate Picking/ });
  await target.selectOption((await alternatePicking.getAttribute("value"))!);
  await page.getByRole("button", { name: "Build Training Quest" }).click();
  await expect(page.getByText("DADGAD", { exact: true })).toBeVisible();
  await expect(page.getByText("PUSH ME", { exact: true })).toBeVisible();
  await expect(
    page.locator("dt", { hasText: "Primary Skill" }).locator("..").getByRole("link"),
  ).toHaveAttribute("href", /\/codex\/skills\//);
  await page.getByRole("button", { name: "Start Practice" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Practice parameters" })).toBeVisible();
  await expect(page.locator(".session-reference").getByRole("link").first()).toHaveAttribute(
    "href",
    /\/codex\//,
  );
  await page.getByRole("button", { name: "+1 rep" }).click();
  await page.getByRole("button", { name: "End Session" }).click();
  await expect(page.getByRole("link", { name: "Record Result" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("generated Quest exposes verified references without obscuring practice", async ({ page }) => {
  await page.goto("/generate");
  await page.getByRole("button", { name: "Generate Quest" }).click();
  await expect(page.locator("#generated-quest-title")).toBeVisible();
  await expect(
    page.locator("dt", { hasText: "Primary Skill" }).locator("..").getByRole("link"),
  ).toHaveAttribute("href", /\/codex\/skills\//);
  await expect(
    page.locator("dt", { hasText: "Concepts" }).locator("..").getByRole("link").first(),
  ).toHaveAttribute("href", /\/codex\/concepts\//);
  await expect(
    page.locator("dt", { hasText: "Constraints" }).locator("..").getByRole("link").first(),
  ).toHaveAttribute("href", /\/codex\/constraints\//);
  await expect(page.getByRole("button", { name: "Start Practice" })).toBeVisible();
});
