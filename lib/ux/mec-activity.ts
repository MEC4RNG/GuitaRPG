import type { LearningLevel } from "@/lib/codex/v2/content";
import type { JourneyTopic } from "@/lib/quest/journey-topics";
import { hasLessonSource } from "@/lib/workbook/lesson-template";
import type {
  WorkbookContextLinkRow,
  WorkbookPageRow,
  WorkbookRow,
} from "@/lib/workbook/repository";

export const activityLevels = [
  { id: "foundational", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
] as const;

export type ActivitySelection = { topicKey: string; level: LearningLevel; lessonId: string | null };
type ActivityCatalog = Record<string, { modules: readonly { id: string; level: LearningLevel }[] }>;

export function activityStorageKey(playerId: string, questId: string) {
  return `sound-uncharted.mec-activity.v1:${playerId}:${questId}`;
}

/** Only restore navigation hints verified against this Quest's current snapshot and gated catalog. */
export function resolveActivitySelection(
  raw: unknown,
  topics: readonly JourneyTopic[],
  catalog: ActivityCatalog,
): ActivitySelection | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const topic = topics.find((item) => item.key === value.topicKey);
  const level = activityLevels.find((item) => item.id === value.level)?.id;
  if (!topic || !level) return null;
  const lesson = topic.moduleKey
    ? catalog[topic.moduleKey]?.modules.find(
        (item) => item.id === value.lessonId && item.level === level,
      )
    : undefined;
  return { topicKey: topic.key, level, lessonId: lesson?.id ?? null };
}

export function readActivitySelection(
  storage: Pick<Storage, "getItem">,
  playerId: string,
  questId: string,
  topics: readonly JourneyTopic[],
  catalog: ActivityCatalog,
) {
  try {
    return resolveActivitySelection(
      JSON.parse(storage.getItem(activityStorageKey(playerId, questId)) ?? "null"),
      topics,
      catalog,
    );
  } catch {
    return null;
  }
}

export function rememberActivitySelection(
  storage: Pick<Storage, "setItem">,
  playerId: string,
  questId: string,
  selection: ActivitySelection,
) {
  try {
    storage.setItem(activityStorageKey(playerId, questId), JSON.stringify(selection));
  } catch {
    // Navigation is still usable when session storage is unavailable.
  }
}

/** Match an actual owner-scoped Explore link, active Workbook, and editable source marker.
 * The marker is a convenience hint, not authoritative creation provenance. */
export function linkedLessonPage(input: {
  questId: string;
  playerId: string;
  skillSlug: string;
  moduleId: string;
  preferredPageId?: string;
  links: readonly WorkbookContextLinkRow[];
  pages: readonly WorkbookPageRow[];
  workbooks: readonly WorkbookRow[];
}) {
  const eligible = new Set(
    input.links
      .filter(
        (link) =>
          link.quest_id === input.questId &&
          link.player_id === input.playerId &&
          link.stage === "EXPLORE" &&
          link.module_key === input.skillSlug,
      )
      .map((link) => link.page_id),
  );
  const active = new Set(
    input.workbooks
      .filter((book) => book.player_id === input.playerId && !book.archived_at)
      .map((book) => book.id),
  );
  const matches = input.pages.filter(
    (page) =>
      eligible.has(page.id) &&
      active.has(page.workbook_id) &&
      (page.id === input.preferredPageId || hasLessonSource(page.document, input.moduleId)),
  );
  return (
    matches.find((page) => page.id === input.preferredPageId) ??
    matches.sort(
      (a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id),
    )[0] ??
    null
  );
}
