import {
  formatSoundingPitch,
  mod12,
  positionsForTuning,
  rootPitchClass,
  spellFromRoot,
  type FretboardRoot,
  type FretboardTuning,
} from "./fretboard-engine";
import {
  ARPEGGIO_SUBDIVISIONS,
  stepCountForSubdivision,
  type ArpeggioBar,
  type ArpeggioEvent,
  type ArpeggioSubdivision,
  type ArpeggioPreset,
} from "./arpeggio-sequencer";

type Role = "root" | "second" | "third" | "fourth" | "fifth" | "sixth" | "seventh";
type FormulaTone = readonly [Role, number, number, string];
const R = ["root", 0, 0, "1"] as const;
const M3 = ["third", 4, 2, "3"] as const;
const m3 = ["third", 3, 2, "♭3"] as const;
const P5 = ["fifth", 7, 4, "5"] as const;
const d5 = ["fifth", 6, 4, "♭5"] as const;
const M6 = ["sixth", 9, 5, "6"] as const;
const M7 = ["seventh", 11, 6, "7"] as const;
const m7 = ["seventh", 10, 6, "♭7"] as const;
export const ARPEGGIO_CHORDS = {
  major: { label: "Major", suffix: "", tones: [R, M3, P5] },
  minor: { label: "Minor", suffix: "m", tones: [R, m3, P5] },
  diminished: { label: "Diminished", suffix: "dim", tones: [R, m3, d5] },
  augmented: { label: "Augmented", suffix: "aug", tones: [R, M3, ["fifth", 8, 4, "♯5"]] },
  sus2: { label: "Suspended 2nd", suffix: "sus2", tones: [R, ["second", 2, 1, "2"], P5] },
  sus4: { label: "Suspended 4th", suffix: "sus4", tones: [R, ["fourth", 5, 3, "4"], P5] },
  major6: { label: "Major 6th", suffix: "6", tones: [R, M3, P5, M6] },
  minor6: { label: "Minor 6th", suffix: "m6", tones: [R, m3, P5, M6] },
  major7: { label: "Major 7th", suffix: "maj7", tones: [R, M3, P5, M7] },
  dominant7: { label: "Dominant 7th", suffix: "7", tones: [R, M3, P5, m7] },
  minor7: { label: "Minor 7th", suffix: "m7", tones: [R, m3, P5, m7] },
  minorMajor7: { label: "Minor major 7th", suffix: "m(maj7)", tones: [R, m3, P5, M7] },
  halfDiminished7: { label: "Half-diminished 7th", suffix: "m7♭5", tones: [R, m3, d5, m7] },
  diminished7: {
    label: "Diminished 7th",
    suffix: "dim7",
    tones: [R, m3, d5, ["seventh", 9, 6, "𝄫7"]],
  },
} as const satisfies Record<
  string,
  { label: string; suffix: string; tones: readonly FormulaTone[] }
>;
export type ArpeggioQuality = keyof typeof ARPEGGIO_CHORDS;
export type ArpeggioPosition = {
  id: string;
  stringNumber: number;
  fret: number;
  midi: number;
  note: string;
  role: Role;
  degree: string;
};
export type ArpeggioVoicing = {
  id: string;
  positions: ArpeggioPosition[];
  inversion: number;
  span: number;
};
export type ExpandedEvent = Omit<ArpeggioEvent, "tone"> & { tone: string };
export type ExpandedBar = Omit<ArpeggioBar, "events"> & { events: ExpandedEvent[] };

export function arpeggioTones(root: FretboardRoot, quality: ArpeggioQuality) {
  return ARPEGGIO_CHORDS[quality].tones.map(([role, semitones, letters, degree]) => ({
    role,
    semitones,
    degree,
    pitchClass: mod12(rootPitchClass(root) + semitones),
    name: spellFromRoot(root, letters, semitones),
  }));
}
export function arpeggioPositions(
  root: FretboardRoot,
  quality: ArpeggioQuality,
  tuning: FretboardTuning,
  strings: readonly number[],
  minFret: number,
  maxFret: number,
): ArpeggioPosition[] {
  if (!Number.isInteger(minFret) || minFret < 0 || minFret > maxFret)
    throw new Error("Invalid minimum fret");
  if (strings.some((s) => !Number.isInteger(s) || s < 1 || s > 6))
    throw new Error("Invalid string");
  const tones = arpeggioTones(root, quality);
  return positionsForTuning(tuning, maxFret)
    .flatMap((p) => {
      const tone = tones.find((t) => t.pitchClass === p.pitchClass);
      return tone && strings.includes(p.stringNumber) && p.fret >= minFret
        ? [
            {
              id: p.id,
              stringNumber: p.stringNumber,
              fret: p.fret,
              midi: p.midi,
              note: formatSoundingPitch(p.midi, tone.name),
              role: tone.role,
              degree: tone.degree,
            },
          ]
        : [];
    })
    .sort((a, b) => a.midi - b.midi || b.stringNumber - a.stringNumber || a.fret - b.fret);
}
/** Complete, distinct-tone compact shapes. String selection is an allowed pool, not a requirement to use every string.
 * This is a fret-span heuristic, not a fingering guarantee. Sequential mode has no span restriction. */
