import {
  deriveRecordedActiveSeconds,
  type PracticeSessionEvent,
  type SessionStatus,
} from "@/lib/session/runtime";
import type { Quest } from "@/lib/quest/runtime";

export const HISTORY_PAGE_SIZE = 20;

export type HistorySession = {
  id: string;
  quest_id: string;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

export type HistoryResult = {
  id: string;
  session_id: string;
  outcome: "ABANDONED" | "ATTEMPTED" | "PARTIAL" | "CLEARED";
  meaningful_attempt: boolean;
  confidence_summary: "LOW" | "MODERATE" | "HIGH" | "MIXED";
  verification_modes: string[];
  reflection: "TOO_EASY" | "GOOD_CHALLENGE" | "TOO_HARD" | null;
  player_notes: string | null;
  finalized_at: string;
};

export type HistoryCriterion = {
  result_id: string;
  quest_criterion_ordinal: number;
  metric: string;
  operator: string;
  target_value: string | number | boolean;
  unit: string;
  criterion_state: "MET" | "NOT_MET" | "UNKNOWN" | "NOT_EVALUATED";
};

export type HistoryEvidence = {
  result_id: string;
  criterion_metric: string;
  verification_mode: string;
  evidence_confidence: "LOW" | "MODERATE" | "HIGH";
  rationale: string | null;
};

export type HistoryQuest = { id: string; resolved_snapshot: Quest };

export type HistoryAttempt = {
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  activeSeconds: number;
  lifecycle: {
    status: SessionStatus;
    label: "In progress" | "Paused" | "Result pending" | HistoryResult["outcome"];
  };
  action: { label: "Continue practice" | "Record Result" | "View details"; href: string };
  quest: {
    title: string;
    type: string;
    primaryDomain: string;
    primarySkill: string;
    objective: string;
  };
  result: (HistoryResult & { criteria: HistoryCriterion[]; evidence: HistoryEvidence[] }) | null;
};

export function orderSessions(sessions: readonly HistorySession[]) {
  return [...sessions].sort(
    (left, right) =>
      Date.parse(right.started_at) - Date.parse(left.started_at) || right.id.localeCompare(left.id),
  );
}

export function pageHistorySessions(
  sessions: readonly HistorySession[],
  offset: number,
  limit = HISTORY_PAGE_SIZE,
) {
  return orderSessions(sessions).slice(offset, offset + limit);
}

function lifecycleFor(session: HistorySession, result: HistoryResult | undefined) {
  if (session.status === "ACTIVE")
    return {
      lifecycle: { status: session.status, label: "In progress" as const },
      action: { label: "Continue practice" as const, href: `/session/${session.id}` },
    };
  if (session.status === "PAUSED")
    return {
      lifecycle: { status: session.status, label: "Paused" as const },
      action: { label: "Continue practice" as const, href: `/session/${session.id}` },
    };
  if (!result)
    return {
      lifecycle: { status: session.status, label: "Result pending" as const },
      action: { label: "Record Result" as const, href: `/session/${session.id}/complete` },
    };
  return {
    lifecycle: { status: session.status, label: result.outcome },
    action: { label: "View details" as const, href: `/history/${session.id}` },
  };
}

export function buildHistoryAttempts(input: {
  sessions: readonly HistorySession[];
  quests: readonly HistoryQuest[];
  events: readonly PracticeSessionEvent[];
  results: readonly HistoryResult[];
  criteria: readonly HistoryCriterion[];
  evidence: readonly HistoryEvidence[];
  observedAt: string;
}): HistoryAttempt[] {
  const quests = new Map(input.quests.map((quest) => [quest.id, quest]));
  const results = new Map(input.results.map((result) => [result.session_id, result]));
  const eventGroups = new Map<string, PracticeSessionEvent[]>();
  for (const event of input.events) {
    eventGroups.set(event.session_id, [...(eventGroups.get(event.session_id) ?? []), event]);
  }

  return orderSessions(input.sessions).flatMap((session) => {
    const quest = quests.get(session.quest_id);
    const events = eventGroups.get(session.id);
    if (!quest || !events?.length) return [];
    const result = results.get(session.id);
    const state = lifecycleFor(session, result);
    const activeSeconds = deriveRecordedActiveSeconds(
      events,
      session.status === "ACTIVE" ? input.observedAt : undefined,
    );
    const snapshot = quest.resolved_snapshot;
    return [
      {
        sessionId: session.id,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        activeSeconds,
        lifecycle: state.lifecycle,
        action: state.action,
        quest: {
          title: snapshot.identity.title,
          type: snapshot.identity.type,
          primaryDomain: snapshot.purpose.primary_domain,
          primarySkill: snapshot.execution.primary_skill.name,
          objective: snapshot.objective.summary,
        },
        result: result
          ? {
              ...result,
              criteria: input.criteria
                .filter((criterion) => criterion.result_id === result.id)
                .sort(
                  (left, right) => left.quest_criterion_ordinal - right.quest_criterion_ordinal,
                ),
              evidence: input.evidence.filter((item) => item.result_id === result.id),
            }
          : null,
      },
    ];
  });
}

export const criterionStateLabel: Record<HistoryCriterion["criterion_state"], string> = {
  MET: "Met",
  NOT_MET: "Not met",
  UNKNOWN: "Unknown",
  NOT_EVALUATED: "Not evaluated",
};

export const verificationModeLabel: Record<string, string> = {
  SELF: "Self-reported",
  SESSION: "Session recorded",
  AUDIO_ASSISTED: "Audio assisted",
  DIRECT_AUDIO: "Direct audio assisted",
  APP_VERIFIED: "App verified",
};

export const reflectionLabel: Record<NonNullable<HistoryResult["reflection"]>, string> = {
  TOO_EASY: "Too easy",
  GOOD_CHALLENGE: "Good challenge",
  TOO_HARD: "Too hard",
};
