import type { Metadata } from "next";
import { QuestJourneySurface } from "@/components/quest-journey-surface";
import { canAccessCodexV2DraftPreview } from "@/lib/codex/v2/preview-access";
import { canAccessStudioAtlasPreview } from "@/lib/ux/studio-atlas-preview";
import type { MapCodexLearning } from "@/components/quest-journey-surface";

export const metadata: Metadata = { title: "Quest Journey" };

export default async function QuestJourneyPage({
  params,
}: {
  params: Promise<{ questId: string }>;
}) {
  const { questId } = await params;
  let mapCodexLearning: Record<string, MapCodexLearning> = {};
  // Draft lessons and interactive references must not leak into public Quest
  // routes. Preview-only data is imported lazily after the same server gate
  // used by the isolated Codex V2 prototype.
  if (canAccessCodexV2DraftPreview()) {
    const { readCodexV2DraftPreview } = await import("@/lib/codex/v2/preview");
    const preview = readCodexV2DraftPreview();
    const { canonicalCodexName } = await import("@/lib/codex/v2/content");
    mapCodexLearning = Object.fromEntries(
      preview.entries
        .filter((entry) => entry.kind === "SKILL")
        .map((entry) => [
          entry.slug,
          {
            blocks: entry.reference_blocks,
            modules: entry.modules.map((module) => ({
              id: module.id,
              title: module.title,
              level: module.level,
              application:
                entry.applications.find((item) => item.id === module.application_id)?.title ??
                module.application_id,
              source: {
                moduleId: module.id,
                skillName: canonicalCodexName(entry.kind, entry.slug),
                skillKind: "SKILL" as const,
                skillSlug: entry.slug,
                revision: entry.revision,
                status: entry.editorial_status,
                title: module.title,
                applicationTitle: entry.applications.find((item) => item.id === module.application_id)?.title ?? module.application_id,
                level: module.level,
                explanation: module.explanation,
                outcomes: module.outcomes,
                exercises: module.exercises.map((exercise) => ({ title: exercise.title, setup: exercise.setup, steps: exercise.steps, selfCheck: exercise.self_check, suggestedMinutes: exercise.suggested_minutes })),
              },
            })),
          },
        ]),
    );
  }

  return <QuestJourneySurface questId={questId} mapCodexLearning={mapCodexLearning} atlas={canAccessStudioAtlasPreview()} />;
}
