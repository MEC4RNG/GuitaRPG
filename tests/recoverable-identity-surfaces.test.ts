import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const panel = readFileSync("components/account-recovery-panel.tsx", "utf8");
const onboarding = readFileSync("components/onboarding-flow.tsx", "utf8");
const profile = readFileSync("components/profile-surface.tsx", "utf8");

describe("DATA-003 account and guest-safety surfaces", () => {
  it("shows guest warning/protection and never exposes guest Sign Out", () => {
    expect(panel).toContain("GUEST PLAYER");
    expect(panel).toContain("Protect your progress");
    expect(panel).toContain("Continue as guest");
    expect(panel).toContain('identity.status === "GUEST"');
    expect(panel.indexOf("Sign out")).toBeGreaterThan(panel.indexOf('status === "GUEST"'));
  });

  it("shows a verified recoverable account and bounded permanent sign-out", () => {
    expect(panel).toContain("PROTECTED ACCOUNT");
    expect(panel).toContain("Protected / recoverable account");
    expect(panel).toContain("Linked email:");
    expect(panel).toContain("Sign out");
  });

  it("offers returning sign-in and new guest setup without auto-creating an account", () => {
    expect(panel).toContain("Return to a protected Player");
    expect(panel).toContain("Email me a sign-in link");
    expect(panel).toContain("Start a new guest Player");
    expect(panel).not.toContain("signInAnonymously");
  });

  it("places account truth in onboarding completion and Profile", () => {
    expect(onboarding).toContain("<AccountRecoveryPanel onboarding />");
    expect(profile).toContain("<AccountRecoveryPanel />");
    expect(profile).toContain("Access your Player.");
  });
});
