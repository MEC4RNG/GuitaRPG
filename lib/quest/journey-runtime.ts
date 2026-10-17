export const QUEST_JOURNEY_STATUSES = [
  "SAVED",
  "ACTIVE",
  "CONCLUDED",
  "ARCHIVED",
  "ABANDONED",
] as const;
export const QUEST_JOURNEY_STAGES = ["MAP", "EXPLORE", "CRAFT"] as const;
export const QUEST_JOURNEY_ACTIONS = [
  "START",
  "CONCLUDE",
  "ABANDON",
  "REOPEN",
  "ARCHIVE",
  "UNARCHIVE",
] as const;

export type QuestJourneyStatus = (typeof QUEST_JOURNEY_STATUSES)[number];
export type QuestJourneyStage = (typeof QUEST_JOURNEY_STAGES)[number];
export type QuestJourneyAction = (typeof QUEST_JOURNEY_ACTIONS)[number];

export type QuestJourney = {
  questId: string;
  playerId: string;
  schemaVersion: 1;
  lifecycleStatus: QuestJourneyStatus;
  currentStage: QuestJourneyStage;
  archivedFromStatus: Exclude<QuestJourneyStatus, "ARCHIVED"> | null;
  openedAt: string | null;
  concludedAt: string | null;
  archivedAt: string | null;
  abandonedAt: string | null;
  lastWorkedAt: string;
  createdAt: string;
  updatedAt: string;
};

const hasText = (value: unknown): value is string => typeof value === "string" && value.length > 0;

export function parseQuestJourney(value: unknown): QuestJourney {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Quest Journey");
  const row = value as Record<string, unknown>;
  if (
    !hasText(row.quest_id) ||
    !hasText(row.player_id) ||
    row.schema_version !== 1 ||
    !QUEST_JOURNEY_STATUSES.includes(row.lifecycle_status as QuestJourneyStatus) ||
    !QUEST_JOURNEY_STAGES.includes(row.current_stage as QuestJourneyStage) ||
    !hasText(row.last_worked_at) ||
    !hasText(row.created_at) ||
    !hasText(row.updated_at)
  )
    throw new Error("Invalid Quest Journey fields");
  return {
    questId: row.quest_id,
    playerId: row.player_id,
    schemaVersion: 1,
    lifecycleStatus: row.lifecycle_status as QuestJourneyStatus,
    currentStage: row.current_stage as QuestJourneyStage,
    archivedFromStatus: (row.archived_from_status as QuestJourney["archivedFromStatus"]) ?? null,
    openedAt: (row.opened_at as string | null) ?? null,
    concludedAt: (row.concluded_at as string | null) ?? null,
    archivedAt: (row.archived_at as string | null) ?? null,
    abandonedAt: (row.abandoned_at as string | null) ?? null,
    lastWorkedAt: row.last_worked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
