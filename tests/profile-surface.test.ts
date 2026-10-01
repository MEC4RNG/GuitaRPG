import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("components/profile-surface.tsx", "utf8");

describe("PLY-003 Profile surface", () => {
  it("exposes the bounded editable Profile and truthful lifecycle states", () => {
    for (const label of [
      "Display name (optional)",
      "Experience background",
      "Typical session length (minutes)",
      "Challenge preference",
      "Default tuning",
      "PRACTICE GOALS",
      "Save Profile",
      "Access your Player",
      "Continue setup",
    ])
      expect(source).toContain(label);
  });

  it("supports the three goal kinds without exposing priority controls", () => {
    expect(source).toContain('value="SKILL"');
    expect(source).toContain('value="DOMAIN"');
    expect(source).toContain('value="OBJECTIVE"');
    expect(source).toContain("Remove goal");
    expect(source).toContain("Add goal");
    expect(source).not.toContain("Goal priority");
    expect(source).not.toContain('name="priority"');
  });

  it("keeps progression and Training semantics explicit", () => {
    expect(source).toMatch(/does not change Skill\s+ranking/);
    expect(source).toMatch(/do not affect Training priority/);
    expect(source).toMatch(/never grant XP, proficiency, confidence, readiness/);
  });
});
