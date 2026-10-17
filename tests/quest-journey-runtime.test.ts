import { describe, expect, it } from "vitest";

import { parseQuestJourney } from "@/lib/quest/journey-runtime";

const row = {
  quest_id: "20000000-0000-4000-8000-000000000001",
  player_id: "10000000-0000-4000-8000-000000000001",
  schema_version: 1,
  lifecycle_status: "SAVED",
  current_stage: "MAP",
  archived_from_status: null,
  opened_at: null,
  concluded_at: null,
  archived_at: null,
  abandoned_at: null,
  last_worked_at: "2026-10-17T12:00:00Z",
  created_at: "2026-10-17T12:00:00Z",
  updated_at: "2026-10-17T12:00:00Z",
};

describe("Quest Journey runtime", () => {
  it("maps the trusted database row into domain casing", () => {
    expect(parseQuestJourney(row)).toEqual(
      expect.objectContaining({
        questId: row.quest_id,
        playerId: row.player_id,
        lifecycleStatus: "SAVED",
        currentStage: "MAP",
      }),
    );
  });

  it.each([
    { ...row, lifecycle_status: "MASTERED" },
    { ...row, current_stage: "LOCKED" },
    { ...row, schema_version: 2 },
    { ...row, quest_id: "" },
  ])("rejects an invalid database row", (value) => {
    expect(() => parseQuestJourney(value)).toThrow("Invalid Quest Journey");
  });
});
