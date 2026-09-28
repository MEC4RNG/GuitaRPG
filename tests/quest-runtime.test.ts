import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseQuest, toQuestPersistenceInput } from "@/lib/quest/runtime";

const fixtures = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../domain/quest/phase0-quest-fixtures.json"), "utf8"),
) as unknown[];
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
type MutableObject = Record<string, unknown>;
const object = (value: unknown): MutableObject => value as MutableObject;
const list = (value: unknown): unknown[] => value as unknown[];

describe("QST-002 Quest runtime", () => {
  it("validates every accepted Phase 0 resolved Quest fixture", () => {
    expect(fixtures).toHaveLength(24);
    for (const fixture of fixtures) expect(parseQuest(fixture).identity.schema_version).toBe(1);
  });

  it("round-trips DORIAN CROSSROADS as a resolved immutable persistence payload", () => {
    const dorian = fixtures.find(
      (value) => (value as { identity: { slug: string } }).identity.slug === "dorian_crossroads",
    );
    const payload = toQuestPersistenceInput(dorian);
    expect(payload.execution.primary_skill.slug).toBe("hybrid_picking");
    expect(payload.execution.secondary_skills.map((item) => item.slug)).toEqual([
      "scale_mapping",
      "syncopation_control",
    ]);
    expect(payload.resolved_snapshot.objective.criteria).toContainEqual(
      expect.objectContaining({ metric: "target_tempo", value: 90 }),
    );
    expect(payload.rewards.fixed_xp).toBeNull();
  });

  it.each([
    ["missing primary", (q: MutableObject) => delete object(q.execution).primary_skill],
    [
      "multiple primary",
      (q: MutableObject) =>
        list(object(q.execution).secondary_skills).push({
          ...object(object(q.execution).primary_skill),
          role: "SECONDARY_SKILL",
        }),
    ],
    [
      "too many secondaries",
      (q: MutableObject) =>
        list(object(q.execution).secondary_skills).push(
          { slug: "x", name: "X", domain: "rhythm", role: "SECONDARY_SKILL" },
          { slug: "y", name: "Y", domain: "rhythm", role: "SECONDARY_SKILL" },
          { slug: "z", name: "Z", domain: "rhythm", role: "SECONDARY_SKILL" },
        ),
    ],
    [
      "duplicate role",
      (q: MutableObject) =>
        list(object(q.execution).required_techniques).push({
          ...object(object(q.execution).primary_skill),
          role: "REQUIRED_TECHNIQUE",
        }),
    ],
    ["no concepts", (q: MutableObject) => (q.concepts = [])],
    ["no constraints", (q: MutableObject) => (q.constraints = [])],
    [
      "too many constraints",
      (q: MutableObject) => list(q.constraints).push(...clone(list(q.constraints))),
    ],
    ["empty criteria", (q: MutableObject) => (object(q.objective).criteria = [])],
    [
      "bad operator",
      (q: MutableObject) => (object(list(object(q.objective).criteria)[0]).operator = "GT"),
    ],
    ["bad type", (q: MutableObject) => (object(q.identity).type = "RANDOM")],
    ["bad mode", (q: MutableObject) => (object(q.purpose).generation_mode = "AUTO")],
    ["mastery", (q: MutableObject) => (object(q.completion_contract).mastery_claimed = true)],
    ["outcome", (q: MutableObject) => (q.outcome = "CLEARED")],
    ["result", (q: MutableObject) => (q.result = {})],
    ["reflection", (q: MutableObject) => (q.reflection = "great")],
    ["progression", (q: MutableObject) => (q.progression = {})],
    [
      "bad verification",
      (q: MutableObject) => (object(q.verification_profile).allowed_modes = ["MIC"]),
    ],
    ["unsupported version", (q: MutableObject) => (object(q.identity).schema_version = 2)],
  ])("rejects %s", (_name, mutate) => {
    const value = clone(fixtures[0]);
    mutate(object(value));
    expect(() => parseQuest(value)).toThrow("Invalid Quest");
  });
});
