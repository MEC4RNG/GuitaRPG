import { describe, expect, it } from "vitest";

import { safeOnboardingReturnPath } from "@/lib/onboarding/return-path";

describe("onboarding return path", () => {
  it("accepts the Generate route", () => {
    expect(safeOnboardingReturnPath("/generate")).toBe("/generate");
  });

  it.each([undefined, null, "", "https://evil.example", "//evil.example"])(
    "defaults unsafe or missing value %s",
    (value) => {
      expect(safeOnboardingReturnPath(value)).toBe("/");
    },
  );
});
