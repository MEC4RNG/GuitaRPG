import {
  createId,
  parseWorkbookDocument,
  type WorkbookBlockV1,
  type WorkbookDocumentV1,
} from "@/lib/workbook/document-v1";

export type CodexLessonWorkbookSource = {
  moduleId: string;
  skillName: string;
  skillKind: "SKILL";
  skillSlug: string;
  revision: string;
  status: "DRAFT_REVIEW" | "PUBLISHED";
  title: string;
  applicationTitle: string;
  level: "foundational" | "intermediate" | "advanced";
  explanation: string;
  outcomes: string[];
  exercises: Array<{
    title: string;
    setup: string;
    steps: string[];
    selfCheck: string;
    suggestedMinutes: number;
  }>;
};

const textBlock = (text: string): WorkbookBlockV1 => ({
  id: createId(),
  version: 1,
  type: "paragraph",
  content: [{ text }],
});
const headingBlock = (text: string, level: 1 | 2 = 2): WorkbookBlockV1 => ({
  id: createId(),
  version: 1,
  type: "heading",
  level,
  content: [{ text }],
});
const listBlock = (
  items: string[],
  type: "bullet_list" | "ordered_list",
): WorkbookBlockV1 => ({
  id: createId(),
  version: 1,
  type,
  items: items.map((text) => [{ text }]),
});

export function lessonWorkbookSourceMarker(moduleId: string) {
  return `Codex lesson source: ${moduleId}`;
}

/** Private editable starting page. Creates no Quest, Session, Result, or XP evidence. */
export function buildLessonWorkbookDocument(
  lesson: CodexLessonWorkbookSource,
): WorkbookDocumentV1 {
  const blocks: WorkbookBlockV1[] = [
    headingBlock(lesson.title, 1),
    textBlock(
      `Reference: ${lesson.skillName} · ${lesson.applicationTitle} · ${lesson.level}. ${lesson.status === "DRAFT_REVIEW" ? "Preview draft, not an approved published lesson." : "Codex educational reference."}`,
    ),
    textBlock(lessonWorkbookSourceMarker(lesson.moduleId)),
    textBlock(`Codex revision: ${lesson.revision} · /codex/skills/${lesson.skillSlug}`),
    textBlock(lesson.explanation),
    headingBlock("What I want to learn"),
    listBlock(lesson.outcomes, "bullet_list"),
  ];
  for (const exercise of lesson.exercises) {
    blocks.push(
      headingBlock(exercise.title),
      textBlock(exercise.setup),
      listBlock(exercise.steps, "ordered_list"),
      textBlock(`Self-check: ${exercise.selfCheck}`),
      textBlock(`Suggested exploration: ${exercise.suggestedMinutes} minutes (no progress recorded automatically).`),
    );
  }
  blocks.push(
    headingBlock("My observations"),
    textBlock("Record what you notice as you practice. Add tablature or chord diagrams using the editor."),
    textBlock(""),
  );
  return parseWorkbookDocument({
    type: "GUITARPG_WORKBOOK_DOCUMENT_V1",
    schema_version: 1,
    blocks,
  });
}

/** A best-effort convenience link only; not authoritative provenance or a unique constraint. */
export function hasLessonSource(document: WorkbookDocumentV1, moduleId: string): boolean {
  const marker = lessonWorkbookSourceMarker(moduleId);
  return document.blocks.some(
    (block) =>
      block.type === "paragraph" &&
      block.content.some((fragment) => fragment.text === marker),
  );
}
