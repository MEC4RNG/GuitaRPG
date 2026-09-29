import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateAbsoluteQuestDemand } from "@/lib/difficulty/dif-v1";
import { parseQuest, toQuestPersistenceInput, type Quest } from "@/lib/quest/runtime";
import {
  GENERATOR_TEMPLATES,
  QUEST_GENERATOR_VERSION,
  QuestGenerationError,
  generateCustomQuest,
  generateQuickQuest,
  validateGeneratorCatalog,
} from "@/lib/quest/generator";

const fixtures = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../domain/quest/phase0-quest-fixtures.json"), "utf8"),
) as unknown[];

const taxonomy = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../domain/taxonomy/canonical-taxonomy.json"), "utf8"),
) as { entities: Array<{ slug: string; kind: string; lifecycle: string }> };
const active = new Map(
  taxonomy.entities
    .filter((item) => item.lifecycle === "ACTIVE")
    .map((item) => [item.slug, item.kind]),
);

function assertGeneratedQuest(quest: Quest, mode: "QUICK" | "CUSTOM") {
  expect(parseQuest(quest)).toBe(quest);
  expect(toQuestPersistenceInput(quest).resolved_snapshot).toBe(quest);
  expect(quest.identity.schema_version).toBe(1);
  expect(quest.identity.origin).toBe(QUEST_GENERATOR_VERSION);
  expect(quest.purpose.generation_mode).toBe(mode);
  expect(quest.execution.secondary_skills.length).toBeLessThanOrEqual(2);
  expect(quest.execution.required_techniques.length).toBeLessThanOrEqual(2);
  const roles = [
    quest.execution.primary_skill,
    ...quest.execution.secondary_skills,
    ...quest.execution.required_techniques,
  ];
  expect(new Set(roles.map((item) => item.slug)).size).toBe(roles.length);
  expect(quest.concepts.length).toBeGreaterThan(0);
  expect(quest.constraints.length).toBeGreaterThanOrEqual(1);
  expect(quest.constraints.length).toBeLessThanOrEqual(3);
  for (const skill of roles) expect(active.get(skill.slug)).toBe("SKILL");
  for (const concept of quest.concepts) expect(active.get(concept.slug)).toBe("CONCEPT");
  for (const constraint of quest.constraints)
    expect(active.get(constraint.slug)).toBe("CONSTRAINT");
  expect(quest.objective.criteria.length).toBeGreaterThan(0);
  expect(quest.completion_contract.mastery_claimed).toBe(false);
  expect(quest.verification_profile.verification_required_for_clear).toBe(false);
  expect(quest.verification_profile.allowed_modes).not.toContain("DIRECT_AUDIO");
  expect(quest.rewards.fixed_xp).toBeNull();
  expect(quest.rewards.progression_effects_embedded).toBe(false);
  expect(quest.difficulty_profile.model_version).toBe("DIF_V1");
  expect(quest.difficulty_profile.source).toBe("COMPUTED");
  expect(quest.difficulty_profile.declared_overall_demand).toBe(
    quest.difficulty_profile.overall?.level,
  );
  for (const forbidden of [
    "player_proficiency",
    "readiness",
    "confidence",
    "personal_difficulty",
    "result",
    "session",
    "progression",
  ])
    expect(quest).not.toHaveProperty(forbidden);
}

