"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CodexV2ReferenceBlock } from "@/lib/codex/v2/content";
import { CodexV2Fretboard } from "./codex-v2-fretboard";
import { CodexV2ChordVoicings } from "./codex-v2-chord-voicings";
import { CodexV2ArpeggioSequencer } from "./codex-v2-arpeggio-sequencer";

type AudioContextRef = { current: AudioContext | null };

function playReferenceTone(ref: AudioContextRef, midi: number) {
  try {
    const context = ref.current ?? new AudioContext();
    ref.current = context;
    void context.resume();
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.13, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.48);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.5);
  } catch {
    // A visual reference remains usable when audio is blocked or unavailable.
  }
}

const degrees = [
  { pitch: "C", degree: 1, role: "Tonic — home", midi: 60 },
  { pitch: "D", degree: 2, role: "Supertonic", midi: 62 },
  { pitch: "E", degree: 3, role: "Mediant", midi: 64 },
  { pitch: "F", degree: 4, role: "Subdominant", midi: 65 },
  { pitch: "G", degree: 5, role: "Dominant", midi: 67 },
  { pitch: "A", degree: 6, role: "Submediant", midi: 69 },
  { pitch: "B", degree: 7, role: "Leading tone", midi: 71 },
] as const;

function ScaleDegreesReference() {
  const [selected, setSelected] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  useEffect(
    () => () => {
      if (audioRef.current) void audioRef.current.close();
    },
    [],
  );
  const active = degrees[selected];
  return (
    <div className="cv2-interactive">
      <span className="cv2-eyebrow">Interactive music reference</span>
      <h3>C major · scale degrees 1–7</h3>
      <p>Select a note to hear its pitch and see its relationship to the tonic.</p>
      <div className="cv2-degree-list" role="group" aria-label="C major scale degrees">
        {degrees.map((note, index) => (
          <button
            key={note.pitch}
            type="button"
            aria-pressed={index === selected}
            onClick={() => {
              setSelected(index);
              playReferenceTone(audioRef, note.midi);
            }}
          >
            <strong>{note.pitch}</strong>
            <span>{note.degree}</span>
          </button>
        ))}
      </div>
      <div className="cv2-reference-detail" role="status">
        <strong>
          Degree {active.degree} · {active.pitch}
        </strong>
        <span>{active.role}</span>
        <p>
          In C major, C is the home note (degree 1). The other degree numbers describe how the notes
          relate to that tonal center, not which finger to use.
        </p>
      </div>
      <p className="cv2-related-reference">
        What am I looking at? Start with the{" "}
        <Link href="/codex/concepts/major_scale" target="_blank" rel="noopener noreferrer">
          Major Scale ↗
        </Link>{" "}
        or{" "}
        <Link href="/codex/contexts/tonal_center" target="_blank" rel="noopener noreferrer">
          Tonal Center ↗
        </Link>
        .
      </p>
    </div>
  );
}

type Voicing = {
  id: string;
  label: string;
  quality: string;
  inversion: string;
  frets: readonly [number, number, number];
  notes: readonly [string, string, string];
  degrees: readonly [string, string, string];
  explanation: string;
};
const voicings: readonly Voicing[] = [
  {
    id: "c-major",
    label: "C major",
    quality: "Major",
    inversion: "Root position",
    frets: [5, 5, 3],
    notes: ["C4", "E4", "G4"],
    degrees: ["1", "3", "5"],
    explanation: "C–E–G. The major third is E, four semitones above C.",
  },
  {
    id: "c-minor",
    label: "C minor",
    quality: "Minor",
    inversion: "Root position",
    frets: [5, 4, 3],
    notes: ["C4", "E♭4", "G4"],
    degrees: ["1", "♭3", "5"],
    explanation: "C–E♭–G. Only the third moves down a semitone; C and G stay.",
  },
  {
    id: "f-first",
    label: "F major",
    quality: "Major",
    inversion: "First inversion",
    frets: [2, 1, 1],
    notes: ["A3", "C4", "F4"],
    degrees: ["3", "5", "1"],
    explanation: "A–C–F is F major in first inversion: the third, A, is the lowest note.",
  },
];

