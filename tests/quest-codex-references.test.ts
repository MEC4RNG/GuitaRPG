import { generateCustomQuest } from "@/lib/quest/generator";
import { questCodexReferences, resolveCodexReference } from "@/lib/quest/codex-references";
import { describe, expect, it } from "vitest";

const dorian = generateCustomQuest({
  seed: "qst-004-dorian",
  primary_skill: "hybrid_picking",
  secondary_skills: ["scale_mapping", "syncopation_control"],
  concepts: ["dorian", "eighth_note_subdivision", "syncopation"],
  tonal_center: "E",
  tuning: "dadgad",
  target_tempo_bpm: 90,
  strings: [2, 3, 4, 5],
  fret_range: { min: 5, max: 12 },
}).quest;

describe("QST-004 Quest Codex resolver", () => {
  it("maps snapshot-authoritative Skill, Concept, Constraint, and Context names", () => {
    const refs = questCodexReferences(dorian);
    expect(refs.primarySkill).toMatchObject({
      name: "Hybrid Picking",
      href: "/codex/skills/hybrid_picking",
    });
    expect(refs.secondarySkills.map((item) => item.href)).toEqual([
      "/codex/skills/scale_mapping",
      "/codex/skills/syncopation_control",
    ]);
    expect(refs.concepts.map((item) => item.href)).toEqual(
      expect.arrayContaining([
        "/codex/concepts/dorian",
        "/codex/concepts/eighth_note_subdivision",
        "/codex/concepts/syncopation",
      ]),
    );
    expect(refs.constraints.find((item) => item.slug === "target_tempo")).toMatchObject({
      href: "/codex/constraints/target_tempo",
      parameter: "90 BPM",
    });
    expect(refs.contexts.find((item) => item.slug === "dadgad")).toMatchObject({
      name: "DADGAD",
      href: "/codex/contexts/dadgad",
    });
    expect(refs.contexts.find((item) => item.slug === "tonal_center")).toMatchObject({
      name: "Tonal Center",
      parameter: "E",
      href: "/codex/contexts/tonal_center",
    });
  });

  it("resolves required Techniques as Skills", () => {
    const withTechnique = structuredClone(dorian);
    withTechnique.execution.required_techniques = [
      {
        slug: "alternate_picking",
        name: "Historical Alternate Picking",
        domain: "Technique",
        role: "REQUIRED_TECHNIQUE",
      },
    ];
    expect(questCodexReferences(withTechnique).requiredTechniques[0]).toMatchObject({
      kind: "SKILL",
      name: "Historical Alternate Picking",
      href: "/codex/skills/alternate_picking",
    });
  });

  it("falls back to snapshot text when current Codex content is unavailable", () => {
    expect(
      resolveCodexReference(
        "SKILL",
        { slug: "retired_skill", name: "Historical Skill" },
        "primary_skill",
      ),
    ).toEqual({
      kind: "SKILL",
      slug: "retired_skill",
      name: "Historical Skill",
      role: "primary_skill",
      href: null,
    });
  });
});
