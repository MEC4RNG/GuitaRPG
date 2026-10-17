import { toQuestPersistenceInput, type Quest } from "./runtime";
import {
  parseQuestJourney,
  type QuestJourney,
  type QuestJourneyAction,
  type QuestJourneyStage,
} from "./journey-runtime";

export type JourneyRpcClient = {
  rpc(
    functionName: string,
    parameters: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
};

async function invokeJourney(
  client: JourneyRpcClient,
  functionName: string,
  parameters: Record<string, unknown>,
): Promise<QuestJourney> {
  const { data, error } = await client.rpc(functionName, parameters);
  if (error) throw new Error(`Quest Journey operation failed: ${error.message}`);
  return parseQuestJourney(Array.isArray(data) ? data[0] : data);
}

export function saveGeneratedQuestJourney(
  client: JourneyRpcClient,
  quest: Quest,
  mode: "SAVED" | "START" | "PRACTICE",
) {
  return invokeJourney(client, "save_generated_quest_journey", {
    p_quest: toQuestPersistenceInput(quest),
    p_mode: mode,
  });
}

export function ensureQuestJourney(client: JourneyRpcClient, questId: string) {
  return invokeJourney(client, "ensure_quest_journey", { p_quest_id: questId });
}

export function setQuestJourneyStage(
  client: JourneyRpcClient,
  questId: string,
  stage: QuestJourneyStage,
) {
  return invokeJourney(client, "set_quest_journey_stage", {
    p_quest_id: questId,
    p_stage: stage,
  });
}

export function transitionQuestJourney(
  client: JourneyRpcClient,
  questId: string,
  action: QuestJourneyAction,
) {
  return invokeJourney(client, "transition_quest_journey", {
    p_quest_id: questId,
    p_action: action,
  });
}
