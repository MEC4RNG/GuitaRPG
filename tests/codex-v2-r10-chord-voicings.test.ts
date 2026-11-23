import { describe, expect, it } from "vitest";
import {
  chordLabel,
  chordToneDefinitions,
  compareVoicings,
  generateTriadVoicings,
  motionLabel,
  suggestConnectedVoicings,
  totalVoiceMotion,
  TRIAD_STRING_GROUPS,
  VOICE_LEADING_PROGRESSIONS,
  type NamedTriad,
  type TriadQuality,
  type TriadStringGroup,
} from "@/lib/codex/v2/chord-voicings";
import {
  CHROMATIC_ROOTS,
  TUNINGS,
  formatSoundingPitch,
  mod12,
  pitchAt,
  rootPitchClass,
  type FretboardTuning,
} from "@/lib/codex/v2/fretboard-engine";
import { parseCodexV2 } from "@/lib/codex/v2/content";
import { readCodexV2DraftPreview } from "@/lib/codex/v2/preview";

const qualities: TriadQuality[] = ["major", "minor"];
const groups: TriadStringGroup[] = ["1-3", "2-4", "3-5", "4-6"];
const tunings = Object.keys(TUNINGS) as FretboardTuning[];
const chord = (root: NamedTriad["root"], quality: TriadQuality = "major"): NamedTriad => ({
  root,
  quality,
});

function findFrets(choices: ReturnType<typeof generateTriadVoicings>, frets: number[]) {
  return choices.find((voicing) => voicing.frets.join(",") === frets.join(","));
}

