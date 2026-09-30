import taxonomy from "@/domain/taxonomy/canonical-taxonomy.json";
import { GENERATOR_TEMPLATES } from "@/lib/quest/generator";
import { parseQuest, toQuestPersistenceInput } from "@/lib/quest/runtime";
import {
  comparePersonalChallenge,
  materializeAdaptiveTrainingQuestV1,
  TRAINING_CHALLENGE_TARGETS,
  type TrainingChallengePreference,
} from "@/lib/training/adaptation-v1";
import {
  buildRecommendationCandidateSetV1,
  generatorPrimaryCapabilities,
  type CandidateGoal,
  type CandidatePlayerContext,
  type CandidateSkillState,
  type CandidateTaxonomyEntity,
} from "@/lib/training/candidates-v1";
import type { TrainingSelectionMode } from "@/lib/training/materialize-v1";
import {
  rankRecommendationCandidatesV1,
  type RankedRecommendationSetV1,
} from "@/lib/training/scoring-v1";
import { describe, expect, it } from "vitest";

const evaluatedAt = "2026-09-30T12:00:00.000Z";
const entities = taxonomy.entities as CandidateTaxonomyEntity[];
const skills = entities.filter(
  (entity) => entity.kind === "SKILL" && entity.lifecycle === "ACTIVE",
);
const skill = (slug: string) => skills.find((entity) => entity.slug === slug)!;
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
const newPlayerStates = skills.map((entity) => unrated(entity.id));
const context = (
  challenge_preference: TrainingChallengePreference = "BALANCED",
  withTuning = true,
): CandidatePlayerContext => ({
  challenge_preference,
  typical_session_minutes: 20,
  default_tuning: withTuning
    ? { id: "standard", slug: "standard_tuning", name: "Standard Tuning" }
    : null,
});
const ratedStates = (primary: string, readiness: "HIGH" | "LOW" = "HIGH") =>
  newPlayerStates.map((state) =>
    state.skill_id === skill(primary).id
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
const rank = (
  states = newPlayerStates,
  goals: CandidateGoal[] = [],
  preference: TrainingChallengePreference = "BALANCED",
  withTuning = true,
) =>
  rankRecommendationCandidatesV1(
    buildRecommendationCandidateSetV1({
      evaluated_at: evaluatedAt,
      entities,
      skill_states: states,
      goals,
      player_context: context(preference, withTuning),
    }),
  );
const selectionMode = (set: RankedRecommendationSetV1, key: string): TrainingSelectionMode => {
  const selected = set.ranked_candidates.find((item) => item.candidate.candidate_key === key)!;
  if (set.unique_top_candidate_key === key) return "UNIQUE_TOP_ACCEPTED";
  if (selected.semantic_rank === 1) return "TOP_TIE_USER_SELECTED";
  return "ALTERNATIVE_USER_SELECTED";
};
const adapt = (set: RankedRecommendationSetV1, primary: string, seed = primary) => {
  const selected = set.ranked_candidates.find((item) => item.candidate.skill.slug === primary)!;
  return materializeAdaptiveTrainingQuestV1({
    recommendation_set: set,
    candidate_key: selected.candidate.candidate_key,
    selection_mode: selectionMode(set, selected.candidate.candidate_key),
    seed,
  });
};
const snapshot = (set: RankedRecommendationSetV1) =>
  set.ranked_candidates.map((item) => [
    item.candidate.candidate_key,
    item.recommendation_priority_score,
    item.semantic_rank,
  ]);

describe("REL-004 Phase 4 adaptive Training integration", () => {
  it("proves the canonical new-Player tie and preference-independent ranking", () => {
    const sets = (["RELAXED", "BALANCED", "CHALLENGE", "PUSH_ME"] as const).map((preference) =>
      rank(newPlayerStates, [], preference),
    );
    for (const set of sets) {
      expect(set.ranked_candidates).toHaveLength(15);
      expect(set.top_candidate_keys).toHaveLength(15);
      expect(set.unique_top_candidate_key).toBeNull();
      expect(set.ranked_candidates.every((item) => item.semantic_rank === 1)).toBe(true);
      expect(set.ranked_candidates.every((item) => item.recommendation_priority_score === 54)).toBe(
        true,
      );
    }
    expect(
      sets
        .slice(1)
        .every((set) => JSON.stringify(snapshot(set)) === JSON.stringify(snapshot(sets[0]!))),
    ).toBe(true);
  });

  it("keeps all new-Player preferences in truthful BASE calibration fallback", () => {
    for (const preference of ["RELAXED", "BALANCED", "CHALLENGE", "PUSH_ME"] as const) {
      const result = adapt(rank(newPlayerStates, [], preference), "hybrid_picking", preference);
      expect(result.adaptation).toMatchObject({
        challenge_preference: preference,
        preference_applied: false,
        fit: "PRIMARY_UNRATED_CALIBRATION_FALLBACK",
        selected_variant_key: "BASE",
        personal_difficulty: { status: "UNKNOWN", personal_level: null },
      });
    }
  });

  it("integrates structured Skill, Domain, free-text, and unsupported goals without inference", () => {
    const hybrid = skill("hybrid_picking");
    const technique = entities.find((item) => item.kind === "DOMAIN" && item.slug === "technique")!;
    const unsupported = skills.find(
      (item) =>
        !generatorPrimaryCapabilities().some(
          (capability) => capability.primary_skill_slug === item.slug,
        ),
    )!;
    const skillSet = rank(newPlayerStates, [
      {
        id: "skill",
        skill_id: hybrid.id,
        domain_id: null,
        objective: null,
        priority: 1,
        is_active: true,
      },
    ]);
    const winner = skillSet.ranked_candidates[0]!;
    expect(winner).toMatchObject({ semantic_rank: 1, recommendation_priority_score: 74 });
    expect(skillSet.unique_top_candidate_key).toBe(winner.candidate.candidate_key);
    expect(adapt(skillSet, "hybrid_picking").provenance.selection_mode).toBe("UNIQUE_TOP_ACCEPTED");

    const domainSet = rank(newPlayerStates, [
      {
        id: "domain",
        skill_id: null,
        domain_id: technique.id,
        objective: null,
        priority: 1,
        is_active: true,
      },
    ]);
    expect(domainSet.unique_top_candidate_key).toBeNull();
    expect(
      domainSet.ranked_candidates
        .filter((item) => item.semantic_rank === 1)
        .every((item) => item.recommendation_priority_score === 64),
    ).toBe(true);

    const inert = rank(newPlayerStates, [
      {
        id: "text",
        skill_id: null,
        domain_id: null,
        objective: "play better",
        priority: 999,
        is_active: true,
      },
      {
        id: "unsupported",
        skill_id: unsupported.id,
        domain_id: null,
        objective: null,
        priority: 999,
        is_active: true,
      },
    ]);
    expect(snapshot(inert)).toEqual(snapshot(rank()));
    expect(inert.diagnostics.unparsed_objective_goal).toHaveLength(1);
    expect(inert.diagnostics.unsupported_goal_skill).toHaveLength(1);
  });

  it("preserves DORIAN anchors and recommendation separation across preferences", () => {
    const states = newPlayerStates.map((state) =>
      state.skill_id === skill("hybrid_picking").id
        ? {
            ...state,
            assessment_status: "ESTIMATED" as const,
            visible_level: "III" as const,
            proficiency_score: 55.3,
            confidence_score: 20,
            readiness_status: "HIGH" as const,
            readiness_score: 55.3,
            exposure_count: 1,
            evidence_count: 1,
            last_practiced_at: evaluatedAt,
            last_evidence_at: evaluatedAt,
          }
        : [skill("scale_mapping").id, skill("syncopation_control").id].includes(state.skill_id)
          ? { ...state, exposure_count: 1, last_practiced_at: evaluatedAt }
          : state,
    );
    const sets = (["RELAXED", "BALANCED", "CHALLENGE", "PUSH_ME"] as const).map((preference) =>
      rank(states, [], preference),
    );
    const score = (set: RankedRecommendationSetV1, slug: string) =>
      set.ranked_candidates.find((item) => item.candidate.skill.slug === slug)!;
    expect(score(sets[0]!, "hybrid_picking").recommendation_priority_score).toBe(47.36);
    expect(score(sets[0]!, "scale_mapping").recommendation_priority_score).toBe(43);
    expect(score(sets[0]!, "syncopation_control").recommendation_priority_score).toBe(43);
    expect(score(sets[0]!, "hybrid_picking").semantic_rank).toBeLessThan(
      score(sets[0]!, "scale_mapping").semantic_rank,
    );
    expect(sets.slice(1).map(snapshot)).toEqual(Array(3).fill(snapshot(sets[0]!)));
  });

  it("proves rated monotonicity, PUSH_ME order, exact/closest fit, and one readiness modifier", () => {
    expect(TRAINING_CHALLENGE_TARGETS.PUSH_ME.level_order).toEqual(["IV", "V", "III", "II", "I"]);
    const results = (["RELAXED", "BALANCED", "CHALLENGE", "PUSH_ME"] as const).map((preference) =>
      adapt(rank(ratedStates("hybrid_picking"), [], preference), "hybrid_picking", preference),
    );
    for (let index = 1; index < results.length; index += 1)
      expect(
        comparePersonalChallenge(
          results[index - 1]!.adaptation.personal_difficulty,
          results[index]!.adaptation.personal_difficulty,
        ),
      ).toBeLessThanOrEqual(0);
    expect(new Set(results.map((result) => result.adaptation.fit))).toEqual(
      expect.objectContaining(new Set(["EXACT_PREFERRED_BAND", "CLOSEST_AVAILABLE_BAND"])),
    );
    const low = adapt(rank(ratedStates("hybrid_picking", "LOW")), "hybrid_picking");
    expect(
      low.adaptation.personal_difficulty.modifiers.filter((item) => item.kind === "READINESS"),
    ).toHaveLength(1);
    expect(low.adaptation.personal_difficulty.skill_state_snapshot[0]?.proficiency_score).toBe(
      55.3,
    );
  });

  it("integrates all six families and all 15 Skills without changing musical focus", () => {
    expect(GENERATOR_TEMPLATES).toHaveLength(6);
    const primaries = GENERATOR_TEMPLATES.flatMap((template) => template.primarySkills);
    expect(primaries).toHaveLength(15);
    for (const primary of primaries) {
      const result = adapt(rank(ratedStates(primary)), primary);
      expect(parseQuest(result.quest)).toBe(result.quest);
      expect(toQuestPersistenceInput(result.quest)).toEqual(result.persistence);
      expect(result.variants).toHaveLength(4);
      expect(
        result.variants.every((variant) => variant.personal_difficulty.status !== "UNKNOWN"),
      ).toBe(true);
      expect(
        new Set(result.variants.map((variant) => variant.quest.execution.primary_skill.slug)),
      ).toEqual(new Set([primary]));
      expect(new Set(result.variants.map((variant) => variant.quest.identity.type))).toHaveLength(
        1,
      );
      expect(
        new Set(result.variants.map((variant) => variant.quest.concepts[0]!.slug)),
      ).toHaveLength(1);
    }
  });

  it("preserves exact recommendation/adaptation provenance and historical snapshots", () => {
    const set = rank(ratedStates("hybrid_picking"), [], "CHALLENGE");
    const result = adapt(set, "hybrid_picking", "historical");
    const historical = structuredClone(result.quest.metadata);
    expect(result.quest.metadata.training_recommendation).toEqual(result.provenance);
    expect(result.quest.metadata.training_adaptation).toEqual(result.adaptation);
    expect(result.adaptation.evaluated_variants).toHaveLength(4);
    expect(result.provenance).toMatchObject({
      materialization_model_version: "TRN_MAT_V1",
      candidate_model_version: "TRN_CAND_V1",
      scoring_model_version: "TRN_SCORE_V1",
    });
    expect(result.adaptation).toMatchObject({
      adaptation_model_version: "TRN_ADAPT_V1",
      challenge_target_version: "TRN_CHALLENGE_TARGET_V1",
      variant_catalog_version: "TRN_VARIANTS_V1",
    });
    rank(ratedStates("hybrid_picking", "LOW"), [], "PUSH_ME");
    expect(result.quest.metadata).toEqual(historical);
  });

  it("recomputes a fresh recommendation snapshot from changed progression without rewriting history", () => {
    const before = rank();
    const historical = adapt(before, "hybrid_picking", "before-result");
    const metadata = structuredClone(historical.quest.metadata);
    const updated = ratedStates("hybrid_picking").map((state) =>
      state.skill_id === skill("hybrid_picking").id
        ? { ...state, confidence_score: 20, exposure_count: 1, evidence_count: 1 }
        : state,
    );
    const after = rank(updated);
    expect(snapshot(after)).not.toEqual(snapshot(before));
    expect(
      after.ranked_candidates.find((item) => item.candidate.skill.slug === "hybrid_picking")
        ?.candidate.skill,
    ).toMatchObject({ assessment_status: "ESTIMATED", exposure_count: 1, evidence_count: 1 });
    expect(historical.quest.metadata).toEqual(metadata);
  });

  it("preserves Player agency for tied, unique-top, and alternative selections", () => {
    expect(adapt(rank(), "hybrid_picking").provenance.selection_mode).toBe("TOP_TIE_USER_SELECTED");
    const hybrid = skill("hybrid_picking");
    const set = rank(newPlayerStates, [
      {
        id: "goal",
        skill_id: hybrid.id,
        domain_id: null,
        objective: null,
        priority: 1,
        is_active: true,
      },
    ]);
    expect(adapt(set, "hybrid_picking").provenance.selection_mode).toBe("UNIQUE_TOP_ACCEPTED");
    const alternative = set.ranked_candidates.find((item) => item.semantic_rank > 1)!;
    const result = adapt(set, alternative.candidate.skill.slug);
    expect(result.provenance.selection_mode).toBe("ALTERNATIVE_USER_SELECTED");
    expect(result.quest.execution.primary_skill.slug).toBe(alternative.candidate.skill.slug);
    expect(result.recommendation.recommendation_priority_score).toBe(
      alternative.recommendation_priority_score,
    );
  });

  it("keeps Context novelty truthful with and without a relevant Context", () => {
    const withContext = adapt(rank(ratedStates("hybrid_picking")), "hybrid_picking");
    expect(withContext.adaptation.context_novelty).toEqual({
      status: "UNKNOWN",
      source: "EXPLICIT_SNAPSHOT",
      context_keys: ["tuning:standard_tuning"],
    });
    expect(withContext.adaptation.personal_difficulty.status).toBe("PROVISIONAL");
    const without = adapt(
      rank(ratedStates("hybrid_picking"), [], "BALANCED", false),
      "hybrid_picking",
    );
    expect(without.adaptation.context_novelty).toEqual({
      status: "LOW",
      source: "NO_RELEVANT_CONTEXT",
      context_keys: [],
    });
  });
});
