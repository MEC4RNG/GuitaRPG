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
import { useEffect, useMemo, useRef, useState } from "react";

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

function GuitarTabView({ node, updateAttributes, editor, getPos, deleteNode }: NodeViewProps) {
  const block = node.attrs.block as Extract<WorkbookBlockV1, { type: "guitar_tab" }>;
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
  const entryBuffer = useRef<{ cell: string; value: string } | null>(null);
  const edit = (state: TabNote["state"] | "EMPTY", explicitFret?: number) => {
    const next = structuredClone(blockRef.current);
    const notes = next.events[selected.event].notes.filter(
      (note) => note.string_number !== selected.string,
    );
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
        string_number: selected.string,
        state,
        ...(state === "FRETTED" ? { fret: parsedFret } : {}),
      });
    next.events[selected.event].notes = notes.sort((a, b) => b.string_number - a.string_number);
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
    const next = structuredClone(blockRef.current);
    next.events.splice(selected.event, 1);
    next.events.forEach((event, ordinal) => (event.ordinal = ordinal));
    setSelected((value) => ({ ...value, event: Math.min(value.event, next.events.length - 1) }));
    commit(next);
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
  const moveSelection = (stringNumber: number, eventIndex: number) => {
    const nextString = Math.min(6, Math.max(1, stringNumber));
    const nextEvent = Math.min(block.events.length - 1, Math.max(0, eventIndex));
    setSelected({ string: nextString, event: nextEvent });
    entryBuffer.current = null;
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(`[data-tab-cell="${block.id}-${nextString}-${nextEvent}"]`)
        ?.focus(),
    );
  };
  return (
    <NodeViewWrapper
      className="workbook-music-block"
      data-block-type="guitar-tab"
      role="group"
      aria-label={summaryForTab(block)}
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
      </div>
      <div className="workbook-tab-scroll" contentEditable={false}>
        <div className="workbook-tab-grid" role="grid" aria-label="Editable guitar tablature">
          <div
            className="workbook-tab-row workbook-tab-row--positions"
            role="row"
            style={{ gridTemplateColumns: `3rem repeat(${block.events.length}, 3.25rem)` }}
          >
            <span aria-hidden="true" />
            {block.events.map((event, index) => (
              <span role="columnheader" key={event.id}>
                {index + 1}
              </span>
            ))}
          </div>
          {pitches.map((pitch) => (
            <div
              className="workbook-tab-row"
              role="row"
              key={pitch.string_number}
              style={{ gridTemplateColumns: `3rem repeat(${block.events.length}, 3.25rem)` }}
            >
              <span role="rowheader">{pitch.open_pitch}</span>
              {block.events.map((event, eventIndex) => {
                const note = event.notes.find((item) => item.string_number === pitch.string_number);
                const active =
                  selected.string === pitch.string_number && selected.event === eventIndex;
                return (
                  <button
                    key={event.id}
                    role="gridcell"
                    className={active ? "is-selected" : ""}
                    aria-label={`String ${pitch.string_number}, position ${eventIndex + 1}, ${noteLabel(note)}`}
                    aria-selected={active}
                    data-tab-cell={`${block.id}-${pitch.string_number}-${eventIndex}`}
                    onClick={() => {
                      setSelected({ string: pitch.string_number, event: eventIndex });
                      setFret(note?.state === "FRETTED" ? String(note.fret) : "0");
                      entryBuffer.current = null;
                    }}
                    onKeyDown={(event) => {
                      const moves: Record<string, [number, number]> = {
                        ArrowLeft: [pitch.string_number, eventIndex - 1],
                        ArrowRight: [pitch.string_number, eventIndex + 1],
                        ArrowUp: [pitch.string_number + 1, eventIndex],
                        ArrowDown: [pitch.string_number - 1, eventIndex],
                      };
                      const next = moves[event.key];
                      if (next) {
                        event.preventDefault();
                        moveSelection(...next);
                        return;
                      }
                      if (/^[0-9]$/.test(event.key)) {
                        event.preventDefault();
                        const cell = `${pitch.string_number}-${eventIndex}`;
                        const candidate =
                          entryBuffer.current?.cell === cell
                            ? `${entryBuffer.current.value}${event.key}`
                            : event.key;
                        const value = Number(candidate);
                        if (value <= 36) {
                          entryBuffer.current = { cell, value: candidate };
                          setSelected({ string: pitch.string_number, event: eventIndex });
                          setFret(candidate);
                          edit("FRETTED", value);
                        } else {
                          setFretError("Enter a whole-number fret from 0 to 36.");
                        }
                      }
                      if (event.key === "Backspace" || event.key === "Delete") {
                        event.preventDefault();
                        entryBuffer.current = null;
                        setSelected({ string: pitch.string_number, event: eventIndex });
                        edit("EMPTY");
                      }
                    }}
                  >
                    {note
                      ? note.state === "FRETTED"
                        ? note.fret
                        : note.state === "OPEN"
                          ? "0"
                          : "×"
                      : "·"}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="workbook-block-controls" contentEditable={false}>
        <span>
          String {selected.string}, position {selected.event + 1}
        </span>
        <label>
          Direct fret entry
          <input
            inputMode="numeric"
            min="0"
            max="36"
            type="number"
            value={fret}
            onChange={(event) => {
              const value = event.target.value;
              setFret(value);
              entryBuffer.current = null;
              if (/^\d{1,2}$/.test(value) && Number(value) <= 36) edit("FRETTED", Number(value));
              else setFretError("Enter a whole-number fret from 0 to 36.");
            }}
          />
        </label>
        <button type="button" onClick={() => edit("OPEN")}>
          Open
        </button>
        <button type="button" onClick={() => edit("MUTED")}>
          Mute
        </button>
        <button type="button" onClick={() => edit("EMPTY")}>
          Clear
        </button>
        <button type="button" onClick={addPosition}>
          Add position
        </button>
        <button type="button" disabled={block.events.length <= 1} onClick={removePosition}>
          Remove position
        </button>
        <button type="button" onClick={duplicate}>
          Duplicate tab
        </button>
        <button type="button" className="danger-quiet" onClick={deleteNode}>
          Delete tab
        </button>
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
        onClick={() => editor.commands.focus((getPos() ?? 0) + node.nodeSize)}
        onKeyDown={(event) => {
          if (event.key === "Escape") editor.commands.focus((getPos() ?? 0) + node.nodeSize);
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

function ChordDiagramView({ node, updateAttributes, editor, getPos, deleteNode }: NodeViewProps) {
  const block = node.attrs.block as Extract<WorkbookBlockV1, { type: "chord_diagram" }>;
  const blockRef = useRef(block);
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
  return (
    <NodeViewWrapper
      className="workbook-music-block"
      data-block-type="chord-diagram"
      role="group"
      aria-label={chordSummary(block)}
    >
      <div className="workbook-music-block__header" contentEditable={false}>
        <div>
          <span className="eyebrow">Chord diagram</span>
          <input
            aria-label="Chord name"
            value={block.name}
            onChange={(event) => commit({ ...blockRef.current, name: event.target.value })}
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
        onClick={() => editor.commands.focus((getPos() ?? 0) + node.nodeSize)}
        onKeyDown={(event) => {
          if (event.key === "Escape") editor.commands.focus((getPos() ?? 0) + node.nodeSize);
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
  addAttributes: () => ({ blockId: { default: null }, block: { default: null } }),
  parseHTML: () => [{ tag: 'div[data-workbook-node="guitar-tab"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-workbook-node": "guitar-tab" }),
  ],
  addNodeView: () => ReactNodeViewRenderer(GuitarTabView),
});
const ChordDiagram = Node.create({
  name: "chordDiagram",
  group: "block",
  atom: true,
  addAttributes: () => ({ blockId: { default: null }, block: { default: null } }),
  parseHTML: () => [{ tag: 'div[data-workbook-node="chord-diagram"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-workbook-node": "chord-diagram" }),
  ],
  addNodeView: () => ReactNodeViewRenderer(ChordDiagramView),
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
  const importJson = () => {
    try {
      const document = parseWorkbookDocument(JSON.parse(jsonText));
      editor.commands.setContent(workbookToEditorJson(document));
      setPages((items) =>
        items.map((page) => (page.id === activePageId ? { ...page, document } : page)),
      );
      setStatus("Document JSON restored and remains editable");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The document could not be imported.");
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
        <aside className="workbook-pages" aria-label="Temporary workbook pages">
          <div className="workbook-pages__heading">
            <h2>Pages</h2>
            <button type="button" onClick={addPage}>
              New page
            </button>
          </div>
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
          <div className="workbook-page-actions">
            <button type="button" onClick={duplicatePage}>
              Duplicate
            </button>
            <button type="button" disabled={pages.length === 1} onClick={deletePage}>
              Delete
            </button>
          </div>
        </aside>
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
                Display the GuitaRPG-owned format below for inspection or editing. This does not
                download a file unless you choose Download JSON file.
              </p>
            </div>
            <div className="workbook-json__actions">
              <button type="button" onClick={exportJson}>
                Display document JSON
              </button>
              <button type="button" onClick={downloadJson}>
                Download JSON file
              </button>
              <button type="button" onClick={importJson}>
                Import document JSON
              </button>
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
