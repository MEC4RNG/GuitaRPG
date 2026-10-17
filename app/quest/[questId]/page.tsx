import type { Metadata } from "next";
import { QuestJourneySurface } from "@/components/quest-journey-surface";

export const metadata: Metadata = { title: "Quest Journey" };

export default async function QuestJourneyPage({
  params,
}: {
  params: Promise<{ questId: string }>;
}) {
  const { questId } = await params;
  return <QuestJourneySurface questId={questId} />;
}
