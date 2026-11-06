import type { JSONContent } from "@tiptap/react";

export type TuningSnapshot = {
  slug: "standard" | "dadgad";
  display_name: string;
  strings_low_to_high: Array<{ string_number: number; open_pitch: string }>;
};

export type TabNote = {
  string_number: number;
  state: "FRETTED" | "OPEN" | "MUTED";
  fret?: number;
};

export type TabEvent = { id: string; ordinal: number; notes: TabNote[] };

type InlineText = { text: string; marks?: Array<"bold" | "italic"> };

export type WorkbookBlockV1 =
  | {
      id: string;
      version: 1;
      type: "paragraph" | "heading";
      level?: 1 | 2 | 3;
      content: InlineText[];
    }
  | { id: string; version: 1; type: "bullet_list" | "ordered_list"; items: InlineText[][] }
  | {
      id: string;
      version: 1;
      type: "guitar_tab";
      tuning: TuningSnapshot;
      positions_per_line?: 4 | 8 | 12 | 16;
      events: TabEvent[];
    }
  | {
      id: string;
      version: 1;
      type: "chord_diagram";
      name: string;
      tuning: TuningSnapshot;
      fret_window_start: number;
      strings: Array<{
        string_number: number;
        state: "FRETTED" | "OPEN" | "MUTED";
        fret?: number;
        finger?: number;
      }>;
      barres: Array<{ from_string: number; to_string: number; fret: number; finger?: number }>;
    }
  | { id: string; version: number; type: "unsupported"; original: unknown };

export type WorkbookDocumentV1 = {
  type: "GUITARPG_WORKBOOK_DOCUMENT_V1";
  schema_version: 1;
  blocks: WorkbookBlockV1[];
};

export const WORKBOOK_DOCUMENT_LIMITS = {
  serializedBytes: 512 * 1024,
  blocks: 200,
  textCharacters: 32_000,
  listItems: 100,
  tabEventsPerBlock: 512,
  tabEventsPerDocument: 2_048,
  barres: 6,
} as const;

const tunings: Record<TuningSnapshot["slug"], TuningSnapshot> = {
  standard: {
    slug: "standard",
    display_name: "Standard tuning",
    strings_low_to_high: ["E2", "A2", "D3", "G3", "B3", "E4"].map((open_pitch, index) => ({
      string_number: 6 - index,
      open_pitch,
    })),
  },
  dadgad: {
    slug: "dadgad",
    display_name: "DADGAD",
    strings_low_to_high: ["D2", "A2", "D3", "G3", "A3", "D4"].map((open_pitch, index) => ({
      string_number: 6 - index,
      open_pitch,
    })),
  },
};

export function tuningSnapshot(slug: TuningSnapshot["slug"]): TuningSnapshot {
  return structuredClone(tunings[slug]);
}

export const createId = () => crypto.randomUUID();

export function emptyTabBlock(): Extract<WorkbookBlockV1, { type: "guitar_tab" }> {
  return {
    id: createId(),
    version: 1,
    type: "guitar_tab",
    tuning: tuningSnapshot("standard"),
    positions_per_line: 16,
    events: Array.from({ length: 16 }, (_, ordinal) => ({ id: createId(), ordinal, notes: [] })),
  };
}

