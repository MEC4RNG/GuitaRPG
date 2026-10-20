import { describe, expect, it } from "vitest";

import { codexQuestRelevance, findCodexPeekEntry } from "@/lib/codex/peek-v1";
import { generateCustomQuest } from "@/lib/quest/generator";
import { questCodexReferences, resolveCodexReference } from "@/lib/quest/codex-references";

describe("CODEX-002 contextual Codex Peek", () => {
  it("resolves authoritative content while retaining snapshot presentation", () => {
    const reference = resolveCodexReference(
      "CONSTRAINT",
      { slug: "target_tempo", name: "Historical Tempo Label" },
      "constraint",
      "90 BPM",
    );
    expect(reference).toMatchObject({ name: "Historical Tempo Label", parameter: "90 BPM" });
    expect(findCodexPeekEntry(reference)).toMatchObject({ slug: "target_tempo" });
  });

  it("uses bounded role-specific Quest relevance", () => {
    expect(codexQuestRelevance("primary_skill")).toContain("primary skill");
    expect(codexQuestRelevance("secondary_skill")).toContain("supports");
    expect(codexQuestRelevance("required_technique")).toContain("required");
    expect(codexQuestRelevance("constraint")).toContain("boundary");
  });

  it("resolves every supported Quest reference category through the authoritative catalog", () => {
    const quest = generateCustomQuest({
      seed: "codex-002-coverage",
      primary_skill: "hybrid_picking",
      secondary_skills: ["scale_mapping"],
      concepts: ["dorian"],
      tuning: "dadgad",
      target_tempo_bpm: 90,
    }).quest;
    quest.execution.required_techniques = [
      {
        slug: "alternate_picking",
        name: "Alternate Picking",
        domain: "Technique",
        role: "REQUIRED_TECHNIQUE",
      },
    ];
    const references = questCodexReferences(quest);
    const supported = [
      references.primarySkill,
      references.secondarySkills[0],
      references.requiredTechniques[0],
      references.concepts[0],
      references.contexts.find((item) => item.role === "tuning")!,
      references.constraints.find((item) => item.slug === "target_tempo")!,
    ];

    expect(supported.map((reference) => findCodexPeekEntry(reference)?.slug)).toEqual([
      "hybrid_picking",
      "scale_mapping",
      "alternate_picking",
      "dorian",
      "dadgad",
      "target_tempo",
    ]);
    expect(supported.at(-1)?.parameter).toBe("90 BPM");
  });

  it("does not substitute missing historical references", () => {
    const missing = resolveCodexReference(
      "SKILL",
      { slug: "retired_skill", name: "Retired Historical Skill" },
      "secondary_skill",
    );
    expect(missing.href).toBeNull();
    expect(findCodexPeekEntry(missing)).toBeNull();
  });
});
