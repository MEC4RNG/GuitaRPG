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
      status: 503,
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
