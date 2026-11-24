import { describe, expect, it } from "vitest";
import { readCodexV2DraftPreview } from "@/lib/codex/v2/preview";
import { canonicalCodexName } from "@/lib/codex/v2/content";
import {
  editorJsonToWorkbook,
  parseWorkbookDocument,
  workbookToEditorJson,
} from "@/lib/workbook/document-v1";
import {
  buildLessonWorkbookDocument,
  hasLessonSource,
  type CodexLessonWorkbookSource,
} from "@/lib/workbook/lesson-template";

function sources(): CodexLessonWorkbookSource[] {
  return readCodexV2DraftPreview().entries.flatMap((entry) =>
    entry.modules.map((module) => {
      const application = entry.applications.find((item) => item.id === module.application_id);
      if (!application) throw new Error("Missing known application");
      return {
        moduleId: module.id,
        skillName: canonicalCodexName(entry.kind, entry.slug),
        skillKind: "SKILL",
        skillSlug: entry.slug,
        revision: entry.revision,
        status: entry.editorial_status,
        title: module.title,
        applicationTitle: application.title,
        level: module.level,
        explanation: module.explanation,
        outcomes: module.outcomes,
        exercises: module.exercises.map((exercise) => ({
          title: exercise.title,
          setup: exercise.setup,
          steps: exercise.steps,
          selfCheck: exercise.self_check,
          suggestedMinutes: exercise.suggested_minutes,
        })),
      };
    }),
  );
}

describe("on-demand Codex → Player Workbook starter documents", () => {
  it("generates valid editable documents for all 114 draft lessons", () => {
    const lessons = sources();
    expect(lessons).toHaveLength(114);
    for (const source of lessons) {
      const document = buildLessonWorkbookDocument(source);
      expect(parseWorkbookDocument(document)).toEqual(document);
      expect(document.blocks[0].type).toBe("heading");
      expect(document.blocks.some((block) => block.type === "ordered_list")).toBe(true);
      expect(document.blocks.some((block) => block.type === "bullet_list")).toBe(true);
      expect(hasLessonSource(document, source.moduleId)).toBe(true);
      expect(hasLessonSource(document, "not-this-module")).toBe(false);
      expect(JSON.stringify(document)).toContain("no progress recorded automatically");
      expect(JSON.stringify(document)).toContain("Preview draft");
    }
  });

  it("converts every Codex lesson including a blank observations paragraph to valid editor JSON", () => {
    for (const source of sources()) {
      const original = buildLessonWorkbookDocument(source);
      const json = workbookToEditorJson(original);
      // ProseMirror's document model forbids empty text nodes. Preserve an
      // intentionally empty editable paragraph as content: [] instead.
      const inspect = (value: unknown): void => {
        if (!value || typeof value !== "object") return;
        const node = value as { type?: string; text?: string; content?: unknown[] };
        if (node.type === "text") {
          expect(node.text?.length).toBeGreaterThan(0);
        }
        for (const item of node.content ?? []) inspect(item);
      };
      inspect(json);
      expect(JSON.stringify(json)).toContain(source.exercises[0].title);
      expect(json.content?.at(-1)).toMatchObject({
        type: "paragraph",
        content: [],
      });
      const restored = editorJsonToWorkbook(json);
      expect(hasLessonSource(restored, source.moduleId)).toBe(true);
      expect(JSON.stringify(restored)).toContain(source.exercises[0].title);
    }
  });

  it("creates distinct private document blocks rather than a shared mutable template", () => {
    const lesson = sources()[0];
    const first = buildLessonWorkbookDocument(lesson);
    const second = buildLessonWorkbookDocument(lesson);
    expect(first.blocks.map((block) => block.id)).not.toEqual(
      second.blocks.map((block) => block.id),
    );
    expect(new Set(first.blocks.map((block) => block.id)).size).toBe(first.blocks.length);
    expect(new Set(second.blocks.map((block) => block.id)).size).toBe(second.blocks.length);
  });
});
