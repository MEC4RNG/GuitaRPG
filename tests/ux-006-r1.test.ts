import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("UX-006-R1 first-run Generate entry", () => {
  it("routes a missing Player through onboarding without generating", () => {
    const generate = read("components/generate-quest-surface.tsx");
    expect(generate).toContain('router.replace("/onboarding?next=/generate")');
    expect(generate).toContain('authError.name !== "AuthSessionMissingError"');
    expect(generate).not.toContain("A Player identity is required before generating a Quest");
    expect(generate).toContain('"Preparing Player…"');
    expect(generate).toContain("disabled={!identityReady || pending !== null}");
  });

  it("shows a truthful identity lookup error", () => {
    expect(read("components/generate-quest-surface.tsx")).toContain(
      "We couldn’t prepare your Player session. Please try again.",
    );
  });

  it("returns completed onboarding to Generate without hiding account protection", () => {
    const onboarding = read("components/onboarding-flow.tsx");
    expect(onboarding).toContain('"Continue to Generate"');
    expect(onboarding).toContain("<AccountRecoveryPanel");
  });
});
