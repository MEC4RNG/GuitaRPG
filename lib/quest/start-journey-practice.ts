import { transitionQuestJourney, type JourneyRpcClient } from "./journey-repository";
import type { QuestJourney } from "./journey-runtime";
import { startPracticeSession, type SessionRpcClient } from "@/lib/session/repository";

export type JourneyPracticeClient = JourneyRpcClient & SessionRpcClient;

export async function startJourneyPractice(client: JourneyPracticeClient, journey: QuestJourney) {
  if (journey.lifecycleStatus === "ARCHIVED")
    throw new Error("Restore this archived Quest before starting practice");
  const updated =
    journey.lifecycleStatus === "CONCLUDED" || journey.lifecycleStatus === "ABANDONED"
      ? await transitionQuestJourney(client, journey.questId, "REOPEN")
      : await transitionQuestJourney(client, journey.questId, "START");
  const session = await startPracticeSession(client, journey.questId);
  return { journey: updated, session };
}
