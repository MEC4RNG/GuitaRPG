import { expect, test } from "@playwright/test";

test("renders a truthful launch-facing Home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TURN PRACTICE INTO A QUEST." })).toBeVisible();
  await expect(page.getByText("PRACTICE · PROGRESS · ADAPT").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Generate Quest" })).toHaveAttribute(
    "href",
    "/generate",
  );
  await expect(page.getByRole("link", { name: "Recommended Training" })).toHaveAttribute(
    "href",
    "/training",
  );
  await expect(page.getByRole("link", { name: "Open Skills" })).toHaveAttribute("href", "/skills");
  await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
});
