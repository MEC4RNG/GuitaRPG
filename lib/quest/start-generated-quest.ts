import type { Quest } from "./runtime";
import { saveGeneratedQuestJourney, type JourneyRpcClient } from "./journey-repository";
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
  client: JourneyRpcClient & SessionRpcClient,
  quest: Quest,
  durableQuestId: string | null,
) {
  if (durableQuestId && durableQuestId !== quest.identity.id) {
    throw new GeneratedQuestStartError(
      "Durable Quest identity does not match the draft",
      null,
      "PERSISTENCE",
    );
  }

  let questId: string;
  try {
    const journey = await saveGeneratedQuestJourney(client, quest, "PRACTICE");
    questId = journey.questId;
  } catch (error) {
    throw new GeneratedQuestStartError(
      error instanceof Error ? error.message : "Quest persistence failed",
      durableQuestId,
      "PERSISTENCE",
    );
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
