import { describe, expect, it } from "vitest";

import { generateQuickQuest } from "@/lib/quest/generator";
import type { SavedQuestSummary } from "@/lib/quest/library-runtime";
import type { QuestJourneyStatus } from "@/lib/quest/journey-runtime";
import { filterLoadedQuests, questCriterionLabel, questDomainIdentity, questDomains } from "@/lib/ux/quest-discovery";

function item(domain: "technique" | "fretboard", lifecycleStatus: QuestJourneyStatus): SavedQuestSummary {
  const quest = generateQuickQuest({ primary_domain: domain, seed: domain }).quest;
  return {
    questId: quest.identity.id,
    quest,
    journey: {
      questId: quest.identity.id, playerId: "player", schemaVersion: 1, lifecycleStatus, currentStage: "MAP",
      archivedFromStatus: lifecycleStatus === "ARCHIVED" ? "SAVED" : null,
      openedAt: null, concludedAt: null, archivedAt: null, abandonedAt: null,
      lastWorkedAt: "2026-11-27T00:00:00Z", createdAt: "2026-11-27T00:00:00Z", updatedAt: "2026-11-27T00:00:00Z",
    },
    sessionCount: 0,
    latestSession: null,
  };
}

describe("F3B Quest discovery presentation", () => {
  it("recognizes canonical domain identities without inventing an unknown domain", () => {
    expect(questDomains).toHaveLength(6);
    const quest = item("technique", "SAVED").quest;
    expect(questDomainIdentity(quest)?.name).toBe("Technique");
    expect(questDomainIdentity({ ...quest, purpose: { ...quest.purpose, primary_domain: "unmapped" } })).toBeNull();
  });

  it("filters only loaded summaries by matching terms, lifecycle and domain without mutating records", () => {
    const first = item("technique", "SAVED");
    const second = item("fretboard", "ARCHIVED");
    const loaded = [first, second];
    const before = structuredClone(loaded);
    expect(filterLoadedQuests(loaded, { search: "", status: "ALL", domain: "" })).toEqual(loaded);
    expect(filterLoadedQuests(loaded, { search: first.quest.execution.primary_skill.name.toUpperCase(), status: "SAVED", domain: "technique" })).toEqual([first]);
    expect(filterLoadedQuests(loaded, { search: "", status: "ARCHIVED", domain: "fretboard" })).toEqual([second]);
    expect(filterLoadedQuests(loaded, { search: "unmatched", status: "ALL", domain: "" })).toEqual([]);
    expect(loaded).toEqual(before);
  });

  it("describes actual criterion comparisons and units", () => {
    expect(questCriterionLabel({ metric: "target_tempo", operator: "GTE", value: 90, unit: "BPM" })).toBe("Target Tempo: at least 90 BPM");
    expect(questCriterionLabel({ metric: "constraint_compliance", operator: "EQ", value: true, unit: "" })).toBe("Constraint Compliance: equals Yes");
    expect(questCriterionLabel({ metric: "time_limit", operator: "LTE", value: 120, unit: "seconds" })).toBe("Time Limit: at most 120 seconds");
  });
});
