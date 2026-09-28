import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("ONB-001 onboarding foundation", () => {
  const flow = read("components/onboarding-flow.tsx");

  it("uses the existing Player profile lifecycle without writing derived state", () => {
    expect(flow).toContain('onboarding_status: "IN_PROGRESS"');
    expect(flow).toContain('onboarding_status: "COMPLETE"');
    expect(flow).toContain("calibration_status: calibration");
    expect(flow).toContain("player_tuning_preferences");
    expect(flow).toContain("player_goals");
    expect(flow).not.toContain("player_skill_states");
    expect(flow).not.toContain("player_character_states");
    expect(flow).not.toContain("player_attribute_states");
  });

  it("keeps calibration optional and honest about unrated Skills", () => {
    expect(flow).toContain('"SKIPPED" | "IN_PROGRESS"');
    expect(flow).toContain("Skip for now — keep every Skill UNRATED");
    expect(flow).toContain("without inventing a rating now");
  });

  it("uses anonymous Auth rather than a local-only guest profile", () => {
    expect(flow).toContain("signInAnonymously");
    expect(flow).toContain("player_id: playerId");
  });
});
