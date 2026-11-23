import { describe, expect, it } from "vitest";
import {
  ARPEGGIO_PRESETS,
  ARPEGGIO_SUBDIVISIONS,
  buildArpeggioBar,
  createArpeggioPattern,
  stepCountForSubdivision,
  type ArpeggioStepTone,
  type ArpeggioSubdivision,
} from "@/lib/codex/v2/arpeggio-sequencer";
import {
  generateTriadVoicings,
  type NamedTriad,
  type TriadVoicing,
} from "@/lib/codex/v2/chord-voicings";
import {
  CHROMATIC_ROOTS,
  TUNINGS,
  pitchAt,
  type FretboardTuning,
} from "@/lib/codex/v2/fretboard-engine";
import { parseCodexV2 } from "@/lib/codex/v2/content";
import { readCodexV2DraftPreview } from "@/lib/codex/v2/preview";
import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";
import { PUBLISHED_CODEX_V2_ENTRIES, PUBLISHED_CODEX_V2_TERMS } from "@/lib/codex/v2/catalog";

function find(
  chord: NamedTriad,
  frets: readonly number[],
  tuning: FretboardTuning = "standard",
): TriadVoicing {
  const found = generateTriadVoicings(chord, tuning, "1-3").find(
    (item) => item.frets.join("-") === frets.join("-"),
  );
  if (!found) throw new Error("Missing known musical example");
  return found;
}

const cMajor = { root: "C", quality: "major" } as const;

