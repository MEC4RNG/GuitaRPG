import taxonomy from "@/domain/taxonomy/canonical-taxonomy.json";
import { evaluateAbsoluteQuestDemand } from "@/lib/difficulty/dif-v1";
import { generateCustomQuest } from "@/lib/quest/generator";
import { parseQuest } from "@/lib/quest/runtime";
import {
  buildRecommendationCandidateSetV1,
  generatorPrimaryCapabilities,
  validateCurrentGeneratorCapabilities,
  type CandidateGoal,
  type CandidatePlayerContext,
  type CandidateSkillState,
  type CandidateTaxonomyEntity,
} from "@/lib/training/candidates-v1";
import { describe, expect, it } from "vitest";

const entities = taxonomy.entities as CandidateTaxonomyEntity[];
const capabilities = generatorPrimaryCapabilities();
const activeSkills = entities.filter(
  (item) => item.kind === "SKILL" && item.lifecycle === "ACTIVE",
);
const baseContext: CandidatePlayerContext = {
  challenge_preference: "BALANCED",
  typical_session_minutes: 20,
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
const states = activeSkills.map((skill) => unrated(skill.id));
const build = (overrides: Partial<Parameters<typeof buildRecommendationCandidateSetV1>[0]> = {}) =>
  buildRecommendationCandidateSetV1({
    evaluated_at: "2026-09-29T12:00:00.000Z",
    entities,
    skill_states: states,
    goals: [],
    player_context: baseContext,
    ...overrides,
  });

describe("TRN_CAND_V1 recommendation candidate generation", () => {
  it("derives 15 unique ACTIVE canonical Primary capabilities across all six Domains", () => {
    expect(validateCurrentGeneratorCapabilities()).toEqual([]);
    expect(capabilities).toHaveLength(15);
    expect(new Set(capabilities.map((item) => item.primary_skill_slug)).size).toBe(15);
    expect(new Set(capabilities.map((item) => item.domain_slug))).toEqual(
      new Set([
        "technique",
        "fretboard",
        "harmony_theory",
        "rhythm",
        "ear_musicianship",
        "creativity_expression",
      ]),
    );
  });

  it("instantiates, parses, and evaluates a deterministic Custom Quest for every capability", () => {
    capabilities.forEach((capability, index) => {
      const id = `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
      const generated = generateCustomQuest({
        id,
        seed: capability.primary_skill_slug,
        primary_skill: capability.primary_skill_slug,
      });
      expect(parseQuest(generated.quest)).toBe(generated.quest);
      expect(evaluateAbsoluteQuestDemand(generated.quest).model_version).toBe("DIF_V1");
      expect(generated.quest.execution.primary_skill.slug).toBe(capability.primary_skill_slug);
    });
  });

  it("creates 15 stable, non-ranked CALIBRATION candidates for a healthy new Player", () => {
    const result = build();
    expect(result).toMatchObject({
      model_version: "TRN_CAND_V1",
      ordering_semantics: "STABLE_NOT_RANKED",
      generator_version: "QST_GEN_V1",
      generator_rule_version: "QST_GEN_RULES_V1",
    });
    expect(result.candidates).toHaveLength(15);
    expect(result.candidates.every((candidate) => candidate.intent === "CALIBRATION")).toBe(true);
    expect(result.candidates.every((candidate) => candidate.skill.visible_level === null)).toBe(
      true,
    );
    expect(result.diagnostics).toMatchObject({
      active_canonical_skill_count: 72,
      generator_primary_capable_skill_count: 15,
      generated_candidate_count: 15,
      unsupported_active_skill_count: 57,
      missing_player_skill_state: [],
    });
  });

  it("classifies DORIAN progression and readiness states without assigning relative rank", () => {
    const bySlug = new Map(activeSkills.map((skill) => [skill.slug, skill]));
    const changed = states.map((state) =>
      state.skill_id === bySlug.get("hybrid_picking")!.id
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
          }
        : state,
    );
    const result = build({ skill_states: changed });
    expect(result.candidates.find((item) => item.skill.slug === "hybrid_picking")).toMatchObject({
      intent: "DEVELOPMENT",
      reasons: ["PRIMARY_ESTIMATED", "READINESS_HIGH", "CONFIDENCE_BELOW_ESTABLISHMENT_THRESHOLD"],
    });
    expect(result.candidates.find((item) => item.skill.slug === "scale_mapping")).toMatchObject({
      intent: "CALIBRATION",
    });
    expect(
      result.candidates.find((item) => item.skill.slug === "syncopation_control"),
    ).toMatchObject({ intent: "CALIBRATION" });
    expect(result.candidates.every((candidate) => !("rank" in candidate))).toBe(true);
  });

  it.each([
    ["ESTIMATED", "HIGH", "DEVELOPMENT"],
    ["ESTIMATED", "LOW", "REFRESH"],
    ["ESTABLISHED", "HIGH", "MAINTENANCE"],
    ["ESTABLISHED", "MODERATE", "MAINTENANCE"],
    ["ESTABLISHED", "LOW", "REFRESH"],
  ] as const)("maps %s plus %s to %s", (assessment, readiness, intent) => {
    const hybrid = activeSkills.find((skill) => skill.slug === "hybrid_picking")!;
    const changed = states.map((state) =>
      state.skill_id === hybrid.id
        ? {
            ...state,
            assessment_status: assessment,
            visible_level: "III" as const,
            proficiency_score: 55.3,
            confidence_score: assessment === "ESTABLISHED" ? 70 : 20,
            readiness_status: readiness,
            readiness_score: readiness === "LOW" ? 33.18 : readiness === "MODERATE" ? 44.24 : 55.3,
          }
        : state,
    );
    expect(
      build({ skill_states: changed }).candidates.find(
        (item) => item.skill.slug === "hybrid_picking",
      )?.intent,
    ).toBe(intent);
  });

  it("matches only structured goals and reports free-text and unsupported Skill goals", () => {
    const hybrid = activeSkills.find((skill) => skill.slug === "hybrid_picking")!;
    const technique = entities.find((item) => item.kind === "DOMAIN" && item.slug === "technique")!;
    const unsupported = activeSkills.find(
      (skill) => !capabilities.some((item) => item.primary_skill_slug === skill.slug),
    )!;
    const goals: CandidateGoal[] = [
      {
        id: "skill",
        skill_id: hybrid.id,
        domain_id: null,
        objective: null,
        priority: 50,
        is_active: true,
      },
      {
        id: "domain",
        skill_id: null,
        domain_id: technique.id,
        objective: null,
        priority: 10,
        is_active: true,
      },
      {
        id: "text",
        skill_id: null,
        domain_id: null,
        objective: "play better solos",
        priority: 1,
        is_active: true,
      },
      {
        id: "unsupported",
        skill_id: unsupported.id,
        domain_id: null,
        objective: null,
        priority: 0,
        is_active: true,
      },
    ];
    const result = build({ goals });
    expect(result.candidates.find((item) => item.skill.slug === "hybrid_picking")?.reasons).toEqual(
      expect.arrayContaining(["GOAL_SKILL_MATCH", "GOAL_DOMAIN_MATCH"]),
    );
    expect(
      result.candidates
        .filter((item) => item.skill.domain_slug === "technique")
        .every((item) => item.reasons.includes("GOAL_DOMAIN_MATCH")),
    ).toBe(true);
    expect(result.diagnostics.unparsed_objective_goal).toEqual([
      { goal_id: "text", objective: "play better solos" },
    ]);
    expect(result.diagnostics.unsupported_goal_skill).toEqual([
      { goal_id: "unsupported", skill_id: unsupported.id },
    ]);
  });

  it("keeps order and eligibility invariant across context, free text, and raw goal priority", () => {
    const hybrid = activeSkills.find((skill) => skill.slug === "hybrid_picking")!;
    const ids = (result: ReturnType<typeof build>) =>
      result.candidates.map((item) => item.candidate_key);
    const baseline = ids(build());
    expect(
      ids(
        build({
          player_context: {
            ...baseContext,
            challenge_preference: "PUSH_ME",
            typical_session_minutes: 999,
          },
          goals: [
            {
              id: "text",
              skill_id: null,
              domain_id: null,
              objective: "anything",
              priority: 0,
              is_active: true,
            },
          ],
        }),
      ),
    ).toEqual(baseline);
    expect(
      ids(
        build({
          goals: [
            {
              id: "goal",
              skill_id: hybrid.id,
              domain_id: null,
              objective: null,
              priority: 999,
              is_active: true,
            },
          ],
        }),
      ),
    ).toEqual(baseline);
  });

  it("omits missing projections without synthesizing UNRATED and never invents unsupported candidates", () => {
    const hybrid = activeSkills.find((skill) => skill.slug === "hybrid_picking")!;
    const unsupported = activeSkills.find(
      (skill) => !capabilities.some((item) => item.primary_skill_slug === skill.slug),
    )!;
    const result = build({ skill_states: states.filter((state) => state.skill_id !== hybrid.id) });
    expect(result.candidates).toHaveLength(14);
    expect(result.diagnostics.missing_player_skill_state).toEqual(["hybrid_picking"]);
    expect(result.candidates.some((item) => item.skill.slug === unsupported.slug)).toBe(false);
  });

  it("contains no scoring, selection, personal difficulty, XP, Character, or Attribute claims", () => {
    const result = build();
    const serialized = JSON.stringify(result);
    for (const forbidden of [
      "priority_score",
      "recommendation_score",
      '"rank"',
      '"selected"',
      '"recommended"',
      "personal_level",
      "practice_xp",
      "character_level",
      "attribute_states",
    ])
      expect(serialized).not.toContain(forbidden);
  });
});
