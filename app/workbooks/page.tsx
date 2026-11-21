import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WorkbookPersistenceSurface } from "@/components/workbook-persistence-surface";
import { canAccessCodexV2DraftPreview } from "@/lib/codex/v2/preview-access";
import type { CodexLessonWorkbookSource } from "@/lib/workbook/lesson-template";

export const metadata: Metadata = { title: "Workbooks" };

export default async function WorkbooksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const params = await searchParams;
  const { parseWorkbookRouteContext } = await import("@/lib/workbook/context");
  const requestedModule = params.codex_module;
  let lessonSource: CodexLessonWorkbookSource | null = null;

  if (requestedModule !== undefined) {
    if (
      typeof requestedModule !== "string" ||
      !/^[a-z0-9._-]{1,120}$/.test(requestedModule) ||
      !canAccessCodexV2DraftPreview()
    )
      notFound();

    // Validate against the trusted server-side editorial catalog; do not accept
    // lesson copy, taxonomy identities or JSON documents from the URL.
    const { readCodexV2DraftPreview } = await import("@/lib/codex/v2/preview");
    const catalog = readCodexV2DraftPreview();
    const entry = catalog.entries.find((item) =>
      item.modules.some((candidate) => candidate.id === requestedModule),
    );
    const lessonModule = entry?.modules.find((item) => item.id === requestedModule);
    const application = entry?.applications.find(
      (item) => item.id === lessonModule?.application_id,
    );
    if (!entry || !lessonModule || !application) notFound();

    const { canonicalCodexName } = await import("@/lib/codex/v2/content");
    lessonSource = {
      moduleId: lessonModule.id,
      skillName: canonicalCodexName(entry.kind, entry.slug),
      skillKind: "SKILL",
      skillSlug: entry.slug,
      revision: entry.revision,
      status: entry.editorial_status,
      title: lessonModule.title,
      applicationTitle: application.title,
      level: lessonModule.level,
      explanation: lessonModule.explanation,
      outcomes: lessonModule.outcomes,
      exercises: lessonModule.exercises.map((exercise) => ({
        title: exercise.title,
        setup: exercise.setup,
        steps: exercise.steps,
        selfCheck: exercise.self_check,
        suggestedMinutes: exercise.suggested_minutes,
      })),
    };
  }

  return (
    <WorkbookPersistenceSurface
      context={parseWorkbookRouteContext(params)}
      lessonSource={lessonSource}
    />
  );
}
