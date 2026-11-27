"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHROMATIC_ROOTS,
  TUNINGS,
  type FretboardRoot,
  type FretboardTuning,
} from "@/lib/codex/v2/fretboard-engine";
import {
  chordLabel,
  chordToneDefinitions,
  compareVoicings,
  generateTriadVoicings,
  motionLabel,
  suggestConnectedVoicings,
  totalVoiceMotion,
  TRIAD_INVERSION_LABELS,
  TRIAD_STRING_GROUPS,
  VOICE_LEADING_PROGRESSIONS,
  type NamedTriad,
  type ProgressionId,
  type TriadInversion,
  type TriadQuality,
  type TriadStringGroup,
  type TriadVoicing,
} from "@/lib/codex/v2/chord-voicings";

type Mode = "inversions" | "voice_leading";
const inversionOrder: readonly TriadInversion[] = ["root", "first", "second"];
const groupOrder: readonly TriadStringGroup[] = ["1-3", "2-4", "3-5", "4-6"];
const chordExamples = [
  [5, 5, 3], // C4–E4–G4
  [5, 5, 5], // C4–E4–A4
  [5, 6, 5], // C4–F4–A4
  [4, 3, 3], // B3–D4–G4
];

function scheduleNotes(
  context: AudioContext,
  values: readonly number[],
  start: number,
  step: number,
  duration: number,
) {
  for (const [index, midi] of values.entries()) {
    const when = start + index * step;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.09, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.01);
  }
}

