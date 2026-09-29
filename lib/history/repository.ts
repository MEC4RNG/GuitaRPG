import type { PracticeSessionEvent } from "@/lib/session/runtime";

import {
  buildHistoryAttempts,
  HISTORY_PAGE_SIZE,
  type HistoryAttempt,
  type HistoryCriterion,
  type HistoryEvidence,
  type HistoryQuest,
  type HistoryResult,
  type HistorySession,
} from "./runtime";

type QueryResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

type HistoryQuery<T> = {
  select(columns: string): HistoryQuery<T>;
  eq(column: string, value: string): HistoryQuery<T>;
  in(column: string, values: string[]): HistoryQuery<T>;
  order(column: string, options?: { ascending?: boolean }): HistoryQuery<T>;
  range(from: number, to: number): QueryResult<T>;
  then: QueryResult<T>["then"];
};

export type HistoryReadClient = {
  from(table: string): HistoryQuery<unknown>;
};

export type HistoryPage = { attempts: HistoryAttempt[]; hasMore: boolean };

function queryError(error: { message: string } | null, scope: string) {
  if (error) throw new Error(`History ${scope} read failed: ${error.message}`);
}

async function readRelated(
  client: HistoryReadClient,
  sessions: HistorySession[],
  observedAt: string,
): Promise<HistoryAttempt[]> {
  const sessionIds = sessions.map((session) => session.id);
  const questIds = [...new Set(sessions.map((session) => session.quest_id))];
  const [questsResponse, eventsResponse, resultsResponse] = await Promise.all([
    client.from("quests").select("id,resolved_snapshot").in("id", questIds),
    client
      .from("practice_session_events")
      .select("id,session_id,sequence,event_type,occurred_at,runtime_version")
      .in("session_id", sessionIds)
      .order("session_id")
      .order("sequence"),
    client
      .from("quest_results")
      .select(
        "id,session_id,outcome,meaningful_attempt,confidence_summary,verification_modes,reflection,player_notes,finalized_at",
      )
      .in("session_id", sessionIds),
  ]);
  queryError(questsResponse.error, "Quest");
  queryError(eventsResponse.error, "Session event");
  queryError(resultsResponse.error, "Result");
  const results = (resultsResponse.data ?? []) as HistoryResult[];
  const resultIds = results.map((result) => result.id);
  const [criteriaResponse, evidenceResponse] = resultIds.length
    ? await Promise.all([
        client
          .from("quest_result_criteria")
          .select(
            "result_id,quest_criterion_ordinal,metric,operator,target_value,unit,criterion_state",
          )
          .in("result_id", resultIds)
          .order("quest_criterion_ordinal"),
        client
          .from("quest_result_evidence")
          .select("result_id,criterion_metric,verification_mode,evidence_confidence,rationale")
          .in("result_id", resultIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  queryError(criteriaResponse.error, "criterion");
  queryError(evidenceResponse.error, "evidence");
  const attempts = buildHistoryAttempts({
    sessions,
    quests: (questsResponse.data ?? []) as HistoryQuest[],
    events: (eventsResponse.data ?? []) as PracticeSessionEvent[],
    results,
    criteria: (criteriaResponse.data ?? []) as HistoryCriterion[],
    evidence: (evidenceResponse.data ?? []) as HistoryEvidence[],
    observedAt,
  });
  if (attempts.length !== sessions.length)
    throw new Error("History item data is unavailable. Refresh and try again.");
  return attempts;
}

export async function readHistoryPage(
  client: HistoryReadClient,
  options: { offset?: number; limit?: number; observedAt?: string } = {},
): Promise<HistoryPage> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? HISTORY_PAGE_SIZE;
  const response = await client
    .from("practice_sessions")
    .select("id,quest_id,status,started_at,ended_at,created_at")
    .order("started_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit);
  queryError(response.error, "Session");
  const rows = (response.data ?? []) as HistorySession[];
  const pageRows = rows.slice(0, limit);
  return {
    attempts: await readRelated(client, pageRows, options.observedAt ?? new Date().toISOString()),
    hasMore: rows.length > limit,
  };
}

export async function readHistoryAttempt(
  client: HistoryReadClient,
  sessionId: string,
  observedAt = new Date().toISOString(),
): Promise<HistoryAttempt | null> {
  const response = await client
    .from("practice_sessions")
    .select("id,quest_id,status,started_at,ended_at,created_at")
    .eq("id", sessionId)
    .range(0, 1);
  queryError(response.error, "Session");
  const session = (response.data ?? [])[0] as HistorySession | undefined;
  if (!session) return null;
  return (await readRelated(client, [session], observedAt))[0] ?? null;
}
