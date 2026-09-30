import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { evaluateAbsoluteQuestDemand } from "@/lib/difficulty/dif-v1";
import { resolvePlayerRelativeDifficulty } from "@/lib/difficulty/personal-v1";
import type {
  PlayerRelativeDifficultyInput,
  SkillStateSnapshot,
} from "@/lib/difficulty/personal-types";
import { evaluateAttributeV1, type AttributeContributor } from "@/lib/progression/attributes-v1";
import {
  buildCharacterProgressionView,
  buildSkillsProgressionView,
  type AttributeStateRow,
  type SkillStateRow,
  type TaxonomyEntity,
} from "@/lib/progression/read-model";
import { evaluateReadinessV1 } from "@/lib/progression/readiness-v1";
import { applySkillProgressionV1, type SkillProgressionState } from "@/lib/progression/skill-v1";
import { calculateXpV1, deriveCharacterLevelV1 } from "@/lib/progression/xp-v1";

const practicedAt = "2026-09-29T12:00:00.000Z";
const root = resolve(import.meta.dirname, "..");
const quests = JSON.parse(
  readFileSync(resolve(root, "domain/quest/phase0-quest-fixtures.json"), "utf8"),
) as PlayerRelativeDifficultyInput["quest"][];
const dorian = quests.find((quest) => quest.identity.slug === "dorian_crossroads")!;
const absolute = evaluateAbsoluteQuestDemand(dorian);
const unrated: SkillProgressionState = {
  assessment: "UNRATED",
  score: null,
  confidence: 0,
  informativeResults: 0,
  distinctSessions: 0,
  recentDirections: [],
  identicalEasyClears: 0,
};

const entity = (id: string, kind: string, slug: string, name: string): TaxonomyEntity => ({
  id,
  kind,
  slug,
  display_name: name,
  lifecycle: "ACTIVE",
});
const domains = [
  entity("technique", "DOMAIN", "technique", "Technique"),
  entity("fretboard", "DOMAIN", "fretboard", "Fretboard"),
  entity("rhythm", "DOMAIN", "rhythm", "Rhythm"),
];
const skills = [
  entity("hybrid", "SKILL", "hybrid_picking", "Hybrid Picking"),
  entity("scale", "SKILL", "scale_mapping", "Scale Mapping"),
  entity("sync", "SKILL", "syncopation_control", "Syncopation Control"),
];
const relationships = [
  { relationship_type: "BELONGS_TO", source_entity_id: "hybrid", target_entity_id: "technique" },
  { relationship_type: "BELONGS_TO", source_entity_id: "scale", target_entity_id: "fretboard" },
  { relationship_type: "BELONGS_TO", source_entity_id: "sync", target_entity_id: "rhythm" },
];
const attributeEntities = [
  "dexterity",
  "precision",
  "coordination",
  "control",
  "endurance",
  "fretboard",
  "rhythm",
  "theory",
  "ear",
  "creativity",
  "expression",
].map((slug) => entity(slug, "ATTRIBUTE", slug, slug[0].toUpperCase() + slug.slice(1)));

function skillRow(id: string, exposure = 1): SkillStateRow {
  return {
    skill_id: id,
    assessment_status: "UNRATED",
    visible_level: null,
    proficiency_score: null,
    confidence_score: 0,
    readiness_status: "UNKNOWN",
    readiness_score: null,
    exposure_count: exposure,
    evidence_count: 0,
    last_practiced_at: exposure ? practicedAt : null,
    last_evidence_at: null,
  };
}

