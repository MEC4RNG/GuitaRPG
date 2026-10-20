import { describe, expect, it } from "vitest";

import {
  editorJsonToWorkbook,
  parseWorkbookDocument,
  tuningSnapshot,
  workbookToEditorJson,
  type WorkbookDocumentV1,
} from "@/lib/workbook/document-v1";

const fixture: WorkbookDocumentV1 = {
  type: "GUITARPG_WORKBOOK_DOCUMENT_V1",
  schema_version: 1,
  blocks: [
    { id: "heading-1", version: 1, type: "heading", level: 1, content: [{ text: "Verse" }] },
    {
      id: "paragraph-1",
      version: 1,
      type: "paragraph",
      content: [{ text: "Play " }, { text: "gently", marks: ["italic"] }],
    },
    {
      id: "tab-1",
      version: 1,
      type: "guitar_tab",
      tuning: tuningSnapshot("dadgad"),
      events: [
        {
          id: "event-1",
          ordinal: 0,
          notes: [
            { string_number: 6, state: "OPEN" },
            { string_number: 3, state: "FRETTED", fret: 2 },
            { string_number: 1, state: "MUTED" },
          ],
        },
      ],
    },
    { id: "paragraph-2", version: 1, type: "paragraph", content: [{ text: "Resolve." }] },
    {
      id: "chord-1",
      version: 1,
      type: "chord_diagram",
      name: "D5",
      tuning: tuningSnapshot("dadgad"),
      fret_window_start: 1,
      strings: [
        { string_number: 6, state: "OPEN" },
        { string_number: 5, state: "OPEN" },
        { string_number: 4, state: "OPEN" },
        { string_number: 3, state: "FRETTED", fret: 2, finger: 1 },
        { string_number: 2, state: "FRETTED", fret: 3, finger: 2 },
        { string_number: 1, state: "MUTED" },
      ],
      barres: [],
    },
  ],
};

describe("GUITARPG_WORKBOOK_DOCUMENT_V1", () => {
  it("round trips mixed rich-text and musical blocks without changing identity or order", () => {
    expect(editorJsonToWorkbook(workbookToEditorJson(fixture))).toEqual(fixture);
  });

  it("accepts valid simultaneous tab notes including open and muted states", () => {
    expect(parseWorkbookDocument(fixture)).toEqual(fixture);
  });

  it("rejects malformed blocks that cannot be preserved with an identity", () => {
    expect(() =>
      parseWorkbookDocument({
        type: "GUITARPG_WORKBOOK_DOCUMENT_V1",
        schema_version: 1,
        blocks: [{ type: "future_block" }],
      }),
    ).toThrow("malformed block");
  });

  it("preserves unknown versioned blocks instead of discarding their data", () => {
    const future = { id: "future-1", version: 9, type: "audio_phrase", gain: 0.75 };
    const parsed = parseWorkbookDocument({
      type: "GUITARPG_WORKBOOK_DOCUMENT_V1",
      schema_version: 1,
      blocks: [future],
    });
    expect(parsed.blocks[0]).toEqual({
      id: "future-1",
      version: 9,
      type: "unsupported",
      original: future,
    });
    expect(editorJsonToWorkbook(workbookToEditorJson(parsed))).toEqual(parsed);
  });
});
