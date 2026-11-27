import type { Metadata } from "next";
import { QuestLibrarySurface } from "@/components/quest-library-surface";
import { canAccessStudioAtlasPreview } from "@/lib/ux/studio-atlas-preview";

export const metadata: Metadata = { title: "Quests" };

export const dynamic = "force-dynamic";

export default function QuestsPage() {
  return <QuestLibrarySurface atlas={canAccessStudioAtlasPreview()} />;
}
