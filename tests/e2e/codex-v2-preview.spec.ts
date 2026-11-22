import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalOverflow } from "./helpers/accessibility";

test("CODEX-V2-A isolated preview keeps navigation and dictionary in place", async ({ page }) => {
  await page.goto("/prototype/codex-v2");
  await expect(page.getByRole("heading", { name: "Explore the musical library." })).toBeVisible();
  await expect(page.locator(".cv2-card")).toHaveCount(9);
  await expect(page.getByText("Design review only")).toBeVisible();

  await page.getByRole("button", { name: "Explore this Skill" }).first().click();
  await expect(page.getByRole("heading", { name: "Scale-Degree Recognition" })).toBeVisible();
  const define = page.getByRole("button", { name: "Define Tonic" });
  await define.click();
  await expect(page.getByRole("dialog", { name: "Tonic" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Related Codex entry" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(define).toBeFocused();

  await define.click();
  await page.getByRole("button", { name: "Read full dictionary entry" }).click();
  await expect(page.getByRole("heading", { name: "Music Dictionary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tonic" })).toBeVisible();

  await page.getByRole("button", { name: "Codex Library" }).click();
  await page.getByLabel("Learning material").selectOption("intermediate");
  await expect(page.locator(".cv2-card")).toHaveCount(9);
  await page.getByLabel("Search Skills").fill("triad");
  await expect(page.locator(".cv2-card")).toHaveCount(1);
  await expectAccessible(page, "Codex V2 library preview");
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A-R6 expands interval and arpeggio curricula without changing layout", async ({
  page,
}) => {
  await page.goto("/prototype/codex-v2");
  await expect(page.locator(".cv2-card")).toHaveCount(9);

  await page
    .locator(".cv2-card")
    .filter({ hasText: "Interval Recognition" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  await expect(page.getByRole("heading", { name: "Interval Recognition" })).toBeVisible();
  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  await expect(page.getByText("12 draft instructional modules")).toBeVisible();
  await expect(page.locator(".cv2-availability-note")).toContainText(
    "All 4 applications include foundational lessons",
  );
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await page.getByRole("combobox", { name: "Musical application" }).selectOption("theory");
  const inverseLesson = page.locator(".cv2-modules .cv2-module").first();
  await expect(inverseLesson.locator("summary")).toContainText(
    "Invert and extend intervals without losing quality",
  );
  await inverseLesson.locator("summary").click();
  await expect(inverseLesson).toContainText("major tenth");

  await page.getByRole("button", { name: "How to Explore" }).click();
  await expect(page.locator(".cv2-explore-module")).toHaveCount(1);
  const activity = page.locator(".cv2-explore-module").first();
  await activity.locator("summary").click();
  await expect(activity).toContainText("Check yourself");
  await page.getByRole("button", { name: "Connections" }).click();
  await expect(page.locator(".cv2-connections li")).toHaveCount(4);

  await page
    .getByRole("button", { name: /Library/ })
    .first()
    .click();
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Arpeggio Sequencing" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  await expect(page.getByRole("heading", { name: "Arpeggio Sequencing" })).toBeVisible();
  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await page.getByRole("combobox", { name: "Musical application" }).selectOption("harmony");
  await expect(page.locator(".cv2-modules summary")).toContainText(
    "Expand from triads to seventh-chord arpeggios",
  );
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A-R7 expands Note Location and Voice Leading without redesign", async ({ page }) => {
  await page.goto("/prototype/codex-v2");
  await expect(page.locator(".cv2-card")).toHaveCount(9);

  await page
    .locator(".cv2-card")
    .filter({ hasText: "Note Location" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  await expect(page.getByRole("heading", { name: "Note Location" })).toBeVisible();
  await expect(page.locator(".cv2-overview-grid")).toBeVisible();
  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  await expect(page.getByText("12 draft instructional modules")).toBeVisible();
  await expect(page.locator(".cv2-availability-note")).toContainText(
    "All 4 applications include foundational lessons",
  );
  await page.getByRole("button", { name: "Intermediate", exact: true }).click();
  await page.getByRole("combobox", { name: "Musical application" }).selectOption("tuning");
  const tuningLesson = page.locator(".cv2-modules .cv2-module").first();
  await expect(tuningLesson.locator("summary")).toContainText("Update your note map in DADGAD");
  await tuningLesson.locator("summary").click();
  await expect(tuningLesson).toContainText("string 2 fret 3");
  await page.getByRole("button", { name: "How to Explore" }).click();
  await expect(page.locator(".cv2-explore-module")).toHaveCount(1);
  await page.getByRole("button", { name: "Connections" }).click();
  await expect(page.locator(".cv2-connections li")).toHaveCount(4);

  await page
    .getByRole("button", { name: /Library/ })
    .first()
    .click();
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Voice Leading" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  await expect(page.getByRole("heading", { name: "Voice Leading" })).toBeVisible();
  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await page.getByRole("combobox", { name: "Musical application" }).selectOption("aural");
  const suspensionLesson = page.locator(".cv2-modules .cv2-module").first();
  await expect(suspensionLesson.locator("summary")).toContainText(
    "Hear a prepared 4-to-3 resolution",
  );
  await suspensionLesson.locator("summary").click();
  await expect(suspensionLesson).toContainText("C4→B3");
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A-R8 expands Scale Mapping and Chord Inversion Navigation without redesign", async ({
  page,
}) => {
  await page.goto("/prototype/codex-v2");
  await expect(page.locator(".cv2-card")).toHaveCount(9);

  await page
    .locator(".cv2-card")
    .filter({ hasText: "Scale Mapping" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  await expect(page.getByRole("heading", { name: "Scale Mapping" })).toBeVisible();
  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  await expect(page.getByText("12 draft instructional modules")).toBeVisible();
  await expect(page.locator(".cv2-availability-note")).toContainText(
    "All 4 applications include foundational lessons",
  );
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await page.getByRole("combobox", { name: "Musical application" }).selectOption("fretboard");
  const minorScale = page.locator(".cv2-modules .cv2-module").first();
  await expect(minorScale.locator("summary")).toContainText(
    "Re-map A natural and harmonic minor",
  );
  await minorScale.locator("summary").click();
  await expect(minorScale).toContainText("G♯");
  await page.getByRole("button", { name: "How to Explore" }).click();
  const explore = page.locator(".cv2-explore-module").first();
  await expect(explore.locator(".cv2-module-chevron")).toBeVisible();
  await explore.locator("summary").click();
  await expect(explore).toHaveAttribute("open");
  await page.getByRole("button", { name: "Connections" }).click();
  await expect(page.locator(".cv2-connections li")).toHaveCount(4);

  await page.getByRole("button", { name: /Library/ }).first().click();
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Chord Inversion Navigation" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  await expect(page.getByRole("heading", { name: "Chord Inversion Navigation" })).toBeVisible();
  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  await page.getByRole("button", { name: "Intermediate", exact: true }).click();
  await page.getByRole("combobox", { name: "Musical application" }).selectOption("fretboard");
  const inversions = page.locator(".cv2-modules .cv2-module").first();
  await expect(inversions.locator("summary")).toContainText(
    "Compare C major across a single upper-string group",
  );
  await inversions.locator("summary").click();
  await expect(inversions).toContainText("9–8–8");
  await page.getByRole("button", { name: "Connections" }).click();
  await expect(page.locator(".cv2-connections li")).toHaveCount(4);
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A preserves published V1 Skill routes", async ({ page }) => {
  await page.goto("/codex/skills/triad_construction");
  await expect(page.getByRole("heading", { name: "Triad Construction" })).toBeVisible();
  await expect(page.getByText(/trainable ability/i)).toBeVisible();
});

test("CODEX-V2-A-R1 restores the interactive triad reference and complete educational sections", async ({
  page,
}) => {
  await page.goto("/prototype/codex-v2");
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Triad Construction" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();

  await expect(page.getByRole("heading", { name: "Triad Construction" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explore the musical library." })).toHaveCount(0);
  await expect(page.locator(".cv2-fret-svg")).toBeVisible();
  await expect(page.locator(".cv2-reference-detail")).toContainText("C4 · E4 · G4");
  await page.getByRole("button", { name: "C minor" }).click();
  await expect(page.locator(".cv2-reference-detail")).toContainText("C4 · E♭4 · G4");
  await page.getByRole("button", { name: /F major.*inversion/ }).click();
  await expect(page.locator(".cv2-reference-detail")).toContainText("A3 · C4 · F4");
  await expect(page.locator(".cv2-reference-detail")).toContainText("First inversion");

  await page.getByRole("button", { name: "Applications" }).click();
  await expect(page.locator(".cv2-application-grid button")).toHaveCount(4);
  await expect(page.locator(".cv2-application-grid")).toContainText("Spell the three chord tones");

  await page.getByRole("button", { name: "Connections" }).click();
  await expect(page.locator(".cv2-connections li")).toHaveCount(7);
  await expect(page.locator(".cv2-connections")).toContainText("Knowing a few note locations");

  await page.getByRole("button", { name: "How to Explore" }).click();
  await expect(page.getByRole("heading", { name: "How to Explore" })).toBeVisible();
  await expect(page.locator(".cv2-explore-grid .cv2-exercise")).toHaveCount(4);
  const activity = page.locator(".cv2-explore-grid .cv2-explore-module").first();
  const disclosure = activity.locator("summary");
  await expect(page.locator(".cv2-explore-grid .cv2-explore-module")).toHaveCount(4);
  await expect(activity.locator(".cv2-module-chevron")).toBeVisible();
  await expect(activity).not.toHaveAttribute("open");
  await expect(activity.getByText("Check yourself:")).toBeHidden();
  await disclosure.click();
  await expect(activity).toHaveAttribute("open");
  await expect(activity.getByText("Check yourself:")).toBeVisible();
  await disclosure.press("Enter");
  await expect(activity).not.toHaveAttribute("open");

  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  await expect(page.getByText("12 draft instructional modules")).toBeVisible();
  await expectAccessible(page, "Codex V2 Triad Construction R1");
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A-R1 restores the subdivided metronome and readable beat grids", async ({
  page,
}) => {
  await page.goto("/prototype/codex-v2");
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Subdivision Control" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();

  await expect(page.getByRole("heading", { name: "Subdivision Control" })).toBeVisible();
  await expect(page.locator(".cv2-beat-parts span")).toHaveCount(8);
  await page.getByRole("button", { name: "Triplet" }).click();
  await expect(page.locator(".cv2-beat-parts span")).toHaveCount(12);
  await page.getByRole("button", { name: "Sixteenth" }).click();
  await expect(page.locator(".cv2-beat-parts span")).toHaveCount(16);
  await page.getByRole("button", { name: "Quarter" }).click();
  await expect(page.locator(".cv2-beat-parts span")).toHaveCount(4);
  await page.getByRole("button", { name: /Play metronome/ }).click();
  await expect(page.getByRole("button", { name: /Stop metronome/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: /Stop metronome/ }).click();
  await expect(page.getByRole("button", { name: /Play metronome/ })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.getByRole("button", { name: "Applications" }).click();
  await expect(page.locator(".cv2-application-grid button")).toHaveCount(5);
  await page.getByRole("button", { name: "Connections" }).click();
  await expect(page.locator(".cv2-connections li")).toHaveCount(10);
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A-R1 restores the C-major degree explorer and full draft dictionary", async ({
  page,
}) => {
  await page.goto("/prototype/codex-v2");
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Scale-Degree Recognition" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();

  await expect(page.locator(".cv2-degree-list button")).toHaveCount(7);
  await page.locator(".cv2-degree-list button").nth(4).click();
  await expect(page.locator(".cv2-reference-detail")).toContainText("Degree 5 · G");
  await page.getByRole("button", { name: "Connections" }).click();
  await expect(page.locator(".cv2-connections li")).toHaveCount(7);
  await page
    .getByRole("button", { name: /Library/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Music Dictionary" }).click();
  await expect(page.getByText("178 preview terms")).toBeVisible();
  await page.getByLabel("Find a term").fill("tonic");
  await expect(page.getByRole("button", { name: "Tonic", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A-R3 enables the previously unavailable Scale-Degree lessons", async ({ page }) => {
  await page.goto("/prototype/codex-v2");
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Scale-Degree Recognition" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  const application = page.getByRole("combobox", { name: "Musical application" });

  await page.getByRole("button", { name: "Foundational", exact: true }).click();
  await expect(page.locator(".cv2-availability-note")).toHaveText(
    "All 5 applications include foundational lessons.",
  );
  await expect(application.locator('option[value="improvisation"]')).not.toHaveAttribute(
    "disabled",
  );
  await application.selectOption("improvisation");
  await expect(page.locator(".cv2-modules .cv2-module").first().locator("summary")).toContainText(
    "Answer the tonic with three notes",
  );

  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await expect(application).toHaveValue("improvisation");
  await application.selectOption("theory");
  const advancedTheory = page.locator(".cv2-modules .cv2-module").first();
  await expect(advancedTheory.locator("summary")).toContainText(
    "Hear temporary tonicization without losing the key",
  );
  await expect(advancedTheory.locator(".cv2-module-chevron")).toBeVisible();
  await advancedTheory.locator("summary").click();
  await expect(advancedTheory).toHaveAttribute("open");
  await expect(advancedTheory).toContainText("F♯");
  await advancedTheory.locator("summary").click();
  await expect(advancedTheory).not.toHaveAttribute("open");

  await page.getByRole("button", { name: "Applications", exact: true }).click();
  await expect(page.locator(".cv2-application-grid")).toContainText("Theory & function");
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A-R3 exposes newly written Triad and Subdivision lessons", async ({ page }) => {
  await page.goto("/prototype/codex-v2");
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Triad Construction" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  const triadApp = page.getByRole("combobox", { name: "Musical application" });
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await expect(triadApp.locator('option[value="theory"]')).not.toHaveAttribute("disabled");
  await triadApp.selectOption("theory");
  await expect(page.locator(".cv2-modules summary")).toContainText(
    "Construct diminished and augmented triads by interval",
  );
  await triadApp.selectOption("aural");
  await expect(page.locator(".cv2-modules summary")).toContainText(
    "Hear individual voices between neighboring triads",
  );
  await page.getByRole("button", { name: "Intermediate", exact: true }).click();
  await triadApp.selectOption("composition");
  await expect(page.locator(".cv2-modules summary")).toContainText(
    "Arrange four triads with a connected top voice",
  );

  await page
    .getByRole("button", { name: /Library/ })
    .first()
    .click();
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Subdivision Control" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  await page.getByRole("button", { name: "Intermediate", exact: true }).click();
  const rhythmApp = page.getByRole("combobox", { name: "Musical application" });
  await expect(rhythmApp.locator('option[value="composition"]')).not.toHaveAttribute("disabled");
  await rhythmApp.selectOption("composition");
  await expect(page.locator(".cv2-modules summary")).toContainText(
    "Compose a two-bar response with rests and offbeats",
  );
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A-R1 maintains the overview's combined width across desktop sections", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop width comparison");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/prototype/codex-v2");
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Subdivision Control" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();

  const overview = page.locator(".cv2-overview-grid");
  await expect(overview).toBeVisible();
  const overviewWidth = await overview.evaluate((node) => node.getBoundingClientRect().width);
  expect(overviewWidth).toBeGreaterThan(700);

  for (const name of ["Lessons", "How to Explore", "Applications", "Connections"]) {
    await page.getByRole("button", { name, exact: true }).click();
    const content = page.locator(".cv2-section-frame > .cv2-reading-panel");
    await expect(content).toBeVisible();
    const width = await content.evaluate((node) => node.getBoundingClientRect().width);
    expect(Math.abs(width - overviewWidth)).toBeLessThanOrEqual(2);
  }
  await expectNoHorizontalOverflow(page);
});
