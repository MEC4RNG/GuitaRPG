/** Pure, deterministic 12-TET guitar fretboard mathematics for draft Codex tools.
 * Guitar string 1 is high E; all stored MIDI notes are sounding concert pitch.
 * No microphone, Player, Quest, Session, grading or network dependencies.
 */
export const CHROMATIC_ROOTS = [
  "C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B",
] as const;
export type FretboardRoot = (typeof CHROMATIC_ROOTS)[number];
export type FretboardTuning = "standard" | "drop_d" | "dadgad";
export type FretboardScale = "major" | "natural_minor" | "harmonic_minor";
export type FretboardInterval = (typeof INTERVALS)[number]["id"];

const NOTE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const NATURAL_PCS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ROOT_PCS: Record<FretboardRoot, number> = {
  C: 0, "C♯": 1, D: 2, "E♭": 3, E: 4, F: 5, "F♯": 6,
  G: 7, "A♭": 8, A: 9, "B♭": 10, B: 11,
};

export const TUNINGS: Record<
  FretboardTuning,
  { title: string; openLowToHigh: readonly [number, number, number, number, number, number] }
> = {
  standard: { title: "Standard · E A D G B E", openLowToHigh: [40, 45, 50, 55, 59, 64] },
  drop_d: { title: "Drop D · D A D G B E", openLowToHigh: [38, 45, 50, 55, 59, 64] },
  dadgad: { title: "DADGAD · D A D G A D", openLowToHigh: [38, 45, 50, 55, 57, 62] },
};

export const SCALE_PATTERNS: Record<
  FretboardScale,
  { name: string; semitones: readonly [number, number, number, number, number, number, number] }
> = {
  major: { name: "Major", semitones: [0, 2, 4, 5, 7, 9, 11] },
  natural_minor: { name: "Natural minor", semitones: [0, 2, 3, 5, 7, 8, 10] },
  harmonic_minor: { name: "Harmonic minor", semitones: [0, 2, 3, 5, 7, 8, 11] },
};

export const INTERVALS = [
  { id: "m2", label: "Minor second", semitones: 1, letterSteps: 1 },
  { id: "M2", label: "Major second", semitones: 2, letterSteps: 1 },
  { id: "m3", label: "Minor third", semitones: 3, letterSteps: 2 },
  { id: "M3", label: "Major third", semitones: 4, letterSteps: 2 },
  { id: "P4", label: "Perfect fourth", semitones: 5, letterSteps: 3 },
  { id: "A4", label: "Augmented fourth", semitones: 6, letterSteps: 3 },
  { id: "d5", label: "Diminished fifth", semitones: 6, letterSteps: 4 },
  { id: "P5", label: "Perfect fifth", semitones: 7, letterSteps: 4 },
  { id: "m6", label: "Minor sixth", semitones: 8, letterSteps: 5 },
  { id: "M6", label: "Major sixth", semitones: 9, letterSteps: 5 },
  { id: "m7", label: "Minor seventh", semitones: 10, letterSteps: 6 },
  { id: "M7", label: "Major seventh", semitones: 11, letterSteps: 6 },
  { id: "P8", label: "Perfect octave", semitones: 12, letterSteps: 7 },
] as const;

export type FretboardPosition = {
  id: string;
  stringNumber: number;
  fret: number;
  midi: number;
  pitchClass: number;
};
export type SpelledDegree = {
  degree: number;
  pitchClass: number;
  semitones: number;
  name: string;
};

export const mod12 = (value: number) => ((value % 12) + 12) % 12;
export const rootPitchClass = (root: FretboardRoot) => ROOT_PCS[root];
export function rootForPitchClass(pc: number): FretboardRoot {
  return CHROMATIC_ROOTS[mod12(pc)];
}

function letterAccidentalOffset(spelled: string): number {
  return [...spelled.slice(1)].reduce(
    (offset, symbol) => offset + (symbol === "♯" ? 1 : symbol === "♭" ? -1 : 0),
    0,
  );
}

/** Spell by diatonic letter first, then chromatic distance; handles E♯, C♭, double accidentals. */
export function spellFromRoot(
  root: FretboardRoot,
  letterSteps: number,
  semitones: number,
): string {
  const rootIndex = NOTE_LETTERS.indexOf(root[0] as (typeof NOTE_LETTERS)[number]);
  const noteLetter = NOTE_LETTERS[(rootIndex + letterSteps) % NOTE_LETTERS.length];
  const targetPC = mod12(rootPitchClass(root) + semitones);
  const chromaticGap = mod12(targetPC - NATURAL_PCS[noteLetter]);
  const accidental = chromaticGap > 6 ? chromaticGap - 12 : chromaticGap;
  if (Math.abs(accidental) > 2) throw new Error("Unsupported theoretical note spelling");
  return noteLetter + (accidental < 0 ? "♭".repeat(-accidental) : "♯".repeat(accidental));
}

