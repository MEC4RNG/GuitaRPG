import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChordFretboardSvg, TabStringGuideSvg } from "@/components/workbook-musical-svg";
import { emptyChordBlock } from "@/lib/workbook/document-v1";

describe("structured musical SVG presentation", () => {
  it("draws the nut, strings, labelled fingers, and barres from chord data", () => {
    const chord = emptyChordBlock();
    chord.name = "F major";
    chord.strings[0] = { string_number: 6, state: "FRETTED", fret: 1, finger: 1 };
    chord.strings[2] = { string_number: 4, state: "FRETTED", fret: 3, finger: 3 };
    chord.barres = [{ from_string: 6, to_string: 1, fret: 1, finger: 1 }];

    const svg = renderToStaticMarkup(createElement(ChordFretboardSvg, { block: chord }));
    expect(svg).toContain('class="workbook-chord__svg"');
    expect(svg).toContain('viewBox="0 0 600 500"');
    expect(svg).toContain('stroke-width="10"');
    expect(svg).toContain('rx="25"');
    expect(svg).toContain('>3</text>');
    expect(svg).toContain('aria-hidden="true"');
  });

  it("keeps absolute chord frets outside the window without falsely displaying markers", () => {
    const chord = emptyChordBlock();
    chord.strings[0] = { string_number: 6, state: "FRETTED", fret: 2 };
    chord.fret_window_start = 8;

    const svg = renderToStaticMarkup(createElement(ChordFretboardSvg, { block: chord }));
    expect(svg).not.toContain("<circle");
    expect(chord.strings[0].fret).toBe(2);
  });

  it("draws six strings for each supported tab system density", () => {
    for (const positionsPerLine of [4, 8, 12, 16] as const) {
      const svg = renderToStaticMarkup(
        createElement(TabStringGuideSvg, { positionsPerLine }),
      );
      expect(svg).toContain(`viewBox="0 0 ${positionsPerLine * 100} 600"`);
      expect(svg.match(/<line/g)).toHaveLength(6);
      expect(svg).toContain('aria-hidden="true"');
    }
  });
});
