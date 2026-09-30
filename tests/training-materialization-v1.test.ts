import taxonomy from "@/domain/taxonomy/canonical-taxonomy.json";
import {
  buildRecommendationCandidateSetV1,
  type CandidateGoal,
  type CandidatePlayerContext,
  type CandidateSkillState,
  type CandidateTaxonomyEntity,
} from "@/lib/training/candidates-v1";
import {
  materializeTrainingQuestV1,
  TRAINING_MATERIALIZATION_MODEL_VERSION,
} from "@/lib/training/materialize-v1";
import { trainingPresentationV1 } from "@/lib/training/presentation-v1";
import { rankRecommendationCandidatesV1 } from "@/lib/training/scoring-v1";
import { parseQuest, toQuestPersistenceInput } from "@/lib/quest/runtime";
import { describe, expect, it } from "vitest";

const entities = taxonomy.entities as CandidateTaxonomyEntity[];
const skills = entities.filter((item) => item.kind === "SKILL" && item.lifecycle === "ACTIVE");
const evaluatedAt = "2026-09-29T12:00:00.000Z";
const context: CandidatePlayerContext = {
  challenge_preference: "PUSH_ME",
  typical_session_minutes: 999,
  default_tuning: { id: "tuning", slug: "standard_tuning", name: "Standard Tuning" },
};
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
const states = skills.map((item) => unrated(item.id));
const skill = (slug: string) => skills.find((item) => item.slug === slug)!;
const ranked = (
  goals: CandidateGoal[] = [],
  skillStates: CandidateSkillState[] = states,
  playerContext = context,
) =>
  rankRecommendationCandidatesV1(
    buildRecommendationCandidateSetV1({
      evaluated_at: evaluatedAt,
      entities,
      skill_states: skillStates,
      goals,
      player_context: playerContext,
    }),
  );

