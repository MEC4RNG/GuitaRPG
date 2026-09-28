import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type Outcome = "ABANDONED" | "ATTEMPTED" | "PARTIAL" | "CLEARED";
type CriterionState = "MET" | "NOT_MET" | "UNKNOWN" | "NOT_EVALUATED";

type ResultFixture = {
  id: string;
  quest_slug: string;
  meaningful_attempt: boolean;
  outcome: Outcome;
  required_criteria: string[];
  criterion_results: Record<string, CriterionState>;
  evidence: Array<{
    evidence_id: string;
    criterion: string;
    verification_mode: string;
    criterion_state: CriterionState;
    observed_or_asserted_value: unknown;
    unit: string;
    confidence: string;
    source_authority: string;
    evaluator_version: string | null;
  }>;
  verification_summary: {
    modes_used: string[];
    confidence: string;
  };
};

type EvidenceContract = {
  outcomes: Outcome[];
  criterion_states: CriterionState[];
  verification_modes: string[];
  evidence_confidence: string[];
  result_confidence_summary: string[];
  source_authorities: string[];
  invariants: {
    self_can_support_clear: boolean;
    verification_mode_determines_outcome: boolean;
    session_proves_musical_correctness: boolean;
    audio_proves_physical_technique: boolean;
    direct_audio_proves_physical_technique: boolean;
    app_verified_is_globally_strongest_mode: boolean;
    evidence_confidence_is_criterion_specific: boolean;
    mixed_verification_modes_allowed: boolean;
    mastery_is_result_outcome: boolean;
    result_embeds_proficiency_mutation: boolean;
    result_embeds_xp_mutation: boolean;
    raw_audio_retained_by_default: boolean;
  };
};

type Fixtures = {
  results: ResultFixture[];
};

const root = resolve(import.meta.dirname, "..");

const contract = JSON.parse(
  readFileSync(resolve(root, "domain/evidence/evidence-contract.json"), "utf8"),
) as EvidenceContract;

const fixtures = JSON.parse(
  readFileSync(resolve(root, "domain/evidence/phase0-evidence-fixtures.json"), "utf8"),
) as Fixtures;

describe("EVD-001 completion and evidence contract", () => {
  it("defines exactly the four canonical outcomes", () => {
    expect(contract.outcomes).toEqual(["ABANDONED", "ATTEMPTED", "PARTIAL", "CLEARED"]);
  });

  it("requires every cleared Result to have all required criteria MET", () => {
    for (const result of fixtures.results.filter((item) => item.outcome === "CLEARED")) {
      expect(result.meaningful_attempt, result.id).toBe(true);

      for (const criterion of result.required_criteria) {
        expect(result.criterion_results[criterion], `${result.id}:${criterion}`).toBe("MET");
      }
    }
  });

  it("keeps abandoned attempts below the meaningful-attempt boundary", () => {
    for (const result of fixtures.results.filter((item) => item.outcome === "ABANDONED")) {
      expect(result.meaningful_attempt, result.id).toBe(false);
    }
  });

  it("allows valid SELF evidence to support a cleared Result", () => {
    const selfClear = fixtures.results.find((item) => item.id === "EVD-FIX-005");

    expect(selfClear?.outcome).toBe("CLEARED");
    expect(selfClear?.verification_summary.modes_used).toContain("SELF");
    expect(contract.invariants.self_can_support_clear).toBe(true);
  });

  it("allows APP_VERIFIED evidence on a non-cleared Result", () => {
    const attempted = fixtures.results.find((item) => item.id === "EVD-FIX-004");

    expect(attempted?.outcome).toBe("ATTEMPTED");
    expect(attempted?.verification_summary.modes_used).toContain("APP_VERIFIED");
    expect(contract.invariants.verification_mode_determines_outcome).toBe(false);
  });

  it("preserves UNKNOWN for unsupported audio judgments", () => {
    const audioAttempt = fixtures.results.find((item) => item.id === "EVD-FIX-007");
    const cleanliness = audioAttempt?.evidence.find(
      (item) => item.criterion === "clean_repetitions",
    );

    expect(cleanliness?.verification_mode).toBe("AUDIO_ASSISTED");
    expect(cleanliness?.criterion_state).toBe("UNKNOWN");
    expect(contract.invariants.audio_proves_physical_technique).toBe(false);
  });

  it("supports mixed verification modes in one Result", () => {
    const mixed = fixtures.results.find((item) => item.id === "EVD-FIX-001");

    expect(new Set(mixed?.verification_summary.modes_used).size).toBeGreaterThan(1);
    expect(mixed?.verification_summary.confidence).toBe("MIXED");
    expect(contract.invariants.mixed_verification_modes_allowed).toBe(true);
  });

  it("keeps evidence source authority consistent with verification mode", () => {
    const expectedAuthority: Record<string, string> = {
      SELF: "PLAYER",
      SESSION: "SESSION_SYSTEM",
      AUDIO_ASSISTED: "AUDIO_ANALYZER",
      DIRECT_AUDIO: "DIRECT_AUDIO_ANALYZER",
      APP_VERIFIED: "APP_GRADER",
    };

    for (const result of fixtures.results) {
      for (const evidence of result.evidence) {
        expect(contract.verification_modes, evidence.evidence_id).toContain(
          evidence.verification_mode,
        );
        expect(contract.evidence_confidence, evidence.evidence_id).toContain(evidence.confidence);
        expect(evidence.source_authority, evidence.evidence_id).toBe(
          expectedAuthority[evidence.verification_mode],
        );
      }
    }
  });

  it("keeps mastery, proficiency, XP, and raw audio outside the Result contract", () => {
    expect(contract.invariants.mastery_is_result_outcome).toBe(false);
    expect(contract.invariants.result_embeds_proficiency_mutation).toBe(false);
    expect(contract.invariants.result_embeds_xp_mutation).toBe(false);
    expect(contract.invariants.raw_audio_retained_by_default).toBe(false);
    expect(contract.invariants.session_proves_musical_correctness).toBe(false);
    expect(contract.invariants.direct_audio_proves_physical_technique).toBe(false);
    expect(contract.invariants.app_verified_is_globally_strongest_mode).toBe(false);
    expect(contract.invariants.evidence_confidence_is_criterion_specific).toBe(true);
  });
});
