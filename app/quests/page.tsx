import type { Metadata } from "next";
import { QuestLibrarySurface } from "@/components/quest-library-surface";

export const metadata: Metadata = { title: "Quests" };

export default function QuestsPage() {
  return <QuestLibrarySurface />;
}
