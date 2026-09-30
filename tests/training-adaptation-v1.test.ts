import taxonomy from "@/domain/taxonomy/canonical-taxonomy.json";
import { GENERATOR_TEMPLATES } from "@/lib/quest/generator";
import {
  comparePersonalChallenge,
  materializeAdaptiveTrainingQuestV1,
  TRAINING_ADAPTATION_MODEL_VERSION,
  TRAINING_CHALLENGE_TARGETS,
  TRAINING_CHALLENGE_TARGET_VERSION,
  TRAINING_VARIANT_CATALOG_VERSION,
  type TrainingChallengePreference,
} from "@/lib/training/adaptation-v1";
import {
  buildRecommendationCandidateSetV1,
  type CandidatePlayerContext,
  type CandidateSkillState,
  type CandidateTaxonomyEntity,
} from "@/lib/training/candidates-v1";
import type { TrainingSelectionMode } from "@/lib/training/materialize-v1";
import {
  rankRecommendationCandidatesV1,
  type RankedRecommendationSetV1,
} from "@/lib/training/scoring-v1";
import { parseQuest, toQuestPersistenceInput } from "@/lib/quest/runtime";
import { describe, expect, it } from "vitest";

const entities = taxonomy.entities as CandidateTaxonomyEntity[];
const skills = entities.filter((item) => item.kind === "SKILL" && item.lifecycle === "ACTIVE");
const evaluatedAt = "2026-09-30T12:00:00.000Z";
const unrated = (skill_id: string): CandidateSkillState => ({
  skill_id,
  assessment_status: "UNRATED",
  visible_level: null,
  proficiency_score: null,
  confidence_score: 0,
  readiness_status: "UNKNOWN",
  readiness_score: null,
  exposure_count: 0,
  evidence_count: 0,
  last_practiced_at: null,
  last_evidence_at: null,
  proficiency_model_version: "PROF_V1",
  confidence_model_version: "CONF_V1",
  readiness_model_version: "READY_V1",
});
const baseStates = skills.map((item) => unrated(item.id));
const skill = (slug: string) => skills.find((item) => item.slug === slug)!;
const context = (
  challenge_preference: TrainingChallengePreference,
  withTuning = true,
): CandidatePlayerContext => ({
  challenge_preference,
  typical_session_minutes: 999,
  default_tuning: withTuning
    ? { id: "tuning", slug: "standard_tuning", name: "Standard Tuning" }
    : null,
});
const ratedStates = (slug: string, readiness: "HIGH" | "LOW" = "HIGH") =>
  baseStates.map((state) =>
    state.skill_id === skill(slug).id
      ? {
          ...state,
          assessment_status: "ESTIMATED" as const,
          visible_level: "III" as const,
          proficiency_score: 55.3,
          confidence_score: 70,
          readiness_status: readiness,
          readiness_score: readiness === "LOW" ? 30 : 55.3,
          exposure_count: 3,
          evidence_count: 3,
          last_practiced_at: evaluatedAt,
          last_evidence_at: evaluatedAt,
        }
      : state,
  );
const ranked = (
  primary: string,
  preference: TrainingChallengePreference,
  states: CandidateSkillState[] = baseStates,
  withTuning = true,
) =>
  rankRecommendationCandidatesV1(
    buildRecommendationCandidateSetV1({
      evaluated_at: evaluatedAt,
      entities,
      skill_states: states,
      goals: [
        {
          id: "target",
          skill_id: skill(primary).id,
          domain_id: null,
          objective: null,
          priority: 1,
          is_active: true,
        },
      ],
      player_context: context(preference, withTuning),
    }),
  );
const mode = (set: RankedRecommendationSetV1, key: string): TrainingSelectionMode => {
  const item = set.ranked_candidates.find(
    (candidate) => candidate.candidate.candidate_key === key,
  )!;
  if (set.unique_top_candidate_key === key) return "UNIQUE_TOP_ACCEPTED";
  return item.semantic_rank === 1 ? "TOP_TIE_USER_SELECTED" : "ALTERNATIVE_USER_SELECTED";
};
const adapt = (set: RankedRecommendationSetV1, primary: string, seed = `${primary}-adaptation`) => {
  const item = set.ranked_candidates.find(
    (candidate) => candidate.candidate.skill.slug === primary,
  )!;
  return materializeAdaptiveTrainingQuestV1({
    recommendation_set: set,
    candidate_key: item.candidate.candidate_key,
    selection_mode: mode(set, item.candidate.candidate_key),
    seed,
  });
};

