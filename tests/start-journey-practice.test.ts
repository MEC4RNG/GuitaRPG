import { describe, expect, it, vi } from "vitest";

import {
  startJourneyPractice,
  type JourneyPracticeClient,
} from "@/lib/quest/start-journey-practice";
import type { QuestJourney } from "@/lib/quest/journey-runtime";

const timestamp = "2026-10-17T12:00:00.000Z";

function journey(lifecycleStatus: QuestJourney["lifecycleStatus"]): QuestJourney {
  return {
    questId: "quest-1",
    playerId: "player-1",
    schemaVersion: 1,
    lifecycleStatus,
    currentStage: "MAP",
    archivedFromStatus: lifecycleStatus === "ARCHIVED" ? "ACTIVE" : null,
    openedAt: null,
    concludedAt: null,
    archivedAt: lifecycleStatus === "ARCHIVED" ? timestamp : null,
    abandonedAt: null,
    lastWorkedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function client() {
  const rpc = vi.fn(async (name: string, parameters: Record<string, unknown>) => {
    if (name === "transition_quest_journey") {
      return {
        data: {
          quest_id: parameters.p_quest_id,
          player_id: "player-1",
          schema_version: 1,
          lifecycle_status: "ACTIVE",
          current_stage: "EXPLORE",
          archived_from_status: null,
          opened_at: timestamp,
          concluded_at: null,
          archived_at: null,
          abandoned_at: null,
          last_worked_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
        },
        error: null,
      };
    }
    return {
      data: { id: "session-1", quest_id: parameters.p_quest_id },
      error: null,
    };
  });
  return { rpc } as unknown as JourneyPracticeClient & { rpc: typeof rpc };
}

describe("QST-007 shared Journey practice entry", () => {
  it.each([
    ["SAVED", "START"],
    ["ACTIVE", "START"],
    ["CONCLUDED", "REOPEN"],
    ["ABANDONED", "REOPEN"],
  ] as const)(
    "transitions %s correctly before starting exactly one Session",
    async (status, action) => {
      const api = client();
      const result = await startJourneyPractice(api, journey(status));

      expect(api.rpc).toHaveBeenCalledTimes(2);
      expect(api.rpc).toHaveBeenNthCalledWith(1, "transition_quest_journey", {
        p_quest_id: "quest-1",
        p_action: action,
      });
      expect(api.rpc).toHaveBeenNthCalledWith(2, "start_practice_session", {
        p_quest_id: "quest-1",
      });
      expect(result.journey.lifecycleStatus).toBe("ACTIVE");
      expect(result.session).toMatchObject({ id: "session-1", quest_id: "quest-1" });
    },
  );

  it("refuses archived Journeys before any mutation", async () => {
    const api = client();
    await expect(startJourneyPractice(api, journey("ARCHIVED"))).rejects.toThrow(
      "Restore this archived Quest",
    );
    expect(api.rpc).not.toHaveBeenCalled();
  });
});
