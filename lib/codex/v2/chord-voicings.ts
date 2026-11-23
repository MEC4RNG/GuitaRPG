import {
  mod12,
  pitchAt,
  rootPitchClass,
  spellFromRoot,
  formatSoundingPitch,
  type FretboardRoot,
  type FretboardTuning,
} from "./fretboard-engine";

/** Reusable, pure guitar-harmony calculations. No sound, fingering, Player or progression effects. */
export type TriadQuality = "major" | "minor";
export type TriadTone = "root" | "third" | "fifth";
export type TriadInversion = "root" | "first" | "second";
export type TriadStringGroup = "1-3" | "2-4" | "3-5" | "4-6";
export type NamedTriad = { root: FretboardRoot; quality: TriadQuality };
export type TriadVoicing = {
  id: string;
  chord: NamedTriad;
  tuning: FretboardTuning;
  group: TriadStringGroup;
  strings: readonly [number, number, number]; // low to high sounding string
  frets: readonly [number, number, number];
  midi: readonly [number, number, number];
  notes: readonly [string, string, string];
  tones: readonly [TriadTone, TriadTone, TriadTone];
  inversion: TriadInversion;
  fretSpan: number;
  fretPosition: number;
};

export const TRIAD_STRING_GROUPS: Record<TriadStringGroup, readonly [number, number, number]> = {
  "1-3": [3, 2, 1],
  "2-4": [4, 3, 2],
  "3-5": [5, 4, 3],
  "4-6": [6, 5, 4],
};

export const TRIAD_INVERSION_LABELS: Record<TriadInversion, string> = {
  root: "Root position",
  first: "First inversion",
  second: "Second inversion",
};
const TONES: readonly TriadTone[] = ["root", "third", "fifth"];
const inversionForBass: Record<TriadTone, TriadInversion> = {
  root: "root",
  third: "first",
  fifth: "second",
};

export function chordToneDefinitions(chord: NamedTriad) {
  const offsets = [0, chord.quality === "major" ? 4 : 3, 7] as const;
  return TONES.map((tone, index) => ({
    tone,
    semitones: offsets[index],
    pitchClass: mod12(rootPitchClass(chord.root) + offsets[index]),
    spelledName: spellFromRoot(chord.root, index * 2, offsets[index]),
  }));
}

export function chordLabel(chord: NamedTriad) {
  return `${chord.root} ${chord.quality}`;
}

/** Three distinct chord tones, strictly ascending register, within a bounded hand position.
 * Open strings are allowed only with nearby frets. We make no fingering claims.
 */
export function generateTriadVoicings(
  chord: NamedTriad,
  tuning: FretboardTuning,
  group: TriadStringGroup,
  maxFret = 12,
): TriadVoicing[] {
  if (!Number.isInteger(maxFret) || maxFret < 0 || maxFret > 24)
    throw new Error("Invalid triad fret range");
  const strings = TRIAD_STRING_GROUPS[group];
  if (!strings) throw new Error("Unknown triad string group");
  const tones = chordToneDefinitions(chord);
  const candidates = strings.map((stringNumber) =>
    Array.from({ length: maxFret + 1 }, (_, fret) => {
      const midi = pitchAt(tuning, stringNumber, fret);
      const match = tones.find((tone) => tone.pitchClass === mod12(midi));
      return match ? { fret, midi, ...match } : null;
    }).filter((option): option is NonNullable<typeof option> => option !== null),
  );

  const generated: TriadVoicing[] = [];
  for (const low of candidates[0]) {
    for (const middle of candidates[1]) {
      for (const high of candidates[2]) {
        if (new Set([low.tone, middle.tone, high.tone]).size !== 3) continue;
        if (!(low.midi < middle.midi && middle.midi < high.midi)) continue;
        const choices = [low, middle, high] as const;
        const frets = choices.map((choice) => choice.fret) as [number, number, number];
        const fretted = frets.filter((fret) => fret > 0);
        const highest = Math.max(...fretted, 0);
        const lowest = Math.min(...fretted, highest);
        const span = highest - lowest;
        if (span > 4 || (frets.includes(0) && highest > 5)) continue;
        const midi = choices.map((choice) => choice.midi) as [number, number, number];
        generated.push({
          id: `${chord.root}:${chord.quality}:${tuning}:${group}:${frets.join("-")}`,
          chord,
          tuning,
          group,
          strings,
          frets,
          midi,
          notes: choices.map((choice) => formatSoundingPitch(choice.midi, choice.spelledName)) as [
            string,
            string,
            string,
          ],
          tones: choices.map((choice) => choice.tone) as [TriadTone, TriadTone, TriadTone],
          inversion: inversionForBass[low.tone],
          fretSpan: span,
          fretPosition: lowest,
        });
      }
    }
  }
  // Favor a tighter and lower position, but retain all verified alternatives.
  return generated.sort(
    (a, b) =>
      a.fretSpan - b.fretSpan ||
      Math.max(...a.frets) - Math.max(...b.frets) ||
      a.frets.join("-").localeCompare(b.frets.join("-")),
  );
}

