import type { ControlEvent } from "./controls/runtime";
import { deriveLatestBpm, deriveRepCount } from "./controls/runtime";
import type { PracticeSession } from "./runtime";

export type SessionRpcClient = {
  rpc(
    functionName: string,
    parameters: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

async function invoke<T>(
  client: SessionRpcClient,
  functionName: string,
  parameters: Record<string, unknown>,
) {
  const { data, error } = await client.rpc(functionName, parameters);
  if (error) throw new Error(`Session RPC ${functionName} failed: ${error.message}`);
  return data as T;
}

export function startPracticeSession(client: SessionRpcClient, questId: string) {
  return invoke<PracticeSession>(client, "start_practice_session", { p_quest_id: questId });
}

export function pausePracticeSession(client: SessionRpcClient, sessionId: string) {
  return invoke<PracticeSession>(client, "pause_practice_session", { p_session_id: sessionId });
}

export function resumePracticeSession(client: SessionRpcClient, sessionId: string) {
  return invoke<PracticeSession>(client, "resume_practice_session", { p_session_id: sessionId });
}

export function endPracticeSession(client: SessionRpcClient, sessionId: string) {
  return invoke<PracticeSession>(client, "end_practice_session", { p_session_id: sessionId });
}

export type SessionControlClient = SessionRpcClient & {
  from(table: "practice_session_control_events"): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): {
        order(column: string): PromiseLike<{
          data: ControlEvent[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export async function readSessionControls(
  client: SessionControlClient,
  sessionId: string,
  fallbackBpm?: number,
) {
  const { data, error } = await client
    .from("practice_session_control_events")
    .select("sequence,event_type,payload")
    .eq("session_id", sessionId)
    .order("sequence");
  if (error) throw new Error(`Session control read failed: ${error.message}`);
  const events = data ?? [];
  return { events, repCount: deriveRepCount(events), bpm: deriveLatestBpm(events, fallbackBpm) };
}

export function adjustPracticeSessionReps(
  client: SessionRpcClient,
  sessionId: string,
  delta: 1 | -1,
) {
  return invoke<ControlEvent>(client, "adjust_practice_session_reps", {
    p_session_id: sessionId,
    p_delta: delta,
  });
}

export function setPracticeSessionMetronomeBpm(
  client: SessionRpcClient,
  sessionId: string,
  bpm: number,
) {
  return invoke<ControlEvent>(client, "set_practice_session_metronome_bpm", {
    p_session_id: sessionId,
    p_bpm: bpm,
  });
}
