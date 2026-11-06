import { describe, expect, it } from "vitest";

import {
  editorJsonToWorkbook,
  emptyChordBlock,
  emptyTabBlock,
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

  it("starts new tablature blocks with sixteen stable ordered positions", () => {
    const block = emptyTabBlock();
    expect(block.positions_per_line).toBe(16);
    expect(block.events).toHaveLength(16);
    expect(block.events.map((event) => event.ordinal)).toEqual(
      Array.from({ length: 16 }, (_, index) => index),
    );
    expect(new Set(block.events.map((event) => event.id)).size).toBe(16);
  });

  it("preserves optional tab presentation grouping without changing event identity", () => {
    const document = structuredClone(fixture);
    const tab = document.blocks.find((block) => block.type === "guitar_tab");
    if (!tab || tab.type !== "guitar_tab") throw new Error("fixture tab missing");
    tab.positions_per_line = 4;
    expect(editorJsonToWorkbook(workbookToEditorJson(document))).toEqual(document);
  });

  it("keeps legacy V1 tabs without a grouping preference compatible", () => {
    const parsed = parseWorkbookDocument(fixture);
    const tab = parsed.blocks.find((block) => block.type === "guitar_tab");
    expect(tab?.type === "guitar_tab" ? tab.positions_per_line : null).toBeUndefined();
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

  it("rejects malformed known musical blocks rather than downgrading them to unsupported", () => {
    const doc = structuredClone(fixture);
    const tab = doc.blocks.find((block) => block.type === "guitar_tab");
    if (!tab || tab.type !== "guitar_tab") throw new Error("Missing fixture tab");
    tab.events[0].notes.push({ string_number: 6, state: "FRETTED", fret: 3 });
    expect(() => parseWorkbookDocument(doc)).toThrow("malformed known");
    expect(() => parseWorkbookDocument({
      ...doc,
      blocks: [{ ...tab, events: [{ id: "one", ordinal: 0, notes: [
        { string_number: 1, state: "OPEN", fret: 4 },
      ] }] }],
    })).toThrow("malformed known");
  });

  it("rejects duplicate event ids and invalid event ordinals", () => {
    const tab = emptyTabBlock();
    tab.events[1].id = tab.events[0].id;
    expect(() => parseWorkbookDocument({ ...fixture, blocks: [tab] })).toThrow("malformed known");
    tab.events[1].id = "unique-event";
    tab.events[1].ordinal = 8;
    expect(() => parseWorkbookDocument({ ...fixture, blocks: [tab] })).toThrow("malformed known");
  });

  it("validates each chord string, finger, fret, and barre span", () => {
    const chord = emptyChordBlock();
    chord.strings[0] = { string_number: 6, state: "FRETTED", fret: 3, finger: 2 };
    chord.barres = [{ from_string: 6, to_string: 1, fret: 1, finger: 1 }];
    const valid = { ...fixture, blocks: [chord] };
    expect(editorJsonToWorkbook(workbookToEditorJson(valid))).toEqual(valid);

    const duplicate = structuredClone(chord);
    duplicate.strings[1].string_number = 6;
    expect(() => parseWorkbookDocument({ ...fixture, blocks: [duplicate] })).toThrow("malformed known");

    const missingFret = structuredClone(chord);
    missingFret.strings[0].fret = 37;
    expect(() => parseWorkbookDocument({ ...fixture, blocks: [missingFret] })).toThrow("malformed known");

    const badFinger = structuredClone(chord);
    badFinger.strings[0].finger = 5;
    expect(() => parseWorkbookDocument({ ...fixture, blocks: [badFinger] })).toThrow("malformed known");

    const badBarre = structuredClone(chord);
    badBarre.barres = [{ from_string: 1, to_string: 6, fret: 1 }];
    expect(() => parseWorkbookDocument({ ...fixture, blocks: [badBarre] })).toThrow("malformed known");
  });

  it("round trips a deterministic sample of editable frets and tuning snapshots", () => {
    for (const tuning of ["standard", "dadgad"] as const) {
      for (let fret = 1; fret <= 36; fret++) {
        const tab = emptyTabBlock();
        tab.tuning = tuningSnapshot(tuning);
        tab.events[0].notes = [
          { string_number: 6, state: "FRETTED", fret },
          { string_number: 1, state: "OPEN" },
        ];
        const chord = emptyChordBlock();
        chord.name = `${tuning} fret ${fret}`;
        chord.tuning = tuningSnapshot(tuning);
        chord.strings[0] = { string_number: 6, state: "FRETTED", fret };
        const doc: WorkbookDocumentV1 = { ...fixture, blocks: [tab, chord] };
        expect(editorJsonToWorkbook(workbookToEditorJson(doc))).toEqual(doc);
      }
    }
  });
});