function TriadFretboardReference() {
  const [selection, setSelection] = useState(voicings[0].id);
  const voicing = voicings.find((candidate) => candidate.id === selection) ?? voicings[0];
  const strings = [
    { no: 3, tuning: "G3", x: 78 },
    { no: 2, tuning: "B3", x: 191 },
    { no: 1, tuning: "E4", x: 304 },
  ];
  const firstY = 48;
  const fretHeight = 46;
  return (
    <div className="cv2-interactive">
      <span className="cv2-eyebrow">Interactive guitar reference</span>
      <h3>Triad voicings · standard tuning</h3>
      <p>
        Compare the same three strings (G, B and high E). Each dot gives the note at that string and
        fret, not a suggested fingering.
      </p>
      <div className="cv2-voicing-select" role="group" aria-label="Choose a triad voicing">
        {voicings.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === selection}
            onClick={() => setSelection(item.id)}
          >
            {item.label}
            {item.id === "f-first" ? " · inversion" : ""}
          </button>
        ))}
      </div>
      <svg
        className="cv2-fret-svg"
        viewBox="0 0 385 350"
        role="img"
        aria-label={`${voicing.label} ${voicing.inversion}: string 3 fret ${voicing.frets[0]} ${voicing.notes[0]}, string 2 fret ${voicing.frets[1]} ${voicing.notes[1]}, string 1 fret ${voicing.frets[2]} ${voicing.notes[2]}`}
      >
        <title>{`${voicing.label} on strings G, B, high E in standard tuning`}</title>
        {Array.from({ length: 6 }, (_, fret) => (
          <g key={fret}>
            <line
              x1="60"
              x2="325"
              y1={firstY + fret * fretHeight}
              y2={firstY + fret * fretHeight}
              stroke="currentColor"
              strokeOpacity={fret === 0 ? 0.65 : 0.25}
              strokeWidth={fret === 0 ? 5 : 2}
            />
            {fret < 5 ? (
              <text
                x="33"
                y={firstY + fret * fretHeight + fretHeight / 2 + 5}
                textAnchor="middle"
                fill="currentColor"
                opacity="0.65"
                fontSize="13"
              >
                {fret + 1}
              </text>
            ) : null}
          </g>
        ))}
        {strings.map((string, index) => (
          <g key={string.no}>
            <line
              x1={string.x}
              x2={string.x}
              y1={firstY}
              y2={firstY + 5 * fretHeight}
              stroke="currentColor"
              strokeOpacity="0.42"
              strokeWidth="2"
            />
            <text x={string.x} y="26" textAnchor="middle" fill="currentColor" fontSize="14">
              {string.tuning}
            </text>
            <text x={string.x} y="305" textAnchor="middle" fill="currentColor" fontSize="13">
              String {string.no}
            </text>
            <circle
              cx={string.x}
              cy={firstY + (voicing.frets[index] - 0.5) * fretHeight}
              r="19"
              fill="#d3a956"
              stroke="#2d2415"
              strokeWidth="2"
            />
            <text
              x={string.x}
              y={firstY + (voicing.frets[index] - 0.5) * fretHeight + 5}
              textAnchor="middle"
              fill="#222017"
              fontSize="13"
              fontWeight="700"
            >
              {voicing.notes[index].replace(/[0-9]/g, "")}
            </text>
          </g>
        ))}
      </svg>
      <div className="cv2-reference-detail" role="status">
        <strong>
          {voicing.label} · {voicing.inversion}
        </strong>
        <span>{voicing.notes.join(" · ")} (low to high)</span>
        <p>{voicing.explanation}</p>
      </div>
      <p className="cv2-related-reference">
        Why does order matter? Read about{" "}
        <Link href="/codex/concepts/chord_inversion" target="_blank" rel="noopener noreferrer">
          Chord Inversions ↗
        </Link>{" "}
        and{" "}
        <Link href="/codex/concepts/chord_voicing" target="_blank" rel="noopener noreferrer">
          Chord Voicings ↗
        </Link>
        .
      </p>
    </div>
  );
}

type Subdivision = { id: string; label: string; count: number; spoken: readonly string[] };
const subdivisions: readonly Subdivision[] = [
  { id: "quarter", label: "Quarter", count: 1, spoken: ["1"] },
  { id: "eighth", label: "Eighth", count: 2, spoken: ["1", "&"] },
  { id: "triplet", label: "Triplet", count: 3, spoken: ["1", "trip", "let"] },
  { id: "sixteenth", label: "Sixteenth", count: 4, spoken: ["1", "e", "&", "a"] },
];

