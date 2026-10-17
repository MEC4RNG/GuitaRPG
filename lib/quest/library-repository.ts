import {
  buildSavedQuestSummaries,
  QUEST_DETAIL_SESSION_LIMIT,
  QUEST_LIBRARY_PAGE_SIZE,
  RECENT_QUEST_LIMIT,
  type JourneyRow,
  type QuestRow,
  type ResultRow,
  type SavedQuestSummary,
  type SessionSummaryRow,
  type SessionRow,
} from "./library-runtime";

type ErrorValue = { message: string } | null;
type Result<T> = PromiseLike<{ data: T[] | null; error: ErrorValue }>;
type Query<T> = {
  select(columns: string): Query<T>;
  eq(column: string, value: string): Query<T>;
  in(column: string, values: string[]): Query<T>;
  order(column: string, options?: { ascending?: boolean }): Query<T>;
  range(from: number, to: number): Result<T>;
  limit(count: number): Result<T>;
  then: Result<T>["then"];
};

export type QuestLibraryClient = {
  rpc(
    name: string,
    parameters?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: ErrorValue }>;
  from(table: string): Query<unknown>;
};

export type QuestLibraryPage = { items: SavedQuestSummary[]; hasMore: boolean };

function check(error: ErrorValue, scope: string) {
  if (error) throw new Error(`Saved Quest ${scope} failed: ${error.message}`);
}

export async function ensurePlayerQuestJourneys(client: QuestLibraryClient) {
  const response = await client.rpc("ensure_player_quest_journeys");
  check(response.error, "overlay ensure");
  return Number(response.data ?? 0);
}

async function hydrate(client: QuestLibraryClient, journeys: JourneyRow[]) {
  if (!journeys.length) return [];
  const questIds = journeys.map((row) => String(row.quest_id));
  const [questsResponse, summaryResponse] = await Promise.all([
    client.from("quests").select("id,resolved_snapshot").in("id", questIds),
    client.rpc("read_player_quest_session_summaries", { p_quest_ids: questIds }),
  ]);
  check(questsResponse.error, "Quest read");
  check(summaryResponse.error, "Session summary read");
  return buildSavedQuestSummaries({
    journeys,
    quests: (questsResponse.data ?? []) as QuestRow[],
    summaries: (summaryResponse.data ?? []) as SessionSummaryRow[],
  });
}

export async function readQuestLibraryPage(
  client: QuestLibraryClient,
  options: { offset?: number; limit?: number } = {},
): Promise<QuestLibraryPage> {
  await ensurePlayerQuestJourneys(client);
  const offset = options.offset ?? 0;
  const limit = options.limit ?? QUEST_LIBRARY_PAGE_SIZE;
  const response = await client
    .from("player_quest_journeys")
    .select("*")
    .order("last_worked_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("quest_id", { ascending: false })
    .range(offset, offset + limit);
  check(response.error, "library read");
  const rows = (response.data ?? []) as JourneyRow[];
  return { items: await hydrate(client, rows.slice(0, limit)), hasMore: rows.length > limit };
}

export async function readRecentQuestJourneys(client: QuestLibraryClient) {
  await ensurePlayerQuestJourneys(client);
  const response = await client
    .from("player_quest_journeys")
    .select("*")
    .in("lifecycle_status", ["ACTIVE", "SAVED", "CONCLUDED"])
    .order("last_worked_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("quest_id", { ascending: false })
    .limit(RECENT_QUEST_LIMIT);
  check(response.error, "recent read");
  return hydrate(client, (response.data ?? []) as JourneyRow[]);
}

export async function readQuestJourneyDetail(client: QuestLibraryClient, questId: string) {
  const journeyResponse = await client
    .from("player_quest_journeys")
    .select("*")
    .eq("quest_id", questId)
    .limit(1);
  check(journeyResponse.error, "detail read");
  const journey = (journeyResponse.data ?? [])[0] as JourneyRow | undefined;
  if (!journey) return null;
  const items = await hydrate(client, [journey]);
  const item = items[0] ?? null;
  if (!item) return null;
  const sessionsResponse = await client
    .from("practice_sessions")
    .select("id,quest_id,status,started_at,ended_at")
    .eq("quest_id", questId)
    .order("started_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(QUEST_DETAIL_SESSION_LIMIT);
  check(sessionsResponse.error, "recent Session read");
  const sessions = (sessionsResponse.data ?? []) as SessionRow[];
  const ids = sessions.map((row) => row.id);
  const resultResponse = ids.length
    ? await client.from("quest_results").select("session_id,outcome").in("session_id", ids)
    : { data: [], error: null };
  check(resultResponse.error, "recent Result read");
  const resultMap = new Map(
    ((resultResponse.data ?? []) as ResultRow[]).map((row) => [row.session_id, row.outcome]),
  );
  return {
    ...item,
    recentSessions: sessions.map((row) => ({
      id: row.id,
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      resultOutcome: resultMap.get(row.id) ?? null,
    })),
  };
}
