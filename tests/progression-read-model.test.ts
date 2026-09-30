import { describe, expect, it } from "vitest";

import {
  buildCharacterProgressionView,
  buildSkillsProgressionView,
  calculateCharacterProgressV1,
  filterSkills,
  groupSkillsByDomain,
  type AttributeStateRow,
  type SkillStateRow,
  type TaxonomyEntity,
} from "@/lib/progression/read-model";

const domains: TaxonomyEntity[] = [
  {
    id: "domain-technique",
    kind: "DOMAIN",
    slug: "technique",
    display_name: "Technique",
    lifecycle: "ACTIVE",
  },
  {
    id: "domain-rhythm",
    kind: "DOMAIN",
    slug: "rhythm",
    display_name: "Rhythm",
    lifecycle: "ACTIVE",
  },
];

const skills: TaxonomyEntity[] = [
  {
    id: "alternate",
    kind: "SKILL",
    slug: "alternate_picking",
    display_name: "Alternate Picking",
    lifecycle: "ACTIVE",
  },
  {
    id: "hybrid",
    kind: "SKILL",
    slug: "hybrid_picking",
    display_name: "Hybrid Picking",
    lifecycle: "ACTIVE",
  },
  {
    id: "syncopation",
    kind: "SKILL",
    slug: "syncopation_control",
    display_name: "Syncopation Control",
    lifecycle: "ACTIVE",
  },
];

const relationships = [
  {
    relationship_type: "BELONGS_TO",
    source_entity_id: "alternate",
    target_entity_id: "domain-technique",
  },
  {
    relationship_type: "BELONGS_TO",
    source_entity_id: "hybrid",
    target_entity_id: "domain-technique",
  },
  {
    relationship_type: "BELONGS_TO",
    source_entity_id: "syncopation",
    target_entity_id: "domain-rhythm",
  },
];

const state = (
  input: Partial<SkillStateRow> & Pick<SkillStateRow, "skill_id" | "assessment_status">,
): SkillStateRow => ({
  visible_level: null,
  proficiency_score: null,
  confidence_score: 0,
  readiness_status: "UNKNOWN",
  readiness_score: null,
  exposure_count: 0,
  evidence_count: 0,
  last_practiced_at: null,
  last_evidence_at: null,
  ...input,
});