describe("TRN_MAT_V1 Training Quest materialization", () => {
  it("leaves a new-Player top tie unselected in the presentation model", () => {
    const view = trainingPresentationV1(ranked());
    expect(view.recommendations).toHaveLength(15);
    expect(view.top).toHaveLength(15);
    expect(view.isTopTie).toBe(true);
    expect(view.uniqueTop).toBeNull();
    expect(view.initialSelectionKey).toBeNull();
    expect(view.top.every((item) => item.rank === 1 && item.score === "54.00")).toBe(true);
  });

  it("materializes an explicit top-tie selection with canonical provenance and default tuning", () => {
    const set = ranked();
    const selected = set.ranked_candidates.find(
      (item) => item.candidate.skill.slug === "hybrid_picking",
    )!;
    const result = materializeTrainingQuestV1({
      recommendation_set: set,
      candidate_key: selected.candidate.candidate_key,
      selection_mode: "TOP_TIE_USER_SELECTED",
      id: "21111111-1111-4111-8111-111111111111",
      seed: "tie-selection",
    });
    expect(parseQuest(result.quest)).toBe(result.quest);
    expect(toQuestPersistenceInput(result.quest)).toEqual(result.persistence);
    expect(result.quest).toMatchObject({
      identity: { origin: "QST_GEN_V1" },
      purpose: { generation_mode: "TRAINING" },
      execution: { primary_skill: { slug: "hybrid_picking" }, estimated_minutes: 10 },
      rewards: { fixed_xp: null, progression_effects_embedded: false },
      completion_contract: { mastery_claimed: false },
      musical_context: { tuning: { slug: "standard_tuning" } },
    });
    expect(result.provenance).toMatchObject({
      materialization_model_version: TRAINING_MATERIALIZATION_MODEL_VERSION,
      candidate_model_version: "TRN_CAND_V1",
      scoring_model_version: "TRN_SCORE_V1",
      semantic_rank: 1,
      recommendation_priority_score: 54,
      top_tie_count: 15,
      selection_mode: "TOP_TIE_USER_SELECTED",
    });
    expect(result.provenance.components).toEqual(
      selected.components.map((component) => ({
        key: component.key,
        points: component.points,
        max_points: component.max_points,
        explanation_codes: component.explanation_codes,
      })),
    );
    expect(result.quest.metadata.training_recommendation).toEqual(result.provenance);
    expect(JSON.stringify(result.quest)).not.toMatch(
      /personal_difficulty|practice_xp|attribute_states/,
    );
  });

  it("uses UNIQUE_TOP_ACCEPTED only for the accepted exact-goal winner", () => {
    const hybrid = skill("hybrid_picking");
    const set = ranked([
      {
        id: "goal",
        skill_id: hybrid.id,
        domain_id: null,
        objective: null,
        priority: 1,
        is_active: true,
      },
    ]);
    const view = trainingPresentationV1(set);
    expect(view.uniqueTop).toMatchObject({ skill: "Hybrid Picking", score: "74.00" });
    expect(view.initialSelectionKey).toBe(view.uniqueTop?.key);
    const result = materializeTrainingQuestV1({
      recommendation_set: set,
      candidate_key: view.uniqueTop!.key,
      selection_mode: "UNIQUE_TOP_ACCEPTED",
      id: "22222222-2222-4222-8222-222222222222",
    });
    expect(result.provenance.selection_mode).toBe("UNIQUE_TOP_ACCEPTED");
    expect(() =>
      materializeTrainingQuestV1({
        recommendation_set: set,
        candidate_key: view.uniqueTop!.key,
        selection_mode: "TOP_TIE_USER_SELECTED",
      }),
    ).toThrow(/selection mode/);
  });

  it("allows a lower-ranked alternative without changing its score or rank", () => {
    const hybrid = skill("hybrid_picking");
    const set = ranked([
      {
        id: "goal",
        skill_id: hybrid.id,
        domain_id: null,
        objective: null,
        priority: 1,
        is_active: true,
      },
    ]);
    const alternative = set.ranked_candidates.find((item) => item.semantic_rank > 1)!;
    const result = materializeTrainingQuestV1({
      recommendation_set: set,
      candidate_key: alternative.candidate.candidate_key,
      selection_mode: "ALTERNATIVE_USER_SELECTED",
      id: "23333333-3333-4333-8333-333333333333",
    });
    expect(result.recommendation).toEqual(alternative);
    expect(result.provenance).toMatchObject({
      semantic_rank: alternative.semantic_rank,
      recommendation_priority_score: alternative.recommendation_priority_score,
      selection_mode: "ALTERNATIVE_USER_SELECTED",
    });
  });

  it("regenerates the same recommendation with a new identity and unchanged provenance", () => {
    const set = ranked();
    const candidate = set.ranked_candidates[0]!;
    const build = (id: string, seed: string) =>
      materializeTrainingQuestV1({
        recommendation_set: set,
        candidate_key: candidate.candidate.candidate_key,
        selection_mode: "TOP_TIE_USER_SELECTED",
        id,
        seed,
      });
    const first = build("24444444-4444-4444-8444-444444444444", "first");
    const second = build("25555555-5555-4555-8555-555555555555", "second");
    expect(first.quest.identity.id).not.toBe(second.quest.identity.id);
    expect(first.quest.execution.primary_skill).toEqual(second.quest.execution.primary_skill);
    expect(first.provenance).toEqual(second.provenance);
  });

  it("preserves DORIAN ordering and a Domain-goal top tie in presentation", () => {
    const changed = states.map((state) =>
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
          }
        : [skill("scale_mapping").id, skill("syncopation_control").id].includes(state.skill_id)
          ? { ...state, exposure_count: 1, last_practiced_at: evaluatedAt }
          : state,
    );
    const dorian = trainingPresentationV1(ranked([], changed));
    const bySlug = (slug: string) =>
      dorian.recommendations.find((item) => item.source.candidate.skill.slug === slug)!;
    expect(bySlug("hybrid_picking").score).toBe("47.36");
    expect(bySlug("scale_mapping").score).toBe("43.00");
    expect(bySlug("syncopation_control").score).toBe("43.00");
    expect(bySlug("hybrid_picking").rank).toBeLessThan(bySlug("scale_mapping").rank);

    const technique = entities.find((item) => item.kind === "DOMAIN" && item.slug === "technique")!;
    const domain = trainingPresentationV1(
      ranked([
        {
          id: "domain",
          skill_id: null,
          domain_id: technique.id,
          objective: null,
          priority: 1,
          is_active: true,
        },
      ]),
    );
    expect(domain.isTopTie).toBe(true);
    expect(domain.initialSelectionKey).toBeNull();
    expect(domain.top.length).toBeGreaterThan(1);
    expect(domain.top.every((item) => item.score === "64.00")).toBe(true);
  });
});
