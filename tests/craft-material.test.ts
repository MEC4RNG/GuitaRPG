import { describe, expect, it } from "vitest";
import { craftMaterial, mergeCraftPageOrder } from "@/lib/ux/craft-material";
import { starterWorkbookDocument } from "@/lib/workbook/document-v1";
import type {
  WorkbookContextLinkRow,
  WorkbookPageRow,
  WorkbookRow,
} from "@/lib/workbook/repository";

describe("F3D Craft material", () => {
  it("deduplicates actual stage links and excludes archived or unrelated material", () => {
    const time = "2026-11-27T00:00:00Z";
    const book: WorkbookRow = {
      id: "book",
      player_id: "player",
      title: "Practice",
      description: null,
      kind: "WORKBOOK",
      archived_at: null,
      revision: 1,
      created_at: time,
      updated_at: time,
    };
    const page: WorkbookPageRow = {
      id: "page",
      workbook_id: book.id,
      title: "Study",
      position: 0,
      document: starterWorkbookDocument(),
      revision: 1,
      created_at: time,
      updated_at: time,
    };
    const link: WorkbookContextLinkRow = {
      id: "link",
      player_id: "player",
      page_id: page.id,
      quest_id: "quest",
      stage: "EXPLORE",
      relationship: "APPLIES_TO",
      session_id: null,
      module_key: "skill",
      created_at: time,
    };
    const input = {
      questId: "quest",
      links: [link, { ...link, id: "craft", stage: "CRAFT" as const }],
      pages: [page],
      workbooks: [book],
    };
    expect(craftMaterial(input)).toEqual([{ page, workbook: book, craft: true, explore: true }]);
    expect(craftMaterial({ ...input, questId: "other" })).toEqual([]);
    expect(craftMaterial({ ...input, workbooks: [{ ...book, archived_at: time }] })).toEqual([]);
  });

  it("preserves unrelated Workbook slots when reordering the Craft subset", () => {
    expect(mergeCraftPageOrder(["a", "b", "c", "d"], ["a", "c"], ["c", "a"])).toEqual([
      "c",
      "b",
      "a",
      "d",
    ]);
    expect(() => mergeCraftPageOrder(["a", "b", "c"], ["a", "c"], ["b", "a"])).toThrow();
    expect(() => mergeCraftPageOrder(["a", "b"], ["a", "b"], ["a", "a"])).toThrow();
  });
});
