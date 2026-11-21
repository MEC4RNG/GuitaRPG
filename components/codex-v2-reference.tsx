"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CodexV2ReferenceBlock } from "@/lib/codex/v2/content";
import {
  describeTriadTones,
  generateTriadVoicings,
  INVERSION_NAMES,
  STRING_GROUPS,
  TRIAD_ROOTS,
  type TriadRoot,
  type TriadQuality,
  type TriadStringGroup,
  type TriadInversion,
} from "@/lib/codex/v2/triad-voicings";

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

const STRING_GROUP_LABELS: readonly { id: TriadStringGroup; label: string }[] = [
  { id: "1-3", label: "Strings 1–3 · G B E" },
  { id: "2-4", label: "Strings 2–4 · D G B" },
  { id: "3-5", label: "Strings 3–5 · A D G" },
  { id: "4-6", label: "Strings 4–6 · E A D" },
];

const OPEN_STRING_LABELS: Readonly<Record<number, string>> = {
  6: "E2",
  5: "A2",
  4: "D3",
  3: "G3",
  2: "B3",
  1: "E4",
};
const INVERSION_OPTIONS: readonly TriadInversion[] = ["root", "first", "second"];

function TriadFretboardReference() {
  const [root, setRoot] = useState<TriadRoot>("C");
  const [quality, setQuality] = useState<TriadQuality>("major");
  const [group, setGroup] = useState<TriadStringGroup>("1-3");
  const [inversion, setInversion] = useState<TriadInversion>("root");
  const [voicingId, setVoicingId] = useState<string | null>(null);
  const voicings = useMemo(
    () => generateTriadVoicings(root, quality, group),
    [root, quality, group],
  );
  const availableInversions = INVERSION_OPTIONS.filter((item) =>
    voicings.some((voicing) => voicing.inversion === item),
  );
  const effectiveInversion = availableInversions.includes(inversion)
    ? inversion
    : availableInversions[0];
  const matchingVoicings = voicings
    .filter((item) => item.inversion === effectiveInversion)
    .slice(0, 12);
  const selectedVoicing =
    matchingVoicings.find((item) => item.id === voicingId) ?? matchingVoicings[0] ?? null;
  const names = describeTriadTones(root, quality);

  function changeRoot(next: TriadRoot) {
    setRoot(next);
    setInversion("root");
    setVoicingId(null);
  }
  function changeQuality(next: TriadQuality) {
    setQuality(next);
    setInversion("root");
    setVoicingId(null);
  }
  function changeGroup(next: TriadStringGroup) {
    setGroup(next);
    setInversion("root");
    setVoicingId(null);
  }

  const firstY = 58;
  const fretHeight = 46;
  return (
    <div className="cv2-interactive">
      <span className="cv2-eyebrow">Interactive guitar reference</span>
      <h3>Triad voicings · standard tuning</h3>
      <p>
        Choose a root, chord quality and three-string group. Dots represent sounding pitches and
        fret locations, not suggested finger assignments.
      </p>
      <div className="cv2-triad-controls">
        <label>
          Root note
          <select value={root} onChange={(event) => changeRoot(event.target.value as TriadRoot)}>
            {TRIAD_ROOTS.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Triad quality
          <select
            value={quality}
            onChange={(event) => changeQuality(event.target.value as TriadQuality)}
          >
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
        </label>
        <label>
          String group
          <select
            value={group}
            onChange={(event) => changeGroup(event.target.value as TriadStringGroup)}
          >
            {STRING_GROUP_LABELS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Inversion
          <select
            value={effectiveInversion ?? ""}
            onChange={(event) => {
              setInversion(event.target.value as TriadInversion);
              setVoicingId(null);
            }}
            disabled={!availableInversions.length}
          >
            {INVERSION_OPTIONS.map((item) => (
              <option key={item} value={item} disabled={!availableInversions.includes(item)}>
                {INVERSION_NAMES[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fretboard voicing
          <select
            value={selectedVoicing?.id ?? ""}
            onChange={(event) => setVoicingId(event.target.value)}
            disabled={!matchingVoicings.length}
          >
            {matchingVoicings.map((voicing) => (
              <option value={voicing.id} key={voicing.id}>
                {voicing.frets.map((fret) => (fret === 0 ? "open" : fret)).join(" / ")}
                {" · frets low to high"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="cv2-triad-tone-line">
        {names.map((item) => (
          <span key={item.tone}>
            <strong>{item.name}</strong> · {item.description}
          </span>
        ))}
      </div>
      {selectedVoicing ? (
        <>
          <svg
            className="cv2-fret-svg"
            viewBox="0 0 385 350"
            role="img"
            aria-label={`${root} ${quality} ${INVERSION_NAMES[selectedVoicing.inversion]}: ${selectedVoicing.strings.map((stringNumber, index) => `string ${stringNumber} fret ${selectedVoicing.frets[index]} ${selectedVoicing.notes[index]}`).join(", ")}`}
          >
            <title>{`${root} ${quality}, ${INVERSION_NAMES[selectedVoicing.inversion]} on strings ${STRING_GROUPS[group].join(", ")}`}</title>
            {Array.from({ length: 6 }, (_, fret) => (
              <g key={fret}>
                <line
                  x1="60"
                  x2="325"
                  y1={firstY + fret * fretHeight}
                  y2={firstY + fret * fretHeight}
                  stroke="currentColor"
                  strokeOpacity={fret === 0 ? 0.65 : 0.25}
                  strokeWidth={fret === 0 && selectedVoicing.fretStart === 1 ? 5 : 2}
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
                    {selectedVoicing.fretStart + fret}
                  </text>
                ) : null}
              </g>
            ))}
            {selectedVoicing.strings.map((stringNumber, index) => {
              const x = 78 + index * 113;
              const fret = selectedVoicing.frets[index];
              const y =
                fret === 0 ? 39 : firstY + (fret - selectedVoicing.fretStart + 0.5) * fretHeight;
              return (
                <g key={stringNumber}>
                  <line
                    x1={x}
                    x2={x}
                    y1={firstY}
                    y2={firstY + 5 * fretHeight}
                    stroke="currentColor"
                    strokeOpacity="0.42"
                    strokeWidth="2"
                  />
                  <text x={x} y="22" textAnchor="middle" fill="currentColor" fontSize="14">
                    {OPEN_STRING_LABELS[stringNumber]}
                  </text>
                  <text x={x} y="324" textAnchor="middle" fill="currentColor" fontSize="13">
                    String {stringNumber}
                  </text>
                  <circle
                    cx={x}
                    cy={y}
                    r={fret === 0 ? 15 : 19}
                    fill={fret === 0 ? "none" : "#d3a956"}
                    stroke={fret === 0 ? "currentColor" : "#2d2415"}
                    strokeWidth="2"
                  />
                  <text
                    x={x}
                    y={y + 5}
                    textAnchor="middle"
                    fill={fret === 0 ? "currentColor" : "#222017"}
                    fontSize="13"
                    fontWeight="700"
                  >
                    {selectedVoicing.notes[index].replace(/[0-9]/g, "")}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="cv2-reference-detail" role="status">
            <strong>
              {root} {quality} · {INVERSION_NAMES[selectedVoicing.inversion]}
            </strong>
            <span>{selectedVoicing.notes.join(" · ")} (low to high)</span>
            <p>{selectedVoicing.description}</p>
          </div>
        </>
      ) : (
        <p role="status">
          No verified three-string voicing is available under the current fret-span limits. Choose
          another root, quality, string group or inversion.
        </p>
      )}
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
        </div>
      ))}
    </aside>
  );
}
