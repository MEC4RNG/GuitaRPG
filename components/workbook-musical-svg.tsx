import type { WorkbookBlockV1 } from "@/lib/workbook/document-v1";

type ChordBlock = Extract<WorkbookBlockV1, { type: "chord_diagram" }>;

// The SVGs are derived views, never persisted document authority. The adjacent
// semantic grid/input controls supply all keyboard/touch editing and screen-reader labels.
export function ChordFretboardSvg({ block }: { block: ChordBlock }) {
  const start = block.fret_window_start;
  const last = start + 4;
  const visible = block.strings.filter(
    (item) => item.state === "FRETTED" && item.fret !== undefined &&
      item.fret >= start && item.fret <= last,
  );
  const barres = block.barres.filter((item) => item.fret >= start && item.fret <= last);

  return (
    <svg
      className="workbook-chord__svg"
      viewBox="0 0 600 500"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <line
          key={`fret-${index}`}
          x1="50"
          x2="550"
          y1={index * 100}
          y2={index * 100}
          stroke="currentColor"
          strokeWidth={index === 0 && start === 1 ? 10 : 2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {Array.from({ length: 6 }, (_, index) => (
        <line
          key={`string-${index}`}
          x1={50 + index * 100}
          x2={50 + index * 100}
          y1="0"
          y2="500"
          stroke="currentColor"
          strokeWidth={index === 0 || index === 5 ? 3 : 2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {barres.map((barre, index) => {
        const left = 50 + (6 - barre.from_string) * 100;
        const right = 50 + (6 - barre.to_string) * 100;
        const center = (barre.fret - start + 0.5) * 100;
        return (
          <g key={`barre-${index}`}>
            <rect
              x={left - 25}
              y={center - 25}
              width={right - left + 50}
              height="50"
              rx="25"
              fill="var(--surface-accent)"
            />
            {barre.finger !== undefined ? (
              <text
                x={(left + right) / 2}
                y={center}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--surface-panel)"
                fontSize="36"
                fontWeight="700"
              >
                {barre.finger}
              </text>
            ) : null}
          </g>
        );
      })}
      {visible.map((item) => {
        const x = 50 + (6 - item.string_number) * 100;
        const y = ((item.fret ?? start) - start + 0.5) * 100;
        return (
          <g key={item.string_number}>
            <circle cx={x} cy={y} r="30" fill="var(--surface-accent)" />
            {item.finger !== undefined ? (
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--surface-panel)"
                fontSize="38"
                fontWeight="700"
              >
                {item.finger}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

// Each system has exactly six horizontal string guides behind six labelled
// input rows; the inputs, not the SVG, remain the edit and selection authority.
export function TabStringGuideSvg({ positionsPerLine }: { positionsPerLine: 4 | 8 | 12 | 16 }) {
  return (
    <svg
      className="workbook-tab-guide-svg"
      viewBox={`0 0 ${positionsPerLine * 100} 600`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <line
          key={index}
          x1="0"
          x2={positionsPerLine * 100}
          y1={50 + index * 100}
          y2={50 + index * 100}
          stroke="currentColor"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
