import { parseQuest, type Quest } from "./runtime";
import { parseQuestJourney, type QuestJourney, type QuestJourneyStatus } from "./journey-runtime";
import type { SessionStatus } from "@/lib/session/runtime";

export const QUEST_LIBRARY_PAGE_SIZE = 20;
export const RECENT_QUEST_LIMIT = 3;
export const QUEST_DETAIL_SESSION_LIMIT = 5;

export type QuestSessionSummary = {
  id: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  resultOutcome: "ABANDONED" | "ATTEMPTED" | "PARTIAL" | "CLEARED" | null;
};

export type SavedQuestSummary = {
  questId: string;
  quest: Quest;
  journey: QuestJourney;
  sessionCount: number;
  latestSession: QuestSessionSummary | null;
};

export type QuestLibrarySection = {
  status: QuestJourneyStatus;
  title: "Active" | "Saved" | "Concluded" | "Archived" | "Stopped";
  items: SavedQuestSummary[];
};

export type QuestRow = { id: string; resolved_snapshot: unknown };
export type JourneyRow = Record<string, unknown>;
export type SessionRow = {
  id: string;
  quest_id: string;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
};
export type ResultRow = {
  session_id: string;
  outcome: QuestSessionSummary["resultOutcome"];
};
export type SessionSummaryRow = {
  quest_id: string;
  session_count: number | string;
  latest_session_id: string | null;
  latest_session_status: SessionStatus | null;
  latest_session_started_at: string | null;
  latest_session_ended_at: string | null;
  latest_result_outcome: QuestSessionSummary["resultOutcome"];
};

const sectionMetadata: Array<Pick<QuestLibrarySection, "status" | "title">> = [
  { status: "ACTIVE", title: "Active" },
  { status: "SAVED", title: "Saved" },
  { status: "CONCLUDED", title: "Concluded" },
  { status: "ABANDONED", title: "Stopped" },
  { status: "ARCHIVED", title: "Archived" },
];

export function buildSavedQuestSummaries(input: {
  journeys: readonly JourneyRow[];
  quests: readonly QuestRow[];
  summaries: readonly SessionSummaryRow[];
}): SavedQuestSummary[] {
  const quests = new Map(input.quests.map((row) => [row.id, parseQuest(row.resolved_snapshot)]));
  const summaries = new Map(input.summaries.map((row) => [row.quest_id, row]));

  return input.journeys.map((row) => {
    const journey = parseQuestJourney(row);
    const quest = quests.get(journey.questId);
    if (!quest) throw new Error("Saved Quest snapshot is unavailable");
    const summary = summaries.get(journey.questId);
    return {
      questId: journey.questId,
      quest,
      journey,
      sessionCount: Number(summary?.session_count ?? 0),
      latestSession:
        summary?.latest_session_id && summary.latest_session_started_at
          ? {
              id: summary.latest_session_id,
              status: summary.latest_session_status!,
              startedAt: summary.latest_session_started_at,
              endedAt: summary.latest_session_ended_at,
              resultOutcome: summary.latest_result_outcome ?? null,
            }
          : null,
    };
  });
}

export function orderSavedQuests(items: readonly SavedQuestSummary[]) {
  return [...items].sort(
    (left, right) =>
      Date.parse(right.journey.lastWorkedAt) - Date.parse(left.journey.lastWorkedAt) ||
      Date.parse(right.journey.createdAt) - Date.parse(left.journey.createdAt) ||
      right.questId.localeCompare(left.questId),
  );
}

export function groupSavedQuests(items: readonly SavedQuestSummary[]): QuestLibrarySection[] {
  const ordered = orderSavedQuests(items);
  return sectionMetadata.map((section) => ({
    ...section,
    items: ordered.filter((item) => item.journey.lifecycleStatus === section.status),
  }));
}

export function recentActionableQuests(items: readonly SavedQuestSummary[]) {
  return orderSavedQuests(items)
    .filter((item) => ["ACTIVE", "SAVED", "CONCLUDED"].includes(item.journey.lifecycleStatus))
    .slice(0, RECENT_QUEST_LIMIT);
}

export function questOpenLabel(status: QuestJourneyStatus) {
  if (status === "ACTIVE") return "Continue Quest";
  if (status === "SAVED") return "Open Quest";
  if (status === "CONCLUDED") return "View Quest";
  if (status === "ABANDONED") return "View Quest";
  return "View archived Quest";
}

export function sessionAction(session: QuestSessionSummary) {
  if (session.status === "ACTIVE" || session.status === "PAUSED")
    return { label: "Continue Practice", href: `/session/${session.id}` };
  if (!session.resultOutcome)
    return { label: "Record Result", href: `/session/${session.id}/complete` };
  return { label: "View Details", href: `/history/${session.id}` };
}
