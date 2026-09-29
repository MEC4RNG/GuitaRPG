import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { evaluateAbsoluteQuestDemand, levelForScore } from "@/lib/difficulty/dif-v1";
import { DIFFICULTY_DIMENSIONS } from "@/lib/difficulty/types";

// Fixture mutation probes intentionally operate on validated JSON copies.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "..");
const load = <T>(path: string): T => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const quests = load<Json[]>("domain/quest/phase0-quest-fixtures.json");
const difficulty = load<{ absolute_profiles: Json[] }>(
  "domain/difficulty/phase0-difficulty-fixtures.json",
);
const bySlug = new Map(quests.map((quest) => [quest.identity.slug, quest]));
const clone = <T>(value: T): T => structuredClone(value);

describe("DIF-002 DIF_V1 absolute Quest-demand evaluator", () => {
  it("reproduces every accepted absolute reference profile without using curated source", () => {
    for (const expected of difficulty.absolute_profiles) {
      const quest = bySlug.get(expected.quest_slug);
      expect(quest, expected.quest_slug).toBeDefined();
      const actual = evaluateAbsoluteQuestDemand(quest);

      expect(actual.model_version).toBe("DIF_V1");
      expect(actual.source).toBe("COMPUTED");
      for (const dimension of DIFFICULTY_DIMENSIONS) {
        expect(actual.dimensions[dimension], `${expected.quest_slug}:${dimension}`).toMatchObject({
          applicable: expected.dimensions[dimension].applicable,
          score: expected.dimensions[dimension].score,
          level: expected.dimensions[dimension].level,
        });
      }
      expect(actual.overall, expected.quest_slug).toMatchObject(expected.overall);
    }
  });

  it("keeps DORIAN CROSSROADS as the exact integration anchor", () => {
    const profile = evaluateAbsoluteQuestDemand(bySlug.get("dorian_crossroads"));
    expect(
      Object.fromEntries(DIFFICULTY_DIMENSIONS.map((key) => [key, profile.dimensions[key]])),
    ).toMatchObject({
      TECHNIQUE: { applicable: true, score: 56, level: "III" },
      FRETBOARD: { applicable: true, score: 48, level: "III" },
      THEORY: { applicable: true, score: 34, level: "II" },
      RHYTHM: { applicable: true, score: 52, level: "III" },
      CREATIVE: { applicable: false, score: null, level: null },
      TEMPO: { applicable: true, score: 45, level: "III" },
      CONSTRAINT: { applicable: true, score: 51, level: "III" },
    });
    expect(profile.overall).toMatchObject({ score: 54, level: "III" });
  });

  it("structurally and deterministically evaluates all 24 accepted Quests", () => {
    expect(quests).toHaveLength(24);
    for (const quest of quests) {
      const first = evaluateAbsoluteQuestDemand(quest);
      const second = evaluateAbsoluteQuestDemand(clone(quest));
      expect(second, quest.identity.slug).toEqual(first);
      expect(Object.keys(first.dimensions), quest.identity.slug).toEqual(DIFFICULTY_DIMENSIONS);
      for (const dimension of Object.values(first.dimensions)) {
        expect(dimension.basis.length).toBeGreaterThan(0);
        if (!dimension.applicable) {
          expect(dimension.score).toBeNull();
          expect(dimension.level).toBeNull();
        } else {
          expect(dimension.score).toBeGreaterThanOrEqual(0);
          expect(dimension.score).toBeLessThanOrEqual(100);
          expect(dimension.level).toBe(levelForScore(dimension.score));
        }
      }
      expect(first.overall.score).toBeGreaterThanOrEqual(0);
      expect(first.overall.score).toBeLessThanOrEqual(100);
      expect(first.overall.level).toBe(levelForScore(first.overall.score));
    }
  });

  it("maps every boundary score to the accepted Level band", () => {
    expect([0, 19, 20, 39, 40, 59, 60, 79, 80, 100].map((score) => levelForScore(score))).toEqual([
      "I",
      "I",
      "II",
      "II",
      "III",
      "III",
      "IV",
      "IV",
      "V",
      "V",
    ]);
  });

  it("does not use Quest identity, verification, rewards, or Player-like metadata", () => {
    const original = bySlug.get("dorian_crossroads")!;
    const changed = clone(original);
    changed.identity = { ...changed.identity, id: "RENAMED-001", slug: "renamed_demand_probe" };
    changed.verification_profile = {
      allowed_modes: ["SELF"],
      recommended_mode: "SELF",
      verification_required_for_clear: false,
    };
    changed.rewards = {
      policy: "ANOTHER_POLICY",
      fixed_xp: null,
      progression_effects_embedded: false,
    };
    changed.metadata = { player_id: "ignored", xp: 9999, character_level: 99 };
    expect(evaluateAbsoluteQuestDemand(changed)).toEqual(evaluateAbsoluteQuestDemand(original));
  });

  it("keeps tempo monotonic as target BPM increases", () => {
    const low = clone(bySlug.get("alternate_precision_gate")!);
    const high = clone(low);
    low.constraints.find((item: Json) => item.slug === "target_tempo").parameters.bpm = 70;
    low.objective.criteria.find((item: Json) => item.metric === "target_tempo").value = 70;
    high.constraints.find((item: Json) => item.slug === "target_tempo").parameters.bpm = 140;
    high.objective.criteria.find((item: Json) => item.metric === "target_tempo").value = 140;
    expect(evaluateAbsoluteQuestDemand(high).dimensions.TEMPO.score!).toBeGreaterThanOrEqual(
      evaluateAbsoluteQuestDemand(low).dimensions.TEMPO.score!,
    );
  });

  it("keeps time pressure monotonic as a response window shrinks", () => {
    const relaxed = clone(bySlug.get("triad_builder")!);
    const pressured = clone(relaxed);
    relaxed.constraints[0].parameters.seconds = 300;
    relaxed.objective.criteria.find((item: Json) => item.metric === "time_elapsed").value = 300;
    pressured.constraints[0].parameters.seconds = 90;
    pressured.objective.criteria.find((item: Json) => item.metric === "time_elapsed").value = 90;
    expect(evaluateAbsoluteQuestDemand(pressured).dimensions.TEMPO.score!).toBeGreaterThanOrEqual(
      evaluateAbsoluteQuestDemand(relaxed).dimensions.TEMPO.score!,
    );
  });

  it("keeps constraint, fret-span, traversal, and creative-output changes monotonic", () => {
    const inversion = clone(bySlug.get("inversion_hunt")!);
    const constrained = clone(inversion);
    constrained.constraints.push({
      slug: "non_adjacent_strings_only",
      name: "Non-Adjacent Strings Only",
      parameters: {},
    });
    expect(
      evaluateAbsoluteQuestDemand(constrained).dimensions.CONSTRAINT.score!,
    ).toBeGreaterThanOrEqual(evaluateAbsoluteQuestDemand(inversion).dimensions.CONSTRAINT.score!);

    const wider = clone(inversion);
    wider.constraints[0].parameters.max = 18;
    expect(evaluateAbsoluteQuestDemand(wider).dimensions.FRETBOARD.score!).toBeGreaterThanOrEqual(
      evaluateAbsoluteQuestDemand(inversion).dimensions.FRETBOARD.score!,
    );

    const picking = clone(bySlug.get("alternate_precision_gate")!);
    const moreStrings = clone(picking);
    moreStrings.constraints.find((item: Json) => item.slug === "string_set").parameters.strings = [
      1, 2, 3, 4,
    ];
    expect(
      evaluateAbsoluteQuestDemand(moreStrings).dimensions.TECHNIQUE.score!,
    ).toBeGreaterThanOrEqual(evaluateAbsoluteQuestDemand(picking).dimensions.TECHNIQUE.score!);
    expect(
      evaluateAbsoluteQuestDemand(moreStrings).dimensions.FRETBOARD.score!,
    ).toBeGreaterThanOrEqual(evaluateAbsoluteQuestDemand(picking).dimensions.FRETBOARD.score!);

    const motif = clone(bySlug.get("motif_forge")!);
    const moreOutputs = clone(motif);
    moreOutputs.constraints.find((item: Json) => item.slug === "variation_count").parameters.min =
      5;
    moreOutputs.objective.criteria.find(
      (item: Json) => item.metric === "variations_created",
    ).value = 5;
    expect(
      evaluateAbsoluteQuestDemand(moreOutputs).dimensions.CREATIVE.score!,
    ).toBeGreaterThanOrEqual(evaluateAbsoluteQuestDemand(motif).dimensions.CREATIVE.score!);
  });

  it("preserves bottlenecks without reducing overall to max or unweighted mean", () => {
    for (const slug of ["dorian_crossroads", "metric_modulation_shift", "motif_forge"]) {
      const profile = evaluateAbsoluteQuestDemand(bySlug.get(slug));
      const scores = Object.values(profile.dimensions).flatMap((item) =>
        item.applicable ? [item.score] : [],
      );
      const mean = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      expect(profile.overall.score, `${slug}:max`).not.toBe(Math.max(...scores));
      expect(profile.overall.score, `${slug}:mean`).not.toBe(mean);
    }
    expect(evaluateAbsoluteQuestDemand(bySlug.get("metric_modulation_shift")).overall.score).toBe(
      83,
    );
  });

  it("exposes no Player-relative result fields", () => {
    const serialized = JSON.stringify(evaluateAbsoluteQuestDemand(bySlug.get("dorian_crossroads")));
    for (const forbidden of [
      "player",
      "readiness",
      "confidence",
      "uncertainty",
      "personal_level",
      "PROVISIONAL",
      "UNKNOWN",
      "xp",
      "character_level",
      "outcome",
      "recommendation",
    ]) {
      expect(serialized.toLowerCase()).not.toMatch(new RegExp(`"${forbidden.toLowerCase()}"\\s*:`));
    }
  });
});
