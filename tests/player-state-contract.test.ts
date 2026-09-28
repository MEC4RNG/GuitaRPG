import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type SkillState = {
  assessment_status: string;
  visible_level: string | null;
  proficiency_score: number | null;
  confidence_score: number;
  readiness_status: string;
  readiness_score: number | null;
  exposure_count: number;
  evidence_count: number;
};

type Contract = {
  skill_assessment_statuses: string[];
  visible_skill_levels: string[];
  readiness_statuses: string[];
  attribute_statuses: string[];
  invariants: {
    unrated_visible_level: null;
    unrated_proficiency_score: null;
    unrated_readiness_status: string;
    new_character_level: number;
    new_practice_xp: number;
    proficiency_score_range: [number, number];
    confidence_score_range: [number, number];
    readiness_score_range: [number, number];
    xp_can_directly_promote_skill: boolean;
    inactivity_can_directly_lower_proficiency: boolean;
    concepts_receive_direct_proficiency: boolean;
    contexts_receive_direct_proficiency: boolean;
    constraints_receive_direct_proficiency: boolean;
    skills_are_duplicated_by_tuning: boolean;
  };
  representative_states: Array<{
    id: string;
    character?: { level: number; practice_xp: number };
    skill?: SkillState;
    attributes?: { status: string; score: number | null };
    tuning_preferences?: Array<{ context_slug: string; is_default: boolean; rank: number }>;
    skill_states_per_canonical_skill?: number;
  }>;
};

const root = resolve(import.meta.dirname, "..");
const contract = JSON.parse(
  readFileSync(resolve(root, "domain/player/player-state-contract.json"), "utf8"),
) as Contract;

describe("PLY-001 player state contract", () => {
  it("keeps UNRATED distinct from Level I", () => {
    const state = contract.representative_states.find((item) => item.id === "new_player");
    expect(state?.skill?.assessment_status).toBe("UNRATED");
    expect(state?.skill?.visible_level).toBeNull();
    expect(state?.skill?.proficiency_score).toBeNull();
    expect(state?.skill?.readiness_status).toBe("UNKNOWN");
    expect(contract.visible_skill_levels).toContain("I");
  });

  it("does not grant proficiency from declared experience alone", () => {
    const state = contract.representative_states.find(
      (item) => item.id === "experienced_uncalibrated",
    );
    expect(state?.skill?.assessment_status).toBe("UNRATED");
    expect(state?.skill?.visible_level).toBeNull();
  });

  it("supports provisional estimated levels", () => {
    const state = contract.representative_states.find((item) => item.id === "calibrated_estimate");
    expect(state?.skill?.assessment_status).toBe("ESTIMATED");
    expect(contract.visible_skill_levels).toContain(state?.skill?.visible_level);
    expect(state?.skill?.confidence_score ?? 100).toBeLessThan(50);
  });

  it("separates stale readiness from established proficiency", () => {
    const state = contract.representative_states.find((item) => item.id === "stale_established");
    expect(state?.skill?.assessment_status).toBe("ESTABLISHED");
    expect(state?.skill?.visible_level).toBe("III");
    expect(state?.skill?.readiness_status).toBe("LOW");
    expect(contract.invariants.inactivity_can_directly_lower_proficiency).toBe(false);
  });

  it("supports multiple tunings without duplicating Skill identity", () => {
    const state = contract.representative_states.find((item) => item.id === "multi_tuning");
    expect(state?.tuning_preferences).toHaveLength(2);
    expect(state?.tuning_preferences?.filter((item) => item.is_default)).toHaveLength(1);
    expect(state?.skill_states_per_canonical_skill).toBe(1);
    expect(contract.invariants.skills_are_duplicated_by_tuning).toBe(false);
  });

  it("keeps progression authority boundaries explicit", () => {
    expect(contract.invariants.xp_can_directly_promote_skill).toBe(false);
    expect(contract.invariants.concepts_receive_direct_proficiency).toBe(false);
    expect(contract.invariants.contexts_receive_direct_proficiency).toBe(false);
    expect(contract.invariants.constraints_receive_direct_proficiency).toBe(false);
  });

  it("uses bounded internal scores only for rated/derived dimensions", () => {
    const [pMin, pMax] = contract.invariants.proficiency_score_range;
    const [cMin, cMax] = contract.invariants.confidence_score_range;
    const [rMin, rMax] = contract.invariants.readiness_score_range;

    for (const item of contract.representative_states) {
      if (!item.skill) continue;

      if (item.skill.proficiency_score !== null) {
        expect(item.skill.proficiency_score).toBeGreaterThanOrEqual(pMin);
        expect(item.skill.proficiency_score).toBeLessThanOrEqual(pMax);
      }

      expect(item.skill.confidence_score).toBeGreaterThanOrEqual(cMin);
      expect(item.skill.confidence_score).toBeLessThanOrEqual(cMax);

      if (item.skill.readiness_score !== null) {
        expect(item.skill.readiness_score).toBeGreaterThanOrEqual(rMin);
        expect(item.skill.readiness_score).toBeLessThanOrEqual(rMax);
      }
    }
  });
});