describe("TRN_ADAPT_V1 adaptive Training composition", () => {
  it("defines the exact versioned challenge target orders and anchors", () => {
    expect(TRAINING_CHALLENGE_TARGETS).toEqual({
      RELAXED: { level_order: ["II", "I", "III", "IV", "V"], primary_gap_anchor: -20 },
      BALANCED: { level_order: ["III", "II", "IV", "I", "V"], primary_gap_anchor: 0 },
      CHALLENGE: { level_order: ["IV", "III", "II", "V", "I"], primary_gap_anchor: 25 },
      PUSH_ME: { level_order: ["IV", "V", "III", "II", "I"], primary_gap_anchor: 35 },
    });
  });

  it.each(["RELAXED", "BALANCED", "CHALLENGE", "PUSH_ME"] as const)(
    "uses BASE calibration fallback for an UNRATED Primary under %s",
    (preference) => {
      const result = adapt(ranked("hybrid_picking", preference), "hybrid_picking");
      expect(result.adaptation).toMatchObject({
        adaptation_model_version: TRAINING_ADAPTATION_MODEL_VERSION,
        challenge_target_version: TRAINING_CHALLENGE_TARGET_VERSION,
        variant_catalog_version: TRAINING_VARIANT_CATALOG_VERSION,
        challenge_preference: preference,
        preference_applied: false,
        fit: "PRIMARY_UNRATED_CALIBRATION_FALLBACK",
        selected_variant_key: "BASE",
        personal_difficulty: {
          status: "UNKNOWN",
          personal_level: null,
          uncertainty: "HIGH",
        },
      });
      expect(result.recommendation.recommendation_priority_score).toBe(74);
      expect(result.quest.metadata.training_recommendation).toEqual(result.provenance);
      expect(result.quest.metadata.training_adaptation).toEqual(result.adaptation);
    },
  );

  it("materializes all 15 capable Primary Skills and monotonic ladders for every family", () => {
    const primarySkills = GENERATOR_TEMPLATES.flatMap((template) => template.primarySkills);
    expect(primarySkills).toHaveLength(15);
    for (const primary of primarySkills) {
      const result = adapt(ranked(primary, "BALANCED", ratedStates(primary)), primary);
      expect(parseQuest(result.quest)).toBe(result.quest);
      expect(toQuestPersistenceInput(result.quest)).toEqual(result.persistence);
      expect(result.quest).toMatchObject({
        identity: { origin: "QST_GEN_V1" },
        purpose: { generation_mode: "TRAINING" },
        execution: {
          primary_skill: { slug: primary },
          secondary_skills: [],
          required_techniques: [],
          estimated_minutes: 10,
        },
      });
      expect(result.variants).toHaveLength(4);
      expect(result.variants.map((variant) => variant.variant_key)).toEqual([
        "LOW",
        "BASE",
        "HIGH",
        "MAX",
      ]);
      const scores = result.variants.map(
        (variant) => variant.personal_difficulty.absolute_demand.overall_score,
      );
      expect(scores).toEqual([...scores].sort((left, right) => left - right));
      expect(new Set(result.variants.map((variant) => variant.quest.identity.type))).toEqual(
        new Set([result.variants[0]!.quest.identity.type]),
      );
      expect(new Set(result.variants.map((variant) => variant.quest.concepts[0]!.slug))).toEqual(
        new Set([result.variants[0]!.quest.concepts[0]!.slug]),
      );
    }
  });

  it("selects nondecreasing personal challenge from RELAXED through PUSH_ME", () => {
    for (const primary of GENERATOR_TEMPLATES.map((template) => template.primarySkills[0]!)) {
      const results = (["RELAXED", "BALANCED", "CHALLENGE", "PUSH_ME"] as const).map((preference) =>
        adapt(ranked(primary, preference, ratedStates(primary)), primary),
      );
      for (let index = 1; index < results.length; index += 1)
        expect(
          comparePersonalChallenge(
            results[index - 1]!.adaptation.personal_difficulty,
            results[index]!.adaptation.personal_difficulty,
          ),
        ).toBeLessThanOrEqual(0);
      expect(results.map((result) => result.recommendation.semantic_rank)).toEqual(
        Array(4).fill(results[0]!.recommendation.semantic_rank),
      );
      expect(results.map((result) => result.recommendation.recommendation_priority_score)).toEqual(
        Array(4).fill(results[0]!.recommendation.recommendation_priority_score),
      );
    }
  });

  it("uses UNKNOWN novelty for default tuning and truthful no-context semantics without it", () => {
    const withContext = adapt(
      ranked("hybrid_picking", "BALANCED", ratedStates("hybrid_picking")),
      "hybrid_picking",
    );
    expect(withContext.adaptation.context_novelty).toEqual({
      status: "UNKNOWN",
      source: "EXPLICIT_SNAPSHOT",
      context_keys: ["tuning:standard_tuning"],
    });
    expect(withContext.adaptation.personal_difficulty.status).toBe("PROVISIONAL");
    expect(withContext.adaptation.personal_difficulty.modifiers).toEqual([]);

    const withoutContext = adapt(
      ranked("hybrid_picking", "BALANCED", ratedStates("hybrid_picking"), false),
      "hybrid_picking",
    );
    expect(withoutContext.adaptation.context_novelty).toEqual({
      status: "LOW",
      source: "NO_RELEVANT_CONTEXT",
      context_keys: [],
    });
  });

  it("consumes the single DIF_PERSONAL low-readiness modifier without changing proficiency", () => {
    const result = adapt(
      ranked("hybrid_picking", "BALANCED", ratedStates("hybrid_picking", "LOW")),
      "hybrid_picking",
    );
    expect(result.adaptation.personal_difficulty.modifiers).toEqual([
      expect.objectContaining({
        kind: "READINESS",
        personal_band_delta: 1,
        changes_proficiency: false,
      }),
    ]);
    expect(result.adaptation.personal_difficulty.applied_modifier_band_delta).toBe(1);
    expect(result.adaptation.personal_difficulty.skill_state_snapshot[0]?.proficiency_score).toBe(
      55.3,
    );
  });

  it("keeps adaptation provenance compact and free of progression mutation claims", () => {
    const result = adapt(
      ranked("hybrid_picking", "PUSH_ME", ratedStates("hybrid_picking")),
      "hybrid_picking",
      "provenance",
    );
    expect(result.adaptation.evaluated_variants).toHaveLength(4);
    expect(result.adaptation.evaluated_variants[0]).toEqual({
      variant_key: expect.any(String),
      absolute_level: expect.any(String),
      absolute_score: expect.any(Number),
      personal_status: expect.any(String),
      personal_level: expect.any(String),
      uncertainty: expect.any(String),
      primary_gap: expect.any(Number),
    });
    expect(JSON.stringify(result.quest.metadata)).not.toMatch(
      /practice_xp|attribute_states|proficiency_mutation|confidence_mutation|readiness_mutation/,
    );
  });

  it("reruns variant search for a new seed without changing recommendation authority", () => {
    const set = ranked("hybrid_picking", "CHALLENGE", ratedStates("hybrid_picking"));
    const first = adapt(set, "hybrid_picking", "regenerate-one");
    const second = adapt(set, "hybrid_picking", "regenerate-two");
    expect(first.quest.identity.id).not.toBe(second.quest.identity.id);
    expect(first.quest.execution.primary_skill).toEqual(second.quest.execution.primary_skill);
    expect(first.provenance).toEqual(second.provenance);
    expect(first.adaptation.challenge_preference).toBe(second.adaptation.challenge_preference);
    expect(first.adaptation.challenge_target_version).toBe(
      second.adaptation.challenge_target_version,
    );
    expect(first.adaptation.evaluated_variants).toHaveLength(4);
    expect(second.adaptation.evaluated_variants).toHaveLength(4);
  });
});
