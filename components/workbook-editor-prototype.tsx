"use client";

import { Extension, Node, mergeAttributes } from "@tiptap/core";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { closeHistory } from "@tiptap/pm/history";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import {
  createId,
  editorJsonToWorkbook,
  emptyChordBlock,
  emptyTabBlock,
  parseWorkbookDocument,
  starterWorkbookDocument,
  tuningSnapshot,
  workbookToEditorJson,
  type TabNote,
  type WorkbookBlockV1,
  type WorkbookDocumentV1,
} from "@/lib/workbook/document-v1";

type Page = { id: string; title: string; document: WorkbookDocumentV1 };
const MAX_WORKBOOK_IMPORT_BYTES = 1024 * 1024;

const BlockIdentity = Extension.create({
  name: "blockIdentity",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "bulletList", "orderedList"],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.dataset.blockId,
            renderHTML: (attributes) =>
              attributes.blockId ? { "data-block-id": attributes.blockId } : {},
          },
        },
      },
    ];
  },
});

function summaryForTab(block: Extract<WorkbookBlockV1, { type: "guitar_tab" }>) {
  const notes = block.events.flatMap((event) => event.notes);
  return `Six-string tablature. ${block.tuning.display_name}. ${block.events.length} positions, ${notes.length} notes.`;
}

function noteLabel(note?: TabNote) {
  if (!note) return "Empty";
  if (note.state === "OPEN") return "Open";
  if (note.state === "MUTED") return "Muted";
  return `Fret ${note.fret}`;
}