export function totalVoiceMotion(path: readonly TriadVoicing[]) {
  let total = 0;
  for (let index = 1; index < path.length; index++) {
    for (let voice = 0; voice < 3; voice++) {
      total += Math.abs(path[index].midi[voice] - path[index - 1].midi[voice]);
    }
  }
  return total;
}

export type VoiceMotion = {
  stringNumber: number;
  from: string;
  to: string;
  semitones: number;
};

export function compareVoicings(from: TriadVoicing, to: TriadVoicing): VoiceMotion[] {
  if (from.group !== to.group || from.tuning !== to.tuning)
    throw new Error("Voicing comparison requires the same tuning and string group");
  return from.strings.map((stringNumber, index) => ({
    stringNumber,
    from: from.notes[index],
    to: to.notes[index],
    semitones: to.midi[index] - from.midi[index],
  }));
}

export function motionLabel(semitones: number) {
  if (semitones === 0) return "Held (0)";
  const magnitude = Math.abs(semitones);
  return `${semitones > 0 ? "Up" : "Down"} ${magnitude} ${magnitude === 1 ? "semitone" : "semitones"}`;
}

/** Dynamic-programming minimization of summed pitch motion across three aligned strings.
 * This compares actual sounding registers, not enharmonic letter labels or fret numbers.
 * Lower positions serve only as a deterministic tiebreaker, never fake movement evidence.
 */
export function suggestConnectedVoicings(
  progression: readonly NamedTriad[],
  tuning: FretboardTuning,
  group: TriadStringGroup,
  maxFret = 12,
): TriadVoicing[] {
  if (!progression.length || progression.length > 8)
    throw new Error("Unsupported progression length");
  const layers = progression.map((chord) => generateTriadVoicings(chord, tuning, group, maxFret));
  if (layers.some((layer) => layer.length === 0)) return [];

  const costs: number[][] = [];
  const previous: number[][] = [];
  for (let layer = 0; layer < layers.length; layer++) {
    costs.push([]);
    previous.push([]);
    for (let current = 0; current < layers[layer].length; current++) {
      const candidate = layers[layer][current];
      if (layer === 0) {
        costs[layer].push(candidate.fretPosition * 0.001 + candidate.fretSpan * 0.0001);
        previous[layer].push(-1);
        continue;
      }
      let best = Infinity;
      let chosen = -1;
      for (let prior = 0; prior < layers[layer - 1].length; prior++) {
        const move = candidate.midi.reduce(
          (sum, pitch, voice) => sum + Math.abs(pitch - layers[layer - 1][prior].midi[voice]),
          0,
        );
        const value =
          costs[layer - 1][prior] +
          move +
          candidate.fretPosition * 0.001 +
          candidate.fretSpan * 0.0001;
        if (value < best) {
          best = value;
          chosen = prior;
        }
      }
      costs[layer].push(best);
      previous[layer].push(chosen);
    }
  }
  const last = layers.length - 1;
  let bestIndex = costs[last].reduce(
    (selected, value, index) => (value < costs[last][selected] ? index : selected),
    0,
  );
  const path: TriadVoicing[] = [];
  for (let layer = last; layer >= 0; layer--) {
    path.unshift(layers[layer][bestIndex]);
    bestIndex = previous[layer][bestIndex];
  }
  return path;
}

export const VOICE_LEADING_PROGRESSIONS = {
  c_am_f_g: {
    title: "C → Am → F → G",
    chords: [
      { root: "C", quality: "major" },
      { root: "A", quality: "minor" },
      { root: "F", quality: "major" },
      { root: "G", quality: "major" },
    ],
  },
  c_f_g_c: {
    title: "C → F → G → C",
    chords: [
      { root: "C", quality: "major" },
      { root: "F", quality: "major" },
      { root: "G", quality: "major" },
      { root: "C", quality: "major" },
    ],
  },
  g_em_c_d: {
    title: "G → Em → C → D",
    chords: [
      { root: "G", quality: "major" },
      { root: "E", quality: "minor" },
      { root: "C", quality: "major" },
      { root: "D", quality: "major" },
    ],
  },
} as const satisfies Record<string, { title: string; chords: readonly NamedTriad[] }>;
export type ProgressionId = keyof typeof VOICE_LEADING_PROGRESSIONS;
