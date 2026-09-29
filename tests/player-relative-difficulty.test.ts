import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { evaluateAbsoluteQuestDemand } from "@/lib/difficulty/dif-v1";
import { personalLevelForGap, resolvePlayerRelativeDifficulty } from "@/lib/difficulty/personal-v1";
import type {
  ContextNoveltySnapshot,
  PlayerRelativeDifficultyInput,
  SkillStateSnapshot,
} from "@/lib/difficulty/personal-types";
import type { DifficultyLevel } from "@/lib/difficulty/types";

// Fixture mutation probes intentionally operate on validated JSON copies.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "..");
const load = <T>(path: string): T => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const quests = load<Json[]>("domain/quest/phase0-quest-fixtures.json");
const fixtures = load<{ personal_evaluations: Json[] }>(
  "domain/difficulty/phase0-difficulty-fixtures.json",
).personal_evaluations;
const dorian = quests.find((quest) => quest.identity.slug === "dorian_crossroads")!;
const absolute = evaluateAbsoluteQuestDemand(dorian);
const evaluatedAt = "2026-09-28T16:00:00.000Z";

const levelFor = (score: number): DifficultyLevel =>
  score < 20 ? "I" : score < 40 ? "II" : score < 60 ? "III" : score < 80 ? "IV" : "V";

function state(
  skill_slug: string,
  assessment_status: SkillStateSnapshot["assessment_status"],
  proficiency_score: number | null,
  confidence_score: number,
  readiness_status: SkillStateSnapshot["readiness_status"] = "HIGH",
): SkillStateSnapshot {
  return {
    skill_slug,
    assessment_status,
    visible_level: proficiency_score === null ? null : levelFor(proficiency_score),
    proficiency_score,
    confidence_score,
    readiness_status,
    readiness_score:
      readiness_status === "UNKNOWN"
        ? null
        : readiness_status === "LOW"
          ? 20
          : readiness_status === "MODERATE"
            ? 55
            : 90,
    exposure_count: assessment_status === "UNRATED" ? 0 : 8,
    evidence_count:
      assessment_status === "ESTABLISHED" ? 6 : assessment_status === "ESTIMATED" ? 2 : 0,
    last_practiced_at: assessment_status === "UNRATED" ? null : "2026-09-27T16:00:00.000Z",
    last_evidence_at: assessment_status === "UNRATED" ? null : "2026-09-27T16:00:00.000Z",
    proficiency_model_version: "PROF_V1",
    confidence_model_version: "CONF_V1",
    readiness_model_version: "READY_V1",
  };
}

const context = (status: ContextNoveltySnapshot["status"]): ContextNoveltySnapshot => ({
  status,
  context_keys: ["tonal_center:E"],
  source: "EXPLICIT_SNAPSHOT",
});

function input(
  primary: SkillStateSnapshot,
  supports: SkillStateSnapshot[] = [],
  novelty: ContextNoveltySnapshot["status"] = "LOW",
): PlayerRelativeDifficultyInput {
  return {
    quest: dorian as PlayerRelativeDifficultyInput["quest"],
    absolute_profile: absolute,
    skill_states: [primary, ...supports],
    context_novelty: context(novelty),
    evaluated_at: evaluatedAt,
    player_state_version: "PLAYER_SNAPSHOT_V1",
  };
}

const establishedSupports = () => [
  state("scale_mapping", "ESTABLISHED", 50, 82),
  state("syncopation_control", "ESTABLISHED", 50, 82),
];

function fromReference(fixture: Json): PlayerRelativeDifficultyInput {
  const source = fixture.player_state.primary_skill;
  const score = source.visible_level === "V" ? 90 : source.visible_level === "III" ? 50 : null;
  const primary = state(
    "hybrid_picking",
    source.assessment_status,
    score,
    source.confidence_score,
    source.readiness_status,
  );
  const coverage = fixture.player_state.secondary_coverage;
  const supports =
    coverage === "ESTABLISHED"
      ? establishedSupports()
      : coverage === "PARTIAL"
        ? [state("scale_mapping", "ESTIMATED", 50, 45)]
        : coverage === "UNRATED_REQUIRED_CAPABILITY"
          ? [
              state("scale_mapping", "UNRATED", null, 0, "UNKNOWN"),
              state("syncopation_control", "ESTABLISHED", 50, 82),
            ]
          : [];
  return input(primary, supports, fixture.player_state.context_novelty);
}

