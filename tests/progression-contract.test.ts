import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type ProgressionContract = {
  xp_policy: {
    practice_xp_per_completed_minute: number;
    outcome_bonus: Record<string, number>;
  };
  proficiency: {
    bands: Record<string, [number, number]>;
    max_absolute_score_delta_per_result: number;
    single_result_can_establish_level_v: boolean;
    single_result_can_establish_from_unrated: boolean;
  };
  establishment: {
    minimum_informative_results: number;
    minimum_distinct_sessions: number;
    minimum_confidence_score: number;
  };
  readiness: {
    default_recency_anchors_days: {
      HIGH_MAX: number;
      MODERATE_MAX: number;
    };
    inactivity_changes_proficiency: boolean;
  };
  attributes: {
    xp_is_input: boolean;
    unrated_skill_treated_as_zero: boolean;
  };
  invariants: Record<string, boolean>;
};

type ProgressionFixture = {
  id: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
};

type Fixtures = {
  cases: ProgressionFixture[];
};

const root = resolve(import.meta.dirname, "..");

const contract = JSON.parse(
  readFileSync(resolve(root, "domain/progression/progression-contract.json"), "utf8"),
) as ProgressionContract;

const fixtures = JSON.parse(
  readFileSync(resolve(root, "domain/progression/phase0-progression-fixtures.json"), "utf8"),
) as Fixtures;

function xpFor(seconds: number, outcome: string) {
  const minutes = Math.floor(seconds / 60);
  return (
    minutes * contract.xp_policy.practice_xp_per_completed_minute +
    contract.xp_policy.outcome_bonus[outcome]
  );
}

describe("PROG-001 progression contract", () => {
  it("awards practice XP for meaningful ATTEMPTED, PARTIAL, and CLEARED results", () => {
    expect(xpFor(600, "ATTEMPTED")).toBe(11);
    expect(xpFor(600, "PARTIAL")).toBe(13);
    expect(xpFor(900, "CLEARED")).toBe(20);
  });

  it("keeps XP and Character Level out of Skill proficiency authority", () => {
    expect(contract.invariants.xp_directly_changes_skill_proficiency).toBe(false);
    expect(contract.invariants.character_level_grants_skill_level).toBe(false);
    expect(contract.invariants.xp_directly_changes_attributes).toBe(false);
  });

  it("prevents single-result mastery inflation", () => {
    expect(contract.proficiency.max_absolute_score_delta_per_result).toBeLessThanOrEqual(8);
    expect(contract.proficiency.single_result_can_establish_level_v).toBe(false);
    expect(contract.proficiency.single_result_can_establish_from_unrated).toBe(false);

    const firstEvidence = fixtures.cases.find((item) => item.id === "PROG-FIX-010");
    expect(firstEvidence?.expected.assessment_status_after).toBe("ESTIMATED");
    expect(firstEvidence?.expected.established_allowed).toBe(false);
  });

  it("requires repeated evidence before ESTABLISHED status", () => {
    expect(contract.establishment.minimum_informative_results).toBeGreaterThanOrEqual(3);
    expect(contract.establishment.minimum_distinct_sessions).toBeGreaterThanOrEqual(2);
    expect(contract.establishment.minimum_confidence_score).toBeGreaterThanOrEqual(60);
  });

  it("treats higher verification confidence as confidence evidence, not a different outcome", () => {
    const self = fixtures.cases.find((item) => item.id === "PROG-FIX-004");
    const verified = fixtures.cases.find((item) => item.id === "PROG-FIX-005");

    expect(self?.expected.outcome_remains).toBe("CLEARED");
    expect(verified?.expected.outcome_remains).toBe("CLEARED");
    expect(self?.expected.proficiency_direction).toBe("POSITIVE");
    expect(verified?.expected.proficiency_direction).toBe("POSITIVE");
    expect(verified?.expected.confidence_delta_class).toBe("HIGHER_THAN_PROG_FIX_004");
  });

  it("values appropriately challenging evidence more than trivial clears", () => {
    const easy = fixtures.cases.find((item) => item.id === "PROG-FIX-006");
    const target = fixtures.cases.find((item) => item.id === "PROG-FIX-007");

    expect(easy?.expected.proficiency_information).toBe("LOW");
    expect(target?.expected.proficiency_information).toBe("HIGHER_THAN_PROG_FIX_006");
  });

  it("does not strongly punish an Overreach non-clear", () => {
    const overreach = fixtures.cases.find((item) => item.id === "PROG-FIX-008");
    expect(overreach?.expected.strong_negative_allowed).toBe(false);
    expect(contract.invariants.overreach_failure_is_strong_negative_evidence).toBe(false);
  });

  it("lets inactivity lower readiness without lowering proficiency", () => {
    const stale = fixtures.cases.find((item) => item.id === "PROG-FIX-011");

    expect(stale?.expected.proficiency_score_after).toBe(
      stale?.input.proficiency_score_before,
    );
    expect(stale?.expected.visible_level_after).toBe(stale?.input.visible_level_before);
    expect(stale?.expected.readiness_status_after).toBe("LOW");
    expect(contract.readiness.inactivity_changes_proficiency).toBe(false);
  });

  it("uses diminishing proficiency information for identical easy repetition while preserving XP", () => {
    const repetition = fixtures.cases.find((item) => item.id === "PROG-FIX-012");

    expect(repetition?.expected.xp_each_session).toBe(15);
    expect(repetition?.expected.proficiency_information_trend).toBe("DIMINISHING");
    expect(contract.invariants.repeated_identical_easy_clears_have_diminishing_information).toBe(
      true,
    );
  });

  it("does not treat missing Attribute evidence as zero", () => {
    const attribute = fixtures.cases.find((item) => item.id === "PROG-FIX-013");

    expect(attribute?.expected.unrated_contribution_is_zero_score).toBe(false);
    expect(contract.attributes.unrated_skill_treated_as_zero).toBe(false);
    expect(contract.attributes.xp_is_input).toBe(false);
  });

  it("preserves core anti-inflation and self-report invariants", () => {
    expect(contract.invariants.clear_equals_mastery).toBe(false);
    expect(contract.invariants.one_clear_can_establish_mastery).toBe(false);
    expect(contract.invariants.self_evidence_is_valid).toBe(true);
    expect(contract.invariants.verification_confidence_changes_outcome).toBe(false);
    expect(contract.invariants.inactivity_directly_lowers_proficiency).toBe(false);
    expect(contract.invariants.abandoned_is_failure_label).toBe(false);
  });
});
