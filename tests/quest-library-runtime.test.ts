import { describe, expect, it } from "vitest";

import { generateQuickQuest } from "@/lib/quest/generator";
import {
  buildSavedQuestSummaries,
  groupSavedQuests,
  QUEST_LIBRARY_PAGE_SIZE,
  recentActionableQuests,
  sessionAction,
} from "@/lib/quest/library-runtime";

const quest = generateQuickQuest({
  seed: "qst-007",
  id: "20000000-0000-4000-8000-000000000000",
  generated_at: "2026-10-17T00:00:00Z",
}).quest;
const journey = (id: string, status: string, worked: string, created = worked) => ({
  quest_id: id,
  player_id: "10000000-0000-4000-8000-000000000001",
  schema_version: 1,
  lifecycle_status: status,
  current_stage: "MAP",
  archived_from_status: status === "ARCHIVED" ? "SAVED" : null,
  opened_at: null,
  concluded_at: null,
  archived_at: status === "ARCHIVED" ? worked : null,
  abandoned_at: null,
  last_worked_at: worked,
  created_at: created,
  updated_at: worked,
});

function summary(id: string, status: string, worked: string) {
  return buildSavedQuestSummaries({
    journeys: [journey(id, status, worked)],
    quests: [{ id, resolved_snapshot: { ...quest, identity: { ...quest.identity, id } } }],
    summaries: [],
  })[0];
}

describe("QST-007 Saved Quest read model", () => {
  it("classifies every lifecycle truthfully, including abandoned as Stopped", () => {
    const items = ["ACTIVE", "SAVED", "CONCLUDED", "ABANDONED", "ARCHIVED"].map((status, index) =>
      summary(
        `20000000-0000-4000-8000-00000000000${index}`,
        status,
        `2026-10-${10 + index}T00:00:00Z`,
      ),
    );
    const sections = groupSavedQuests(items);
    expect(sections.map((section) => section.title)).toEqual([
      "Active",
      "Saved",
      "Concluded",
      "Stopped",
      "Archived",
    ]);
    expect(
      sections.find((section) => section.title === "Stopped")?.items[0].journey.lifecycleStatus,
    ).toBe("ABANDONED");
  });

  it("orders deterministically and caps only recents at three actionable Quests", () => {
    const items = [
      summary("20000000-0000-4000-8000-000000000001", "SAVED", "2026-10-10T00:00:00Z"),
      summary("20000000-0000-4000-8000-000000000002", "ACTIVE", "2026-10-14T00:00:00Z"),
      summary("20000000-0000-4000-8000-000000000003", "CONCLUDED", "2026-10-13T00:00:00Z"),
      summary("20000000-0000-4000-8000-000000000004", "SAVED", "2026-10-12T00:00:00Z"),
      summary("20000000-0000-4000-8000-000000000005", "ARCHIVED", "2026-10-15T00:00:00Z"),
    ];
    expect(QUEST_LIBRARY_PAGE_SIZE).toBe(20);
    expect(recentActionableQuests(items).map((item) => item.questId)).toEqual([
      "20000000-0000-4000-8000-000000000002",
      "20000000-0000-4000-8000-000000000003",
      "20000000-0000-4000-8000-000000000004",
    ]);
  });

  it("aggregates Session count, latest Session and Session-result wording inputs", () => {
    const id = "20000000-0000-4000-8000-000000000001";
    const item = buildSavedQuestSummaries({
      journeys: [journey(id, "ACTIVE", "2026-10-15T00:00:00Z")],
      quests: [{ id, resolved_snapshot: { ...quest, identity: { ...quest.identity, id } } }],
      summaries: [
        {
          quest_id: id,
          session_count: 2,
          latest_session_id: "s2",
          latest_session_status: "ENDED",
          latest_session_started_at: "2026-10-11T00:00:00Z",
          latest_session_ended_at: "2026-10-11T01:00:00Z",
          latest_result_outcome: "CLEARED",
        },
      ],
    })[0];
    expect(item.sessionCount).toBe(2);
    expect(item.latestSession).toMatchObject({ id: "s2", resultOutcome: "CLEARED" });
    expect(sessionAction(item.latestSession!)).toEqual({
      label: "View Details",
      href: "/history/s2",
    });
  });

  it("fails closed when the immutable Quest snapshot is missing or malformed", () => {
    expect(() =>
      buildSavedQuestSummaries({
        journeys: [journey("missing", "SAVED", "2026-10-10T00:00:00Z")],
        quests: [],
        summaries: [],
      }),
    ).toThrow("snapshot is unavailable");
  });
});
