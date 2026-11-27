import { Fragment } from "react";
import type { WorkbookBlockV1, WorkbookDocumentV1 } from "@/lib/workbook/document-v1";
import { ChordFretboardSvg } from "./workbook-musical-svg";

type TextRun = { text: string; marks?: Array<"bold" | "italic"> };

function InlineRuns({ runs }: { runs: TextRun[] }) {
  return runs.map((run, index) => {
    let node = <>{run.text}</>;
    if (run.marks?.includes("italic")) node = <em>{node}</em>;
    if (run.marks?.includes("bold")) node = <strong>{node}</strong>;
    return <Fragment key={index}>{node}</Fragment>;
  });
}

function DisplayTab({ block }: { block: Extract<WorkbookBlockV1, { type: "guitar_tab" }> }) {
  const lineLength = block.positions_per_line ?? 16;
  const strings = [...block.tuning.strings_low_to_high].reverse();
  const systems = Array.from({ length: Math.ceil(block.events.length / lineLength) }, (_, i) =>
    block.events.slice(i * lineLength, (i + 1) * lineLength),
  );
  return (
    <figure className="workbook-display-tab">
      <figcaption>Tablature · {block.tuning.display_name}</figcaption>
      {systems.map((events, index) => (
        <div
          className="workbook-display-tab__scroll"
          role="region"
          aria-label={`Tablature system ${index + 1}, horizontally scrollable`}
          tabIndex={0}
          key={index}
        >
          <table
            aria-label={`Guitar tablature system ${index + 1}`}
            style={{ minWidth: `${Math.max(14, events.length * 1.8 + 3)}rem` }}
          >
            <tbody>
              {strings.map((string) => (
                <tr key={string.string_number}>
                  <th scope="row">{string.open_pitch}</th>
                  {events.map((event) => {
                    const note = event.notes.find((n) => n.string_number === string.string_number);
                    const value =
                      note?.state === "OPEN"
                        ? "0"
                        : note?.state === "MUTED"
                          ? "x"
                          : note?.state === "FRETTED"
                            ? note.fret
                            : "";
                    return (
                      <td key={event.id}>
                        <span>{value}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </figure>
  );
}

function DisplayChord({ block }: { block: Extract<WorkbookBlockV1, { type: "chord_diagram" }> }) {
  const description = block.strings
    .map((string) =>
      string.state === "FRETTED"
        ? `String ${string.string_number} fret ${string.fret}${string.finger ? `, finger ${string.finger}` : ""}`
        : `String ${string.string_number} ${string.state.toLowerCase()}`,
    )
    .concat(
      block.barres.map(
        (barre) =>
          `Barre fret ${barre.fret}, strings ${barre.from_string} to ${barre.to_string}${barre.finger ? `, finger ${barre.finger}` : ""}`,
      ),
    )
    .join("; ");
  const outside =
    block.strings.some(
      (string) =>
        string.state === "FRETTED" &&
        (string.fret! < block.fret_window_start || string.fret! > block.fret_window_start + 4),
    ) ||
    block.barres.some(
      (barre) => barre.fret < block.fret_window_start || barre.fret > block.fret_window_start + 4,
    );
  return (
    <figure className="workbook-display-chord">
      <figcaption>
        <strong>{block.name}</strong> · {block.tuning.display_name}
      </figcaption>
      <div role="img" aria-label={`${block.name}: ${description}`}>
        <div className="workbook-display-chord__strings" aria-hidden="true">
          {block.strings.map((string) => (
            <span key={string.string_number}>
              {string.state === "OPEN" ? "○" : string.state === "MUTED" ? "×" : ""}
            </span>
          ))}
        </div>
        <div className="workbook-display-chord__diagram">
          <ChordFretboardSvg block={block} />
        </div>
        <div className="workbook-display-chord__strings" aria-hidden="true">
          {block.tuning.strings_low_to_high.map((string) => (
            <span key={string.string_number}>{string.open_pitch}</span>
          ))}
        </div>
        <small>
          Frets {block.fret_window_start}–{block.fret_window_start + 4}
        </small>
      </div>
      {outside ? <p>Some notes lie outside the diagram: {description}.</p> : null}
    </figure>
  );
}

/** Pure presentation of the existing document. No editor, mutation or playback side effects. */
export function WorkbookDisplay({ document }: { document: WorkbookDocumentV1 }) {
  return (
    <article className="workbook-display" aria-label="Workbook page display">
      {document.blocks.map((block) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={block.id}>
                <InlineRuns runs={block.content} />
              </p>
            );
          case "heading": {
            const Heading = block.level === 1 ? "h2" : block.level === 3 ? "h4" : "h3";
            return (
              <Heading key={block.id}>
                <InlineRuns runs={block.content} />
              </Heading>
            );
          }
          case "bullet_list":
          case "ordered_list": {
            const List = block.type === "bullet_list" ? "ul" : "ol";
            return (
              <List key={block.id}>
                {block.items.map((runs, index) => (
                  <li key={index}>
                    <InlineRuns runs={runs} />
                  </li>
                ))}
              </List>
            );
          }
          case "guitar_tab":
            return <DisplayTab key={block.id} block={block} />;
          case "chord_diagram":
            return <DisplayChord key={block.id} block={block} />;
          case "unsupported":
            return (
              <p key={block.id} role="note">
                This block requires a newer editor. Its original data is preserved.
              </p>
            );
        }
      })}
    </article>
  );
}
