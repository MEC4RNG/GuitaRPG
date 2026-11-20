import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalOverflow } from "./helpers/accessibility";

test("CODEX-V2-A isolated preview keeps navigation and dictionary in place", async ({ page }) => {
  await page.goto("/prototype/codex-v2");
  await expect(page.getByRole("heading", { name: "Explore the musical library." })).toBeVisible();
  await expect(page.locator(".cv2-card")).toHaveCount(3);
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
  await expect(page.locator(".cv2-card")).toHaveCount(3);
  await page.getByLabel("Search Skills").fill("triad");
  await expect(page.locator(".cv2-card")).toHaveCount(1);
  await expectAccessible(page, "Codex V2 library preview");
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A preserves published V1 Skill routes", async ({ page }) => {
  await page.goto("/codex/skills/triad_construction");
  await expect(page.getByRole("heading", { name: "Triad Construction" })).toBeVisible();
  await expect(page.getByText(/trainable ability/i)).toBeVisible();
});


test("CODEX-V2-A-R1 restores the interactive triad reference and complete educational sections", async ({ page }) => {
  await page.goto("/prototype/codex-v2");
  await page.locator(".cv2-card").filter({ hasText: "Triad Construction" })
    .getByRole("button", { name: /Explore this Skill/ }).click();

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
  await expect(page.locator(".cv2-explore-grid .cv2-exercise")).toHaveCount(1);
  await expect(page.locator(".cv2-explore-grid")).toContainText("Check yourself");

  await page.getByRole("button", { name: "Lessons" }).click();
  await expect(page.getByText("6 draft instructional modules")).toBeVisible();
  await expectAccessible(page, "Codex V2 Triad Construction R1");
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A-R1 restores the subdivided metronome and readable beat grids", async ({ page }) => {
  await page.goto("/prototype/codex-v2");
  await page.locator(".cv2-card").filter({ hasText: "Subdivision Control" })
    .getByRole("button", { name: /Explore this Skill/ }).click();

  await expect(page.getByRole("heading", { name: "Subdivision Control" })).toBeVisible();
  await expect(page.locator(".cv2-beat-parts span")).toHaveCount(8);
  await page.getByRole("button", { name: "Triplet" }).click();
  await expect(page.locator(".cv2-beat-parts span")).toHaveCount(12);
  await page.getByRole("button", { name: "Sixteenth" }).click();
  await expect(page.locator(".cv2-beat-parts span")).toHaveCount(16);
  await page.getByRole("button", { name: "Quarter" }).click();
  await expect(page.locator(".cv2-beat-parts span")).toHaveCount(4);
  await page.getByRole("button", { name: /Play metronome/ }).click();
  await expect(page.getByRole("button", { name: /Stop metronome/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Stop metronome/ }).click();
  await expect(page.getByRole("button", { name: /Play metronome/ })).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("button", { name: "Applications" }).click();
  await expect(page.locator(".cv2-application-grid button")).toHaveCount(5);
  await page.getByRole("button", { name: "Connections" }).click();
  await expect(page.locator(".cv2-connections li")).toHaveCount(10);
  await expectNoHorizontalOverflow(page);
});

test("CODEX-V2-A-R1 restores the C-major degree explorer and full draft dictionary", async ({ page }) => {
  await page.goto("/prototype/codex-v2");
  await page.locator(".cv2-card").filter({ hasText: "Scale-Degree Recognition" })
    .getByRole("button", { name: /Explore this Skill/ }).click();

  await expect(page.locator(".cv2-degree-list button")).toHaveCount(7);
  await page.locator(".cv2-degree-list button").nth(4).click();
  await expect(page.locator(".cv2-reference-detail")).toContainText("Degree 5 · G");
  await page.getByRole("button", { name: "Connections" }).click();
  await expect(page.locator(".cv2-connections li")).toHaveCount(7);
  await page.getByRole("button", { name: /Library/ }).first().click();
  await page.getByRole("button", { name: "Music Dictionary" }).click();
  await expect(page.getByText("178 preview terms")).toBeVisible();
  await page.getByLabel("Find a term").fill("tonic");
  await expect(page.getByRole("button", { name: "Tonic", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
