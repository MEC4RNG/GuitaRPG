import taxonomy from "@/domain/taxonomy/canonical-taxonomy.json";
import {
  buildRecommendationCandidateSetV1,
  type CandidateGoal,
  type CandidatePlayerContext,
  type CandidateSkillState,
  type CandidateTaxonomyEntity,
  type RecommendationCandidateV1,
} from "@/lib/training/candidates-v1";
import {
  denseRankRecommendationScoresV1,
  exposureNeedV1,
  rankRecommendationCandidatesV1,
  recencyNeedV1,
  scoreRecommendationCandidateV1,
} from "@/lib/training/scoring-v1";
import { describe, expect, it } from "vitest";

const evaluatedAt = "2026-09-29T12:00:00.000Z";
const recent = "2026-09-29T00:00:00.000Z";
const entities = taxonomy.entities as CandidateTaxonomyEntity[];
const skills = entities.filter(
  (entity) => entity.kind === "SKILL" && entity.lifecycle === "ACTIVE",
);
const context: CandidatePlayerContext = {
  challenge_preference: "BALANCED",
  typical_session_minutes: 20,
  default_tuning: null,
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
const baseStates = skills.map((skill) => unrated(skill.id));
const build = (skillStates = baseStates, goals: CandidateGoal[] = []) =>
  buildRecommendationCandidateSetV1({
    evaluated_at: evaluatedAt,
    entities,
    skill_states: skillStates,
    goals,
    player_context: context,
  });
const skill = (slug: string) => skills.find((candidate) => candidate.slug === slug)!;
const replace = (slug: string, state: Partial<CandidateSkillState>) =>
  baseStates.map((candidate) =>
    candidate.skill_id === skill(slug).id ? { ...candidate, ...state } : candidate,
  );

describe("TRN_SCORE_V1 recommendation scoring", () => {
  it("gives every new-player candidate score 54, dense rank 1, and a 15-way top tie", () => {
    const result = rankRecommendationCandidatesV1(build());
    expect(result).toMatchObject({
      scoring_model_version: "TRN_SCORE_V1",
      ranking_semantics: "SCORE_DESCENDING_DENSE_RANK",
      top_score: 54,
      unique_top_candidate_key: null,
    });
    expect(result.ranked_candidates).toHaveLength(15);
    expect(
      result.ranked_candidates.map((candidate) => candidate.recommendation_priority_score),
    ).toEqual(Array(15).fill(54));
    expect(result.ranked_candidates.every((candidate) => candidate.semantic_rank === 1)).toBe(true);
    expect(result.top_candidate_keys).toHaveLength(15);
  });

  it("scores DORIAN Hybrid Picking at 47.36 while recent exposure-only supports remain 43", () => {
    const states = replace("hybrid_picking", {
      assessment_status: "ESTIMATED",
      visible_level: "III",
      proficiency_score: 55.3,
      confidence_score: 20,
      readiness_status: "HIGH",
      readiness_score: 55.3,
      exposure_count: 1,
      evidence_count: 1,
      last_practiced_at: recent,
      last_evidence_at: recent,
    }).map((state) =>
      [skill("scale_mapping").id, skill("syncopation_control").id].includes(state.skill_id)
        ? { ...state, exposure_count: 1, last_practiced_at: recent }
        : state,
    );
    const result = rankRecommendationCandidatesV1(build(states));
    const score = (slug: string) =>
      result.ranked_candidates.find((candidate) => candidate.candidate.skill.slug === slug)!;
    expect(score("hybrid_picking").recommendation_priority_score).toBe(47.36);
    expect(score("hybrid_picking").components.map((component) => component.points)).toEqual([
      28, 5.36, 10, 0, 4,
    ]);
    expect(score("scale_mapping").recommendation_priority_score).toBe(43);
    expect(score("syncopation_control").recommendation_priority_score).toBe(43);
  });

  it("scores the stale established fixture at 48.10 and keeps XP/Character/Attribute concepts absent", () => {
    const states = replace("hybrid_picking", {
      assessment_status: "ESTABLISHED",
      visible_level: "III",
      proficiency_score: 55,
      confidence_score: 80,
      readiness_status: "LOW",
      readiness_score: 30,
      exposure_count: 6,
      evidence_count: 6,
      last_practiced_at: "2026-08-01T00:00:00.000Z",
    });
    const candidate = build(states).candidates.find(
      (item) => item.skill.slug === "hybrid_picking",
    )!;
    const result = scoreRecommendationCandidateV1(candidate, evaluatedAt);
    expect(result.recommendation_priority_score).toBe(48.1);
    expect(result.components.map((component) => component.points)).toEqual([30, 8.1, 0, 0, 10]);
    expect(JSON.stringify(result)).not.toMatch(
      /practice_xp|character_level|attribute_states|personal_/i,
    );
  });

  it("uses exact recency and exposure boundaries", () => {
    const atAge = (days: number) =>
      new Date(Date.parse(evaluatedAt) - days * 86_400_000).toISOString();
    expect(
      [0, 1, 1.01, 7, 7.01, 30, 30.01].map((days) => recencyNeedV1(atAge(days), evaluatedAt)),
    ).toEqual([0, 0, 3, 3, 7, 7, 10]);
    expect(recencyNeedV1(null, evaluatedAt)).toBe(10);
    expect(recencyNeedV1("2026-09-30T12:00:00.000Z", evaluatedAt)).toBe(0);
    expect([0, 1, 2, 3, 5, 6].map(exposureNeedV1)).toEqual([5, 4, 4, 2, 2, 0]);
  });

  it("keeps every component and the final score within its declared bound", () => {
    for (const candidate of rankRecommendationCandidatesV1(build()).ranked_candidates) {
      expect(candidate.recommendation_priority_score).toBeGreaterThanOrEqual(0);
      expect(candidate.recommendation_priority_score).toBeLessThanOrEqual(100);
      for (const component of candidate.components) {
        expect(component.points).toBeGreaterThanOrEqual(0);
        expect(component.points).toBeLessThanOrEqual(component.max_points);
      }
    }
  });

  it("separates confidence-weighted proficiency need from ESTIMATED evidence need", () => {
    const base = build().candidates[0]!;
    const estimated = (confidence: number) =>
      scoreRecommendationCandidateV1(
        {
          ...base,
          intent: "DEVELOPMENT",
          skill: {
            ...base.skill,
            assessment_status: "ESTIMATED",
            proficiency_score: 50,
            confidence_score: confidence,
            readiness_status: "HIGH",
          },
        },
        evaluatedAt,
      );
    const low = estimated(20).components;
    const high = estimated(60).components;
    expect(low.find((item) => item.key === "PROFICIENCY_NEED")?.points).toBe(6);
    expect(high.find((item) => item.key === "PROFICIENCY_NEED")?.points).toBe(8);
    expect(low.find((item) => item.key === "EVIDENCE_NEED")?.points).toBe(10);
    expect(high.find((item) => item.key === "EVIDENCE_NEED")?.points).toBe(0);
  });

  it("applies Skill goals as 20, Domain goals as 10, without stacking or priority weighting", () => {
    const hybrid = skill("hybrid_picking");
    const technique = entities.find(
      (entity) => entity.kind === "DOMAIN" && entity.slug === "technique",
    )!;
    const goals: CandidateGoal[] = [
      {
        id: "skill-low",
        skill_id: hybrid.id,
        domain_id: null,
        objective: null,
        priority: 1,
        is_active: true,
      },
      {
        id: "skill-high",
        skill_id: hybrid.id,
        domain_id: null,
        objective: null,
        priority: 999,
        is_active: true,
      },
      {
        id: "domain",
        skill_id: null,
        domain_id: technique.id,
        objective: null,
        priority: 500,
        is_active: true,
      },
    ];
    const result = rankRecommendationCandidatesV1(build(baseStates, goals));
    const hybridResult = result.ranked_candidates.find(
      (item) => item.candidate.skill.slug === "hybrid_picking",
    )!;
    expect(hybridResult.recommendation_priority_score).toBe(74);
    expect(hybridResult.components.find((item) => item.key === "GOAL_ALIGNMENT")?.points).toBe(20);
    expect(result.unique_top_candidate_key).toBe(hybridResult.candidate.candidate_key);
    expect(
      result.ranked_candidates
        .filter(
          (item) =>
            item.candidate.skill.domain_slug === "technique" &&
            item.candidate.skill.slug !== "hybrid_picking",
        )
        .every((item) => item.recommendation_priority_score === 64),
    ).toBe(true);
  });

  it("ignores raw goal priority and carries ranking-inert Player context unchanged", () => {
    const hybrid = skill("hybrid_picking");
    const result = (priority: number, playerContext: CandidatePlayerContext) => {
      const set = buildRecommendationCandidateSetV1({
        evaluated_at: evaluatedAt,
        entities,
        skill_states: baseStates,
        goals: [
          {
            id: "goal",
            skill_id: hybrid.id,
            domain_id: null,
            objective: null,
            priority,
            is_active: true,
          },
        ],
        player_context: playerContext,
      });
      return rankRecommendationCandidatesV1(set);
    };
    const first = result(1, context);
    const second = result(999, {
      challenge_preference: "PUSH_ME",
      typical_session_minutes: 999,
      default_tuning: { id: "alternate", slug: "drop_d", name: "Drop D" },
    });
    expect(
      first.ranked_candidates.map((item) => [
        item.candidate.candidate_key,
        item.recommendation_priority_score,
        item.semantic_rank,
      ]),
    ).toEqual(
      second.ranked_candidates.map((item) => [
        item.candidate.candidate_key,
        item.recommendation_priority_score,
        item.semantic_rank,
      ]),
    );
    expect(second.player_context).toMatchObject({
      challenge_preference: "PUSH_ME",
      typical_session_minutes: 999,
      default_tuning: { slug: "drop_d" },
    });
  });

  it("keeps fresh established maintenance materially below comparable stale refresh", () => {
    const base = build().candidates[0]!;
    const score = (readiness: "HIGH" | "LOW", lastPracticedAt: string) =>
      scoreRecommendationCandidateV1(
        {
          ...base,
          intent: readiness === "LOW" ? "REFRESH" : "MAINTENANCE",
          skill: {
            ...base.skill,
            assessment_status: "ESTABLISHED",
            visible_level: "IV",
            proficiency_score: 80,
            confidence_score: 90,
            readiness_status: readiness,
            exposure_count: 6,
            evidence_count: 8,
            last_practiced_at: lastPracticedAt,
          },
        },
        evaluatedAt,
      ).recommendation_priority_score;
    expect(score("HIGH", recent)).toBe(13.8);
    expect(score("LOW", "2026-08-01T00:00:00.000Z")).toBe(43.8);
  });

  it("assigns stable descending dense ranks 1, 1, 2, 3, 3", () => {
    const candidates = build().candidates.slice(0, 5);
    const scored = candidates.map((candidate, index) => ({
      recommendation_priority_score: [80, 80, 65, 50, 50][index]!,
      components: [],
      candidate,
    }));
    const ranked = denseRankRecommendationScoresV1(scored);
    expect(ranked.map((item) => item.semantic_rank)).toEqual([1, 1, 2, 3, 3]);
    expect(ranked.map((item) => item.candidate.candidate_key)).toEqual(
      candidates.map((item) => item.candidate_key),
    );
  });

  it("retains the complete candidate, evidence, and exact additive explanation", () => {
    const candidate = build().candidates[0]!;
    const result = scoreRecommendationCandidateV1(candidate, evaluatedAt);
    expect(result.candidate).toEqual(candidate);
    expect(result.candidate).not.toBe(candidate);
    expect(
      result.components.every((component) => component.evidence && component.explanation_codes),
    ).toBe(true);
    expect(result.components.reduce((sum, component) => sum + component.points, 0)).toBe(
      result.recommendation_priority_score,
    );
  });

  it("fails closed for invalid model, time, ranges, exposure, and inconsistent state", () => {
    const set = build();
    expect(() =>
      rankRecommendationCandidatesV1({ ...set, model_version: "BAD" as never }),
    ).toThrow();
    expect(() => rankRecommendationCandidatesV1({ ...set, evaluated_at: "bad" })).toThrow();
    const base = set.candidates[0]!;
    const invalid = (state: Partial<RecommendationCandidateV1["skill"]>) =>
      scoreRecommendationCandidateV1({ ...base, skill: { ...base.skill, ...state } }, evaluatedAt);
    expect(() => invalid({ confidence_score: 101 })).toThrow();
    expect(() => invalid({ exposure_count: -1 })).toThrow();
    expect(() => invalid({ readiness_status: "HIGH" })).toThrow();
    expect(() => scoreRecommendationCandidateV1(base, "bad")).toThrow();
  });
});
