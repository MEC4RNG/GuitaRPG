"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  CHROMATIC_ROOTS,
  INTERVALS,
  SCALE_PATTERNS,
  TUNINGS,
  formatSoundingPitch,
  intervalTarget,
  mod12,
  positionsForTuning,
  preferredIntervalAnchor,
  rootForPitchClass,
  rootPitchClass,
  scaleDegrees,
  type FretboardInterval,
  type FretboardPosition,
  type FretboardRoot,
  type FretboardScale,
  type FretboardTuning,
} from "@/lib/codex/v2/fretboard-engine";

export type FretboardLearningMode = "note_location" | "scale_mapping" | "interval_recognition";
const strings = [1, 2, 3, 4, 5, 6] as const;
const frets = Array.from({ length: 13 }, (_, fret) => fret);
const titles: Record<FretboardLearningMode, string> = {
  note_location: "Find every occurrence of a note",
  scale_mapping: "Map a scale and explore its degrees",
  interval_recognition: "Explore ascending intervals on the fretboard",
};
const instructions: Record<FretboardLearningMode, string> = {
  note_location: "Choose a pitch class or select any fret. All matching notes in the visible 0–12 fret range light up, with their sounding octaves.",
  scale_mapping: "Choose the tonic and scale. Select a highlighted position to inspect its degree; every note uses the correct pitch spelling in that scale.",
  interval_recognition: "Choose the reference note and ascending interval, then select a root position. Only exact sounding destinations in the current fret range are highlighted.",
};

function playPitch(reference: { current: AudioContext | null }, midi: number) {
  try {
    const context = reference.current ?? new AudioContext();
    reference.current = context;
    void context.resume();
    const start = context.currentTime + 0.02;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.13, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.36);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.4);
  } catch {
    // All note names and fret positions remain usable without Web Audio support.
  }
}

function locationText(position: FretboardPosition) {
  return `string ${position.stringNumber}, ${position.fret === 0 ? "open" : `fret ${position.fret}`}`;
}

