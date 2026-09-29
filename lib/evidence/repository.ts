import type { ReflectionValue, ResultOutcome, ResultConfidenceSummary } from "./runtime";

export type SelfCriterionInput = {
  ordinal: number;
  unknown?: boolean;
  observed_value?: string | number | boolean;
};

export type FinalizeResultInput = {
  sessionId: string;
  selfCriteria: SelfCriterionInput[];
  reflection?: ReflectionValue | null;
  notes?: string | null;
};

export type FinalizedResult = {
  id: string;
  player_id: string;
  quest_id: string;
  session_id: string;
  evidence_model_version: "EVD_V1";
  meaningful_attempt: boolean;
  outcome: ResultOutcome;
  verification_modes: string[];
  confidence_summary: ResultConfidenceSummary;
  reflection: ReflectionValue | null;
  player_notes: string | null;
  finalized_at: string;
};

export type EvidenceRpcClient = {
  rpc(
    functionName: "finalize_quest_result",
    parameters: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export async function finalizeQuestResult(client: EvidenceRpcClient, input: FinalizeResultInput) {
  const { data, error } = await client.rpc("finalize_quest_result", {
    p_session_id: input.sessionId,
    p_self_criteria: input.selfCriteria,
    p_reflection: input.reflection ?? null,
    p_notes: input.notes ?? null,
  });
  if (error) throw new Error(`Result finalization failed: ${error.message}`);
  return data as FinalizedResult;
}
