import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("UX-003 production progression surfaces", () => {
  it("replaces both placeholders with production progression components", () => {
    expect(read("app/character/page.tsx")).toContain("CharacterProgressionSurface");
    expect(read("app/skills/page.tsx")).toContain("SkillsProgressionSurface");
    expect(read("app/character/page.tsx")).not.toContain("FoundationPage");
    expect(read("app/skills/page.tsx")).not.toContain("FoundationPage");
  });

  it("keeps Character semantics explicit and provides empty, loading, error, and retry states", () => {
    const source = read("components/character-progression-surface.tsx");
    expect(source).toContain("not an overall rating of your guitar ability");
    expect(source).toContain("RECORDED MEANINGFUL PRACTICE");
    expect(source).toContain("Evidence is not yet broad enough");
    expect(source).toContain("Generate a Quest");
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('role="alert"');
    expect(source).toContain("Retry");
  });

  it("uses the trusted readiness RPC and never mutates progression projections", () => {
    const repository = read("lib/progression/repository.ts");
    expect(repository).toContain('rpc("refresh_player_readiness")');
    expect(repository).toContain('from("player_character_states")');
    expect(repository).toContain('from("player_attribute_states")');
    expect(repository).toContain('from("player_skill_states")');
    expect(repository).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
    expect(repository).not.toMatch(/service.role|service_role/i);
  });

  it("provides labelled filters and text-labelled non-color Skill states", () => {
    const source = read("components/skills-progression-surface.tsx");
    expect(source).toContain("Search Skills");
    expect(source).toContain("Assessment status");
    expect(source).toContain("System confidence");
    expect(source).toContain("Current readiness");
    expect(source).toContain("Practice exposures");
    expect(source).toContain("Informative evidence");
    expect(source).toContain("No recorded practice");
    expect(source).toContain("No evidence yet");
  });
});
