import { describe, expect, it } from "vitest";

import { codexQuestRelevance, findCodexPeekEntry } from "@/lib/codex/peek-v1";
import { resolveCodexReference } from "@/lib/quest/codex-references";

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