export function emptyChordBlock(): Extract<WorkbookBlockV1, { type: "chord_diagram" }> {
  return {
    id: createId(),
    version: 1,
    type: "chord_diagram",
    name: "Untitled chord",
    tuning: tuningSnapshot("standard"),
    fret_window_start: 1,
    strings: Array.from({ length: 6 }, (_, index) => ({
      string_number: 6 - index,
      state: "MUTED" as const,
    })),
    barres: [],
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const boundedInteger = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && Number(value) >= min && Number(value) <= max;

const knownBlockTypes = new Set([
  "paragraph",
  "heading",
  "bullet_list",
  "ordered_list",
  "guitar_tab",
  "chord_diagram",
  "unsupported",
]);

function validateTuning(value: unknown): value is TuningSnapshot {
  return (
    isRecord(value) &&
    (value.slug === "standard" || value.slug === "dadgad") &&
    typeof value.display_name === "string" &&
    value.display_name.length > 0 &&
    value.display_name.length <= 80 &&
    Array.isArray(value.strings_low_to_high) &&
    value.strings_low_to_high.length === 6 &&
    value.strings_low_to_high.every(
      (item, index) =>
        isRecord(item) &&
        item.string_number === 6 - index &&
        typeof item.open_pitch === "string" &&
        /^[A-G](?:#|b)?[0-8]$/.test(item.open_pitch),
    )
  );
}

function validateTabNote(value: unknown): value is TabNote {
  if (!isRecord(value) || !boundedInteger(value.string_number, 1, 6)) return false;
  if (value.state === "FRETTED") return boundedInteger(value.fret, 1, 36);
  return (value.state === "OPEN" || value.state === "MUTED") && value.fret === undefined;
}

function validateChordString(value: unknown) {
  if (!isRecord(value) || !boundedInteger(value.string_number, 1, 6)) return false;
  if (value.state === "FRETTED")
    return (
      boundedInteger(value.fret, 1, 36) &&
      (value.finger === undefined || boundedInteger(value.finger, 1, 4))
    );
  return (
    (value.state === "OPEN" || value.state === "MUTED") &&
    value.fret === undefined &&
    value.finger === undefined
  );
}

function validateBarre(value: unknown) {
  return (
    isRecord(value) &&
    boundedInteger(value.from_string, 1, 6) &&
    boundedInteger(value.to_string, 1, 6) &&
    Number(value.from_string) > Number(value.to_string) &&
    boundedInteger(value.fret, 1, 36) &&
    (value.finger === undefined || boundedInteger(value.finger, 1, 4))
  );
}

function validateInline(value: unknown): value is InlineText[] {
  return (
    Array.isArray(value) &&
    value.every(
      (segment) =>
        isRecord(segment) &&
        typeof segment.text === "string" &&
        segment.text.length <= WORKBOOK_DOCUMENT_LIMITS.textCharacters &&
        (segment.marks === undefined ||
          (Array.isArray(segment.marks) &&
            segment.marks.every((mark) => mark === "bold" || mark === "italic"))),
    ) &&
    value.reduce((total, segment) => total + String(segment.text).length, 0) <=
      WORKBOOK_DOCUMENT_LIMITS.textCharacters
  );
}

function validateBlock(value: unknown): value is WorkbookBlockV1 {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id.length < 1 ||
    value.id.length > 100 ||
    typeof value.type !== "string"
  )
    return false;
  if (value.type === "unsupported")
    return boundedInteger(value.version, 1, 10_000) && "original" in value;
  if (value.version !== 1) return false;
  if (value.type === "paragraph" || value.type === "heading")
    return (
      validateInline(value.content) &&
      (value.type !== "heading" ||
        value.level === undefined ||
        [1, 2, 3].includes(Number(value.level)))
    );
  if (value.type === "bullet_list" || value.type === "ordered_list")
    return (
      Array.isArray(value.items) &&
      value.items.length <= WORKBOOK_DOCUMENT_LIMITS.listItems &&
      value.items.every(validateInline)
    );
  if (value.type === "guitar_tab") {
    if (
      !validateTuning(value.tuning) ||
      (value.positions_per_line !== undefined &&
        ![4, 8, 12, 16].includes(Number(value.positions_per_line))) ||
      !Array.isArray(value.events) ||
      value.events.length < 1 ||
      value.events.length > WORKBOOK_DOCUMENT_LIMITS.tabEventsPerBlock
    )
      return false;

    const eventIds = new Set<string>();
    return value.events.every((event, index) => {
      if (
        !isRecord(event) ||
        typeof event.id !== "string" ||
        !event.id.length ||
        event.id.length > 100 ||
        eventIds.has(event.id) ||
        event.ordinal !== index ||
        !Array.isArray(event.notes) ||
        event.notes.length > 6 ||
        !event.notes.every(validateTabNote)
      )
        return false;
      eventIds.add(event.id);
      const strings = event.notes.map((note: TabNote) => note.string_number);
      return new Set(strings).size === strings.length;
    });
  }
  if (value.type === "chord_diagram") {
    if (
      typeof value.name !== "string" ||
      !value.name.trim() ||
      value.name.length > 80 ||
      !validateTuning(value.tuning) ||
      !boundedInteger(value.fret_window_start, 1, 36) ||
      !Array.isArray(value.strings) ||
      value.strings.length !== 6 ||
      !value.strings.every(validateChordString) ||
      !Array.isArray(value.barres) ||
      value.barres.length > WORKBOOK_DOCUMENT_LIMITS.barres ||
      !value.barres.every(validateBarre)
    )
      return false;
    const strings = value.strings.map((item: { string_number: number }) => item.string_number);
    return new Set(strings).size === 6;
  }
  return false;
}

export function parseWorkbookDocument(input: unknown): WorkbookDocumentV1 {
  if (
    !isRecord(input) ||
    input.type !== "GUITARPG_WORKBOOK_DOCUMENT_V1" ||
    input.schema_version !== 1 ||
    !Array.isArray(input.blocks) ||
    input.blocks.length > WORKBOOK_DOCUMENT_LIMITS.blocks ||
    new TextEncoder().encode(JSON.stringify(input)).byteLength >
      WORKBOOK_DOCUMENT_LIMITS.serializedBytes
  )
    throw new Error("This is not a valid GUITARPG_WORKBOOK_DOCUMENT_V1 document.");
  const blocks = input.blocks.map((block) => {
    if (validateBlock(block)) return structuredClone(block);
    // A malformed V1 musical block must not masquerade as a valid editable block
    // or be silently converted into an unsupported future type.
    if (
      isRecord(block) &&
      knownBlockTypes.has(String(block.type)) &&
      (block.version === 1 || block.type === "unsupported")
    )
      throw new Error("The document contains malformed known Workbook block data.");
    if (
      isRecord(block) &&
      typeof block.id === "string" &&
      block.id.length > 0 &&
      block.id.length <= 100 &&
      typeof block.type === "string" &&
      block.type.length > 0 &&
      boundedInteger(block.version, 1, 10_000)
    )
      return {
        id: block.id,
        version: block.version,
        type: "unsupported",
        original: structuredClone(block),
      } as const;
    throw new Error("The document contains a malformed block that cannot be preserved safely.");
  });
  const ids = blocks.map((block) => block.id);
  if (new Set(ids).size !== ids.length)
    throw new Error("The document contains duplicate block identities.");
  const eventCount = blocks.reduce(
    (total, block) => total + (block.type === "guitar_tab" ? block.events.length : 0),
    0,
  );
  if (eventCount > WORKBOOK_DOCUMENT_LIMITS.tabEventsPerDocument)
    throw new Error("The document contains too many tablature events.");
  return { type: "GUITARPG_WORKBOOK_DOCUMENT_V1", schema_version: 1, blocks };
}

function inlineFromJson(content: JSONContent[] = []): InlineText[] {
  return content
    .filter((node) => node.type === "text" && typeof node.text === "string")
    .map((node) => ({
      text: node.text ?? "",
      marks: node.marks
        ?.map((mark) => mark.type)
        .filter((mark): mark is "bold" | "italic" => mark === "bold" || mark === "italic"),
    }));
}

function inlineToJson(content: InlineText[]): JSONContent[] {
  return content.map((segment) => ({
    type: "text",
    text: segment.text,
    marks: segment.marks?.map((type) => ({ type })),
  }));
}

export function editorJsonToWorkbook(json: JSONContent): WorkbookDocumentV1 {
  const blocks: WorkbookBlockV1[] = (json.content ?? []).map((node) => {
    const id = typeof node.attrs?.blockId === "string" ? node.attrs.blockId : createId();
    if (node.type === "paragraph" || node.type === "heading")
      return {
        id,
        version: 1,
        type: node.type,
        level: node.type === "heading" ? (node.attrs?.level as 1 | 2 | 3) : undefined,
        content: inlineFromJson(node.content),
      };
    if (node.type === "bulletList" || node.type === "orderedList")
      return {
        id,
        version: 1,
        type: node.type === "bulletList" ? "bullet_list" : "ordered_list",
        items: (node.content ?? []).map((item) => inlineFromJson(item.content?.[0]?.content)),
      };
    if (node.type === "guitarTab" || node.type === "chordDiagram")
      return parseWorkbookDocument({
        type: "GUITARPG_WORKBOOK_DOCUMENT_V1",
        schema_version: 1,
        blocks: [node.attrs?.block],
      }).blocks[0];
    if (node.type === "unsupportedBlock")
      return {
        id,
        version: Number(node.attrs?.blockVersion) || 1,
        type: "unsupported",
        original: node.attrs?.original,
      };
    return { id, version: 1, type: "unsupported", original: node };
  });
  return parseWorkbookDocument({
    type: "GUITARPG_WORKBOOK_DOCUMENT_V1",
    schema_version: 1,
    blocks,
  });
}

export function workbookToEditorJson(document: WorkbookDocumentV1): JSONContent {
  return {
    type: "doc",
    content: document.blocks.map((block) => {
      if (block.type === "paragraph" || block.type === "heading")
        return {
          type: block.type,
          attrs: {
            blockId: block.id,
            ...(block.type === "heading" ? { level: block.level ?? 2 } : {}),
          },
          content: inlineToJson(block.content),
        };
      if (block.type === "bullet_list" || block.type === "ordered_list")
        return {
          type: block.type === "bullet_list" ? "bulletList" : "orderedList",
          attrs: { blockId: block.id },
          content: block.items.map((item) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: inlineToJson(item) }],
          })),
        };
      if (block.type === "guitar_tab")
        return { type: "guitarTab", attrs: { blockId: block.id, block } };
      if (block.type === "chord_diagram")
        return { type: "chordDiagram", attrs: { blockId: block.id, block } };
      const unsupported = block as Extract<WorkbookBlockV1, { type: "unsupported" }>;
      return {
        type: "unsupportedBlock",
        attrs: {
          blockId: unsupported.id,
          blockVersion: unsupported.version,
          original: unsupported.original,
        },
      };
    }),
  };
}

export function starterWorkbookDocument(): WorkbookDocumentV1 {
  return {
    type: "GUITARPG_WORKBOOK_DOCUMENT_V1",
    schema_version: 1,
    blocks: [
      {
        id: createId(),
        version: 1,
        type: "heading",
        level: 1,
        content: [{ text: "My guitar workbook" }],
      },
      {
        id: createId(),
        version: 1,
        type: "paragraph",
        content: [{ text: "Write an idea, then add tablature or a chord diagram." }],
      },
    ],
  };
}
