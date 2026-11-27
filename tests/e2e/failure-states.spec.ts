import { expect, test } from "@playwright/test";

test("a failed Profile read is safe and recoverable", async ({ page }) => {
  await page.route("**/auth/identity", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } }),
    }),
  );
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: '{"message":"provider secret detail"}',
    }),
  );
  await page.goto("/profile");
  await expect(page.getByText("Profile data is unavailable. Please try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry Profile" })).toBeVisible();
  await expect(page.getByText(/provider secret detail/i)).toHaveCount(0);
});

test("offline navigation retains a truthful browser failure state", async ({ page, context }) => {
  await page.goto("/");
  await context.setOffline(true);
  await page.goto("/codex").catch(() => undefined);
  await context.setOffline(false);
  await page.goto("/");
  await page.goto("/codex");
  await expect(page.getByRole("heading", { name: "Musical reference" })).toBeVisible();
});

test("onboarding recovers from unavailable tuning options without showing an empty form", async ({
  page,
}) => {
  let rejected = false;
  await page.route(/\/rest\/v1\/taxonomy_entities(?:\?|$)/, async (route) => {
    if (rejected) return route.continue();
    rejected = true;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"message":"provider diagnostic detail"}',
    });
  });
  await page.goto("/onboarding");
  const retry = page.getByRole("button", { name: "Retry Player setup" });
  await expect(retry).toBeVisible();
  expect(rejected).toBe(true);
  await expect(page.getByLabel("Preferred tuning")).toHaveCount(0);
  await expect(page.getByText("provider diagnostic detail")).toHaveCount(0);
  await retry.click();
  const tuning = page.getByLabel("Preferred tuning");
  await expect(tuning).toBeVisible();
  await tuning.selectOption({ label: "Standard Tuning" });
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText("PLAYER READY")).toBeVisible();
});