export function ChordDiagram({ voicing }: { voicing: TriadVoicing }) {
  const fretted = voicing.frets.filter((fret) => fret > 0);
  const high = Math.max(...fretted, 0);
  const low = Math.min(...fretted, high);
  const startFret = high <= 5 ? 1 : low;
  const firstY = 60;
  const fretHeight = 34;
  const xValues = [58, 149, 240];
  return (
    <svg
      className="cv2-chord-diagram"
      viewBox="0 0 300 275"
      role="img"
      aria-label={`${chordLabel(voicing.chord)}, ${TRIAD_INVERSION_LABELS[voicing.inversion]}. ${voicing.strings.map((stringNumber, index) => `String ${stringNumber} fret ${voicing.frets[index]}, ${voicing.notes[index]}`).join("; ")}`}
    >
      <title>{`${chordLabel(voicing.chord)} on strings ${voicing.strings.join(", ")}`}</title>
      {Array.from({ length: 6 }, (_, index) => (
        <g key={index}>
          <line
            x1="40"
            x2="259"
            y1={firstY + index * fretHeight}
            y2={firstY + index * fretHeight}
            stroke="currentColor"
            strokeOpacity={index === 0 ? 0.7 : 0.26}
            strokeWidth={index === 0 && startFret === 1 ? 4 : 1.5}
          />
          {index < 5 ? (
            <text
              x="20"
              y={firstY + (index + 0.5) * fretHeight + 4}
              fontSize="12"
              fill="currentColor"
              textAnchor="middle"
              opacity="0.7"
            >
              {startFret + index}
            </text>
          ) : null}
        </g>
      ))}
      {voicing.strings.map((stringNumber, index) => {
        const x = xValues[index];
        const fret = voicing.frets[index];
        const y = fret === 0 ? 37 : firstY + (fret - startFret + 0.5) * fretHeight;
        const tone = voicing.tones[index];
        const shortTone = tone === "root" ? "R" : tone === "third" ? "3" : "5";
        return (
          <g key={stringNumber}>
            <line
              x1={x}
              x2={x}
              y1={firstY}
              y2={firstY + 5 * fretHeight}
              stroke="currentColor"
              strokeOpacity="0.45"
              strokeWidth="2"
            />
            <text x={x} y="17" textAnchor="middle" fontSize="13" fill="currentColor">
              String {stringNumber}
            </text>
            <circle
              cx={x}
              cy={y}
              r={fret === 0 ? 14 : 17}
              fill={fret === 0 ? "none" : "#d6a84b"}
              stroke={fret === 0 ? "currentColor" : "#302715"}
              strokeWidth="2"
            />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontWeight="700"
              fontSize="13"
              fill={fret === 0 ? "currentColor" : "#282216"}
            >
              {shortTone}
            </text>
            <text x={x} y="257" textAnchor="middle" fontSize="13" fill="currentColor">
              {voicing.notes[index]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function VoicingCard({
  voicing,
  index,
  candidates,
  onSelect,
  onHear,
}: {
  voicing: TriadVoicing;
  index?: number;
  candidates?: readonly TriadVoicing[];
  onSelect?: (id: string) => void;
  onHear: (voicing: TriadVoicing, asChord: boolean) => void;
}) {
  const options = candidates
    ? [
        ...(candidates.some((candidate) => candidate.id === voicing.id) ? [] : [voicing]),
        ...candidates.filter((candidate) => candidate.id !== voicing.id).slice(0, 39),
      ]
    : [];
  if (candidates && !options.some((candidate) => candidate.id === voicing.id)) {
    options.unshift(voicing);
  }
  return (
    <article className="cv2-chord-card">
      <div>
        <span className="cv2-eyebrow">
          {index === undefined ? "Selected voicing" : `Chord ${index + 1}`}
        </span>
        <h4>
          {chordLabel(voicing.chord)} · {TRIAD_INVERSION_LABELS[voicing.inversion]}
        </h4>
      </div>
      {candidates && onSelect ? (
        <label>
          Alternate voicing
          <select
            aria-label={`Chord ${index! + 1} voicing`}
            value={voicing.id}
            onChange={(event) => onSelect(event.target.value)}
          >
            {options.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.frets.map((fret) => (fret === 0 ? "open" : fret)).join(" / ")}
                {" · "}
                {TRIAD_INVERSION_LABELS[candidate.inversion]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <ChordDiagram voicing={voicing} />
      <p>{voicing.notes.join(" · ")} (low to high)</p>
      <p className="cv2-chord-fret-label">
        Frets {voicing.frets.map((fret) => (fret === 0 ? "open" : fret)).join("–")} on strings{" "}
        {voicing.strings.join("–")}
      </p>
      <div className="cv2-chord-audio">
        <button type="button" onClick={() => onHear(voicing, true)}>
          Hear chord
        </button>
        <button type="button" onClick={() => onHear(voicing, false)}>
          Hear arpeggio
        </button>
      </div>
    </article>
  );
}

/** One voice/voicing renderer shared by the Inversion and Voice Leading Codex Skills. */
export function CodexV2ChordVoicings({ mode }: { mode: Mode }) {
  const [tuning, setTuning] = useState<FretboardTuning>("standard");
  const [group, setGroup] = useState<TriadStringGroup>("1-3");
  const [root, setRoot] = useState<FretboardRoot>("C");
  const [quality, setQuality] = useState<TriadQuality>("major");
  const [inversion, setInversion] = useState<TriadInversion>("root");
  const [voicingId, setVoicingId] = useState<string | null>(null);
  const [progressionId, setProgressionId] = useState<ProgressionId>("c_am_f_g");
  const [optimized, setOptimized] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [audioMessage, setAudioMessage] = useState("Audio is optional and user-initiated.");
  const audioRef = useRef<AudioContext | null>(null);
  useEffect(
    () => () => {
      if (audioRef.current) void audioRef.current.close();
    },
    [],
  );

  const chord: NamedTriad = useMemo(() => ({ root, quality }), [root, quality]);
  const voicings = useMemo(
    () => generateTriadVoicings(chord, tuning, group),
    [chord, tuning, group],
  );
  const availableInversions = inversionOrder.filter((id) =>
    voicings.some((voicing) => voicing.inversion === id),
  );
  const activeInversion = availableInversions.includes(inversion)
    ? inversion
    : availableInversions[0];
  const candidates = voicings.filter((voicing) => voicing.inversion === activeInversion);
  const shownCandidates = candidates.slice(0, 24);
  const selectedVoicing =
    shownCandidates.find((voicing) => voicing.id === voicingId) ?? shownCandidates[0] ?? null;

  const progression = VOICE_LEADING_PROGRESSIONS[progressionId];
  const progressionVoicings = useMemo(
    () => progression.chords.map((item) => generateTriadVoicings(item, tuning, group).slice(0, 40)),
    [progression, tuning, group],
  );
  const suggested = useMemo(
    () => suggestConnectedVoicings(progression.chords, tuning, group),
    [progression, tuning, group],
  );
  const example =
    progressionId === "c_am_f_g" && group === "1-3" && tuning === "standard"
      ? progressionVoicings.map(
          (list, index) =>
            list.find((voicing) =>
              voicing.frets.every((fret, n) => fret === chordExamples[index][n]),
            ) ?? suggested[index],
        )
      : suggested;
  const displayedPath = progressionVoicings
    .map(
      (options, index) =>
        options.find((option) => option.id === overrides[index]) ??
        (optimized ? suggested[index] : example[index]) ??
        options[0],
    )
    .filter((value): value is TriadVoicing => Boolean(value));
  const hasCompletePath = displayedPath.length === progression.chords.length;
  const totalMotion = hasCompletePath ? totalVoiceMotion(displayedPath) : null;
  const suggestedMotion = suggested.length ? totalVoiceMotion(suggested) : null;
  const lines = hasCompletePath
    ? displayedPath.slice(1).map((to, index) => ({
        fromChord: chordLabel(displayedPath[index].chord),
        toChord: chordLabel(to.chord),
        movement: compareVoicings(displayedPath[index], to),
      }))
    : [];

  function resetVoicingChoice() {
    setInversion("root");
    setVoicingId(null);
    setOptimized(false);
    setOverrides({});
  }

  function audition(voice: TriadVoicing, asChord: boolean) {
    try {
      const context = audioRef.current ?? new AudioContext();
      audioRef.current = context;
      void context.resume();
      scheduleNotes(
        context,
        voice.midi,
        context.currentTime + 0.04,
        asChord ? 0 : 0.26,
        asChord ? 0.6 : 0.38,
      );
      setAudioMessage(
        `Played ${chordLabel(voice.chord)} as ${asChord ? "a chord" : "individual chord tones"}.`,
      );
    } catch {
      setAudioMessage("Audio is unavailable here; the exact sounding pitches remain visible.");
    }
  }
  function auditionProgression() {
    if (!hasCompletePath) return;
    try {
      const context = audioRef.current ?? new AudioContext();
      audioRef.current = context;
      void context.resume();
      const now = context.currentTime + 0.04;
      displayedPath.forEach((voice, index) => {
        scheduleNotes(context, voice.midi, now + index * 0.85, 0, 0.65);
      });
      setAudioMessage("Played the four harmonies in order; note movement is shown below.");
    } catch {
      setAudioMessage("Audio is unavailable here; the note movement table still works.");
    }
  }

  return (
    <div className="cv2-interactive cv2-chord-engine">
      <span className="cv2-eyebrow">Interactive guitar reference · draft</span>
      <h3>{mode === "inversions" ? "Chord inversion explorer" : "Voice-leading explorer"}</h3>
      <p>
        {mode === "inversions"
          ? "Choose a chord, tuning and three-string group. Compare playable root, first and second inversions by their actual lowest sounding chord tone."
          : "Compare real three-note guitar voicings and track how each string's sounding pitch moves when the harmony changes."}
      </p>
      <div className="cv2-chord-controls">
        {mode === "inversions" ? (
          <>
            <label>
              Root note
              <select
                aria-label="Chord root"
                value={root}
                onChange={(event) => {
                  setRoot(event.target.value as FretboardRoot);
                  resetVoicingChoice();
                }}
              >
                {CHROMATIC_ROOTS.map((note) => (
                  <option key={note} value={note}>
                    {note}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Chord quality
              <select
                aria-label="Chord quality"
                value={quality}
                onChange={(event) => {
                  setQuality(event.target.value as TriadQuality);
                  resetVoicingChoice();
                }}
              >
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </label>
          </>
        ) : (
          <label>
            Harmonic progression
            <select
              aria-label="Harmonic progression"
              value={progressionId}
              onChange={(event) => {
                setProgressionId(event.target.value as ProgressionId);
                setOptimized(false);
                setOverrides({});
              }}
            >
              {(Object.keys(VOICE_LEADING_PROGRESSIONS) as ProgressionId[]).map((id) => (
                <option key={id} value={id}>
                  {VOICE_LEADING_PROGRESSIONS[id].title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Guitar tuning
          <select
            aria-label="Chord guitar tuning"
            value={tuning}
            onChange={(event) => {
              setTuning(event.target.value as FretboardTuning);
              resetVoicingChoice();
            }}
          >
            {(Object.keys(TUNINGS) as FretboardTuning[]).map((id) => (
              <option key={id} value={id}>
                {TUNINGS[id].title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Three-string group
          <select
            aria-label="Three-string group"
            value={group}
            onChange={(event) => {
              setGroup(event.target.value as TriadStringGroup);
              resetVoicingChoice();
            }}
          >
            {groupOrder.map((id) => (
              <option key={id} value={id}>
                Strings {TRIAD_STRING_GROUPS[id].join("–")}
              </option>
            ))}
          </select>
        </label>
        {mode === "inversions" ? (
          <>
            <label>
              Inversion
              <select
                aria-label="Chord inversion"
                value={activeInversion ?? ""}
                disabled={!availableInversions.length}
                onChange={(event) => {
                  setInversion(event.target.value as TriadInversion);
                  setVoicingId(null);
                }}
              >
                {inversionOrder.map((id) => (
                  <option key={id} value={id} disabled={!availableInversions.includes(id)}>
                    {TRIAD_INVERSION_LABELS[id]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fretboard voicing
              <select
                aria-label="Chord voicing"
                value={selectedVoicing?.id ?? ""}
                disabled={!shownCandidates.length}
                onChange={(event) => setVoicingId(event.target.value)}
              >
                {shownCandidates.map((voicing) => (
                  <option key={voicing.id} value={voicing.id}>
                    {voicing.frets.map((fret) => (fret === 0 ? "open" : fret)).join(" / ")}
                    {" · "}
                    {voicing.notes.join("–")}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </div>

      {mode === "inversions" ? (
        <>
          <p className="cv2-chord-tone-line">
            Chord tones:{" "}
            {chordToneDefinitions(chord)
              .map((tone) => `${tone.spelledName} (${tone.tone})`)
              .join(" · ")}
          </p>
          {selectedVoicing ? (
            <div className="cv2-chord-diagrams">
              <VoicingCard voicing={selectedVoicing} onHear={audition} />
            </div>
          ) : (
            <p role="status">
              No playable three-string triad is available under the current fret-span limits. Try
              another group or tuning.
            </p>
          )}
          <div className="cv2-reference-detail" role="status">
            <strong>
              {selectedVoicing
                ? `${chordLabel(chord)} · ${TRIAD_INVERSION_LABELS[selectedVoicing.inversion]}`
                : "No verified voicing"}
            </strong>
            <p>
              {selectedVoicing
                ? `The lowest sounding tone is ${selectedVoicing.notes[0]} (${selectedVoicing.tones[0]}), which determines this triad's inversion. The root remains ${root}, even when another tone is the bass.`
                : "Unavailable selections do not generate invented shapes or imply a valid fingering."}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="cv2-chord-route-actions">
            <button
              type="button"
              disabled={!suggested.length}
              onClick={() => {
                setOptimized(true);
                setOverrides({});
              }}
            >
              Suggest smaller pitch movement
            </button>
            <button
              type="button"
              disabled={!suggested.length}
              onClick={() => {
                setOptimized(false);
                setOverrides({});
              }}
            >
              Restore lesson example
            </button>
            <button type="button" disabled={!hasCompletePath} onClick={auditionProgression}>
              Hear progression
            </button>
          </div>
          {hasCompletePath ? (
            <>
              <p className="cv2-chord-motion-total" role="status">
                Total three-voice movement: <strong>{totalMotion} semitones</strong>
                {suggestedMotion !== null
                  ? ` · Suggested low-motion path: ${suggestedMotion} semitones`
                  : ""}
              </p>
              <div className="cv2-chord-diagrams">
                {displayedPath.map((voicing, index) => (
                  <VoicingCard
                    key={`${index}:${voicing.chord.root}`}
                    voicing={voicing}
                    index={index}
                    candidates={progressionVoicings[index].slice(0, 40)}
                    onSelect={(id) => setOverrides((old) => ({ ...old, [index]: id }))}
                    onHear={audition}
                  />
                ))}
              </div>
              <div className="cv2-chord-motion-table-wrap">
                <table className="cv2-chord-motion-table">
                  <caption>Movement of the three corresponding guitar voices</caption>
                  <thead>
                    <tr>
                      <th scope="col">Chord change</th>
                      {TRIAD_STRING_GROUPS[group].map((number) => (
                        <th key={number} scope="col">
                          String {number}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={index}>
                        <th scope="row">
                          {line.fromChord} → {line.toChord}
                        </th>
                        {line.movement.map((item) => (
                          <td key={item.stringNumber}>
                            <strong>{motionLabel(item.semitones)}</strong>
                            <span>
                              {item.from} → {item.to}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="cv2-chord-instruction">
                Compare the exact semitones, not fret-number changes. This searches three-string
                triad voicings for smaller pitch movement; it does not grade performance, guarantee
                the easiest fingering, or determine the inversion of an added lower bass.
              </p>
            </>
          ) : (
            <p role="status">
              A complete four-chord voicing route is unavailable within the selected fret limits.
              Choose another tuning or string group.
            </p>
          )}
        </>
      )}
      <p className="cv2-chord-audio-status" role="status">
        {audioMessage}
      </p>
    </div>
  );
}
