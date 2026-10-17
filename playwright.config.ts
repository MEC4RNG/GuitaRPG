import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3000);
const externalBaseURL = process.env.E2E_BASE_URL;
const baseURL = externalBaseURL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["line"]] : "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: process.env.CI ? "chrome" : undefined },
    },
    {
      name: "mobile-chromium",
      testMatch: [
        "**/core-loop.spec.ts",
        "**/phase5-launch-package.spec.ts",
        "**/quest-journey.spec.ts",
        "**/quest-library.spec.ts",
        "**/recoverable-identity.spec.ts",
      ],
      use: { ...devices["Pixel 7"], channel: process.env.CI ? "chrome" : undefined },
    },
    {
      name: "firefox",
      testMatch: [
        "**/browser-compatibility.spec.ts",
        "**/quest-journey.spec.ts",
        "**/quest-library.spec.ts",
      ],
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testMatch: [
        "**/browser-compatibility.spec.ts",
        "**/quest-journey.spec.ts",
        "**/quest-library.spec.ts",
      ],
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "small-phone",
      testMatch: ["**/responsive.spec.ts", "**/quest-journey.spec.ts", "**/quest-library.spec.ts"],
      use: { browserName: "chromium", viewport: { width: 320, height: 700 } },
    },
    {
      name: "tablet",
      testMatch: ["**/responsive.spec.ts", "**/quest-journey.spec.ts", "**/quest-library.spec.ts"],
      use: { ...devices["iPad (gen 7)"] },
    },
    {
      name: "mobile-webkit",
      testMatch: ["**/responsive.spec.ts", "**/quest-journey.spec.ts", "**/quest-library.spec.ts"],
      use: { ...devices["iPhone 15"] },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: `npm run start -- -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
});