export function arpeggioVoicings(
  positions: readonly ArpeggioPosition[],
  quality: ArpeggioQuality,
): ArpeggioVoicing[] {
  const roles = ARPEGGIO_CHORDS[quality].tones.map((t) => t[0]);
  const result: ArpeggioVoicing[] = [];
  const groups = [6, 5, 4, 3, 2, 1].map((s) => positions.filter((p) => p.stringNumber === s));
  function walk(index: number, selected: ArpeggioPosition[]) {
    if (selected.length === roles.length) {
      const frets = selected.map((p) => p.fret);
      const fretted = frets.filter((f) => f > 0);
      const high = Math.max(0, ...fretted);
      const span = high - Math.min(high, ...fretted);
      if (span > 4 || (frets.includes(0) && high > 5)) return;
      result.push({
        id: selected.map((p) => p.id).join(":"),
        positions: selected,
        inversion: roles.indexOf(selected[0].role),
        span,
      });
      return;
    }
    if (index === groups.length || selected.length + groups.length - index < roles.length) return;
    walk(index + 1, selected);
    for (const p of groups[index]) {
      if (
        selected.some((x) => x.role === p.role) ||
        (selected.length && p.midi <= selected[selected.length - 1].midi)
      )
        continue;
      const next = [...selected, p];
      const fretted = next.filter((x) => x.fret > 0).map((x) => x.fret);
      const high = Math.max(0, ...fretted);
      if (high - Math.min(high, ...fretted) > 4 || (next.some((x) => x.fret === 0) && high > 5))
        continue;
      walk(index + 1, next);
    }
  }
  walk(0, []);
  return result.sort(
    (a, b) =>
      a.span - b.span ||
      Math.max(...a.positions.map((p) => p.fret)) - Math.max(...b.positions.map((p) => p.fret)) ||
      a.positions
        .map((p) => p.fret)
        .join("-")
        .localeCompare(b.positions.map((p) => p.fret).join("-")) ||
      a.id.localeCompare(b.id),
  );
}
/** Degree selections resolve to the lowest available register. Exact-position selections retain string, fret and octave. */
export function resolveArpeggioStep(
  positions: readonly ArpeggioPosition[],
  step: string,
): ArpeggioPosition | null {
  if (step === "rest") return null;
  return (
    positions.find((p) => p.id === step) ??
    positions
      .filter((p) => p.role === step)
      .sort((a, b) => a.midi - b.midi || b.stringNumber - a.stringNumber)[0] ??
    null
  );
}
export function expandedPattern(
  subdivision: ArpeggioSubdivision,
  preset: ArpeggioPreset,
  quality: ArpeggioQuality,
  positions: readonly ArpeggioPosition[],
): string[] {
  const roles = ARPEGGIO_CHORDS[quality].tones
    .map((t) => t[0])
    .filter((role) => positions.some((p) => p.role === role));
  if (!roles.length) return Array(stepCountForSubdivision(subdivision)).fill("rest");
  const first = roles[0],
    second = roles[1] ?? first,
    last = roles[roles.length - 1];
  const order: readonly string[] =
    preset === "ascending"
      ? roles
      : preset === "descending"
        ? [...roles].reverse()
        : preset === "space"
          ? [first, second, "rest", last]
          : preset === "bass_pulse"
            ? [first, last, first, second]
            : roles.length > 3
              ? roles
              : [first, second, last, second];
  return Array.from(
    { length: stepCountForSubdivision(subdivision) },
    (_, i) => order[i % order.length],
  );
}
export function buildExpandedBar(
  positions: readonly ArpeggioPosition[],
  subdivision: ArpeggioSubdivision,
  bpm: number,
  pattern: readonly string[],
): ExpandedBar {
  if (!Number.isInteger(bpm) || bpm < 40 || bpm > 200) throw new Error("Invalid BPM");
  const count = stepCountForSubdivision(subdivision);
  if (pattern.length !== count) throw new Error("Invalid pattern length");
  const choice = ARPEGGIO_SUBDIVISIONS[subdivision];
  const stepSeconds = 60 / bpm / choice.stepsPerBeat;
  return {
    subdivision,
    bpm,
    stepsPerBeat: choice.stepsPerBeat,
    stepSeconds,
    durationSeconds: 240 / bpm,
    events: pattern.map((tone, index) => {
      const p = resolveArpeggioStep(positions, tone);
      if (tone !== "rest" && !p) throw new Error("Unavailable arpeggio tone or position");
      const beat = Math.floor(index / choice.stepsPerBeat) + 1,
        part = index % choice.stepsPerBeat;
      return {
        index,
        beat,
        part: part + 1,
        count: part === 0 ? String(beat) : choice.spoken[part],
        tone,
        midi: p?.midi ?? null,
        note: p?.note ?? null,
        stringNumber: p?.stringNumber ?? null,
        fret: p?.fret ?? null,
        startSeconds: index * stepSeconds,
        durationSeconds: stepSeconds * 0.83,
      };
    }),
  };
}