function GuitarTabView({
  node,
  updateAttributes,
  editor,
  getPos,
  deleteNode,
  selected: nodeSelected,
}: NodeViewProps) {
  const block = node.attrs.block as Extract<WorkbookBlockV1, { type: "guitar_tab" }>;
  const positionsPerLine = block.positions_per_line ?? 16;
  const blockRef = useRef(block);
  useEffect(() => {
    blockRef.current = block;
  }, [block]);
  const commit = (next: typeof block) => {
    blockRef.current = next;
    updateAttributes({ block: next });
  };
  const [selected, setSelected] = useState({ string: 6, event: 0 });
  const [fret, setFret] = useState("0");
  const [fretError, setFretError] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<number | null>(null);
  const edit = (state: TabNote["state"] | "EMPTY", explicitFret?: number, target = selected) => {
    const next = structuredClone(blockRef.current);
    const targetEvent = next.events[target.event];
    if (!targetEvent) return;
    const notes = targetEvent.notes.filter((note) => note.string_number !== target.string);
    const parsedFret = explicitFret ?? Number.parseInt(fret, 10);
    if (
      state === "FRETTED" &&
      (!Number.isInteger(parsedFret) || parsedFret < 0 || parsedFret > 36)
    ) {
      setFretError("Enter a whole-number fret from 0 to 36.");
      return;
    }
    if (state !== "EMPTY")
      notes.push({
        string_number: target.string,
        state,
        ...(state === "FRETTED" ? { fret: parsedFret } : {}),
      });
    targetEvent.notes = notes.sort((a, b) => b.string_number - a.string_number);
    commit(next);
    setFretError("");
  };
  const addPosition = () => {
    const next = structuredClone(blockRef.current);
    next.events.push({ id: createId(), ordinal: next.events.length, notes: [] });
    commit(next);
  };
  const removePosition = () => {
    if (block.events.length <= 1) return;
    const target = blockRef.current.events[selected.event];
    if (target.notes.length > 0 && pendingRemoval !== selected.event) {
      setPendingRemoval(selected.event);
      return;
    }
    const next = structuredClone(blockRef.current);
    next.events.splice(selected.event, 1);
    next.events.forEach((event, ordinal) => (event.ordinal = ordinal));
    setSelected((value) => ({ ...value, event: Math.min(value.event, next.events.length - 1) }));
    setPendingRemoval(null);
    blockRef.current = next;
    editor.view.dispatch(
      closeHistory(
        editor.state.tr.setNodeMarkup(getPos() ?? 0, undefined, {
          ...node.attrs,
          block: next,
        }),
      ),
    );
    editor.view.dispatch(closeHistory(editor.state.tr));
  };
  const duplicate = () => {
    const copy = structuredClone(blockRef.current);
    copy.id = createId();
    copy.events = copy.events.map((event) => ({ ...event, id: createId() }));
    editor
      .chain()
      .focus()
      .insertContentAt((getPos() ?? 0) + node.nodeSize, {
        type: "guitarTab",
        attrs: { blockId: copy.id, block: copy },
      })
      .run();
  };
  const pitches = [...block.tuning.strings_low_to_high].reverse();
  const systemCount = Math.max(1, Math.ceil(block.events.length / positionsPerLine));
  const systems = Array.from({ length: systemCount }, (_, index) => ({
    index,
    start: index * positionsPerLine,
  }));
  const materializeThrough = (eventIndex: number) => {
    if (eventIndex < blockRef.current.events.length) return;
    const next = structuredClone(blockRef.current);
    while (next.events.length <= eventIndex)
      next.events.push({ id: createId(), ordinal: next.events.length, notes: [] });
    commit(next);
  };
  const moveSelection = (stringNumber: number, eventIndex: number) => {
    const nextString = Math.min(6, Math.max(1, stringNumber));
    const nextEvent = Math.min(blockRef.current.events.length - 1, Math.max(0, eventIndex));
    setSelected({ string: nextString, event: nextEvent });
    const focusCell = () =>
      document
        .querySelector<HTMLElement>(`[data-tab-cell="${block.id}-${nextString}-${nextEvent}"]`)
        ?.focus();
    focusCell();
  };
  const returnToDocument = () => {
    const afterNode = (getPos() ?? 0) + node.nodeSize;
    editor.commands.setTextSelection(Math.min(editor.state.doc.content.size, afterNode + 1));
    editor.view.focus();
  };
  return (
    <NodeViewWrapper
      className="workbook-music-block"
      data-block-type="guitar-tab"
      data-node-selected={nodeSelected ? "true" : "false"}
      role="group"
      aria-label={summaryForTab(block)}
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        returnToDocument();
      }}
    >
      <div className="workbook-music-block__header" contentEditable={false}>
        <div>
          <span className="eyebrow">Guitar tablature</span>
          <strong>{block.tuning.display_name}</strong>
        </div>
        <label>
          Tuning
          <select
            value={block.tuning.slug}
            onChange={(event) =>
              updateAttributes({
                block: {
                  ...block,
                  tuning: tuningSnapshot(event.target.value as "standard" | "dadgad"),
                },
              })
            }
          >
            <option value="standard">Standard · E A D G B E</option>
            <option value="dadgad">DADGAD · D A D G A D</option>
          </select>
        </label>
        <label>
          Positions per line
          <select
            value={positionsPerLine}
            onChange={(event) =>
              commit({
                ...blockRef.current,
                positions_per_line: Number(event.target.value) as 4 | 8 | 12 | 16,
              })
            }
          >
            {[4, 8, 12, 16].map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="workbook-tab-systems" contentEditable={false}>
        {systems.map((system) => (
          <section
            className="workbook-tab-system"
            aria-label={`System ${system.index + 1}, positions ${system.start + 1} to ${system.start + positionsPerLine}`}
            key={system.start}
          >
            <strong>
              System {system.index + 1} · Positions {system.start + 1}–
              {system.start + positionsPerLine}
            </strong>
            <div className="workbook-tab-scroll">
              <div
                className="workbook-tab-grid"
                role="grid"
                aria-label={`Editable guitar tablature system ${system.index + 1}`}
              >
                <div
                  className="workbook-tab-row workbook-tab-row--positions"
                  role="row"
                  style={{ gridTemplateColumns: `3rem repeat(${positionsPerLine}, 3rem)` }}
                >
                  <span aria-hidden="true" />
                  {Array.from({ length: positionsPerLine }, (_, offset) => (
                    <span role="columnheader" key={offset}>
                      {system.start + offset + 1}
                    </span>
                  ))}
                </div>
                {pitches.map((pitch) => (
                  <div
                    className="workbook-tab-row"
                    role="row"
                    key={pitch.string_number}
                    style={{ gridTemplateColumns: `3rem repeat(${positionsPerLine}, 3rem)` }}
                  >
                    <span role="rowheader">{pitch.open_pitch}</span>
                    {Array.from({ length: positionsPerLine }, (_, offset) => {
                      const eventIndex = system.start + offset;
                      const tabEvent = block.events[eventIndex];
                      const note = tabEvent?.notes.find(
                        (item) => item.string_number === pitch.string_number,
                      );
                      const active =
                        selected.string === pitch.string_number && selected.event === eventIndex;
                      return (
                        <input
                          key={`${pitch.string_number}-${eventIndex}`}
                          role="gridcell"
                          type="text"
                          inputMode="numeric"
                          enterKeyHint="next"
                          maxLength={2}
                          pattern="[0-9xX]*"
                          autoComplete="off"
                          className={`${active ? "is-selected" : ""} ${tabEvent ? "" : "is-placeholder"}`}
                          aria-label={`String ${pitch.string_number}, position ${eventIndex + 1}, ${tabEvent ? noteLabel(note) : "Empty placeholder"}`}
                          aria-selected={active}
                          data-tab-cell={`${block.id}-${pitch.string_number}-${eventIndex}`}
                          value={
                            note?.state === "FRETTED"
                              ? String(note.fret)
                              : note?.state === "OPEN"
                                ? "0"
                                : note?.state === "MUTED"
                                  ? "x"
                                  : ""
                          }
                          placeholder="·"
                          onFocus={(focusEvent) => {
                            materializeThrough(eventIndex);
                            setSelected({ string: pitch.string_number, event: eventIndex });
                            setFret(note?.state === "FRETTED" ? String(note.fret) : "0");
                            setPendingRemoval(null);
                            setFretError("");
                            focusEvent.currentTarget.select();
                          }}
                          onChange={(changeEvent) => {
                            const value = changeEvent.target.value.trim().toLowerCase();
                            setSelected({ string: pitch.string_number, event: eventIndex });
                            setFret(value);
                            if (value === "")
                              edit("EMPTY", undefined, {
                                string: pitch.string_number,
                                event: eventIndex,
                              });
                            else if (value === "x")
                              edit("MUTED", undefined, {
                                string: pitch.string_number,
                                event: eventIndex,
                              });
                            else if (/^\d{1,2}$/.test(value) && Number(value) <= 36)
                              edit(
                                Number(value) === 0 ? "OPEN" : "FRETTED",
                                Number(value) || undefined,
                                {
                                  string: pitch.string_number,
                                  event: eventIndex,
                                },
                              );
                            else setFretError("Enter a whole-number fret from 0 to 36.");
                          }}
                          onKeyDown={(keyboardEvent) => {
                            const moves: Record<string, [number, number]> = {
                              ArrowLeft: [pitch.string_number, eventIndex - 1],
                              ArrowRight: [pitch.string_number, eventIndex + 1],
                              ArrowUp: [pitch.string_number - 1, eventIndex],
                              ArrowDown: [pitch.string_number + 1, eventIndex],
                            };
                            const next = moves[keyboardEvent.key];
                            if (next) {
                              keyboardEvent.preventDefault();
                              if (
                                next[0] < 1 ||
                                next[0] > 6 ||
                                next[1] < 0 ||
                                next[1] >= blockRef.current.events.length
                              )
                                return;
                              moveSelection(...next);
                              return;
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
      <div className="workbook-tab-entry" contentEditable={false}>
        <span>
          String {selected.string}, position {selected.event + 1}
        </span>
        <button
          type="button"
          disabled={selected.event === 0}
          aria-label="Previous tablature position"
          onClick={() => moveSelection(selected.string, selected.event - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={selected.event >= block.events.length - 1}
          aria-label="Next tablature position"
          onClick={() => moveSelection(selected.string, selected.event + 1)}
        >
          Next
        </button>
        <label>
          Fret for selected position
          <input
            inputMode="numeric"
            min="0"
            max="36"
            type="number"
            value={fret}
            onChange={(event) => {
              const value = event.target.value;
              setFret(value);
              if (/^\d{1,2}$/.test(value) && Number(value) <= 36)
                edit(Number(value) === 0 ? "OPEN" : "FRETTED", Number(value) || undefined);
              else setFretError("Enter a whole-number fret from 0 to 36.");
            }}
          />
        </label>
        <div className="workbook-tab-entry__states">
          <button type="button" onClick={() => edit("OPEN")}>
            Open
          </button>
          <button type="button" onClick={() => edit("MUTED")}>
            Mute
          </button>
          <button type="button" onClick={() => edit("EMPTY")}>
            Clear
          </button>
        </div>
      </div>
      <details className="workbook-tab-tools" contentEditable={false}>
        <summary>Tab block actions</summary>
        <div className="workbook-block-controls">
          <button type="button" onClick={duplicate}>
            Duplicate tab
          </button>
          <button type="button" className="danger-quiet" onClick={deleteNode}>
            Delete tab
          </button>
        </div>
      </details>
      <div className="workbook-tab-primary-actions" contentEditable={false}>
        <button type="button" onClick={addPosition}>
          Add position
        </button>
        <button
          type="button"
          className={pendingRemoval === selected.event ? "danger-quiet" : ""}
          disabled={block.events.length <= 1}
          onClick={removePosition}
        >
          {pendingRemoval === selected.event ? "Confirm remove position" : "Remove position"}
        </button>
        {pendingRemoval === selected.event ? (
          <button type="button" onClick={() => setPendingRemoval(null)}>
            Cancel removal
          </button>
        ) : null}
      </div>
      {fretError ? (
        <p className="workbook-field-error" role="status">
          {fretError}
        </p>
      ) : null}
      <button
        type="button"
        className="workbook-block-exit"
        contentEditable={false}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.currentTarget.blur();
          returnToDocument();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") returnToDocument();
        }}
      >
        Return to document
      </button>
    </NodeViewWrapper>
  );
}

function chordSummary(block: Extract<WorkbookBlockV1, { type: "chord_diagram" }>) {
  const strings = [...block.strings]
    .sort((a, b) => b.string_number - a.string_number)
    .map(
      (item) =>
        `string ${item.string_number} ${item.state === "FRETTED" ? `fret ${item.fret}` : item.state.toLowerCase()}`,
    )
    .join(", ");
  return `Six-string chord diagram. ${block.name}. ${block.tuning.display_name}. ${strings}.`;
}

function ChordDiagramView({
  node,
  updateAttributes,
  editor,
  getPos,
  deleteNode,
  selected: nodeSelected,
}: NodeViewProps) {
  const block = node.attrs.block as Extract<WorkbookBlockV1, { type: "chord_diagram" }>;
  const blockRef = useRef(block);
  const [chordName, setChordName] = useState(block.name);
  useEffect(() => {
    blockRef.current = block;
  }, [block]);
  const commit = (next: typeof block) => {
    blockRef.current = next;
    updateAttributes({ block: next });
  };
  const [selected, setSelected] = useState(6);
  const setString = (
    state: "FRETTED" | "OPEN" | "MUTED",
    fret?: number,
    stringNumber = selected,
  ) => {
    const next = structuredClone(blockRef.current);
    next.strings = next.strings.map((item) =>
      item.string_number === stringNumber
        ? {
            string_number: stringNumber,
            state,
            ...(state === "FRETTED" ? { fret } : {}),
          }
        : item,
    );
    commit(next);
  };
  const stringNumbers = [6, 5, 4, 3, 2, 1];
  const visibleFrets = Array.from({ length: 5 }, (_, index) => block.fret_window_start + index);
  const outsideWindow = block.strings.filter(
    (item) =>
      item.state === "FRETTED" &&
      (item.fret! < block.fret_window_start || item.fret! > block.fret_window_start + 4),
  );
  const returnToDocument = () => {
    const afterNode = (getPos() ?? 0) + node.nodeSize;
    editor.commands.setTextSelection(Math.min(editor.state.doc.content.size, afterNode + 1));
    editor.view.focus();
  };
  return (
    <NodeViewWrapper
      className="workbook-music-block"
      data-block-type="chord-diagram"
      data-node-selected={nodeSelected ? "true" : "false"}
      role="group"
      aria-label={chordSummary({ ...block, name: chordName })}
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        returnToDocument();
      }}
    >
      <div className="workbook-music-block__header" contentEditable={false}>
        <div>
          <span className="eyebrow">Chord diagram</span>
          <input
            aria-label="Chord name"
            value={chordName}
            onChange={(event) => {
              setChordName(event.target.value);
              commit({ ...blockRef.current, name: event.target.value });
            }}
            onBlur={(event) => commit({ ...blockRef.current, name: event.currentTarget.value })}
          />
        </div>
        <label>
          Displayed frets start at
          <input
            type="number"
            min="1"
            max="20"
            value={block.fret_window_start}
            onChange={(event) =>
              commit({
                ...blockRef.current,
                fret_window_start: Math.max(1, Number(event.target.value)),
              })
            }
          />
        </label>
        <label>
          Tuning
          <select
            value={block.tuning.slug}
            onChange={(event) =>
              commit({
                ...blockRef.current,
                tuning: tuningSnapshot(event.target.value as "standard" | "dadgad"),
              })
            }
          >
            <option value="standard">Standard · E A D G B E</option>
            <option value="dadgad">DADGAD · D A D G A D</option>
          </select>
        </label>
      </div>
      <div className="workbook-chord" contentEditable={false}>
        <div className="workbook-chord__states" aria-label="Chord string states">
          {stringNumbers.map((stringNumber) => {
            const item = block.strings.find((entry) => entry.string_number === stringNumber)!;
            return (
              <button
                type="button"
                key={stringNumber}
                aria-pressed={selected === stringNumber}
                aria-label={`Select string ${stringNumber}, ${noteLabel(item)}`}
                onClick={() => setSelected(stringNumber)}
              >
                <span aria-hidden="true">
                  {item.state === "OPEN" ? "○" : item.state === "MUTED" ? "×" : item.fret}
                </span>
                <small>{stringNumber}</small>
              </button>
            );
          })}
        </div>
        <div className="workbook-chord__grid" role="grid" aria-label="Chord fretboard">
          {visibleFrets.map((fret) => (
            <div className="workbook-chord__fret" role="row" key={fret}>
              <span aria-hidden="true">{fret}</span>
              {stringNumbers.map((stringNumber) => {
                const item = block.strings.find((entry) => entry.string_number === stringNumber)!;
                const active = item.state === "FRETTED" && item.fret === fret;
                return (
                  <button
                    type="button"
                    role="gridcell"
                    aria-label={`Set string ${stringNumber} to fret ${fret}`}
                    aria-selected={active}
                    className={active ? "is-fretted" : ""}
                    key={stringNumber}
                    onClick={() => {
                      setSelected(stringNumber);
                      setString("FRETTED", fret, stringNumber);
                    }}
                  >
                    <span aria-hidden="true">{active ? "●" : ""}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {outsideWindow.length > 0 ? (
        <p className="workbook-chord__notice" role="status">
          Outside this five-fret view:{" "}
          {outsideWindow
            .map((item) => `string ${item.string_number}, fret ${item.fret}`)
            .join("; ")}
          .
        </p>
      ) : null}
      <div className="workbook-block-controls" contentEditable={false}>
        <span>String {selected}</span>
        <button type="button" onClick={() => setString("OPEN")}>
          Open
        </button>
        <button type="button" onClick={() => setString("MUTED")}>
          Mute
        </button>
        <button type="button" onClick={() => setString("MUTED")}>
          Clear position
        </button>
        <button type="button" className="danger-quiet" onClick={deleteNode}>
          Delete chord
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {chordSummary(block)}
      </p>
      <button
        type="button"
        className="workbook-block-exit"
        contentEditable={false}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.currentTarget.blur();
          returnToDocument();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") returnToDocument();
        }}
      >
        Return to document
      </button>
    </NodeViewWrapper>
  );
}

function UnsupportedView({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper className="workbook-unsupported" role="note" contentEditable={false}>
      <strong>Unsupported block preserved</strong>
      <p>
        This future block cannot be edited by this prototype. Exporting the document preserves its
        original data.
      </p>
      <pre>{JSON.stringify(node.attrs.original, null, 2)}</pre>
    </NodeViewWrapper>
  );
}

const GuitarTab = Node.create({
  name: "guitarTab",
  group: "block",
  atom: true,
  selectable: false,
  addAttributes: () => ({ blockId: { default: null }, block: { default: null } }),
  parseHTML: () => [{ tag: 'div[data-workbook-node="guitar-tab"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-workbook-node": "guitar-tab" }),
  ],
  addNodeView: () => ReactNodeViewRenderer(GuitarTabView, { stopEvent: () => true }),
});
const ChordDiagram = Node.create({
  name: "chordDiagram",
  group: "block",
  atom: true,
  selectable: false,
  addAttributes: () => ({ blockId: { default: null }, block: { default: null } }),
  parseHTML: () => [{ tag: 'div[data-workbook-node="chord-diagram"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-workbook-node": "chord-diagram" }),
  ],
  addNodeView: () => ReactNodeViewRenderer(ChordDiagramView, { stopEvent: () => true }),
});
const UnsupportedBlock = Node.create({
  name: "unsupportedBlock",
  group: "block",
  atom: true,
  addAttributes: () => ({
    blockId: { default: null },
    blockVersion: { default: 1 },
    original: { default: null },
  }),
  parseHTML: () => [{ tag: 'div[data-workbook-node="unsupported"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-workbook-node": "unsupported" }),
  ],
  addNodeView: () => ReactNodeViewRenderer(UnsupportedView),
});

export function WorkbookEditorPrototype() {
  const initialPage = useMemo<Page>(
    () => ({ id: createId(), title: "First page", document: starterWorkbookDocument() }),
    [],
  );
  const [pages, setPages] = useState<Page[]>([initialPage]);
  const [activePageId, setActivePageId] = useState(initialPage.id);
  const [pageActionsOpen, setPageActionsOpen] = useState(false);
  const activePageIdRef = useRef(activePageId);
  const [status, setStatus] = useState(
    "Temporary prototype · changes are not saved to your account",
  );
  const [jsonText, setJsonText] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);
  const pagesRef = useRef(pages);
  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0];
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);
  useEffect(() => {
    activePageIdRef.current = activePageId;
  }, [activePageId]);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      BlockIdentity,
      GuitarTab,
      ChordDiagram,
      UnsupportedBlock,
    ],
    content: workbookToEditorJson(initialPage.document),
    editorProps: {
      attributes: { class: "workbook-prosemirror", "aria-label": "Workbook page document" },
      transformPastedHTML: (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ""),
    },
    onUpdate: ({ editor }) => {
      try {
        const document = editorJsonToWorkbook(editor.getJSON());
        setPages((current) =>
          current.map((page) =>
            page.id === activePageIdRef.current ? { ...page, document } : page,
          ),
        );
        setStatus("Edited locally · export JSON to keep a copy");
      } catch {
        setStatus("The document contains an invalid block. Undo the last change.");
      }
    },
  });
  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      paragraph: currentEditor?.isActive("paragraph") ?? false,
      heading: currentEditor?.isActive("heading", { level: 2 }) ?? false,
      bold: currentEditor?.isActive("bold") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      bulletList: currentEditor?.isActive("bulletList") ?? false,
      orderedList: currentEditor?.isActive("orderedList") ?? false,
      canUndo: currentEditor?.can().undo() ?? false,
      canRedo: currentEditor?.can().redo() ?? false,
    }),
  });
  useEffect(() => {
    const page = pagesRef.current.find((item) => item.id === activePageId);
    if (editor && page)
      editor.commands.setContent(workbookToEditorJson(page.document), { emitUpdate: false });
  }, [activePageId, editor]);
  if (!editor) return <p>Preparing the temporary workbook editor…</p>;
  const switchPage = (id: string) => {
    const current = editorJsonToWorkbook(editor.getJSON());
    setPages((items) =>
      items.map((page) => (page.id === activePageId ? { ...page, document: current } : page)),
    );
    setActivePageId(id);
  };
  const addPage = () => {
    const page = {
      id: createId(),
      title: `Page ${pages.length + 1}`,
      document: starterWorkbookDocument(),
    };
    setPages((items) => [...items, page]);
    setActivePageId(page.id);
  };
  const duplicatePage = () => {
    const copy = structuredClone(activePage);
    copy.id = createId();
    copy.title = `${copy.title} copy`;
    copy.document.blocks = copy.document.blocks.map((block) => {
      const copied = { ...block, id: createId() };
      return copied.type === "guitar_tab"
        ? { ...copied, events: copied.events.map((event) => ({ ...event, id: createId() })) }
        : copied;
    });
    setPages((items) => [...items, copy]);
    setActivePageId(copy.id);
  };
  const deletePage = () => {
    if (pages.length === 1) return;
    const next = pages.filter((page) => page.id !== activePageId);
    setPages(next);
    setActivePageId(next[0].id);
  };
  const insertMusical = (type: "tab" | "chord") => {
    const block = type === "tab" ? emptyTabBlock() : emptyChordBlock();
    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: type === "tab" ? "guitarTab" : "chordDiagram",
          attrs: { blockId: block.id, block },
        },
        { type: "paragraph", attrs: { blockId: createId() } },
      ])
      .run();
  };
  const exportJson = () => {
    const document = editorJsonToWorkbook(editor.getJSON());
    setPages((items) =>
      items.map((page) => (page.id === activePageId ? { ...page, document } : page)),
    );
    setJsonText(JSON.stringify(document, null, 2));
    setStatus("Document JSON exported locally below");
  };
  const downloadJson = () => {
    const document = editorJsonToWorkbook(editor.getJSON());
    const href = URL.createObjectURL(
      new Blob([JSON.stringify(document, null, 2)], { type: "application/json" }),
    );
    const anchor = window.document.createElement("a");
    anchor.href = href;
    anchor.download = "guitarpg-workbook.json";
    anchor.click();
    URL.revokeObjectURL(href);
    setStatus("Document JSON downloaded to this device");
  };
  const restoreDocument = (document: WorkbookDocumentV1) => {
    if (!window.confirm("Replace the current page with this imported document?")) {
      setStatus("Import cancelled · the current page was not changed");
      return;
    }
    editor.commands.setContent(workbookToEditorJson(document));
    setPages((items) =>
      items.map((page) => (page.id === activePageId ? { ...page, document } : page)),
    );
    setStatus("Document JSON restored and remains editable");
  };
  const importJsonText = () => {
    if (!jsonText.trim()) {
      setStatus("Enter JSON text or select a JSON file to import.");
      statusRef.current?.focus();
      return;
    }
    try {
      const document = parseWorkbookDocument(JSON.parse(jsonText));
      restoreDocument(document);
    } catch (error) {
      setStatus(
        error instanceof SyntaxError
          ? "The JSON text is malformed. The current page was not changed."
          : error instanceof Error
            ? error.message
            : "The document could not be imported.",
      );
      statusRef.current?.focus();
    }
  };
  const importJsonFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      setStatus("Choose a .json workbook file. The current page was not changed.");
      return;
    }
    if (file.size > MAX_WORKBOOK_IMPORT_BYTES) {
      setStatus("The JSON file exceeds the 1 MB prototype import limit.");
      return;
    }
    try {
      const text = await file.text();
      if (!text.trim()) throw new SyntaxError();
      const document = parseWorkbookDocument(JSON.parse(text));
      restoreDocument(document);
    } catch (error) {
      setStatus(
        error instanceof SyntaxError
          ? "The selected JSON file is malformed. The current page was not changed."
          : error instanceof Error
            ? error.message
            : "The selected file could not be imported.",
      );
      statusRef.current?.focus();
    }
  };
  return (
    <section className="workbook-prototype" aria-labelledby="workbook-title">
      <header className="workbook-header">
        <div>
          <span className="eyebrow">Non-production prototype</span>
          <h1 id="workbook-title">Interactive Workbook Editor</h1>
          <p>
            Test one continuous document with rich text, tablature, and chord diagrams. Nothing is
            saved remotely.
          </p>
        </div>
        <label>
          Workbook title
          <input defaultValue="Guitar ideas" />
        </label>
      </header>
      <p ref={statusRef} className="workbook-status" role="status" tabIndex={-1}>
        {status}
      </p>
      <div className="workbook-layout">
        <nav className="workbook-pages" aria-label="Temporary workbook pages">
          <h2>Pages</h2>
          <div className="workbook-page-strip" aria-label="Workbook page selectors">
            {pages.map((page) => (
              <button
                type="button"
                className={page.id === activePageId ? "is-active" : ""}
                aria-current={page.id === activePageId ? "page" : undefined}
                key={page.id}
                onClick={() => switchPage(page.id)}
              >
                {page.title}
              </button>
            ))}
          </div>
          <button className="workbook-new-page" type="button" onClick={addPage}>
            + New page
          </button>
          <div className={`workbook-page-actions ${pageActionsOpen ? "is-open" : ""}`}>
            <button
              className="workbook-page-actions__toggle"
              type="button"
              aria-expanded={pageActionsOpen}
              aria-controls="workbook-page-actions-menu"
              onClick={() => setPageActionsOpen((open) => !open)}
            >
              Page actions
            </button>
            <div id="workbook-page-actions-menu">
              <button type="button" onClick={duplicatePage}>
                Duplicate page
              </button>
              <button type="button" disabled={pages.length === 1} onClick={deletePage}>
                Delete page
              </button>
            </div>
          </div>
        </nav>
        <div className="workbook-editor-area">
          <label className="workbook-page-title">
            Page title
            <input
              value={activePage.title}
              onChange={(event) =>
                setPages((items) =>
                  items.map((page) =>
                    page.id === activePageId ? { ...page, title: event.target.value } : page,
                  ),
                )
              }
            />
          </label>
          <div className="workbook-toolbar" role="toolbar" aria-label="Workbook editing tools">
            <button
              type="button"
              aria-pressed={toolbarState?.paragraph ?? false}
              onClick={() => editor.chain().focus().setParagraph().run()}
            >
              Paragraph
            </button>
            <button
              type="button"
              aria-pressed={toolbarState?.heading ?? false}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              Heading
            </button>
            <button
              type="button"
              aria-pressed={toolbarState?.bold ?? false}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              Bold
            </button>
            <button
              type="button"
              aria-pressed={toolbarState?.italic ?? false}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              Italic
            </button>
            <button
              type="button"
              aria-pressed={toolbarState?.bulletList ?? false}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              Bullets
            </button>
            <button
              type="button"
              aria-pressed={toolbarState?.orderedList ?? false}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              Numbered
            </button>
            <button
              type="button"
              disabled={!toolbarState?.canUndo}
              onClick={() => editor.chain().focus().undo().run()}
            >
              Undo
            </button>
            <button
              type="button"
              disabled={!toolbarState?.canRedo}
              onClick={() => editor.chain().focus().redo().run()}
            >
              Redo
            </button>
            <button type="button" onClick={() => insertMusical("tab")}>
              Insert tablature
            </button>
            <button type="button" onClick={() => insertMusical("chord")}>
              Insert chord diagram
            </button>
          </div>
          <EditorContent editor={editor} />
          <section className="workbook-json" aria-labelledby="json-title">
            <div>
              <h2 id="json-title">Document JSON round trip</h2>
              <p>
                Display or download the active page only. Import JSON text or a local JSON file;
                files stay in this browser and are limited to 1 MB.
              </p>
            </div>
            <div className="workbook-json__actions">
              <button type="button" onClick={exportJson}>
                Display document JSON
              </button>
              <button type="button" onClick={downloadJson}>
                Download JSON file
              </button>
              <button type="button" onClick={importJsonText}>
                Import JSON text
              </button>
              <label className="workbook-file-import">
                Import JSON file
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => {
                    void importJsonFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const document = starterWorkbookDocument();
                  editor.commands.setContent(workbookToEditorJson(document));
                  setJsonText("");
                  setStatus("Prototype page reset");
                }}
              >
                Reset prototype
              </button>
            </div>
            <label>
              Workbook document JSON
              <textarea
                spellCheck={false}
                value={jsonText}
                onChange={(event) => setJsonText(event.target.value)}
                placeholder="Exported GUITARPG_WORKBOOK_DOCUMENT_V1 appears here"
              />
            </label>
          </section>
        </div>
      </div>
    </section>
  );
}
