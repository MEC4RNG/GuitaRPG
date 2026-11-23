import type { TriadTone, TriadVoicing } from "./chord-voicings";

/**
 * One four-quarter-beat bar of chord-tone attacks.
 * Counts are anchored to quarter-note beats, not to guitar fret numbers.
 * Data only; neither tempo nor note selection records Player progress.
 */
export const ARPEGGIO_SUBDIVISIONS = {
  quarter: { label: "Quarter notes", stepsPerBeat: 1, spoken: ["1"] },
  eighth: { label: "Eighth notes", stepsPerBeat: 2, spoken: ["1", "&"] },
  triplet: { label: "Eighth-note triplets", stepsPerBeat: 3, spoken: ["1", "trip", "let"] },
  sixteenth: { label: "Sixteenth notes", stepsPerBeat: 4, spoken: ["1", "e", "&", "a"] },
} as const;

export type ArpeggioSubdivision = keyof typeof ARPEGGIO_SUBDIVISIONS;
export type ArpeggioStepTone = TriadTone | "rest";
export const ARPEGGIO_STEP_TONES: readonly ArpeggioStepTone[] = [
  "root", "third", "fifth", "rest",
];

export const ARPEGGIO_PRESETS = {
  arch: {
    title: "Root → third → fifth → third",
    order: ["root", "third", "fifth", "third"],
  },
  ascending: {
    title: "Ascending triad",
    order: ["root", "third", "fifth"],
  },
  descending: {
    title: "Descending triad",
    order: ["fifth", "third", "root"],
  },
  bass_pulse: {
    title: "Root and upper notes",
    order: ["root", "fifth", "root", "third"],
  },
  space: {
    title: "Phrase with a rest",
    order: ["root", "third", "rest", "fifth"],
  },
} as const satisfies Record<string, { title: string; order: readonly ArpeggioStepTone[] }>;
export type ArpeggioPreset = keyof typeof ARPEGGIO_PRESETS;

export type ArpeggioEvent = {
  index: number;
  beat: number;
  part: number;
  count: string;
  tone: ArpeggioStepTone;
  midi: number | null;
  note: string | null;
  stringNumber: number | null;
  fret: number | null;
  startSeconds: number;
  durationSeconds: number;
};

export type ArpeggioBar = {
  subdivision: ArpeggioSubdivision;
  bpm: number;
  stepsPerBeat: number;
  stepSeconds: number;
  durationSeconds: number;
  events: ArpeggioEvent[];
};

export function stepCountForSubdivision(subdivision: ArpeggioSubdivision): number {
  const choice = ARPEGGIO_SUBDIVISIONS[subdivision];
  if (!choice) throw new Error("Unsupported arpeggio subdivision");
  return choice.stepsPerBeat * 4;
}

export function createArpeggioPattern(
  subdivision: ArpeggioSubdivision,
  preset: ArpeggioPreset = "arch",
): ArpeggioStepTone[] {
  const template = ARPEGGIO_PRESETS[preset];
  if (!template) throw new Error("Unknown arpeggio pattern");
  const count = stepCountForSubdivision(subdivision);
  return Array.from({ length: count }, (_, index) => template.order[index % template.order.length]);
}

/** Resolve chord-tone names and fret positions from the *selected* validated voicing.
 * A first-inversion voicing still plays the root when the pattern selects "root".
 */
export function buildArpeggioBar(
  voicing: TriadVoicing,
  subdivision: ArpeggioSubdivision,
  bpm: number,
  pattern: readonly ArpeggioStepTone[],
): ArpeggioBar {
  if (!Number.isInteger(bpm) || bpm < 40 || bpm > 200) {
    throw new Error("Arpeggio BPM must be a whole number between 40 and 200");
  }
  const choice = ARPEGGIO_SUBDIVISIONS[subdivision];
  if (!choice) throw new Error("Unsupported arpeggio subdivision");
  if (pattern.length !== stepCountForSubdivision(subdivision)) {
    throw new Error("Pattern length must equal the selected rhythmic subdivision");
  }
  if (pattern.some((tone) => !ARPEGGIO_STEP_TONES.includes(tone))) {
    throw new Error("Unsupported chord tone in pattern");
  }
  if (
    voicing.tones.length !== 3 ||
    new Set(voicing.tones).size !== 3 ||
    voicing.midi.length !== 3 ||
    voicing.notes.length !== 3 ||
    voicing.strings.length !== 3 ||
    voicing.frets.length !== 3
  ) {
    throw new Error("Arpeggio source must be a complete three-tone guitar voicing");
  }

  const quarterSeconds = 60 / bpm;
  const stepSeconds = quarterSeconds / choice.stepsPerBeat;
  const indexOfTone = new Map(voicing.tones.map((tone, index) => [tone, index]));
  const events = pattern.map((tone, index): ArpeggioEvent => {
    const matching = tone === "rest" ? undefined : indexOfTone.get(tone);
    const part = index % choice.stepsPerBeat;
    const beat = Math.floor(index / choice.stepsPerBeat) + 1;
    return {
      index,
      beat,
      part: part + 1,
      count: part === 0 ? String(beat) : choice.spoken[part],
      tone,
      midi: matching === undefined ? null : voicing.midi[matching],
      note: matching === undefined ? null : voicing.notes[matching],
      stringNumber: matching === undefined ? null : voicing.strings[matching],
      fret: matching === undefined ? null : voicing.frets[matching],
      startSeconds: index * stepSeconds,
      durationSeconds: stepSeconds * 0.83,
    };
  });
  return {
    subdivision,
    bpm,
    stepsPerBeat: choice.stepsPerBeat,
    stepSeconds,
    durationSeconds: quarterSeconds * 4,
    events,
  };
}