describe("CODEX-V2-A-R11 deterministic arpeggio sequencer", () => {
  it("outlines C–E–G–E as four quarter notes in one actual 4/4 bar", () => {
    const voicing = find(cMajor, [5, 5, 3]);
    const bar = buildArpeggioBar(voicing, "quarter", 80, createArpeggioPattern("quarter", "arch"));
    expect(bar.events).toHaveLength(4);
    expect(bar.events.map((event) => event.note)).toEqual(["C4", "E4", "G4", "E4"]);
    expect(bar.events.map((event) => event.midi)).toEqual([60, 64, 67, 64]);
    expect(bar.events.map((event) => event.stringNumber)).toEqual([3, 2, 1, 2]);
    expect(bar.events.map((event) => event.fret)).toEqual([5, 5, 3, 5]);
    expect(bar.events.map((event) => event.beat)).toEqual([1, 2, 3, 4]);
    expect(bar.events.map((event) => event.count)).toEqual(["1", "2", "3", "4"]);
    expect(bar.events.map((event) => event.startSeconds)).toEqual([0, 0.75, 1.5, 2.25]);
    expect(bar.stepSeconds).toBe(0.75);
    expect(bar.durationSeconds).toBe(3);
  });

  it("uses actual chord-tone roles when the root is not the voicing bass", () => {
    const firstInversion = find(cMajor, [9, 8, 8]);
    expect(firstInversion.notes).toEqual(["E4", "G4", "C5"]);
    expect(firstInversion.tones).toEqual(["third", "fifth", "root"]);
    const bar = buildArpeggioBar(
      firstInversion,
      "quarter",
      60,
      createArpeggioPattern("quarter", "arch"),
    );
    expect(bar.events.map((event) => event.note)).toEqual(["C5", "E4", "G4", "E4"]);
    expect(bar.events.map((event) => event.stringNumber)).toEqual([1, 3, 2, 3]);
    expect(bar.events.map((event) => event.fret)).toEqual([8, 9, 8, 9]);
  });

  it("separates quarter tempo from 8 eighth / 12 triplet / 16 sixteenth attacks", () => {
    for (const [id, count, subdivisions] of [
      ["quarter", 4, 1],
      ["eighth", 8, 2],
      ["triplet", 12, 3],
      ["sixteenth", 16, 4],
    ] as const) {
      expect(stepCountForSubdivision(id)).toBe(count);
      expect(ARPEGGIO_SUBDIVISIONS[id].stepsPerBeat).toBe(subdivisions);
      const bar = buildArpeggioBar(find(cMajor, [5, 5, 3]), id, 60, createArpeggioPattern(id));
      expect(bar.events).toHaveLength(count);
      expect(bar.durationSeconds).toBe(4);
      expect(bar.stepSeconds).toBe(1 / subdivisions);
      expect(bar.events.map((event) => event.startSeconds)).toEqual(
        Array.from({ length: count }, (_, index) => index / subdivisions),
      );
      for (const event of bar.events) {
        expect(event.beat).toBe(Math.floor(event.index / subdivisions) + 1);
        expect(event.part).toBe((event.index % subdivisions) + 1);
        expect(event.durationSeconds).toBeLessThan(bar.stepSeconds);
        expect(event.startSeconds + event.durationSeconds).toBeLessThan(4.000001);
      }
    }
    const triplets = buildArpeggioBar(
      find(cMajor, [5, 5, 3]),
      "triplet",
      60,
      createArpeggioPattern("triplet"),
    );
    expect(triplets.events.slice(0, 6).map((event) => event.count)).toEqual([
      "1",
      "trip",
      "let",
      "2",
      "trip",
      "let",
    ]);
    const sixteenths = buildArpeggioBar(
      find(cMajor, [5, 5, 3]),
      "sixteenth",
      60,
      createArpeggioPattern("sixteenth"),
    );
    expect(sixteenths.events.slice(0, 4).map((event) => event.count)).toEqual(["1", "e", "&", "a"]);
  });

  it("keeps rests silent and distinguishes a preset from edited chord-tone order", () => {
    const voicing = find(cMajor, [5, 5, 3]);
    const template = createArpeggioPattern("eighth", "space");
    expect(template).toHaveLength(8);
    expect(template).toContain("rest");
    const modified: ArpeggioStepTone[] = [...template];
    modified[1] = "fifth";
    modified[4] = "rest";
    const bar = buildArpeggioBar(voicing, "eighth", 100, modified);
    expect(bar.events[1]).toMatchObject({ note: "G4", tone: "fifth", midi: 67 });
    expect(bar.events[4]).toMatchObject({
      tone: "rest",
      midi: null,
      note: null,
      fret: null,
      stringNumber: null,
    });
    expect(bar.events.some((event) => event.note === "Silence")).toBe(false);
    expect(Object.keys(ARPEGGIO_PRESETS)).toHaveLength(5);
  });

  it("keeps correct pitches and tone mappings across 12 roots, tunings, groups and rhythms", () => {
    const rhythmIds = Object.keys(ARPEGGIO_SUBDIVISIONS) as ArpeggioSubdivision[];
    const tunings = Object.keys(TUNINGS) as FretboardTuning[];
    let tested = 0;
    for (const root of CHROMATIC_ROOTS) {
      for (const quality of ["major", "minor"] as const) {
        for (const tuning of tunings) {
          for (const group of ["1-3", "2-4", "3-5", "4-6"] as const) {
            const voicing = generateTriadVoicings({ root, quality }, tuning, group)[0];
            if (!voicing) continue;
            for (const rhythm of rhythmIds) {
              const bar = buildArpeggioBar(
                voicing,
                rhythm,
                120,
                createArpeggioPattern(rhythm, "ascending"),
              );
              expect(bar.events).toHaveLength(4 * ARPEGGIO_SUBDIVISIONS[rhythm].stepsPerBeat);
              for (const event of bar.events) {
                if (event.tone === "rest") {
                  expect(event.midi).toBeNull();
                  continue;
                }
                const voice = voicing.tones.indexOf(event.tone);
                expect(event.midi).toBe(voicing.midi[voice]);
                expect(event.note).toBe(voicing.notes[voice]);
                expect(event.midi).toBe(pitchAt(tuning, event.stringNumber!, event.fret!));
              }
              tested++;
            }
          }
        }
      }
    }
    expect(tested).toBeGreaterThan(500);
    const b = generateTriadVoicings({ root: "A♭", quality: "minor" }, "standard", "1-3")[0];
    const name = b.notes.find((note) => note.startsWith("C♭"));
    expect(name).toBeDefined();
  });

  it("rejects malformed tempos, mismatched step counts and unknown notes", () => {
    const voicing = find(cMajor, [5, 5, 3]);
    const quarter = createArpeggioPattern("quarter");
    for (const bad of [-1, 0, 39, 201, 120.5, Number.NaN]) {
      expect(() => buildArpeggioBar(voicing, "quarter", bad, quarter)).toThrow(/BPM/);
    }
    expect(() => buildArpeggioBar(voicing, "quarter", 80, quarter.slice(0, 3))).toThrow(/length/);
    expect(() =>
      buildArpeggioBar(voicing, "quarter", 80, [
        "root",
        "seventh",
        "third",
        "fifth",
      ] as ArpeggioStepTone[]),
    ).toThrow(/tone/);
    expect(() => createArpeggioPattern("unknown" as ArpeggioSubdivision)).toThrow(/subdivision/);
    expect(() => createArpeggioPattern("quarter", "bad" as "arch")).toThrow(/pattern/);
  });

  it("registers interactive media only on the draft Arpeggio Sequencing Skill", () => {
    const catalog = readCodexV2DraftPreview();
    expect(catalog.entries).toHaveLength(9);
    expect(catalog.entries.flatMap((entry) => entry.modules)).toHaveLength(114);
    expect(catalog.terms).toHaveLength(178);
    expect(CODEX_ENTRIES).toHaveLength(197);
    expect(PUBLISHED_CODEX_V2_ENTRIES).toHaveLength(0);
    expect(PUBLISHED_CODEX_V2_TERMS).toHaveLength(0);
    const entry = catalog.entries.find((item) => item.slug === "arpeggio_sequencing");
    expect(entry?.reference_blocks.map((block) => block.kind)).toEqual(["ARPEGGIO_SEQUENCER"]);
    const forged = structuredClone(catalog);
    forged.entries
      .find((item) => item.slug === "note_location")!
      .reference_blocks.push({
        id: "forged-sequence",
        kind: "ARPEGGIO_SEQUENCER",
        location: "overview",
      });
    expect(() => parseCodexV2(forged, true)).toThrow(/unsupported reference block/);
  });
});
