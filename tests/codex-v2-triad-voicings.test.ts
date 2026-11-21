import { describe, expect, it } from "vitest";
import {
  describeTriadTones,
  generateTriadVoicings,
  INVERSION_NAMES,
  STRING_GROUPS,
  TRIAD_ROOTS,
  type TriadInversion,
  type TriadQuality,
  type TriadStringGroup,
} from "@/lib/codex/v2/triad-voicings";

const qualityChoices: TriadQuality[] = ["major", "minor"];
const groups: TriadStringGroup[] = ["1-3", "2-4", "3-5", "4-6"];
const openMidi: Record<number, number> = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
const rootPitch: Record<(typeof TRIAD_ROOTS)[number], number> = {
  C: 0, "C♯": 1, D: 2, "E♭": 3, E: 4, F: 5,
  "F♯": 6, G: 7, "A♭": 8, A: 9, "B♭": 10, B: 11,
};
const pc = (midi: number) => ((midi % 12) + 12) % 12;

describe("Codex V2 reusable standard-tuning triad voicings", () => {
  it("retains the existing verified C/C minor and F-major inversion examples", () => {
    const major = generateTriadVoicings("C", "major", "1-3");
    expect(major[0].frets).toEqual([5, 5, 3]);
    expect(major[0].notes).toEqual(["C4", "E4", "G4"]);
    expect(major[0].inversion).toBe("root");

    const minor = generateTriadVoicings("C", "minor", "1-3");
    expect(minor[0].frets).toEqual([5, 4, 3]);
    expect(minor[0].notes).toEqual(["C4", "E♭4", "G4"]);
    expect(minor[0].inversion).toBe("root");

    const f = generateTriadVoicings("F", "major", "1-3");
    const first = f.filter((item) => item.inversion === "first");
    expect(first[0].frets).toEqual([2, 1, 1]);
    expect(first[0].notes).toEqual(["A3", "C4", "F4"]);
  });

  it("produces chromatically and diatonically correct note names", () => {
    expect(describeTriadTones("C♯", "major").map((item) => item.name))
      .toEqual(["C♯", "E♯", "G♯"]);
    expect(describeTriadTones("A♭", "minor").map((item) => item.name))
      .toEqual(["A♭", "C♭", "E♭"]);
    expect(describeTriadTones("B", "major").map((item) => item.name))
      .toEqual(["B", "D♯", "F♯"]);
  });

  it("covers all 96 combinations without inventing chords or fingerings", () => {
    for (const root of TRIAD_ROOTS) {
      for (const quality of qualityChoices) {
        for (const group of groups) {
          const voicings = generateTriadVoicings(root, quality, group);
          expect(voicings.length, `${root}/${quality}/${group}`).toBeGreaterThan(0);
          expect(new Set(voicings.map((item) => item.id)).size).toBe(voicings.length);
          for (const voicing of voicings) {
            expect(voicing.strings).toEqual(STRING_GROUPS[group]);
            expect(new Set(voicing.tones)).toEqual(new Set(["root", "third", "fifth"]));
            const chordPitches = [0, quality === "major" ? 4 : 3, 7]
              .map((offset) => pc(rootPitch[root] + offset));
            expect(voicing.midi.map(pc).sort()).toEqual([...chordPitches].sort());
            for (const [index, string] of voicing.strings.entries()) {
              expect(voicing.midi[index]).toBe(openMidi[string] + voicing.frets[index]);
              expect(voicing.frets[index]).toBeGreaterThanOrEqual(0);
              expect(voicing.frets[index]).toBeLessThanOrEqual(17);
            }
            const expectedInversion: TriadInversion =
              voicing.tones[0] === "root"
                ? "root"
                : voicing.tones[0] === "third"
                  ? "first"
                  : "second";
            expect(voicing.inversion).toBe(expectedInversion);
            expect(INVERSION_NAMES[voicing.inversion]).toBeDefined();
            expect(voicing.notes.every((item) => /[0-9]+$/.test(item))).toBe(true);
          }
        }
      }
    }
  });
});