describe("CODEX-V2-A-R10 reusable chord/voicing calculation", () => {
  it("produces verified C/Cm and F-major guitar examples with real inversions", () => {
    const cMajor = generateTriadVoicings(chord("C"), "standard", "1-3");
    const cMinor = generateTriadVoicings(chord("C", "minor"), "standard", "1-3");
    const fMajor = generateTriadVoicings(chord("F"), "standard", "1-3");

    expect(findFrets(cMajor, [5, 5, 3])).toMatchObject({
      notes: ["C4", "E4", "G4"], inversion: "root", tones: ["root", "third", "fifth"],
    });
    expect(findFrets(cMinor, [5, 4, 3])).toMatchObject({
      notes: ["C4", "E♭4", "G4"], inversion: "root",
    });
    expect(findFrets(fMajor, [2, 1, 1])).toMatchObject({
      notes: ["A3", "C4", "F4"], inversion: "first",
    });
    expect(findFrets(cMajor, [9, 8, 8])).toMatchObject({
      notes: ["E4", "G4", "C5"], inversion: "first",
    });
    expect(findFrets(cMajor, [0, 1, 0])).toMatchObject({
      notes: ["G3", "C4", "E4"], inversion: "second",
    });
  });

  it("preserves correctly spelled triads instead of enharmonic shortcuts", () => {
    expect(chordToneDefinitions(chord("C♯")).map((item) => item.spelledName)).toEqual([
      "C♯", "E♯", "G♯",
    ]);
    expect(chordToneDefinitions(chord("A♭", "minor")).map((item) => item.spelledName)).toEqual([
      "A♭", "C♭", "E♭",
    ]);
    expect(chordToneDefinitions(chord("B")).map((item) => item.spelledName)).toEqual([
      "B", "D♯", "F♯",
    ]);
    expect(chordLabel(chord("B♭", "minor"))).toBe("B♭ minor");
  });

  it("generates only valid real-pitch three-string shapes across roots, qualities and tunings", () => {
    let verified = 0;
    for (const root of CHROMATIC_ROOTS) {
      for (const quality of qualities) {
        const current = chord(root, quality);
        const definitions = chordToneDefinitions(current);
        const allowedPcs = definitions.map((item) => item.pitchClass);
        expect(new Set(allowedPcs).size).toBe(3);
        for (const tuning of tunings) {
          for (const group of groups) {
            const voicings = generateTriadVoicings(current, tuning, group);
            expect(new Set(voicings.map((item) => item.id)).size).toBe(voicings.length);
            for (const voicing of voicings) {
              verified += 1;
              expect(voicing.strings).toEqual(TRIAD_STRING_GROUPS[group]);
              expect(new Set(voicing.tones)).toEqual(new Set(["root", "third", "fifth"]));
              expect([...voicing.midi].map(mod12).sort()).toEqual([...allowedPcs].sort());
              expect(voicing.midi[0]).toBeLessThan(voicing.midi[1]);
              expect(voicing.midi[1]).toBeLessThan(voicing.midi[2]);
              for (const [index, number] of voicing.strings.entries()) {
                expect(voicing.midi[index]).toBe(pitchAt(tuning, number, voicing.frets[index]));
                expect(voicing.frets[index]).toBeGreaterThanOrEqual(0);
                expect(voicing.frets[index]).toBeLessThanOrEqual(12);
                const spelling = definitions.find((item) => item.tone === voicing.tones[index])!;
                expect(voicing.notes[index]).toBe(
                  formatSoundingPitch(voicing.midi[index], spelling.spelledName),
                );
              }
              const fretted = voicing.frets.filter((fret) => fret > 0);
              expect(Math.max(...fretted, 0) - Math.min(...fretted, Math.max(...fretted, 0)))
                .toBeLessThanOrEqual(4);
              if (voicing.frets.includes(0)) {
                expect(Math.max(...voicing.frets)).toBeLessThanOrEqual(5);
              }
              const expected = { root: "root", third: "first", fifth: "second" };
              expect(voicing.inversion).toBe(expected[voicing.tones[0]]);
            }
          }
        }
      }
    }
    expect(verified).toBeGreaterThan(300);
  });

  it("compares exact semitone movements and keeps chord roots distinct from actual basses", () => {
    const progression = [
      chord("C"), chord("A", "minor"), chord("F"), chord("G"),
    ];
    const frets = [[5, 5, 3], [5, 5, 5], [5, 6, 5], [4, 3, 3]];
    const path = progression.map((current, index) => {
      const selected = findFrets(
        generateTriadVoicings(current, "standard", "1-3"),
        frets[index],
      );
      expect(selected).toBeDefined();
      return selected!;
    });
    expect(path.map((voicing) => voicing.notes)).toEqual([
      ["C4", "E4", "G4"],
      ["C4", "E4", "A4"],
      ["C4", "F4", "A4"],
      ["B3", "D4", "G4"],
    ]);
    expect(path.map((voicing) => voicing.inversion)).toEqual([
      "root", "first", "second", "first",
    ]);
    expect(totalVoiceMotion(path)).toBe(9);
    expect(compareVoicings(path[0], path[1]).map((item) => item.semitones)).toEqual([
      0, 0, 2,
    ]);
    expect(compareVoicings(path[1], path[2]).map((item) => item.semitones)).toEqual([
      0, 1, 0,
    ]);
    expect(compareVoicings(path[2], path[3]).map((item) => item.semitones)).toEqual([
      -1, -3, -2,
    ]);
    expect(motionLabel(0)).toBe("Held (0)");
    expect(motionLabel(1)).toBe("Up 1 semitone");
    expect(motionLabel(-2)).toBe("Down 2 semitones");
    const proposed = suggestConnectedVoicings(progression, "standard", "1-3");
    expect(proposed).toHaveLength(4);
    expect(totalVoiceMotion(proposed)).toBeLessThanOrEqual(9);
    expect(proposed.map((voicing) => voicing.strings)).toEqual([
      TRIAD_STRING_GROUPS["1-3"],
      TRIAD_STRING_GROUPS["1-3"],
      TRIAD_STRING_GROUPS["1-3"],
      TRIAD_STRING_GROUPS["1-3"],
    ]);
  });

  it("finds bounded connected voicings for every preset, string group and supported tuning", () => {
    for (const preset of Object.values(VOICE_LEADING_PROGRESSIONS)) {
      for (const tuning of tunings) {
        for (const group of groups) {
          const path = suggestConnectedVoicings(preset.chords, tuning, group);
          if (path.length === 0) {
            expect(preset.chords.some((item) =>
              generateTriadVoicings(item, tuning, group).length === 0,
            )).toBe(true);
          } else {
            expect(path).toHaveLength(preset.chords.length);
            expect(path.map((item) => item.chord)).toEqual(preset.chords);
            expect(totalVoiceMotion(path)).toBeGreaterThanOrEqual(0);
            for (let i = 1; i < path.length; i++) {
              const compared = compareVoicings(path[i - 1], path[i]);
              expect(compared).toHaveLength(3);
              expect(compared.map((item) => item.semitones)).toEqual(
                path[i].midi.map((midi, voice) => midi - path[i - 1].midi[voice]),
              );
            }
          }
        }
      }
    }
  });

  it("rejects unsupported groups, ranges and mismatched voicing comparisons", () => {
    expect(() => generateTriadVoicings(chord("C"), "standard", "1-3", 25))
      .toThrow(/range/);
    expect(() => generateTriadVoicings(chord("C"), "standard", "none" as TriadStringGroup))
      .toThrow(/group/);
    expect(() => suggestConnectedVoicings([], "standard", "1-3")).toThrow(/length/);
    const same = generateTriadVoicings(chord("C"), "standard", "1-3")[0];
    const other = generateTriadVoicings(chord("C"), "standard", "2-4")[0];
    expect(() => compareVoicings(same, other)).toThrow(/same tuning and string group/);
    expect(() => compareVoicings(same, generateTriadVoicings(chord("C"), "drop_d", "1-3")[0]))
      .toThrow(/same tuning and string group/);
  });

  it("allows only the correct canonical Skill to request a chord reference", () => {
    const preview = readCodexV2DraftPreview();
    expect(preview.entries.find((entry) => entry.slug === "voice_leading")
      ?.reference_blocks.map((block) => block.kind)).toEqual(["VOICE_LEADING_EXPLORER"]);
    expect(preview.entries.find((entry) => entry.slug === "chord_inversion_navigation")
      ?.reference_blocks.map((block) => block.kind)).toEqual(["CHORD_INVERSION_EXPLORER"]);

    const wrong = structuredClone(preview);
    const mutated = wrong.entries.find((entry) => entry.slug === "note_location")!;
    mutated.reference_blocks.push({
      id: "untrusted-voicing-widget",
      kind: "CHORD_INVERSION_EXPLORER",
      location: "overview",
    });
    expect(() => parseCodexV2(wrong, true)).toThrow(/unsupported reference block/);
  });
});
