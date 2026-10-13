import { expect, test } from "@playwright/test";

import { expectAccessible } from "./helpers/accessibility";
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
    page.getByRole("link", { name: "GuitaRPG home, Practice operating system" }),
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