describe("UX-003 progression read models", () => {
  it("calculates CHAR_V1 progress within the current level interval", () => {
    expect(calculateCharacterProgressV1(2, 250)).toEqual({
      level: 2,
      practiceXp: 250,
      currentThreshold: 100,
      nextThreshold: 400,
      xpIntoLevel: 150,
      xpForNextLevel: 300,
      progressPercent: 50,
    });
  });

  it("presents a new Player at Level 1 with UNASSESSED Attributes and no numeric zeros", () => {
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
    ].map((slug) => ({
      id: slug,
      kind: "ATTRIBUTE",
      slug,
      display_name: slug,
      lifecycle: "ACTIVE",
    }));
    const attributeStates = attributeEntities.map((attribute): AttributeStateRow => ({
      attribute_id: attribute.id,
      assessment_status: "UNASSESSED",
      score: null,
    }));
    const model = buildCharacterProgressionView({
      character: {
        practice_xp: 0,
        character_level: 1,
        total_practice_seconds: 0,
        xp_model_version: "XP_V1",
        character_model_version: "CHAR_V1",
      },
      attributeEntities,
      attributeStates,
    });
    expect(model.progress).toMatchObject({ level: 1, practiceXp: 0, nextThreshold: 100 });
    expect(model.attributes).toHaveLength(11);
    expect(model.attributes.every((attribute) => attribute.assessmentStatus === "UNASSESSED")).toBe(
      true,
    );
    expect(model.attributes.every((attribute) => attribute.score === null)).toBe(true);
  });

  it("preserves UNRATED, ESTIMATED, and ESTABLISHED semantics as separate states", () => {
    const model = buildSkillsProgressionView({
      skillEntities: skills,
      domainEntities: domains,
      relationships,
      skillStates: [
        state({
          skill_id: "alternate",
          assessment_status: "ESTABLISHED",
          visible_level: "IV",
          proficiency_score: 70,
          confidence_score: 80,
          readiness_status: "LOW",
          readiness_score: 42,
          exposure_count: 8,
          evidence_count: 4,
        }),
        state({
          skill_id: "hybrid",
          assessment_status: "ESTIMATED",
          visible_level: "III",
          proficiency_score: 55.3,
          confidence_score: 20,
          readiness_status: "HIGH",
          readiness_score: 55.3,
          exposure_count: 1,
          evidence_count: 1,
        }),
        state({ skill_id: "syncopation", assessment_status: "UNRATED", exposure_count: 1 }),
      ],
    });
    expect(model.find((skill) => skill.id === "syncopation")).toMatchObject({
      assessmentStatus: "UNRATED",
      visibleLevel: null,
      proficiencyScore: null,
      readinessStatus: "UNKNOWN",
    });
    expect(model.find((skill) => skill.id === "hybrid")).toMatchObject({
      assessmentStatus: "ESTIMATED",
      visibleLevel: "III",
      confidenceScore: 20,
      readinessStatus: "HIGH",
    });
    expect(model.find((skill) => skill.id === "alternate")).toMatchObject({
      assessmentStatus: "ESTABLISHED",
      visibleLevel: "IV",
      proficiencyScore: 70,
      confidenceScore: 80,
      readinessStatus: "LOW",
      readinessScore: 42,
    });
  });

  it("surfaces a missing Skill projection as unavailable rather than Level I", () => {
    const [missing] = buildSkillsProgressionView({
      skillEntities: [skills[0]],
      domainEntities: domains,
      relationships,
      skillStates: [],
    });
    expect(missing).toMatchObject({
      projectionAvailable: false,
      assessmentStatus: "UNAVAILABLE",
      visibleLevel: null,
      proficiencyScore: null,
      readinessStatus: "UNAVAILABLE",
    });
  });

  it("groups by canonical Domain and sorts established, estimated, then unrated", () => {
    const model = buildSkillsProgressionView({
      skillEntities: skills,
      domainEntities: domains,
      relationships,
      skillStates: [
        state({ skill_id: "alternate", assessment_status: "UNRATED" }),
        state({
          skill_id: "hybrid",
          assessment_status: "ESTIMATED",
          visible_level: "III",
          proficiency_score: 55.3,
          confidence_score: 20,
          readiness_status: "HIGH",
          readiness_score: 55.3,
        }),
        state({
          skill_id: "syncopation",
          assessment_status: "ESTABLISHED",
          visible_level: "II",
          proficiency_score: 35,
          confidence_score: 70,
          readiness_status: "MODERATE",
          readiness_score: 28,
        }),
      ],
    });
    expect(groupSkillsByDomain(model).map((group) => group.domain)).toEqual([
      "Technique",
      "Rhythm",
    ]);
    expect(groupSkillsByDomain(model)[0].skills.map((skill) => skill.name)).toEqual([
      "Hybrid Picking",
      "Alternate Picking",
    ]);
  });

  it("filters deterministically by text, Domain, and assessment status", () => {
    const model = buildSkillsProgressionView({
      skillEntities: skills,
      domainEntities: domains,
      relationships,
      skillStates: [
        state({ skill_id: "alternate", assessment_status: "UNRATED" }),
        state({
          skill_id: "hybrid",
          assessment_status: "ESTIMATED",
          visible_level: "III",
          proficiency_score: 55.3,
        }),
        state({ skill_id: "syncopation", assessment_status: "UNRATED" }),
      ],
    });
    expect(
      filterSkills(model, { search: "pick", domain: "Technique", assessment: "ESTIMATED" }).map(
        (skill) => skill.id,
      ),
    ).toEqual(["hybrid"]);
  });
});