type Playback = {
  context: AudioContext;
  interval: number;
  firstTime: number;
  nextTime: number;
  index: number;
  division: number;
  secondsPerStep: number;
};
function scheduleClick(context: AudioContext, at: number, accented: boolean) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = accented ? 980 : 660;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(accented ? 0.28 : 0.12, at + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.065);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(at);
  oscillator.stop(at + 0.07);
}
function RhythmGridReference() {
  const [bpm, setBpm] = useState(80);
  const [divisionId, setDivisionId] = useState("eighth");
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const playbackRef = useRef<Playback | null>(null);
  const choice = subdivisions.find((item) => item.id === divisionId) ?? subdivisions[1];

  function stop() {
    const playback = playbackRef.current;
    playbackRef.current = null;
    if (playback) {
      window.clearInterval(playback.interval);
      void playback.context.close();
    }
    setPlaying(false);
    setStep(-1);
  }
  useEffect(
    () => () => {
      const playback = playbackRef.current;
      playbackRef.current = null;
      if (playback) {
        window.clearInterval(playback.interval);
        void playback.context.close();
      }
    },
    [],
  );

  function start() {
    if (playbackRef.current) return stop();
    try {
      const context = new AudioContext();
      void context.resume();
      const firstTime = context.currentTime + 0.085;
      const secondsPerStep = 60 / bpm / choice.count;
      const state: Playback = {
        context,
        firstTime,
        nextTime: firstTime,
        index: 0,
        division: choice.count,
        secondsPerStep,
        interval: 0,
      };
      const scheduler = () => {
        if (playbackRef.current !== state) return;
        while (state.nextTime < context.currentTime + 0.15) {
          try {
            scheduleClick(context, state.nextTime, state.index % (4 * state.division) === 0);
          } catch {
            stop();
            return;
          }
          state.nextTime += state.secondsPerStep;
          state.index++;
        }
        const elapsed = context.currentTime - state.firstTime;
        const active =
          elapsed < 0 ? -1 : Math.floor(elapsed / state.secondsPerStep) % (4 * state.division);
        setStep((previous) => (previous === active ? previous : active));
      };
      playbackRef.current = state;
      state.interval = window.setInterval(scheduler, 25);
      setPlaying(true);
      scheduler();
    } catch {
      stop();
    }
  }

  return (
    <div className="cv2-interactive">
      <span className="cv2-eyebrow">Interactive rhythm reference</span>
      <h3>4/4 subdivision grid · quarter-note pulse</h3>
      <p>
        Change note density without changing the underlying tempo. The first click of each bar is
        accented; the other subdivisions are softer.
      </p>
      <div className="cv2-tempo-control">
        <label htmlFor="cv2-bpm">
          Tempo: <strong>{bpm} BPM</strong>
        </label>
        <input
          id="cv2-bpm"
          aria-label="Tempo in beats per minute"
          type="range"
          min="40"
          max="180"
          step="1"
          value={bpm}
          onChange={(event) => {
            stop();
            setBpm(Number(event.target.value));
          }}
        />
      </div>
      <div className="cv2-voicing-select" role="group" aria-label="Subdivision">
        {subdivisions.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={divisionId === item.id}
            onClick={() => {
              stop();
              setDivisionId(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="cv2-beat-grid"
        aria-label={`${choice.label} subdivisions, four quarter-note beats`}
      >
        {Array.from({ length: 4 }, (_, beat) => (
          <div className="cv2-beat" key={beat}>
            <strong>Beat {beat + 1}</strong>
            <div
              className="cv2-beat-parts"
              style={{ gridTemplateColumns: `repeat(${choice.count}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: choice.count }, (_, part) => {
                const index = beat * choice.count + part;
                return (
                  <span
                    key={index}
                    className={step === index ? "is-active" : ""}
                    aria-label={`Beat ${beat + 1}, part ${part + 1}`}
                  >
                    {part === 0 ? beat + 1 : choice.spoken[part]}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="cv2-playback-controls">
        <button type="button" onClick={start} aria-pressed={playing}>
          {playing ? "■ Stop metronome" : "▶ Play metronome"}
        </button>
        <span role="status">
          {playing
            ? `${bpm} BPM · ${choice.label} notes`
            : "Stopped · audio starts only when you press Play"}
        </span>
      </div>
      <p className="cv2-related-reference">
        What am I counting? Read{" "}
        <Link
          href="/codex/concepts/eighth_note_subdivision"
          target="_blank"
          rel="noopener noreferrer"
        >
          Eighth-Note Subdivision ↗
        </Link>{" "}
        or{" "}
        <Link href="/codex/concepts/triplet_feel" target="_blank" rel="noopener noreferrer">
          Triplet Feel ↗
        </Link>
        .
      </p>
    </div>
  );
}

export function CodexV2Reference({ blocks }: { blocks: readonly CodexV2ReferenceBlock[] }) {
  if (!blocks.length) return null;
  return (
    <aside className="cv2-reference-stack" aria-label="Interactive musical examples">
      {blocks.map((block) => (
        <div key={block.id}>
          {block.kind === "SCALE_DEGREES" ? <ScaleDegreesReference /> : null}
          {block.kind === "TRIAD_FRETBOARD" ? <TriadFretboardReference /> : null}
          {block.kind === "RHYTHM_GRID" ? <RhythmGridReference /> : null}
          {block.kind === "FRETBOARD_NOTE_LOCATION" ? (
            <CodexV2Fretboard mode="note_location" />
          ) : null}
          {block.kind === "FRETBOARD_SCALE_MAP" ? <CodexV2Fretboard mode="scale_mapping" /> : null}
          {block.kind === "FRETBOARD_INTERVALS" ? (
            <CodexV2Fretboard mode="interval_recognition" />
          ) : null}
          {block.kind === "CHORD_INVERSION_EXPLORER" ? (
            <CodexV2ChordVoicings mode="inversions" />
          ) : null}
          {block.kind === "VOICE_LEADING_EXPLORER" ? (
            <CodexV2ChordVoicings mode="voice_leading" />
          ) : null}
          {block.kind === "ARPEGGIO_SEQUENCER" ? (
            <CodexV2ArpeggioSequencer />
          ) : null}
        </div>
      ))}
    </aside>
  );
}