describe("DIF-003 DIF_PERSONAL_V1 resolver", () => {
  it("reproduces all seven accepted personal reference evaluations", () => {
    expect(fixtures).toHaveLength(7);
    for (const fixture of fixtures) {
      const actual = resolvePlayerRelativeDifficulty(fromReference(fixture));
      expect(actual, fixture.id).toMatchObject({
        model_version: "DIF_V1",
        resolver_version: "DIF_PERSONAL_V1",
        evaluated_at: evaluatedAt,
        status: fixture.evaluation.status,
        personal_level: fixture.evaluation.personal_level,
        uncertainty: fixture.evaluation.uncertainty,
      });
      expect(actual.rationale, fixture.id).toEqual(
        expect.arrayContaining(fixture.evaluation.rationale),
      );
      expect(
        actual.modifiers.map(({ kind, personal_band_delta, changes_proficiency }) => ({
          kind,
          personal_band_delta,
          changes_proficiency,
        })),
        fixture.id,
      ).toEqual(fixture.evaluation.modifiers);
    }
  });

  it("always makes an UNRATED Primary Skill UNKNOWN with null Level and HIGH uncertainty", () => {
    const result = resolvePlayerRelativeDifficulty(
      input(state("hybrid_picking", "UNRATED", null, 0, "UNKNOWN")),
    );
    expect(result).toMatchObject({ status: "UNKNOWN", personal_level: null, uncertainty: "HIGH" });
    expect(result.modifiers).toEqual([]);
  });

  it("keeps ESTIMATED capability provisional and confidence separate from capability", () => {
    const low = resolvePlayerRelativeDifficulty(
      input(state("hybrid_picking", "ESTIMATED", 50, 25, "MODERATE"), establishedSupports()),
    );
    const high = resolvePlayerRelativeDifficulty(
      input(state("hybrid_picking", "ESTIMATED", 50, 55, "MODERATE"), establishedSupports()),
    );
    expect(low.status).toBe("PROVISIONAL");
    expect(high.status).toBe("PROVISIONAL");
    expect(low.personal_level).toBe(high.personal_level);
    expect(low.primary_gap).toBe(high.primary_gap);
    expect(low.uncertainty).toBe("HIGH");
    expect(high.uncertainty).toBe("MODERATE");
  });

  it("is monotonic across proficiency and absolute demand coordinates", () => {
    const levels = [10, 30, 50, 70, 90].map(
      (score) =>
        resolvePlayerRelativeDifficulty(
          input(state("hybrid_picking", "ESTABLISHED", score, 85), establishedSupports()),
        ).personal_level!,
    );
    const indexes = levels.map((level) => ["I", "II", "III", "IV", "V"].indexOf(level));
    expect(indexes).toEqual([...indexes].sort((a, b) => b - a));

    const demands = [20, 40, 60, 80].map((score) => {
      const profile = structuredClone(absolute);
      profile.overall.score = score;
      profile.overall.level = levelFor(score);
      profile.dimensions.TECHNIQUE = {
        applicable: true,
        score,
        level: levelFor(score),
        basis: [],
      };
      return resolvePlayerRelativeDifficulty({
        ...input(state("hybrid_picking", "ESTABLISHED", 50, 85), establishedSupports()),
        absolute_profile: profile,
      }).personal_level!;
    });
    const demandIndexes = demands.map((level) => ["I", "II", "III", "IV", "V"].indexOf(level));
    expect(demandIndexes).toEqual([...demandIndexes].sort((a, b) => a - b));
  });

  it("bounds readiness and novelty to +1 and treats UNKNOWN as uncertainty, not lost capability", () => {
    const primary = state("hybrid_picking", "ESTABLISHED", 50, 82);
    const high = resolvePlayerRelativeDifficulty(input(primary, establishedSupports()));
    const moderate = resolvePlayerRelativeDifficulty(
      input(
        { ...primary, readiness_status: "MODERATE", readiness_score: 55 },
        establishedSupports(),
      ),
    );
    const low = resolvePlayerRelativeDifficulty(
      input({ ...primary, readiness_status: "LOW", readiness_score: 20 }, establishedSupports()),
    );
    const unknown = resolvePlayerRelativeDifficulty(
      input(
        { ...primary, readiness_status: "UNKNOWN", readiness_score: null },
        establishedSupports(),
      ),
    );
    expect(high.personal_level).toBe("III");
    expect(moderate.personal_level).toBe("III");
    expect(low.personal_level).toBe("IV");
    expect(unknown.personal_level).toBe("III");
    expect(unknown.uncertainty).toBe("MODERATE");
    expect(low.modifiers.find((item) => item.kind === "READINESS")?.personal_band_delta).toBe(1);

    const novel = resolvePlayerRelativeDifficulty(input(primary, establishedSupports(), "HIGH"));
    expect(novel.personal_level).toBe("IV");
    expect(novel.modifiers[0].personal_band_delta).toBe(1);
  });

  it("makes supporting bottlenecks explainable, bounded, and never easier", () => {
    const primary = state("hybrid_picking", "ESTABLISHED", 50, 84);
    const matched = resolvePlayerRelativeDifficulty(input(primary, establishedSupports()));
    const lower = resolvePlayerRelativeDifficulty(
      input(primary, [state("scale_mapping", "ESTABLISHED", 20, 82), establishedSupports()[1]]),
    );
    const unrated = resolvePlayerRelativeDifficulty(
      input(primary, [
        state("scale_mapping", "UNRATED", null, 0, "UNKNOWN"),
        establishedSupports()[1],
      ]),
    );
    expect(lower.personal_level).toBe("IV");
    expect(unrated.personal_level).toBe("IV");
    expect(["I", "II", "III", "IV", "V"].indexOf(lower.personal_level!)).toBeGreaterThanOrEqual(
      ["I", "II", "III", "IV", "V"].indexOf(matched.personal_level!),
    );
    expect(unrated).toMatchObject({ status: "PROVISIONAL", uncertainty: "HIGH" });
  });

  it("caps simultaneous modifier composition at one personal band", () => {
    const result = resolvePlayerRelativeDifficulty(
      input(
        state("hybrid_picking", "ESTABLISHED", 50, 82, "LOW"),
        [state("scale_mapping", "UNRATED", null, 0, "UNKNOWN"), establishedSupports()[1]],
        "HIGH",
      ),
    );
    expect(result.modifiers.map((item) => item.personal_band_delta)).toEqual([1, 1, 1]);
    expect(result.applied_modifier_band_delta).toBe(1);
    expect(result.personal_level).toBe("IV");
  });

  it("ignores XP, Character Level, challenge preference, goals, and experience background", () => {
    const base = input(state("hybrid_picking", "ESTABLISHED", 50, 82), establishedSupports());
    const unrelated = {
      ...base,
      practice_xp: 999999,
      character_level: 99,
      challenge_preference: "PUSH_ME",
      goals: ["become famous"],
      experience_background: "EXPERIENCED",
    } as PlayerRelativeDifficultyInput;
    expect(resolvePlayerRelativeDifficulty(unrelated)).toEqual(
      resolvePlayerRelativeDifficulty(base),
    );

    const unrated = {
      ...unrelated,
      skill_states: [state("hybrid_picking", "UNRATED", null, 0, "UNKNOWN")],
    };
    expect(resolvePlayerRelativeDifficulty(unrated).status).toBe("UNKNOWN");
  });

  it("is deterministic for explicit snapshots, identity-invariant, and mutation-free", () => {
    const source = input(state("hybrid_picking", "ESTABLISHED", 50, 82), establishedSupports());
    const before = structuredClone(source);
    const first = resolvePlayerRelativeDifficulty(source);
    const second = resolvePlayerRelativeDifficulty(structuredClone(source));
    expect(second).toEqual(first);
    expect(source).toEqual(before);

    const renamed = structuredClone(source);
    renamed.quest.identity.id = "RENAMED-003";
    renamed.quest.identity.slug = "same_semantics_new_identity";
    const changed = resolvePlayerRelativeDifficulty(renamed);
    expect({ ...changed, quest: first.quest }).toEqual(first);
    expect(source.absolute_profile).toEqual(absolute);
  });

  it("keeps status/uncertainty independent from difficulty magnitude", () => {
    const easy = structuredClone(absolute);
    easy.overall.score = 10;
    easy.overall.level = "I";
    easy.dimensions.TECHNIQUE = { applicable: true, score: 10, level: "I", basis: [] };
    const uncertain = resolvePlayerRelativeDifficulty({
      ...input(state("hybrid_picking", "ESTIMATED", 50, 20, "MODERATE"), establishedSupports()),
      absolute_profile: easy,
    });
    expect(uncertain.personal_level).toBe("II");
    expect(uncertain.uncertainty).toBe("HIGH");

    const hard = structuredClone(absolute);
    hard.overall.score = 100;
    hard.overall.level = "V";
    hard.dimensions.TECHNIQUE = { applicable: true, score: 100, level: "V", basis: [] };
    const certain = resolvePlayerRelativeDifficulty({
      ...input(state("hybrid_picking", "ESTABLISHED", 50, 90), establishedSupports()),
      absolute_profile: hard,
    });
    expect(certain.personal_level).toBe("V");
    expect(certain.uncertainty).toBe("LOW");
  });

  it("rejects unsupported, missing, duplicate, and corrupt snapshots", () => {
    const valid = input(state("hybrid_picking", "ESTABLISHED", 50, 82), establishedSupports());
    expect(() =>
      resolvePlayerRelativeDifficulty({
        ...valid,
        absolute_profile: { ...absolute, model_version: "DIF_V2" as "DIF_V1" },
      }),
    ).toThrow("absolute profile must use DIF_V1");
    expect(() =>
      resolvePlayerRelativeDifficulty({ ...valid, skill_states: establishedSupports() }),
    ).toThrow("Primary Skill snapshot is missing");
    expect(() =>
      resolvePlayerRelativeDifficulty({
        ...valid,
        skill_states: [...valid.skill_states, valid.skill_states[0]],
      }),
    ).toThrow("duplicate Skill snapshot");
    expect(() =>
      resolvePlayerRelativeDifficulty({
        ...valid,
        skill_states: [{ ...valid.skill_states[0], proficiency_score: 120 }],
      }),
    ).toThrow("inconsistent proficiency");
    expect(() =>
      resolvePlayerRelativeDifficulty({
        ...valid,
        context_novelty: { ...valid.context_novelty, status: "NOVEL" as "LOW" },
      }),
    ).toThrow("context novelty status is invalid");
  });

  it("uses a bounded, monotonic gap-to-Level mapping", () => {
    expect([-60, -50, -20, 0, 15, 16, 35, 36, 100].map(personalLevelForGap)).toEqual([
      "I",
      "I",
      "II",
      "III",
      "III",
      "IV",
      "IV",
      "V",
      "V",
    ]);
  });
});