function canonicalChain(evaluatedAt = practicedAt) {
  const xp = calculateXpV1(612, "CLEARED", true);
  const skill = applySkillProgressionV1({
    meaningfulAttempt: true,
    outcome: "CLEARED",
    confidenceSummary: "MIXED",
    demandScore: 55.3,
    previous: unrated,
  });
  const readiness = evaluateReadinessV1({
    assessmentStatus: skill.assessment,
    proficiencyScore: skill.score,
    lastPracticedAt: practicedAt,
    evaluatedAt,
  });
  const contributor: AttributeContributor = {
    assessmentStatus: skill.assessment,
    proficiencyScore: skill.score,
    confidenceScore: skill.confidence,
    readinessStatus: readiness.status,
  };
  const coordination = evaluateAttributeV1([
    contributor,
    ...Array.from(
      { length: 20 },
      () =>
        ({
          assessmentStatus: "UNRATED",
          proficiencyScore: null,
          confidenceScore: 0,
        }) satisfies AttributeContributor,
    ),
  ]);
  const attributeStates: AttributeStateRow[] = attributeEntities.map(({ id }) => ({
    attribute_id: id,
    assessment_status:
      id === "coordination" || id === "precision" ? coordination.status : "UNASSESSED",
    score: id === "coordination" || id === "precision" ? coordination.score : null,
  }));
  const primary: SkillStateRow = {
    skill_id: "hybrid",
    assessment_status: skill.assessment,
    visible_level: skill.level,
    proficiency_score: skill.score,
    confidence_score: skill.confidence,
    readiness_status: readiness.status,
    readiness_score: readiness.score,
    exposure_count: 1,
    evidence_count: 1,
    last_practiced_at: practicedAt,
    last_evidence_at: practicedAt,
  };
  const character = {
    practice_xp: xp.totalXp,
    character_level: deriveCharacterLevelV1(xp.totalXp),
    total_practice_seconds: xp.eligiblePracticeSeconds,
    xp_model_version: "XP_V1",
    character_model_version: "CHAR_V1",
  };
  return { xp, skill, readiness, coordination, primary, attributeStates, character };
}

