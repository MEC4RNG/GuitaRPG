import { describe, expect, it } from "vitest";
import {
  CHROMATIC_ROOTS,
  INTERVALS,
  SCALE_PATTERNS,
  TUNINGS,
  formatSoundingPitch,
  intervalTarget,
  mod12,
  pitchAt,
  positionsForTuning,
  preferredIntervalAnchor,
  rootForPitchClass,
  rootPitchClass,
  scaleDegrees,
  spellFromRoot,
  type FretboardInterval,
  type FretboardScale,
  type FretboardTuning,
} from "@/lib/codex/v2/fretboard-engine";
import { parseCodexV2 } from "@/lib/codex/v2/content";
import { readCodexV2DraftPreview } from "@/lib/codex/v2/preview";

describe("CODEX-V2-A-R9 deterministic shared guitar fretboard engine", () => {
  it("spells open strings and exact fret offsets for all three tunings", () => {
    expect(TUNINGS.standard.openLowToHigh).toEqual([40, 45, 50, 55, 59, 64]);
    expect(TUNINGS.drop_d.openLowToHigh).toEqual([38, 45, 50, 55, 59, 64]);
    expect(TUNINGS.dadgad.openLowToHigh).toEqual([38, 45, 50, 55, 57, 62]);
    expect(pitchAt("standard", 2, 1)).toBe(60); // C4
    expect(pitchAt("standard", 3, 5)).toBe(60); // C4 unison
    expect(pitchAt("standard", 2, 3)).toBe(62); // D4
    expect(pitchAt("dadgad", 2, 3)).toBe(60); // C4 after retuning B3 to A3
    expect(pitchAt("drop_d", 6, 10)).toBe(48); // C3
    expect(pitchAt("standard", 6, 8)).toBe(48); // C3
    expect(pitchAt("standard", 1, 8)).toBe(72); // C5
    for (const tuning of Object.keys(TUNINGS) as FretboardTuning[]) {
      const positions = positionsForTuning(tuning);
      expect(positions).toHaveLength(78);
      expect(new Set(positions.map((item) => item.id)).size).toBe(78);
      for (const position of positions) {
        expect(position.midi).toBe(pitchAt(tuning, position.stringNumber, position.fret));
        expect(position.pitchClass).toBe(mod12(position.midi));
      }
    }
  });

  it("rejects invalid string, fret, range and tuning parameters", () => {
    expect(() => pitchAt("standard", 0, 0)).toThrow(/string/);
    expect(() => pitchAt("standard", 7, 0)).toThrow(/string/);
    expect(() => pitchAt("standard", 1, 25)).toThrow(/fret/);
    expect(() => pitchAt("standard", 2, -1)).toThrow(/fret/);
    expect(() => positionsForTuning("standard", 25)).toThrow(/range/);
    expect(() => positionsForTuning("standard", 1.5)).toThrow(/range/);
    expect(() => positionsForTuning("nonsense" as FretboardTuning)).toThrow(/tuning/);
    expect(() => formatSoundingPitch(60, "NotANote")).toThrow(/pitch/);
    expect(() => intervalTarget("C", "nonsense" as FretboardInterval)).toThrow(/interval/);
  });

  it("identifies all twelve chromatic roots and enharmonic sounding octaves", () => {
    expect(CHROMATIC_ROOTS).toHaveLength(12);
    expect(CHROMATIC_ROOTS.map((root) => rootPitchClass(root))).toEqual(
      Array.from({ length: 12 }, (_, index) => index),
    );
    expect(CHROMATIC_ROOTS.every((root, index) => rootForPitchClass(index) === root)).toBe(true);
    expect(formatSoundingPitch(60, "C")).toBe("C4");
    expect(formatSoundingPitch(60, "B♯")).toBe("B♯3");
    expect(formatSoundingPitch(59, "C♭")).toBe("C♭4");
    expect(formatSoundingPitch(65, "E♯")).toBe("E♯4");
    expect(formatSoundingPitch(61, "D♭")).toBe("D♭4");
    expect(() => formatSoundingPitch(60, "D")).toThrow(/match/);
  });

  it("calculates all 36 chromatic-root/scale combinations with spelling and degree identity", () => {
    const scales = Object.keys(SCALE_PATTERNS) as FretboardScale[];
    expect(scales).toHaveLength(3);
    for (const root of CHROMATIC_ROOTS) {
      for (const scale of scales) {
        const degreeList = scaleDegrees(root, scale);
        expect(degreeList).toHaveLength(7);
        expect(degreeList.map((degree) => degree.degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(new Set(degreeList.map((degree) => degree.pitchClass)).size).toBe(7);
        for (const [index, degree] of degreeList.entries()) {
          expect(degree.semitones).toBe(SCALE_PATTERNS[scale].semitones[index]);
          expect(degree.pitchClass).toBe(mod12(rootPitchClass(root) + degree.semitones));
          expect(degree.name[0]).toBe("CDEFGAB"[("CDEFGAB".indexOf(root[0]) + index) % 7]);
          // Find a visible physical realization if one exists; every highlighted degree must
          // agree with its spelled pitch class and sounding register.
          const guitar = positionsForTuning("standard").find(
            (position) => position.pitchClass === degree.pitchClass,
          );
          if (guitar) {
            const labeled = formatSoundingPitch(guitar.midi, degree.name);
            expect(labeled).toMatch(/-?\d+$/);
          }
        }
      }
    }
    expect(scaleDegrees("C", "major").map((item) => item.name)).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
    expect(scaleDegrees("G", "major").map((item) => item.name)).toEqual([
      "G",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F♯",
    ]);
    expect(scaleDegrees("A", "harmonic_minor").map((item) => item.name)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G♯",
    ]);
    expect(scaleDegrees("C♯", "major").map((item) => item.name)).toEqual([
      "C♯",
      "D♯",
      "E♯",
      "F♯",
      "G♯",
      "A♯",
      "B♯",
    ]);
    expect(scaleDegrees("A♭", "natural_minor").map((item) => item.name)).toEqual([
      "A♭",
      "B♭",
      "C♭",
      "D♭",
      "E♭",
      "F♭",
      "G♭",
    ]);
    expect(scaleDegrees("F♯", "harmonic_minor").map((item) => item.name)).toEqual([
      "F♯",
      "G♯",
      "A",
      "B",
      "C♯",
      "D",
      "E♯",
    ]);
  });

  it("distinguishes augmented fourth from diminished fifth despite equal semitone distance", () => {
    expect(intervalTarget("C", "A4")).toMatchObject({
      targetName: "F♯",
      semitones: 6,
      targetPitchClass: 6,
    });
    expect(intervalTarget("C", "d5")).toMatchObject({
      targetName: "G♭",
      semitones: 6,
      targetPitchClass: 6,
    });
    expect(intervalTarget("C", "M3").targetName).toBe("E");
    expect(intervalTarget("C", "m3").targetName).toBe("E♭");
    expect(intervalTarget("C", "P8").targetName).toBe("C");
    expect(spellFromRoot("B", 2, 4)).toBe("D♯");
    for (const root of CHROMATIC_ROOTS) {
      for (const interval of INTERVALS) {
        const result = intervalTarget(root, interval.id);
        expect(result.targetPitchClass).toBe(mod12(rootPitchClass(root) + interval.semitones));
        expect(result.targetName[0]).toBe(
          "CDEFGAB"[("CDEFGAB".indexOf(root[0]) + interval.letterSteps) % 7],
        );
      }
    }
  });

  it("finds a real exact-register ascending interval position rather than any octave match", () => {
    for (const tuning of Object.keys(TUNINGS) as FretboardTuning[]) {
      const positions = positionsForTuning(tuning);
      const available = new Set(positions.map((position) => position.midi));
      for (const root of CHROMATIC_ROOTS) {
        for (const interval of INTERVALS) {
          const anchor = preferredIntervalAnchor(positions, root, interval.id);
          expect(anchor).not.toBeNull();
          expect(anchor?.pitchClass).toBe(rootPitchClass(root));
          const actualCandidates = positions.filter(
            (position) =>
              position.pitchClass === rootPitchClass(root) &&
              available.has(position.midi + interval.semitones),
          );
          if (actualCandidates.length) {
            expect(available.has(anchor!.midi + interval.semitones)).toBe(true);
          }
        }
      }
    }
    const standard = positionsForTuning("standard");
    const anchor = preferredIntervalAnchor(standard, "C", "M3");
    expect(anchor?.midi).toBe(60); // C4, the familiar reference
    expect(standard.some((position) => position.midi === anchor!.midi + 4)).toBe(true);
  });

  it("accepts three new reference kinds only for their matching canonical Skill", () => {
    const draft = readCodexV2DraftPreview();
    const expected = {
      note_location: "FRETBOARD_NOTE_LOCATION",
      scale_mapping: "FRETBOARD_SCALE_MAP",
      interval_recognition: "FRETBOARD_INTERVALS",
    } as const;
    for (const [skill, mediaKind] of Object.entries(expected)) {
      const entry = draft.entries.find((item) => item.slug === skill);
      expect(entry?.reference_blocks.map((item) => item.kind)).toEqual([mediaKind]);
    }
    const wrongSkill = structuredClone(draft);
    const noteEntry = wrongSkill.entries.find((entry) => entry.slug === "note_location")!;
    noteEntry.reference_blocks[0].kind = "TRIAD_FRETBOARD";
    expect(() => parseCodexV2(wrongSkill, true)).toThrow(/unsupported reference block/);

    const wrongLocation = structuredClone(draft);
    const intervalEntry = wrongLocation.entries.find(
      (entry) => entry.slug === "interval_recognition",
    )!;
    intervalEntry.reference_blocks[0].location = "lessons" as "overview";
    expect(() => parseCodexV2(wrongLocation, true)).toThrow(/unsupported reference block/);
  });
});
