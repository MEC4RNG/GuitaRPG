import type { PracticeSession } from "./runtime";

export type SessionRpcClient = {
  rpc(
    functionName: string,
    parameters: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

async function invoke(
  client: SessionRpcClient,
  functionName: string,
  parameters: Record<string, unknown>,
) {
  const { data, error } = await client.rpc(functionName, parameters);
  if (error) throw new Error(`Session RPC ${functionName} failed: ${error.message}`);
  return data as PracticeSession;
}

export function startPracticeSession(client: SessionRpcClient, questId: string) {
  return invoke(client, "start_practice_session", { p_quest_id: questId });
}

export function pausePracticeSession(client: SessionRpcClient, sessionId: string) {
  return invoke(client, "pause_practice_session", { p_session_id: sessionId });
}

export function resumePracticeSession(client: SessionRpcClient, sessionId: string) {
  return invoke(client, "resume_practice_session", { p_session_id: sessionId });
}

export function endPracticeSession(client: SessionRpcClient, sessionId: string) {
  return invoke(client, "end_practice_session", { p_session_id: sessionId });
}