describe("QST-003 Quick/Custom Quest generator", () => {
  it("generates a canonical persistence-ready Quick Quest with no musical configuration", () => {
    const generated = generateQuickQuest({ seed: "minimal" });
    assertGeneratedQuest(generated.quest, "QUICK");
    expect(generated.persistence.identity.id).toBe(generated.quest.identity.id);
  });

  it("generates a canonical Custom Quest anchored by Primary Skill", () => {
    const generated = generateCustomQuest({ seed: "custom", primary_skill: "scale_mapping" });
    assertGeneratedQuest(generated.quest, "CUSTOM");
    expect(generated.quest.execution.primary_skill.slug).toBe("scale_mapping");
  });

  it("reproduces DORIAN CROSSROADS semantics and exact DIF_V1 demand through general rules", () => {
    const { quest } = generateCustomQuest({
      seed: "dorian-regression",
      primary_skill: "hybrid_picking",
      quest_type: "TECHNIQUE",
      secondary_skills: ["scale_mapping", "syncopation_control"],
      concepts: ["dorian", "eighth_note_subdivision", "syncopation"],
      tonal_center: "E",
      strings: [2, 3, 4, 5],
      fret_range: { min: 5, max: 12 },
      target_tempo_bpm: 90,
      estimated_minutes: 10,
      meter: "4/4",
    });
    expect(quest.execution.secondary_skills.map((item) => item.slug)).toEqual([
      "scale_mapping",
      "syncopation_control",
    ]);
    expect(
      (quest.musical_context as { tonal_center: { pitch_class: string } }).tonal_center.pitch_class,
    ).toBe("E");
    expect(quest.objective.criteria).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric: "practice_duration", value: 600 }),
        expect.objectContaining({ metric: "target_tempo", value: 90 }),
      ]),
    );
    const profile = evaluateAbsoluteQuestDemand(quest);
    expect(
      Object.fromEntries(
        Object.entries(profile.dimensions).map(([key, value]) => [key, value.score]),
      ),
    ).toEqual({
      TECHNIQUE: 56,
      FRETBOARD: 48,
      THEORY: 34,
      RHYTHM: 52,
      CREATIVE: null,
      TEMPO: 45,
      CONSTRAINT: 51,
    });
    expect(profile.overall).toMatchObject({ score: 54, level: "III" });
    expect(quest.difficulty_profile.declared_overall_demand).toBe("III");
  });

  it("reaches all six Domains and all five Quest Types", () => {
    const domains = [
      "technique",
      "fretboard",
      "harmony_theory",
      "rhythm",
      "ear_musicianship",
      "creativity_expression",
    ] as const;
    for (const domain of domains)
      expect(
        generateQuickQuest({ seed: domain, primary_domain: domain }).quest.purpose.primary_domain,
      ).toBe(domain);
    for (const type of [
      "TECHNIQUE",
      "PERFORMANCE",
      "EXPLORATION",
      "CREATIVE",
      "KNOWLEDGE",
    ] as const)
      expect(generateQuickQuest({ seed: type, quest_type: type }).quest.identity.type).toBe(type);
  });

  it("is deterministic for the same seed/request/version and diverse across controlled seeds", () => {
    const first = generateQuickQuest({ seed: "repeat" }).quest;
    expect(generateQuickQuest({ seed: "repeat" }).quest).toEqual(first);
    const compositions = new Set(
      Array.from({ length: 20 }, (_, seed) => {
        const quest = generateQuickQuest({ seed }).quest;
        return `${quest.purpose.primary_domain}:${quest.execution.primary_skill.slug}:${quest.concepts[0]?.slug}`;
      }),
    );
    expect(compositions.size).toBeGreaterThan(3);
  });

  it("preserves explicit valid Custom values and propagates tempo into criteria", () => {
    const { quest } = generateCustomQuest({
      seed: 10,
      primary_skill: "alternate_picking",
      concepts: ["eighth_note_subdivision"],
      strings: [1, 2],
      target_tempo_bpm: 110,
      estimated_minutes: 12,
      tuning: "drop_d",
    });
    expect(quest.concepts.map((item) => item.slug)).toEqual(["eighth_note_subdivision"]);
    expect(quest.constraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "string_set", parameters: { strings: [1, 2] } }),
        expect.objectContaining({ slug: "target_tempo", parameters: { bpm: 110 } }),
      ]),
    );
    expect(quest.objective.criteria).toContainEqual(
      expect.objectContaining({ metric: "target_tempo", value: 110 }),
    );
    expect(quest.execution.estimated_minutes).toBe(12);
  });

  it("propagates explicit practice duration constraints into authoritative criteria", () => {
    const { quest } = generateCustomQuest({
      primary_skill: "syncopation_control",
      constraints: [{ slug: "practice_duration", parameters: { seconds: 420 } }],
    });
    expect(quest.objective.criteria).toContainEqual(
      expect.objectContaining({ metric: "practice_duration", value: 420, unit: "seconds" }),
    );
  });

  it.each([
    [{ primary_skill: "not_real" }, "INVALID_PRIMARY_SKILL"],
    [{ primary_skill: "hybrid_picking", quest_type: "KNOWLEDGE" }, "UNSUPPORTED_QUEST_TYPE"],
    [{ primary_skill: "hybrid_picking", concepts: ["counterpoint"] }, "INCOMPATIBLE_SELECTION"],
    [
      { primary_skill: "hybrid_picking", secondary_skills: ["scale_mapping", "scale_mapping"] },
      "DUPLICATE_SELECTION",
    ],
    [{ primary_skill: "hybrid_picking", target_tempo_bpm: 999 }, "INVALID_PARAMETER"],
    [{ primary_skill: "scale_mapping", fret_range: { min: 12, max: 5 } }, "INVALID_PARAMETER"],
    [{ primary_skill: "scale_mapping", style: "playing_role_lead_guitar" }, "INVALID_STYLE"],
    [
      {
        primary_skill: "scale_mapping",
        constraints: [
          { slug: "single_string_only" },
          { slug: "string_set", parameters: { strings: [1, 2] } },
        ],
      },
      "INCOMPATIBLE_CONSTRAINTS",
    ],
  ])("rejects invalid Custom request %# with a structured error", (input, code) => {
    try {
      generateCustomQuest(input as Parameters<typeof generateCustomQuest>[0]);
      throw new Error("expected generation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(QuestGenerationError);
      expect((error as QuestGenerationError).code).toBe(code);
    }
  });

  it("validates every catalog reference and instantiates every family", () => {
    expect(validateGeneratorCatalog()).toEqual([]);
    for (const template of GENERATOR_TEMPLATES) {
      const quest = generateCustomQuest({
        seed: template.id,
        primary_skill: template.primarySkills[0]!,
        quest_type: template.questTypes[0]!,
      }).quest;
      expect(quest.metadata.template_id).toBe(template.id);
      assertGeneratedQuest(quest, "CUSTOM");
    }
  });

  it("keeps identity, title, and unrelated Player-like caller data outside difficulty semantics", () => {
    const base = { seed: "identity", primary_skill: "syncopation_control" } as const;
    const first = generateCustomQuest({ ...base, id: "one" }).quest;
    const second = generateCustomQuest({
      ...base,
      id: "two",
      ...({ proficiency: 100, readiness: "LOW", xp: 999 } as object),
    }).quest;
    expect(first.identity.id).not.toBe(second.identity.id);
    expect(evaluateAbsoluteQuestDemand(first)).toEqual(evaluateAbsoluteQuestDemand(second));
    expect(first.execution).toEqual(second.execution);
    expect(first.constraints).toEqual(second.constraints);
  });

  it("preserves all 24 accepted Quest fixtures", () => {
    expect(fixtures).toHaveLength(24);
    for (const fixture of fixtures) expect(parseQuest(fixture).identity.schema_version).toBe(1);
  });
});
