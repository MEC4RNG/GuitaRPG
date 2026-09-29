import { persistGeneratedQuest, type QuestPersistenceRpcClient } from "./repository";
import type { Quest } from "./runtime";
import { startPracticeSession, type SessionRpcClient } from "@/lib/session/repository";

export class GeneratedQuestStartError extends Error {
  constructor(
    message: string,
    readonly durableQuestId: string | null,
    readonly stage: "PERSISTENCE" | "SESSION_START",
  ) {
    super(message);
    this.name = "GeneratedQuestStartError";
  }
}

export async function startGeneratedQuestPractice(
  client: QuestPersistenceRpcClient & SessionRpcClient,
  quest: Quest,
  durableQuestId: string | null,
) {
  let questId = durableQuestId;
  if (!questId) {
    try {
      questId = await persistGeneratedQuest(client, quest);
    } catch (error) {
      throw new GeneratedQuestStartError(
        error instanceof Error ? error.message : "Quest persistence failed",
        null,
        "PERSISTENCE",
      );
    }
  }

  try {
    const session = await startPracticeSession(client, questId);
    return { questId, session };
  } catch (error) {
    throw new GeneratedQuestStartError(
      error instanceof Error ? error.message : "Practice Session start failed",
      questId,
      "SESSION_START",
    );
  }
}
