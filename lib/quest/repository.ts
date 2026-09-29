import { toQuestPersistenceInput, type Quest } from "./runtime";

export type QuestPersistenceRpcClient = {
  rpc(
    functionName: "persist_generated_quest",
    parameters: { p_quest: unknown },
  ): PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
};

export class QuestPersistenceError extends Error {
  constructor(
    message: string,
    readonly code = "QUEST_PERSISTENCE_FAILED",
  ) {
    super(message);
    this.name = "QuestPersistenceError";
  }
}

export async function persistGeneratedQuest(client: QuestPersistenceRpcClient, quest: Quest) {
  const input = toQuestPersistenceInput(quest);
  const { data, error } = await client.rpc("persist_generated_quest", { p_quest: input });
  if (error)
    throw new QuestPersistenceError(
      `Quest persistence failed: ${error.message}`,
      error.code ?? "QUEST_PERSISTENCE_FAILED",
    );

  const row = (Array.isArray(data) ? data[0] : data) as { id?: unknown } | null;
  if (!row || typeof row.id !== "string" || row.id !== quest.identity.id)
    throw new QuestPersistenceError(
      "Quest persistence returned an unexpected durable identity",
      "QUEST_IDENTITY_MISMATCH",
    );
  return row.id;
}