describe("REL-003 Phase 3 progression integration", () => {
  it("composes canonical DORIAN Result through XP, Character, Skill, readiness, Attributes, and UX", () => {
    const chain = canonicalChain();
    expect(chain.xp).toMatchObject({
      eligiblePracticeSeconds: 612,
      completedPracticeMinutes: 10,
      practiceMinuteXp: 10,
      outcomeBonusXp: 5,
      totalXp: 15,
    });
    expect(chain.character).toMatchObject({
      practice_xp: 15,
      character_level: 1,
      total_practice_seconds: 612,
    });
    expect(chain.skill).toMatchObject({
      assessment: "ESTIMATED",
      level: "III",
      score: 55.3,
      confidence: 20,
      exposure: true,
      evidence: true,
    });
    expect(chain.readiness).toMatchObject({ status: "HIGH", score: 55.3 });
    expect(chain.coordination).toMatchObject({
      status: "ESTIMATED",
      score: 55.3,
      ratedContributorCount: 1,
      totalContributorCount: 21,
    });

    const characterView = buildCharacterProgressionView({
      character: chain.character,
      attributeEntities,
      attributeStates: chain.attributeStates,
    });
    const skillsView = buildSkillsProgressionView({
      skillEntities: skills,
      domainEntities: domains,
      relationships,
      skillStates: [chain.primary, skillRow("scale"), skillRow("sync")],
    });
    expect(characterView).toMatchObject({
      progress: { level: 1, practiceXp: 15 },
      totalPracticeSeconds: 612,
    });
    expect(
      characterView.attributes
        .filter(({ assessmentStatus }) => assessmentStatus === "ESTIMATED")
        .map(({ slug, score }) => [slug, score]),
    ).toEqual([
      ["precision", 55.3],
      ["coordination", 55.3],
    ]);
    expect(
      characterView.attributes.filter(({ assessmentStatus }) => assessmentStatus === "UNASSESSED"),
    ).toHaveLength(9);
    expect(skillsView.find(({ id }) => id === "hybrid")).toMatchObject({
      assessmentStatus: "ESTIMATED",
      visibleLevel: "III",
      proficiencyScore: 55.3,
      confidenceScore: 20,
      readinessStatus: "HIGH",
      exposureCount: 1,
      evidenceCount: 1,
    });
    expect(
      skillsView
        .filter(({ id }) => id !== "hybrid")
        .every(
          ({ assessmentStatus, proficiencyScore, evidenceCount, exposureCount }) =>
            assessmentStatus === "UNRATED" &&
            proficiencyScore === null &&
            evidenceCount === 0 &&
            exposureCount === 1,
        ),
    ).toBe(true);
  });

  it("ages readiness without mutating proficiency, confidence, Attributes, or UX skill evidence", () => {
    const immediate = canonicalChain(practicedAt);
    const day8 = canonicalChain("2026-10-07T12:00:00.000Z");
    const day31 = canonicalChain("2026-10-30T12:00:00.000Z");
    expect([immediate.readiness, day8.readiness, day31.readiness]).toMatchObject([
      { status: "HIGH", score: 55.3 },
      { status: "MODERATE", score: 44.24 },
      { status: "LOW", score: 33.18 },
    ]);
    expect(
      [immediate.skill, day8.skill, day31.skill].map(
        ({ score, confidence, assessment, level }) => ({ score, confidence, assessment, level }),
      ),
    ).toEqual(
      Array(3).fill({ score: 55.3, confidence: 20, assessment: "ESTIMATED", level: "III" }),
    );
    expect([immediate.coordination, day8.coordination, day31.coordination]).toEqual(
      Array(3).fill(immediate.coordination),
    );
  });

  it("accumulates XP independently while establishment obeys evidence, session, confidence, and contradiction gates", () => {
    const first = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "CLEARED",
      confidenceSummary: "HIGH",
      demandScore: 55,
      previous: unrated,
    });
    const second = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "CLEARED",
      confidenceSummary: "HIGH",
      demandScore: 55,
      previous: {
        ...unrated,
        assessment: first.assessment,
        score: first.score,
        confidence: first.confidence,
        informativeResults: 1,
        distinctSessions: 1,
      },
    });
    const third = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "CLEARED",
      confidenceSummary: "HIGH",
      demandScore: 55,
      previous: {
        ...unrated,
        assessment: second.assessment,
        score: second.score,
        confidence: second.confidence,
        informativeResults: 2,
        distinctSessions: 2,
        recentDirections: [1, 1],
      },
    });
    expect([first.assessment, second.assessment, third.assessment]).toEqual([
      "ESTIMATED",
      "ESTIMATED",
      "ESTABLISHED",
    ]);
    expect([first.confidence, second.confidence, third.confidence]).toEqual([25, 50, 75]);
    expect(
      [612, 612, 612]
        .map((seconds) => calculateXpV1(seconds, "CLEARED", true).totalXp)
        .reduce((a, b) => a + b),
    ).toBe(45);
    const contradicted = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "CLEARED",
      confidenceSummary: "HIGH",
      demandScore: 55,
      previous: {
        ...unrated,
        assessment: "ESTIMATED",
        score: 50,
        confidence: 50,
        informativeResults: 2,
        distinctSessions: 2,
        recentDirections: [-1],
      },
    });
    expect(contradicted).toMatchObject({
      assessment: "ESTIMATED",
      contradiction: true,
      confidence: 75,
    });
  });

  it("separates easy-practice XP from attenuated evidence and protects isolated Overreach attempts", () => {
    const easyBase: SkillProgressionState = {
      ...unrated,
      assessment: "ESTIMATED",
      score: 70,
      confidence: 30,
      informativeResults: 3,
      distinctSessions: 2,
      identicalEasyClears: 3,
    };
    const easy = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "CLEARED",
      confidenceSummary: "HIGH",
      demandScore: 10,
      previous: easyBase,
    });
    expect(calculateXpV1(612, "CLEARED", true).totalXp).toBe(15);
    expect(easy).toMatchObject({
      repetitionFactor: 0.25,
      appliedDelta: 0.25,
      confidence: 36.25,
      exposure: true,
      evidence: true,
    });
    const overreach = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "ATTEMPTED",
      confidenceSummary: "HIGH",
      demandScore: 100,
      previous: {
        ...easyBase,
        assessment: "ESTABLISHED",
        score: 50,
        confidence: 65,
        identicalEasyClears: 0,
      },
    });
    expect(overreach).toMatchObject({
      challenge: "OVERREACH",
      appliedDelta: 0,
      score: 50,
      assessment: "ESTABLISHED",
    });
    expect(calculateXpV1(612, "ATTEMPTED", true).totalXp).toBe(11);
  });

  it("keeps pending and nonmeaningful ABANDONED activity free of progression", () => {
    const abandonedXp = calculateXpV1(12, "ABANDONED", false);
    const abandonedSkill = applySkillProgressionV1({
      meaningfulAttempt: false,
      outcome: "ABANDONED",
      confidenceSummary: "LOW",
      demandScore: 55.3,
      previous: unrated,
    });
    expect(abandonedXp).toMatchObject({ totalXp: 0, eligiblePracticeSeconds: 0 });
    expect(abandonedSkill).toMatchObject({
      exposure: false,
      evidence: false,
      assessment: "UNRATED",
      score: null,
      confidence: 0,
    });
    expect(
      evaluateAttributeV1([
        { assessmentStatus: "UNRATED", proficiencyScore: null, confidenceScore: 0 },
      ]),
    ).toMatchObject({ status: "UNASSESSED", score: null });
    const pending = { result: null, xpAwards: 0, skillEvents: 0, attributeEvents: 0 };
    expect(pending).toEqual({ result: null, xpAwards: 0, skillEvents: 0, attributeEvents: 0 });
  });

  it("feeds the same immutable projection snapshot into DIF_PERSONAL_V1 before and after evidence", () => {
    const chain = canonicalChain();
    const snapshot = (slug: string, row: SkillStateRow): SkillStateSnapshot => ({
      skill_slug: slug,
      assessment_status: row.assessment_status,
      visible_level: row.visible_level,
      proficiency_score: row.proficiency_score,
      confidence_score: row.confidence_score,
      readiness_status: row.readiness_status,
      readiness_score: row.readiness_score,
      exposure_count: row.exposure_count,
      evidence_count: row.evidence_count,
      last_practiced_at: row.last_practiced_at,
      last_evidence_at: row.last_evidence_at,
      proficiency_model_version: "PROF_V1",
      confidence_model_version: "CONF_V1",
      readiness_model_version: "READY_V1",
    });
    const input = (primary: SkillStateRow): PlayerRelativeDifficultyInput => ({
      quest: dorian,
      absolute_profile: absolute,
      skill_states: [
        snapshot("hybrid_picking", primary),
        snapshot("scale_mapping", skillRow("scale")),
        snapshot("syncopation_control", skillRow("sync")),
      ],
      context_novelty: {
        status: "LOW",
        context_keys: ["tonal_center:E"],
        source: "EXPLICIT_SNAPSHOT",
      },
      evaluated_at: practicedAt,
      player_state_version: "PLAYER_SNAPSHOT_V1",
    });
    const before = resolvePlayerRelativeDifficulty(input(skillRow("hybrid", 0)));
    const primaryBefore = structuredClone(chain.primary);
    const after = resolvePlayerRelativeDifficulty(input(chain.primary));
    const low = resolvePlayerRelativeDifficulty(
      input({ ...chain.primary, readiness_status: "LOW", readiness_score: 33.18 }),
    );
    expect(before).toMatchObject({ status: "UNKNOWN", personal_level: null });
    expect(after).toMatchObject({ status: "PROVISIONAL" });
    expect(low.applied_modifier_band_delta).toBe(1);
    expect(chain.primary).toEqual(primaryBefore);
  });
});
