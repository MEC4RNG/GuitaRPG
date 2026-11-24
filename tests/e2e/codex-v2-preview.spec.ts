import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalOverflow } from "./helpers/accessibility";
import { completeGuestOnboarding } from "./helpers/player-flow";

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

test("MEC-R12 restores safe Codex Lesson and How to Explore Workbook actions", async ({ page }) => {
  await page.goto("/prototype/codex-v2?skill=note_location");
  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  const lesson = page.locator(".cv2-modules .cv2-module").first();
  await lesson.locator("summary").click();
  await expect(lesson.getByRole("link", { name: "Practice in Workbook" })).toHaveAttribute(
    "href",
    /\/workbooks\?codex_module=nl\.[a-z]+\.[fia]1/,
  );

  await page.getByRole("button", { name: "How to Explore" }).click();
  const explore = page.locator(".cv2-explore-module").first();
  await explore.locator("summary").click();
  await expect(explore.getByRole("link", { name: "Practice in Workbook" })).toHaveAttribute(
    "href",
    /\/workbooks\?codex_module=nl\.[a-z]+\.[fia]1/,
  );
  await expectNoHorizontalOverflow(page);
});

test("MEC-R12 explicitly creates a private Codex lesson page only after confirmation", async ({
  page,
}) => {
  await completeGuestOnboarding(page);
  await page.goto("/prototype/codex-v2?skill=scale_degree_recognition");
  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  const lesson = page.locator(".cv2-modules .cv2-module").first();
  await lesson.locator("summary").click();
  await lesson.getByRole("link", { name: "Practice in Workbook" }).click();
  await expect(page).toHaveURL(/\/workbooks\?codex_module=sdr\.aural\.f1/);
  await expect(page.getByRole("heading", { name: "Workbooks" })).toBeVisible();
  await expect(page.locator("#workbook-lesson-title")).toHaveText("Hear the tonal home");
  await expect(page.getByRole("button", { name: /^Open existing:/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Create new Workbook from lesson" }).click();
  await expect(page.locator(".workbook-library__message")).toContainText(
    "Lesson page created in your Workbook.",
  );
  await expect(page.getByLabel("Page title")).toHaveValue("Hear the tonal home");
  await page.reload();
  await expect(page.getByRole("button", { name: /^Open existing:/ })).toHaveCount(1);
  await page.getByRole("button", { name: /^Open existing:/ }).click();
  await expect(page.getByRole("textbox", { name: "Workbook page document" })).toContainText(
    "Find home",
  );
  await expectNoHorizontalOverflow(page);
});

test("MEC-R12 rejects unknown Codex workbook source IDs", async ({ page }) => {
  const response = await page.request.get("/workbooks?codex_module=not-a-real-module");
  expect(response.status()).toBe(404);
});

test("R9-R1 browser Back and Forward restore Library, Skill, and Dictionary views", async ({
  page,
}) => {
  await page.goto("/prototype/codex-v2");
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Note Location" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  await expect(page).toHaveURL(/\/prototype\/codex-v2\?skill=note_location$/);
  await expect(page.getByRole("heading", { name: "Note Location" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/prototype\/codex-v2$/);
  await expect(page.locator(".cv2-card")).toHaveCount(9);
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Note Location" })).toBeVisible();

  await page.getByRole("button", { name: "← Library" }).click();
  await expect(page).toHaveURL(/\/prototype\/codex-v2$/);
  await page.getByRole("button", { name: "Music Dictionary" }).click();
  await expect(page).toHaveURL(/\?dictionary=1$/);
  await page.getByRole("button", { name: "Tonic", exact: true }).click();
  await expect(page).toHaveURL(/dictionary=1&term=vocab%3Atonic$/);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Music Dictionary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tonic" })).toHaveCount(0);
  await page.goBack();
  await expect(page.locator(".cv2-card")).toHaveCount(9);

  await page.goto("/prototype/codex-v2?skill=scale_mapping");
  await expect(page.getByRole("heading", { name: "Scale Mapping" })).toBeVisible();
  await page.getByRole("button", { name: "← Library" }).click();
  await expect(page.locator(".cv2-card")).toHaveCount(9);
  await expect(page).toHaveURL(/\/prototype\/codex-v2$/);
});

test("R9-R1 mobile landscape shows open strings and frets 1–12 without scrolling", async ({
  page,
}) => {
  for (const width of [844, 740, 568]) {
    await page.setViewportSize({ width, height: width === 568 ? 320 : 390 });
    await page.goto("/prototype/codex-v2");
    await page
      .locator(".cv2-card")
      .filter({ hasText: "Note Location" })
      .getByRole("button", { name: /Explore this Skill/ })
      .click();
    const fretboard = page.locator(".cv2-fretboard-interactive");
    const scroller = fretboard.locator(".cv2-fretboard-scroll");
    await expect(scroller).toBeVisible();
    const geometry = await scroller.evaluate((node) => {
      const finalFret = node.querySelector("thead th:last-child");
      if (!finalFret) throw new Error("Missing fret 12 column");
      const bounds = node.getBoundingClientRect();
      const last = finalFret.getBoundingClientRect();
      return {
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth,
        lastRight: last.right,
        scrollerRight: bounds.right,
      };
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 2);
    expect(geometry.lastRight).toBeLessThanOrEqual(geometry.scrollerRight + 2);
    await expect(scroller.locator("thead th:last-child")).toHaveText("12");
    await expect(fretboard.locator(".cv2-fretboard-cell")).toHaveCount(78);
    await expectNoHorizontalOverflow(page);
  }

  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/prototype/codex-v2");
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Note Location" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  const scroller = page.locator(".cv2-fretboard-scroll");
  const portrait = await scroller.evaluate((node) => ({
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
  }));
  expect(portrait.scrollWidth).toBeGreaterThan(portrait.clientWidth);
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
  await expect(minorScale.locator("summary")).toContainText("Re-map A natural and harmonic minor");
  await minorScale.locator("summary").click();
  await expect(minorScale).toContainText("G♯");
  await page.getByRole("button", { name: "How to Explore" }).click();
  const explore = page.locator(".cv2-explore-module").first();
  await expect(explore.locator(".cv2-module-chevron")).toBeVisible();
  await explore.locator("summary").click();
  await expect(explore).toHaveAttribute("open");
  await page.getByRole("button", { name: "Connections" }).click();
  await expect(page.locator(".cv2-connections li")).toHaveCount(4);

  await page
    .getByRole("button", { name: /Library/ })
    .first()
    .click();
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

test("CODEX-V2-A-R9 finds real pitches across standard tuning and DADGAD", async ({ page }) => {
  await page.goto("/prototype/codex-v2");
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Note Location" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();

  const fretboard = page.locator(".cv2-fretboard-interactive");
  await expect(fretboard).toBeVisible();
  await expect(fretboard.locator(".cv2-fretboard-cell")).toHaveCount(78);
  await expect(fretboard.locator(".cv2-reference-detail")).toContainText("C occurs at");
  const firstC = fretboard.getByRole("button", {
    name: "String 2, fret 1, C4",
  });
  await expect(firstC).toHaveClass(/is-highlight/);
  await firstC.focus();
  await page.keyboard.press("ArrowRight");
  const sharp = fretboard.getByRole("button", { name: "String 2, fret 2, C♯4" });
  await expect(sharp).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(fretboard.getByRole("combobox", { name: "Find note" })).toHaveValue("C♯");
  await expect(fretboard.locator(".cv2-reference-detail")).toContainText(
    "Selected C♯4 on string 2, fret 2",
  );

  await fretboard.getByRole("combobox", { name: "Find note" }).selectOption("C");
  await fretboard.getByRole("combobox", { name: "Guitar tuning" }).selectOption("dadgad");
  await expect(fretboard.getByRole("button", { name: "String 2, fret 3, C4" })).toHaveClass(
    /is-highlight/,
  );
  await expect(fretboard.locator(".cv2-fretboard-table")).toContainText("2 · A3");
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A-R9 spells and locates scale degrees across keys and tunings", async ({ page }) => {
  await page.goto("/prototype/codex-v2");
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Scale Mapping" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  const fretboard = page.locator(".cv2-fretboard-interactive");
  await expect(fretboard).toBeVisible();
  await expect(fretboard.locator(".cv2-fretboard-degree-line")).toContainText(
    "C · D · E · F · G · A · B",
  );
  await fretboard.getByRole("combobox", { name: "Tonic" }).selectOption("G");
  await expect(fretboard.locator(".cv2-fretboard-degree-line")).toContainText("F♯");
  await fretboard.getByRole("button", { name: "String 1, fret 2, F♯4, scale degree 7" }).click();
  await expect(fretboard.locator(".cv2-reference-detail")).toContainText("Degree 7: F♯");

  await fretboard.getByRole("combobox", { name: "Tonic" }).selectOption("C♯");
  await expect(fretboard.locator(".cv2-fretboard-degree-line")).toContainText("E♯");
  await expect(fretboard.locator(".cv2-fretboard-degree-line")).toContainText("B♯");
  await fretboard.getByRole("combobox", { name: "Tonic" }).selectOption("A");
  await fretboard.getByRole("combobox", { name: "Scale type" }).selectOption("harmonic_minor");
  await expect(fretboard.locator(".cv2-fretboard-degree-line")).toContainText(
    "A · B · C · D · E · F · G♯",
  );
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A-R9 distinguishes interval spelling and exact sounding octave", async ({
  page,
}) => {
  await page.goto("/prototype/codex-v2");
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Interval Recognition" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  const fretboard = page.locator(".cv2-fretboard-interactive");
  await expect(fretboard).toBeVisible();
  await expect(fretboard.locator(".cv2-reference-detail")).toContainText(
    "C4 + major third (4 semitones) = E4",
  );
  const interval = fretboard.getByRole("combobox", { name: "Ascending interval" });
  await interval.selectOption("A4");
  await expect(fretboard.locator(".cv2-reference-detail")).toContainText("F♯4");
  await interval.selectOption("d5");
  await expect(fretboard.locator(".cv2-reference-detail")).toContainText("G♭4");
  await expect(fretboard.locator(".cv2-fretboard-cell.is-destination").first()).toHaveAttribute(
    "aria-label",
    /G♭4.*exact interval destination/,
  );
  await interval.selectOption("P8");
  await fretboard.getByRole("button", { name: "String 5, fret 3, C3" }).click();
  await expect(fretboard.locator(".cv2-reference-detail")).toContainText(
    "C3 + perfect octave (12 semitones) = C4",
  );
  await expect(fretboard.locator(".cv2-fretboard-cell.is-destination")).not.toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A-R9 keeps phone-width overflow within the fretboard and supports touch", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/prototype/codex-v2");
  await page
    .locator(".cv2-card")
    .filter({ hasText: "Note Location" })
    .getByRole("button", { name: /Explore this Skill/ })
    .click();
  const scroller = page.locator(".cv2-fretboard-scroll");
  await expect(scroller).toBeVisible();
  const sizing = await scroller.evaluate((node) => ({
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
  }));
  expect(sizing.scrollWidth).toBeGreaterThan(sizing.clientWidth);
  await expectNoHorizontalOverflow(page);
  await page.locator(".cv2-fretboard-cell.is-highlight").first().click();
  await expect(page.locator(".cv2-reference-detail")).toContainText("Selected");
});

test("R10 chord inversions come from actual sounding bass and correct guitar frets", async ({
  page,
}) => {
  await page.goto("/prototype/codex-v2?skill=chord_inversion_navigation");
  await expect(page.getByRole("heading", { name: "Chord Inversion Navigation" })).toBeVisible();

  const explorer = page.locator(".cv2-chord-engine");
  await expect(explorer.getByRole("heading", { name: "Chord inversion explorer" })).toBeVisible();
  await expect(explorer.getByRole("combobox", { name: "Chord root" })).toHaveValue("C");
  await expect(explorer.getByRole("combobox", { name: "Chord quality" })).toHaveValue("major");
  await expect(explorer.locator(".cv2-chord-tone-line")).toContainText("C (root)");
  await expect(explorer.locator(".cv2-chord-tone-line")).toContainText("E (third)");
  await expect(explorer.locator(".cv2-chord-card")).toContainText("C4 · E4 · G4");
  await expect(explorer.locator(".cv2-chord-card svg")).toHaveAccessibleName(/Root position/);

  await explorer.getByRole("combobox", { name: "Chord inversion" }).selectOption("first");
  await expect(explorer.locator(".cv2-chord-card")).toContainText("First inversion");
  await expect(explorer.locator(".cv2-chord-card")).toContainText("E4 · G4 · C5");
  await explorer.getByRole("combobox", { name: "Chord inversion" }).selectOption("second");
  await expect(explorer.locator(".cv2-chord-card")).toContainText("G3 · C4 · E4");

  await explorer.getByRole("combobox", { name: "Chord quality" }).selectOption("minor");
  await expect(explorer.locator(".cv2-chord-tone-line")).toContainText("E♭ (third)");
  await explorer.getByRole("combobox", { name: "Chord root" }).selectOption("C♯");
  await explorer.getByRole("combobox", { name: "Chord quality" }).selectOption("major");
  await expect(explorer.locator(".cv2-chord-tone-line")).toContainText("E♯ (third)");
  await explorer.getByRole("combobox", { name: "Chord guitar tuning" }).selectOption("dadgad");
  await explorer.getByRole("combobox", { name: "Three-string group" }).selectOption("3-5");
  await expect(explorer.locator(".cv2-chord-card")).toHaveCount(1);
  await explorer.getByRole("button", { name: "Hear arpeggio" }).click();
  await expect(explorer.getByRole("status").last()).toContainText(/Played|Audio is unavailable/);
  await expectNoHorizontalOverflow(page);
});

test("R10 voice leading visualizes semitone movement and suggests a connected path", async ({
  page,
}) => {
  await page.goto("/prototype/codex-v2?skill=voice_leading");
  await expect(page.getByRole("heading", { name: "Voice Leading" })).toBeVisible();

  const explorer = page.locator(".cv2-chord-engine");
  await expect(explorer.getByRole("heading", { name: "Voice-leading explorer" })).toBeVisible();
  await expect(explorer.locator(".cv2-chord-card")).toHaveCount(4);
  await expect(explorer.locator(".cv2-chord-motion-total")).toContainText(
    "Total three-voice movement: 9 semitones",
  );
  await expect(explorer.locator(".cv2-chord-motion-table")).toContainText("G4 → A4");
  await expect(explorer.locator(".cv2-chord-motion-table")).toContainText("Up 2 semitones");
  await expect(explorer.locator(".cv2-chord-motion-table")).toContainText("Down 3 semitones");

  await explorer.getByRole("button", { name: "Suggest smaller pitch movement" }).click();
  const optimizedTotal = await explorer.locator(".cv2-chord-motion-total strong").innerText();
  expect(Number(optimizedTotal.replace(/[^0-9]/g, ""))).toBeLessThanOrEqual(9);
  await expect(explorer.getByRole("combobox", { name: "Chord 1 voicing" })).toBeVisible();
  await explorer.getByRole("button", { name: "Restore lesson example" }).click();
  await expect(explorer.locator(".cv2-chord-motion-total")).toContainText("9 semitones");
  await explorer.getByRole("combobox", { name: "Harmonic progression" }).selectOption("c_f_g_c");
  await expect(explorer.locator(".cv2-chord-card")).toHaveCount(4);
  await explorer.getByRole("combobox", { name: "Three-string group" }).selectOption("2-4");
  await expect(explorer.locator(".cv2-chord-motion-table tbody tr")).toHaveCount(3);
  await explorer.getByRole("button", { name: "Hear progression" }).click();
  await expect(explorer.getByRole("status").last()).toContainText(/Played|Audio is unavailable/);
  await expectNoHorizontalOverflow(page);
});

test("R10 chord tool stays inside the phone viewport and retains scroll-free controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/prototype/codex-v2?skill=voice_leading");
  const explorer = page.locator(".cv2-chord-engine");
  await expect(explorer).toBeVisible();
  await expect(explorer.locator(".cv2-chord-card")).toHaveCount(4);
  await expectNoHorizontalOverflow(page);
  await explorer.getByRole("combobox", { name: "Harmonic progression" }).selectOption("g_em_c_d");
  await expect(explorer.locator(".cv2-chord-card")).toHaveCount(4);
  await explorer.getByRole("button", { name: "Suggest smaller pitch movement" }).click();
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 740, height: 390 });
  await expectNoHorizontalOverflow(page);
});

test("R11 arpeggio source uses real chord-tone pitches and editable quarter/eighth patterns", async ({
  page,
}) => {
  await page.goto("/prototype/codex-v2?skill=arpeggio_sequencing");
  await expect(page.getByRole("heading", { name: "Arpeggio Sequencing" })).toBeVisible();
  const sequencer = page.locator(".cv2-arpeggio-engine");
  await expect(sequencer.getByRole("heading", { name: /Arpeggio sequencer/ })).toBeVisible();
  await expect(sequencer.locator(".cv2-arpeggio-source")).toContainText("C4 · E4 · G4");
  await expect(sequencer.locator(".cv2-arpeggio-beats select")).toHaveCount(4);
  await expect(sequencer.getByRole("combobox", { name: "Beat 1, part 1" })).toHaveValue("root");
  await expect(sequencer.getByRole("combobox", { name: "Beat 2, part 1" })).toHaveValue("third");
  await expect(sequencer.getByRole("combobox", { name: "Beat 3, part 1" })).toHaveValue("fifth");
  await expect(sequencer.locator(".cv2-arpeggio-status")).toContainText(
    "4 sounding attacks, 0 rests",
  );

  await sequencer.getByRole("combobox", { name: "Arpeggio subdivision" }).selectOption("eighth");
  await expect(sequencer.locator(".cv2-arpeggio-beats select")).toHaveCount(8);
  await sequencer.getByRole("combobox", { name: "Arpeggio preset" }).selectOption("space");
  await expect(sequencer.locator(".cv2-arpeggio-status")).toContainText("rests");
  await sequencer.getByRole("combobox", { name: "Beat 2, part 2" }).selectOption("rest");
  await expect(sequencer.getByRole("combobox", { name: "Arpeggio preset" })).toHaveValue("custom");

  await sequencer.getByRole("combobox", { name: "Arpeggio inversion" }).selectOption("first");
  await expect(sequencer.locator(".cv2-arpeggio-source")).toContainText("E4 · G4 · C5");
  await sequencer.getByRole("combobox", { name: "Arpeggio preset" }).selectOption("arch");
  await expect(sequencer.locator(".cv2-arpeggio-beat").first()).toContainText("C5");
  await sequencer.getByRole("combobox", { name: "Arpeggio quality" }).selectOption("minor");
  await expect(sequencer.locator(".cv2-arpeggio-source")).toContainText("E♭");
  await sequencer.getByRole("combobox", { name: "Arpeggio root" }).selectOption("C♯");
  await sequencer.getByRole("combobox", { name: "Arpeggio quality" }).selectOption("major");
  await expect(sequencer.locator(".cv2-arpeggio-source")).toContainText("E♯");
  await expectNoHorizontalOverflow(page);
});

test("R11 metrical subdivisions keep a 4/4 quarter-note pulse and a controllable bar", async ({
  page,
}) => {
  await page.goto("/prototype/codex-v2?skill=arpeggio_sequencing");
  const sequencer = page.locator(".cv2-arpeggio-engine");
  await sequencer.getByRole("combobox", { name: "Arpeggio subdivision" }).selectOption("triplet");
  await expect(sequencer.locator(".cv2-arpeggio-beats select")).toHaveCount(12);
  await expect(sequencer.locator(".cv2-arpeggio-beat").first()).toContainText("trip");
  await expect(sequencer.locator(".cv2-arpeggio-status")).toContainText("12 sounding attacks");
  await sequencer.getByRole("combobox", { name: "Arpeggio subdivision" }).selectOption("sixteenth");
  await expect(sequencer.locator(".cv2-arpeggio-beats select")).toHaveCount(16);
  await expect(sequencer.locator(".cv2-arpeggio-beat").first()).toContainText("&");
  await sequencer.getByRole("spinbutton", { name: "Arpeggio tempo BPM" }).fill("120");
  await expect(sequencer.getByRole("spinbutton", { name: "Arpeggio tempo BPM" })).toHaveValue(
    "120",
  );
  await expect(sequencer.locator(".cv2-arpeggio-status")).toContainText("2.00 seconds");
  await sequencer.getByRole("checkbox", { name: "Repeat bar until stopped" }).check();
  await sequencer.getByRole("button", { name: "Play bar" }).click();
  await expect(sequencer.locator(".cv2-arpeggio-status")).toContainText(
    /Playing|Audio is unavailable/,
  );
  const stop = sequencer.getByRole("button", { name: /Stop/ });
  if (await stop.isEnabled()) {
    await stop.click();
    await expect(sequencer.locator(".cv2-arpeggio-status")).toContainText("Stopped");
  }
  await sequencer.getByRole("checkbox", { name: "Repeat bar until stopped" }).uncheck();
  await expect(sequencer.getByRole("button", { name: "Play bar" })).toBeEnabled();
  await expectNoHorizontalOverflow(page);
});

test("R11 arpeggio editor stays inside portrait and mobile-landscape Codex widths", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 720 },
    { width: 740, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/prototype/codex-v2?skill=arpeggio_sequencing");
    const sequencer = page.locator(".cv2-arpeggio-engine");
    await expect(sequencer).toBeVisible();
    await sequencer
      .getByRole("combobox", { name: "Arpeggio subdivision" })
      .selectOption("sixteenth");
    await expect(sequencer.locator(".cv2-arpeggio-beats select")).toHaveCount(16);
    await sequencer.getByRole("combobox", { name: "Arpeggio tuning" }).selectOption("dadgad");
    await sequencer.getByRole("combobox", { name: "Arpeggio string group" }).selectOption("3-5");
    await expect(sequencer.locator(".cv2-arpeggio-source")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
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
