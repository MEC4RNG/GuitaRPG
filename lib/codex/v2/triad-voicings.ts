/**
 * Pure standard-tuning three-string triad voicing resolver.
 * No finger assignment, Player state, persistence, or audio side effects.
 */
export const TRIAD_ROOTS = [
  "C",
  "C♯",
  "D",
  "E♭",
  "E",
  "F",
  "F♯",
  "G",
  "A♭",
  "A",
  "B♭",
  "B",
] as const;
export type TriadRoot = (typeof TRIAD_ROOTS)[number];
export type TriadQuality = "major" | "minor";
export type TriadStringGroup = "1-3" | "2-4" | "3-5" | "4-6";
export type TriadInversion = "root" | "first" | "second";
export type TriadTone = "root" | "third" | "fifth";

export const STRING_GROUPS: Readonly<Record<TriadStringGroup, readonly [number, number, number]>> =
  {
    "1-3": [3, 2, 1],
    "2-4": [4, 3, 2],
    "3-5": [5, 4, 3],
    "4-6": [6, 5, 4],
  };

const OPEN_MIDI: Readonly<Record<number, number>> = {
  6: 40,
  5: 45,
  4: 50,
  3: 55,
  2: 59,
  1: 64,
};
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const NATURAL_PCS: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const ROOT_PCS: Readonly<Record<TriadRoot, number>> = {
  C: 0,
  "C♯": 1,
  D: 2,
  "E♭": 3,
  E: 4,
  F: 5,
  "F♯": 6,
  G: 7,
  "A♭": 8,
  A: 9,
  "B♭": 10,
  B: 11,
};
const TONE_NAMES: Readonly<Record<TriadTone, string>> = {
  root: "Root",
  third: "Third",
  fifth: "Fifth",
};
export const INVERSION_NAMES: Readonly<Record<TriadInversion, string>> = {
  root: "Root position",
  first: "First inversion",
  second: "Second inversion",
};

export type TriadVoicing = {
  id: string;
  root: TriadRoot;
  quality: TriadQuality;
  group: TriadStringGroup;
  inversion: TriadInversion;
  strings: readonly [number, number, number];
  frets: readonly [number, number, number];
  notes: readonly [string, string, string];
  tones: readonly [TriadTone, TriadTone, TriadTone];
  midi: readonly [number, number, number];
  fretStart: number;
  description: string;
};

function mod12(n: number) {
  return ((n % 12) + 12) % 12;
}

function spellTone(root: TriadRoot, quality: TriadQuality, tone: TriadTone) {
  const letter = root[0];
  const index = LETTERS.findIndex((value) => value === letter);
  const shift = tone === "root" ? 0 : tone === "third" ? 2 : 4;
  const target = mod12(
    ROOT_PCS[root] + (tone === "third" ? (quality === "major" ? 4 : 3) : tone === "fifth" ? 7 : 0),
  );
  const noteLetter = LETTERS[(index + shift) % LETTERS.length];
  const delta = mod12(target - NATURAL_PCS[noteLetter]);
  const offset = delta > 6 ? delta - 12 : delta;
  if (Math.abs(offset) > 2) throw new Error("Unsupported chord spelling");
  const accidental = offset < 0 ? "♭".repeat(-offset) : "♯".repeat(offset);
  return { letter: noteLetter, offset, name: noteLetter + accidental };
}

function pitchLabel(midi: number, spelling: ReturnType<typeof spellTone>) {
  // The spelled octave must include the accidental (B♯3 = C4, C♭4 = B3).
  const octave = (midi - NATURAL_PCS[spelling.letter] - spelling.offset) / 12 - 1;
  if (!Number.isInteger(octave)) throw new Error("Unspellable pitch");
  return `${spelling.name}${octave}`;
}

export function generateTriadVoicings(
  root: TriadRoot,
  quality: TriadQuality,
  group: TriadStringGroup,
  maxFret = 17,
): TriadVoicing[] {
  const strings = STRING_GROUPS[group];
  const toneOffsets: readonly [TriadTone, number][] = [
    ["root", 0],
    ["third", quality === "major" ? 4 : 3],
    ["fifth", 7],
  ];
  const choices = strings.map((stringNumber) =>
    Array.from({ length: maxFret + 1 }, (_, fret) => ({
      fret,
      midi: OPEN_MIDI[stringNumber] + fret,
    })).flatMap((item) =>
      toneOffsets
        .filter(([, semitone]) => mod12(item.midi) === mod12(ROOT_PCS[root] + semitone))
        .map(([tone]) => ({ ...item, tone })),
    ),
  );
  const resolved: TriadVoicing[] = [];
  for (const low of choices[0]) {
    for (const middle of choices[1]) {
      for (const high of choices[2]) {
        const sounding = [low, middle, high] as const;
        if (new Set(sounding.map((item) => item.tone)).size !== 3) continue;
        const frets = sounding.map((item) => item.fret) as [number, number, number];
        const fretted = frets.filter((fret) => fret > 0);
        const highest = Math.max(...fretted, 0);
        const lowest = Math.min(...fretted, highest);
        if (highest - lowest > 4) continue;
        // Open strings and fretted notes may sound together; reject impractical
        // high-position shapes with an open string and a wide reachable span.
        if (frets.includes(0) && highest > 5) continue;
        const inversion: TriadInversion =
          low.tone === "root" ? "root" : low.tone === "third" ? "first" : "second";
        const fretStart = highest <= 5 ? 1 : Math.max(1, highest - 4);
        const notes = sounding.map((item) =>
          pitchLabel(item.midi, spellTone(root, quality, item.tone)),
        ) as [string, string, string];
        resolved.push({
          id: `${root}:${quality}:${group}:${frets.join("-")}`,
          root,
          quality,
          group,
          inversion,
          strings,
          frets,
          notes,
          tones: sounding.map((item) => item.tone) as [TriadTone, TriadTone, TriadTone],
          midi: sounding.map((item) => item.midi) as [number, number, number],
          fretStart,
          description: `${root} ${quality} · ${INVERSION_NAMES[inversion]} · ${sounding
            .map(
              (item, index) =>
                `string ${strings[index]} ${item.fret === 0 ? "open" : `fret ${item.fret}`}`,
            )
            .join(", ")}. ${notes.join("–")} (low to high).`,
        });
      }
    }
  }
  const featured: Readonly<Record<string, string>> = {
    "C:major:1-3:5-5-3": "0",
    "C:minor:1-3:5-4-3": "0",
    "F:major:1-3:2-1-1": "0",
  };
  resolved.sort((a, b) => {
    const rankA = featured[a.id] === "0" ? -1 : 0;
    const rankB = featured[b.id] === "0" ? -1 : 0;
    if (rankA !== rankB) return rankA - rankB;
    const spanA = Math.max(...a.frets) - Math.min(...a.frets);
    const spanB = Math.max(...b.frets) - Math.min(...b.frets);
    if (spanA !== spanB) return spanA - spanB;
    const heightA = Math.max(...a.frets);
    const heightB = Math.max(...b.frets);
    if (heightA !== heightB) return heightA - heightB;
    return a.frets.join("-").localeCompare(b.frets.join("-"));
  });
  return resolved;
}

export function describeTriadTones(root: TriadRoot, quality: TriadQuality) {
  return (["root", "third", "fifth"] as const).map((tone) => {
    const spelling = spellTone(root, quality, tone);
    return { tone, name: spelling.name, description: TONE_NAMES[tone] };
  });
}