export function CodexV2Fretboard({ mode }: { mode: FretboardLearningMode }) {
  const [tuning, setTuning] = useState<FretboardTuning>("standard");
  const [root, setRoot] = useState<FretboardRoot>("C");
  const [scale, setScale] = useState<FretboardScale>("major");
  const [interval, setInterval] = useState<FretboardInterval>("M3");
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [selectedDegree, setSelectedDegree] = useState<number | null>(1);
  const [inspected, setInspected] = useState<FretboardPosition | null>(null);
  const [focusCell, setFocusCell] = useState("s2-f1");
  const audioRef = useRef<AudioContext | null>(null);
  useEffect(
    () => () => {
      if (audioRef.current) void audioRef.current.close();
    },
    [],
  );

  const positions = useMemo(() => positionsForTuning(tuning, 12), [tuning]);
  const lookup = useMemo(
    () => new Map(positions.map((position) => [position.id, position])),
    [positions],
  );
  const notesInScale = useMemo(() => scaleDegrees(root, scale), [root, scale]);
  const scaleByPitchClass = useMemo(
    () => new Map(notesInScale.map((degree) => [degree.pitchClass, degree])),
    [notesInScale],
  );
  const degreeNotes = notesInScale.map((degree) => degree.name).join(" · ");
  const currentInterval = intervalTarget(root, interval);
  const rootPositions = positions.filter((position) => position.pitchClass === rootPitchClass(root));
  const suggestedAnchor = preferredIntervalAnchor(positions, root, interval);
  const anchorCandidate = anchorId ? lookup.get(anchorId) : null;
  const anchor =
    anchorCandidate?.pitchClass === rootPitchClass(root) ? anchorCandidate : suggestedAnchor;
  const destinationMidi = anchor ? anchor.midi + currentInterval.semitones : null;
  const destinations =
    destinationMidi === null
      ? []
      : positions.filter((position) => position.midi === destinationMidi);
  const destinationIds = new Set(destinations.map((position) => position.id));
  const rootCount = rootPositions.length;

  const selectedNoteName =
    inspected && mode !== "interval_recognition"
      ? (mode === "scale_mapping"
          ? scaleByPitchClass.get(inspected.pitchClass)?.name
          : rootPitchClass(root) === inspected.pitchClass
            ? root
            : undefined) ?? rootForPitchClass(inspected.pitchClass)
      : null;
  const inspectedLabel =
    inspected && selectedNoteName
      ? formatSoundingPitch(inspected.midi, selectedNoteName)
      : null;
  const chosenDegree =
    selectedDegree === null
      ? null
      : (notesInScale.find((degree) => degree.degree === selectedDegree) ?? null);

  function updateRoot(next: FretboardRoot) {
    setRoot(next);
    setAnchorId(null);
    setSelectedDegree(1);
    setInspected(null);
  }

  function choose(position: FretboardPosition) {
    setFocusCell(position.id);
    playPitch(audioRef, position.midi);
    if (mode === "interval_recognition") {
      if (position.pitchClass === rootPitchClass(root)) {
        setAnchorId(position.id);
      } else if (!destinationIds.has(position.id)) {
        updateRoot(rootForPitchClass(position.pitchClass));
        setAnchorId(position.id);
      }
      return;
    }
    if (mode === "note_location" && position.pitchClass !== rootPitchClass(root)) {
      updateRoot(rootForPitchClass(position.pitchClass));
    }
    if (mode === "scale_mapping") {
      setSelectedDegree(scaleByPitchClass.get(position.pitchClass)?.degree ?? null);
    }
    setInspected(position);
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLButtonElement>, position: FretboardPosition) {
    let nextString = position.stringNumber;
    let nextFret = position.fret;
    if (event.key === "ArrowRight") nextFret = Math.min(12, nextFret + 1);
    else if (event.key === "ArrowLeft") nextFret = Math.max(0, nextFret - 1);
    else if (event.key === "ArrowDown") nextString = Math.min(6, nextString + 1);
    else if (event.key === "ArrowUp") nextString = Math.max(1, nextString - 1);
    else if (event.key === "Home") nextFret = 0;
    else if (event.key === "End") nextFret = 12;
    else return;
    event.preventDefault();
    const targetId = `s${nextString}-f${nextFret}`;
    setFocusCell(targetId);
    event.currentTarget
      .closest(".cv2-fretboard-scroll")
      ?.querySelector<HTMLButtonElement>(`[data-fret-position="${targetId}"]`)
      ?.focus();
  }

  function cellPresentation(position: FretboardPosition) {
    const named = rootForPitchClass(position.pitchClass);
    const highlight =
      mode === "note_location"
        ? position.pitchClass === rootPitchClass(root)
        : mode === "scale_mapping"
          ? scaleByPitchClass.has(position.pitchClass)
          : position.id === anchor?.id ||
            position.pitchClass === rootPitchClass(root) ||
            destinationIds.has(position.id);
    const degree = scaleByPitchClass.get(position.pitchClass);
    let noteName = named;
    let mark = "";
    let variant = "";
    if (mode === "note_location" && highlight) {
      noteName = root;
      mark = formatSoundingPitch(position.midi, root);
      variant = "is-highlight";
    } else if (mode === "scale_mapping" && degree) {
      noteName = rootForPitchClass(position.pitchClass);
      mark = `${degree.degree}`;
      variant = degree.degree === selectedDegree ? "is-selected-degree" : "is-scale-degree";
    } else if (mode === "interval_recognition") {
      if (position.id === anchor?.id) {
        mark = root;
        variant = "is-anchor";
      } else if (destinationIds.has(position.id)) {
        mark = currentInterval.targetName;
        variant = "is-destination";
      } else if (position.pitchClass === rootPitchClass(root)) {
        mark = root;
        variant = "is-alternate-root";
      }
      if (position.pitchClass === rootPitchClass(root)) noteName = root;
    }
    const pitchForLabel =
      mode === "scale_mapping" && degree
        ? formatSoundingPitch(position.midi, degree.name)
        : mode === "interval_recognition" && destinationIds.has(position.id)
          ? formatSoundingPitch(position.midi, currentInterval.targetName)
          : formatSoundingPitch(position.midi, noteName);
    return {
      mark,
      variant,
      highlight,
      ariaLabel: `String ${position.stringNumber}, ${position.fret === 0 ? "open string" : `fret ${position.fret}`}, ${pitchForLabel}${mode === "scale_mapping" && degree ? `, scale degree ${degree.degree}` : ""}${mode === "interval_recognition" && position.id === anchor?.id ? ", current interval reference" : ""}${mode === "interval_recognition" && destinationIds.has(position.id) ? ", exact interval destination" : ""}`,
    };
  }

  const detail =
    mode === "note_location"
      ? `${root} occurs at ${rootCount} positions from frets 0–12 in ${TUNINGS[tuning].title}.`
      : mode === "scale_mapping"
        ? chosenDegree
          ? `Degree ${chosenDegree.degree}: ${chosenDegree.name} · ${chosenDegree.semitones} semitones above ${root}. ${inspectedLabel ? `Selected ${inspectedLabel} at ${locationText(inspected!)}.` : "Select a fretboard note to hear it."}`
          : `${inspectedLabel ?? "This note"} is outside the ${root} ${SCALE_PATTERNS[scale].name.toLowerCase()} scale. Select a highlighted degree to return.`
        : anchor
          ? `${formatSoundingPitch(anchor.midi, root)} + ${currentInterval.label.toLowerCase()} (${currentInterval.semitones} semitones) = ${formatSoundingPitch(anchor.midi + currentInterval.semitones, currentInterval.targetName)}. ${destinations.length} exact destination ${destinations.length === 1 ? "position" : "positions"} visible.`
          : "No reference pitch is available in the current range.";

  return (
    <div className="cv2-interactive cv2-fretboard-interactive">
      <span className="cv2-eyebrow">Interactive guitar reference · draft</span>
      <h3>{titles[mode]}</h3>
      <p>{instructions[mode]}</p>

      <div className="cv2-fretboard-controls">
        <label>
          {mode === "interval_recognition" ? "Reference note" : mode === "scale_mapping" ? "Tonic" : "Find note"}
          <select
            aria-label={mode === "interval_recognition" ? "Reference note" : mode === "scale_mapping" ? "Tonic" : "Find note"}
            value={root}
            onChange={(event) => updateRoot(event.target.value as FretboardRoot)}
          >
            {CHROMATIC_ROOTS.map((note) => (
              <option key={note} value={note}>{note}</option>
            ))}
          </select>
        </label>
        <label>
          Guitar tuning
          <select
            aria-label="Guitar tuning"
            value={tuning}
            onChange={(event) => {
              setTuning(event.target.value as FretboardTuning);
              setAnchorId(null);
              setInspected(null);
            }}
          >
            {(Object.keys(TUNINGS) as FretboardTuning[]).map((id) => (
              <option key={id} value={id}>{TUNINGS[id].title}</option>
            ))}
          </select>
        </label>
        {mode === "scale_mapping" ? (
          <label>
            Scale type
            <select
              aria-label="Scale type"
              value={scale}
              onChange={(event) => {
                setScale(event.target.value as FretboardScale);
                setSelectedDegree(1);
                setInspected(null);
              }}
            >
              {(Object.keys(SCALE_PATTERNS) as FretboardScale[]).map((id) => (
                <option key={id} value={id}>{SCALE_PATTERNS[id].name}</option>
              ))}
            </select>
          </label>
        ) : null}
        {mode === "interval_recognition" ? (
          <label>
            Ascending interval
            <select
              aria-label="Ascending interval"
              value={interval}
              onChange={(event) => {
                setInterval(event.target.value as FretboardInterval);
                setAnchorId(null);
              }}
            >
              {INTERVALS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {mode === "scale_mapping" ? (
        <p className="cv2-fretboard-degree-line" aria-label="Spelled scale degrees">
          {degreeNotes}
        </p>
      ) : null}
      <p className="cv2-fretboard-scroll-help">
        Frets 0–12 · horizontal scrolling on narrow screens · arrow keys move between positions;
        Enter or Space selects a note.
      </p>
      <div className="cv2-fretboard-scroll" role="region" aria-label="Scrollable guitar fretboard, frets 0 through 12" tabIndex={0}>
        <table className="cv2-fretboard-table" aria-label={`${TUNINGS[tuning].title} fretboard, strings 1 through 6`}>
          <thead>
            <tr>
              <th scope="col">String</th>
              {frets.map((fret) => (
                <th key={fret} scope="col">{fret === 0 ? "Open" : fret}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {strings.map((stringNumber) => {
              const openMidi = TUNINGS[tuning].openLowToHigh[6 - stringNumber];
              const openPitchName = formatSoundingPitch(
                openMidi,
                rootForPitchClass(mod12(openMidi)),
              );
              return (
                <tr key={stringNumber}>
                  <th scope="row">{stringNumber} · {openPitchName}</th>
                  {frets.map((fret) => {
                    const position = lookup.get(`s${stringNumber}-f${fret}`)!;
                    const view = cellPresentation(position);
                    return (
                      <td key={fret}>
                        <button
                          type="button"
                          data-fret-position={position.id}
                          className={`cv2-fretboard-cell ${view.variant}`}
                          aria-label={view.ariaLabel}
                          aria-pressed={mode === "interval_recognition"
                            ? position.id === anchor?.id
                            : mode === "note_location"
                              ? view.highlight
                              : inspected?.id === position.id}
                          tabIndex={focusCell === position.id ? 0 : -1}
                          onKeyDown={(event) => handleGridKeyDown(event, position)}
                          onClick={() => choose(position)}
                        >
                          {view.mark || "·"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="cv2-fretboard-legend" aria-label="Fretboard legend">
        {mode === "interval_recognition" ? (
          <>
            <span><i className="cv2-fretboard-swatch is-anchor" /> Chosen reference</span>
            <span><i className="cv2-fretboard-swatch is-destination" /> Exact higher note</span>
            <span><i className="cv2-fretboard-swatch is-alternate-root" /> Other reference positions</span>
          </>
        ) : mode === "scale_mapping" ? (
          <>
            <span><i className="cv2-fretboard-swatch is-scale-degree" /> Scale note</span>
            <span><i className="cv2-fretboard-swatch is-selected-degree" /> Selected degree</span>
          </>
        ) : (
          <span><i className="cv2-fretboard-swatch is-highlight" /> Matching sounding note</span>
        )}
      </div>
      <div className="cv2-reference-detail" role="status" aria-live="polite">
        <strong>{detail}</strong>
        {mode === "interval_recognition" ? (
          <p>
            {destinations.length
              ? `Visible destinations: ${destinations.map(locationText).join(" · ")}. The interval is measured upward from the specific selected root, not from every note sharing its letter.`
              : "No exact higher destination appears between frets 0–12 for this selected position. Choose another highlighted reference position."}
          </p>
        ) : mode === "scale_mapping" ? (
          <p>
            {inspectedLabel
              ? `Sounding pitch: ${inspectedLabel}. The selected string/fret, scale degree and note name describe different things.`
              : "Choose any highlighted scale degree to hear its sounding pitch and inspect its interval from the tonic."}
          </p>
        ) : (
          <p>
            {inspectedLabel
              ? `Selected ${inspectedLabel} on ${locationText(inspected!)}.`
              : "All matching dots indicate the same pitch class. Their octave numbers distinguish different sounding registers."}
          </p>
        )}
      </div>
      <p className="cv2-fretboard-note">
        Reference only: a highlighted fret is a sounding pitch, not prescribed fingering or
        automatic practice evidence. Audio starts only when you select a position.
      </p>
    </div>
  );
}
