import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("launch navigation stays truthful on desktop and mobile", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TURN PRACTICE INTO A QUEST." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Generate Quest" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Recommended Training" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Codex" })).toHaveCount(isMobile ? 0 : 1);

  if (isMobile) {
    const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });
    await expect(mobileNav.getByRole("link")).toHaveCount(4);
    await expect(mobileNav.getByRole("link", { name: "Generate" })).toBeVisible();
  } else {
    const sidebar = page.getByRole("complementary", { name: "Primary navigation" });
    await expect(sidebar.getByRole("link", { name: "Profile" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Settings" })).toHaveCount(0);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("Player edits Profile preferences and a structured goal", async ({ page }) => {
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
  await expect(page.getByRole("heading", { name: "Your practice preferences." })).toBeVisible();
  await page.getByLabel("Display name (optional)").fill("Dorian");
  await page.getByLabel("Experience background").selectOption("EXPERIENCED");
  await page.getByLabel("Typical session length (minutes)").fill("35");
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

  await page.reload();
  await expect(page.getByLabel("Display name (optional)")).toHaveValue("Dorian");
  await expect(page.getByLabel("Typical session length (minutes)")).toHaveValue("35");
  await expect(page.getByLabel("Challenge preference")).toHaveValue("PUSH_ME");
  await expect(page.getByLabel("Default tuning")).toHaveValue(
    "40000000-0000-4000-8000-000000000030",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  await page.goto("/training");
  const trainingTarget = page.getByLabel("Training target", { exact: true });
  await expect(trainingTarget).toBeVisible({ timeout: 15_000 });
  await expect(trainingTarget.getByRole("option", { name: /Alternate Picking/ })).toHaveCount(1);
});

test("new anonymous Player completes the production core loop", async ({ page, isMobile }) => {
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

  await page.getByRole("link", { name: "Enter the app" }).click();
  await page.goto("/character");
  await expect(page.getByRole("heading", { name: "Level 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "0 XP" })).toBeVisible();
  await expect(page.locator("article.attribute-card")).toHaveCount(11);
  await expect(page.locator("article.attribute-card").getByText("UNASSESSED")).toHaveCount(11);

  await page.goto("/skills");
  await expect(page.getByText("Showing 72 of 72 active Skills")).toBeVisible();
  await expect(page.getByTestId("skill-row")).toHaveCount(72);
  await expect(page.getByLabel("Search Skills")).toBeVisible();
  await expect(page.getByLabel("Domain")).toBeVisible();
  await expect(page.getByLabel("Assessment status")).toBeVisible();
  await page.getByTestId("skill-row").first().click();
  await expect(page.getByText("Practice exposures").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  await page.goto("/generate");
  await page.getByRole("button", { name: "Generate Quest" }).click();

  const questHeading = page.locator("#generated-quest-title");
  await expect(questHeading).toBeVisible();
  const questTitle = await questHeading.innerText();
  const primarySkill = await page
    .locator("dt", { hasText: "Primary Skill" })
    .locator("..")
    .locator("dd")
    .innerText();
  await expect(page.getByText(/Demand [IVX]+/)).toBeVisible();
  await expect(page.getByText(/BPM|Not required/).first()).toBeVisible();
  await page.getByRole("button", { name: "Start Practice" }).click();

  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/);
  const sessionId = new URL(page.url()).pathname.split("/").at(-1);
  expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: questTitle })).toBeVisible();
  await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "+1 rep" }).click();
  await expect(page.getByText("REPS").locator("..").getByText("1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "End Session" }).click();
  await expect(page.getByText("ENDED", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Record Result" }).click();
  await expect(page).toHaveURL(`/session/${sessionId}/complete`);
  await expect(page.getByRole("heading", { name: questTitle })).toBeVisible();
  await expect(page.getByText(/recorded active seconds/)).toBeVisible();
  await expect(page.getByLabel("Final Result")).toHaveCount(0);
  await page.getByLabel("Challenge fit").selectOption("GOOD_CHALLENGE");
  await page.getByLabel("Notes").fill("REL-002 browser integration");
  await page.getByRole("button", { name: "Record Result" }).click();

  const finalResult = page.getByLabel("Final Result");
  await expect(finalResult).toBeVisible();
  await expect(finalResult.getByText("ABANDONED", { exact: true })).toBeVisible();
  await expect(page.getByText("Reflection: Good challenge")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Final Result")).toHaveCount(1);

  if (isMobile) {
    await page.goto("/history");
  } else {
    await page.getByRole("link", { name: "History" }).click();
  }
  const attempt = page.locator("article.history-attempt").filter({ hasText: questTitle });
  await expect(attempt).toBeVisible();
  await expect(attempt.getByText("ABANDONED", { exact: true })).toBeVisible();
  await attempt.getByRole("link", { name: "View details" }).click();

  await expect(page).toHaveURL(`/history/${sessionId}`);
  await expect(page.getByRole("heading", { name: questTitle })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "ABANDONED" })).toBeVisible();
  await expect(page.getByText("Good challenge", { exact: true })).toBeVisible();
  await expect(page.getByText("REL-002 browser integration")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quest criteria" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evidence" })).toBeVisible();

  await page.goto("/character");
  await expect(page.getByRole("heading", { name: "Character progression." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Level 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "0 XP" })).toBeVisible();
  await expect(page.locator("article.attribute-card").getByText("UNASSESSED")).toHaveCount(11);
  await expect(page.getByText(/XP to Level 2/)).toBeVisible();
  await page.goto("/skills");
  await expect(page.getByText("Showing 72 of 72 active Skills")).toBeVisible();
  const primarySkillRow = page.getByTestId("skill-row").filter({ hasText: primarySkill });
  await expect(primarySkillRow.getByText("UNRATED", { exact: true })).toBeVisible();
  await primarySkillRow.click();
  await expect(primarySkillRow.getByText("0", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/READINESS/).first()).toBeVisible();
});

test("new anonymous Player explicitly selects a tied Training target and starts practice", async ({
  page,
}) => {
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

  await page.goto("/training");
  await expect(page.getByRole("heading", { name: "Top recommendations are tied" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByText("We don't have enough evidence to prefer one calibration target yet."),
  ).toBeVisible();
  await expect(page.getByText("RECOMMENDED NEXT")).toHaveCount(0);
  const target = page.getByLabel("Training target", { exact: true });
  await expect(target.locator("option")).toHaveCount(16);
  await expect(page.getByRole("button", { name: "Build Training Quest" })).toBeDisabled();
  await target.selectOption({ index: 1 });
  await expect(page.getByText("Training priority 54.00").first()).toBeVisible();
  await expect(page.getByText(/not an ability or mastery percentage/i)).toBeVisible();
  await page.getByRole("button", { name: "Build Training Quest" }).click();

  await expect(page.locator("#training-quest-title")).toBeVisible();
  await expect(page.getByText("TRAINING · TECHNIQUE QUEST")).toBeVisible();
  await expect(page.getByText("DIF_V1 demand", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Why this Quest" })).toBeVisible();
  await expect(page.getByText("Standard Tuning", { exact: true })).toBeVisible();
  await expect(page.getByText("BALANCED", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Unknown — more Skill evidence is needed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Challenge preference is not yet applied because this Skill does not have a proficiency estimate.",
    ),
  ).toBeVisible();
  await expect(page.getByText(/Personal challenge: [IVX]/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  await page.getByRole("button", { name: "Start Practice" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/, { timeout: 15_000 });
  await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+1 rep" }).click();
  await page.getByRole("button", { name: "End Session" }).click();
  await page.getByRole("link", { name: "Record Result" }).click();
  await page.getByLabel("Challenge fit").selectOption("GOOD_CHALLENGE");
  await page.getByRole("button", { name: "Record Result" }).click();
  await expect(
    page.getByLabel("Final Result").getByText("ABANDONED", { exact: true }),
  ).toBeVisible();

  await page.goto("/training");
  await expect(page.getByRole("heading", { name: "Top recommendations are tied" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByLabel("Training target", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Build Training Quest" })).toBeDisabled();
});

test("Codex browses canonical references without Player setup", async ({ page }) => {
  await page.goto("/codex");
  await expect(page.getByRole("heading", { name: "Musical reference" })).toBeVisible();
  const search = page.getByLabel("Search the Codex");
  await search.fill("Dorian");
  await page.getByRole("link", { name: "Dorian", exact: true }).click();
  await expect(page).toHaveURL(/\/codex\/concepts\/dorian$/);
  await expect(page.getByText("CONCEPT", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Back to Codex" }).click();
  await page.getByRole("button", { name: "Skills" }).click();
  await search.fill("Alternate Picking");
  await page.getByRole("link", { name: "Alternate Picking", exact: true }).click();
  await expect(page.getByRole("definition").filter({ hasText: "Technique" })).toBeVisible();

  await page.goto("/codex");
  await search.fill("Barre Chords");
  await expect(page.getByRole("link", { name: "Barre-Chord Fretting", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const response = await page.goto("/codex/concepts/alternate_picking");
  expect(response?.status()).toBe(404);
});