/** Registers use sounding pitch; e.g. B♯3 = MIDI 60 = C4, C♭4 = MIDI 59 = B3. */
export function formatSoundingPitch(midi: number, spelledName: string): string {
  if (!Number.isInteger(midi) || !/^[A-G][♯♭]{0,2}$/.test(spelledName)) {
    throw new Error("Invalid fretboard sounding pitch");
  }
  const letter = spelledName[0];
  const accidental = letterAccidentalOffset(spelledName);
  const octave = (midi - NATURAL_PCS[letter] - accidental) / 12 - 1;
  if (!Number.isInteger(octave)) throw new Error("Spelling does not match sounding pitch");
  return `${spelledName}${octave}`;
}

export function positionsForTuning(
  tuning: FretboardTuning,
  maxFret = 12,
): FretboardPosition[] {
  if (!Number.isInteger(maxFret) || maxFret < 0 || maxFret > 24)
    throw new Error("Fretboard position range is outside supported limits");
  const open = TUNINGS[tuning]?.openLowToHigh;
  if (!open) throw new Error("Unknown guitar tuning");
  const positions: FretboardPosition[] = [];
  for (let stringNumber = 1; stringNumber <= 6; stringNumber++) {
    const openMidi = open[6 - stringNumber];
    for (let fret = 0; fret <= maxFret; fret++) {
      const midi = openMidi + fret;
      positions.push({
        id: `s${stringNumber}-f${fret}`,
        stringNumber,
        fret,
        midi,
        pitchClass: mod12(midi),
      });
    }
  }
  return positions;
}

export function pitchAt(
  tuning: FretboardTuning,
  stringNumber: number,
  fret: number,
): number {
  if (!Number.isInteger(stringNumber) || stringNumber < 1 || stringNumber > 6) {
    throw new Error("Invalid guitar string number");
  }
  if (!Number.isInteger(fret) || fret < 0 || fret > 24) {
    throw new Error("Invalid fret");
  }
  const open = TUNINGS[tuning]?.openLowToHigh;
  if (!open) throw new Error("Unknown guitar tuning");
  return open[6 - stringNumber] + fret;
}

export function scaleDegrees(root: FretboardRoot, scale: FretboardScale): SpelledDegree[] {
  return SCALE_PATTERNS[scale].semitones.map((semitones, index) => ({
    degree: index + 1,
    semitones,
    pitchClass: mod12(rootPitchClass(root) + semitones),
    name: spellFromRoot(root, index, semitones),
  }));
}

export function intervalTarget(root: FretboardRoot, intervalId: FretboardInterval) {
  const interval = INTERVALS.find((item) => item.id === intervalId);
  if (!interval) throw new Error("Unknown interval");
  return {
    ...interval,
    rootName: root,
    targetName: spellFromRoot(root, interval.letterSteps, interval.semitones),
    targetPitchClass: mod12(rootPitchClass(root) + interval.semitones),
  };
}

/**
 * Pick a reference whose *exact upward interval target* occurs on the current visible guitar.
 * Prefer a C4-ish reference so intervals can be compared in a stable register.
 */
export function preferredIntervalAnchor(
  positions: readonly FretboardPosition[],
  root: FretboardRoot,
  intervalId: FretboardInterval,
): FretboardPosition | null {
  const semitones = intervalTarget(root, intervalId).semitones;
  const availableMidi = new Set(positions.map((position) => position.midi));
  const roots = positions.filter((position) => position.pitchClass === rootPitchClass(root));
  roots.sort((a, b) => {
    const aTarget = availableMidi.has(a.midi + semitones) ? 0 : 1;
    const bTarget = availableMidi.has(b.midi + semitones) ? 0 : 1;
    if (aTarget !== bTarget) return aTarget - bTarget;
    const registerDifference = Math.abs(a.midi - 60) - Math.abs(b.midi - 60);
    if (registerDifference !== 0) return registerDifference;
    return a.stringNumber - b.stringNumber || a.fret - b.fret;
  });
  return roots[0] ?? null;
}
