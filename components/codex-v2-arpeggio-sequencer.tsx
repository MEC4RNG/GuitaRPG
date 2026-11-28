"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ARPEGGIO_PRESETS,
  ARPEGGIO_SUBDIVISIONS,
  stepCountForSubdivision,
  type ArpeggioPreset,
  type ArpeggioSubdivision,
} from "@/lib/codex/v2/arpeggio-sequencer";
import {
  ARPEGGIO_CHORDS,
  arpeggioTones,
  arpeggioPositions,
  arpeggioVoicings,
  buildExpandedBar,
  expandedPattern,
  type ArpeggioQuality,
  type ExpandedBar,
} from "@/lib/codex/v2/expanded-arpeggios";
import {
  CHROMATIC_ROOTS,
  TUNINGS,
  type FretboardRoot,
  type FretboardTuning,
} from "@/lib/codex/v2/fretboard-engine";

const groups: Record<string, number[]> = {
  "1-3": [3, 2, 1],
  "2-4": [4, 3, 2],
  "3-5": [5, 4, 3],
  "4-6": [6, 5, 4],
  "1-4": [4, 3, 2, 1],
  "2-5": [5, 4, 3, 2],
  "3-6": [6, 5, 4, 3],
  all: [6, 5, 4, 3, 2, 1],
};
const inversions = ["root", "first", "second", "third"];
const inversionLabels = ["Root position", "First inversion", "Second inversion", "Third inversion"];
const subdivisionOptions = Object.keys(ARPEGGIO_SUBDIVISIONS) as ArpeggioSubdivision[];
const presetOptions = Object.keys(ARPEGGIO_PRESETS) as ArpeggioPreset[];
const ranges = ["0-12", "0-5", "5-9", "9-15", "12-17", "12-24", "0-24"];

type AudioRun = {
  context: AudioContext;
  output: GainNode;
  bar: ExpandedBar;
  start: number;
  nextIndex: number;
  repeat: boolean;
  timer: number;
};

/** One-bar chord-tone sequence editor, independent of Quest and Player persistence. */
export function CodexV2ArpeggioSequencer() {
  const [root, setRoot] = useState<FretboardRoot>("C");
  const [quality, setQuality] = useState<ArpeggioQuality>("major");
  const [tuning, setTuning] = useState<FretboardTuning>("standard");
  const [mode, setMode] = useState<"voicing" | "fretboard">("voicing");
  const [strings, setStrings] = useState<number[]>(groups["1-3"]);
  const [range, setRange] = useState("0-12");
  const [inversion, setInversion] = useState(0);
  const [voicingId, setVoicingId] = useState<string | null>(null);
  const [subdivision, setSubdivision] = useState<ArpeggioSubdivision>("quarter");
  const [preset, setPreset] = useState<ArpeggioPreset | "custom">("arch");
  const [custom, setCustom] = useState<string[]>([]);
  const [targetStep, setTargetStep] = useState(0);
  const [bpm, setBpm] = useState(80);
  const [bpmDraft, setBpmDraft] = useState("80");
  const tempoHelpId = useId();
  const stepHelpId = useId();
  const draftBpmNumber = Number(bpmDraft);
  const validBpmDraft =
    bpmDraft.trim() !== "" &&
    Number.isInteger(draftBpmNumber) &&
    draftBpmNumber >= 40 &&
    draftBpmNumber <= 200;
  const [loop, setLoop] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [audioStatus, setAudioStatus] = useState(
    "Ready. Audio plays only when you select Play bar.",
  );
  const contextRef = useRef<AudioContext | null>(null);
  const runRef = useRef<AudioRun | null>(null);
  const generationRef = useRef(0);

  useEffect(
    () => () => {
      generationRef.current++;
      const run = runRef.current;
      if (run) {
        window.clearInterval(run.timer);
        run.output.gain.setValueAtTime(0, run.context.currentTime);
        run.output.disconnect();
        runRef.current = null;
      }
      if (contextRef.current) void contextRef.current.close();
    },
    [],
  );

  const [minFret, maxFret] = range.split("-").map(Number);
  const group =
    Object.keys(groups).find(
      (key) =>
        groups[key].length === strings.length && groups[key].every((s) => strings.includes(s)),
    ) ?? "custom";
  const tones = useMemo(() => arpeggioTones(root, quality), [root, quality]);
  const positions = useMemo(
    () => arpeggioPositions(root, quality, tuning, strings, minFret, maxFret),
    [root, quality, tuning, strings, minFret, maxFret],
  );
  const choices = useMemo(
    () => (mode === "voicing" ? arpeggioVoicings(positions, quality) : []),
    [mode, positions, quality],
  );
  const availableInversions = inversions
    .map((_, i) => i)
    .filter((i) => choices.some((c) => c.inversion === i));
  const activeInversion = availableInversions.includes(inversion)
    ? inversion
    : availableInversions[0];
  const availableVoicings = choices.filter((c) => c.inversion === activeInversion);
  const selectedVoicing =
    availableVoicings.find((c) => c.id === voicingId) ?? availableVoicings[0] ?? null;
  const source = mode === "voicing" ? (selectedVoicing?.positions ?? []) : positions;
  const stepOptions = tones.filter((t) => source.some((p) => p.role === t.role));
  const pattern =
    preset === "custom" ? custom : expandedPattern(subdivision, preset, quality, source);
  const bar = buildExpandedBar(source, subdivision, bpm, pattern);
  const soundingEvents = bar.events.filter((event) => event.midi !== null).length;
  const frets = Array.from({ length: maxFret - minFret + 1 }, (_, i) => minFret + i);

  function stopPlayback(message?: string) {
    generationRef.current++;
    const run = runRef.current;
    if (run) {
      window.clearInterval(run.timer);
      run.output.gain.cancelScheduledValues(run.context.currentTime);
      run.output.gain.setValueAtTime(0, run.context.currentTime);
      run.output.disconnect();
      runRef.current = null;
    }
    setPlaying(false);
    setActiveStep(null);
    if (message) setAudioStatus(message);
  }

  function resetPattern() {
    setPreset((previous) => (previous === "custom" ? "arch" : previous));
    setCustom([]);
  }
  function resetChord(next: () => void) {
    stopPlayback("Stopped. Source changed; custom note edits reset to a preset.");
    setInversion(0);
    setVoicingId(null);
    resetPattern();
    next();
  }
  function resetRhythm(next: ArpeggioSubdivision) {
    stopPlayback("Stopped. The rhythmic grid has changed.");
    resetPattern();
    setSubdivision(next);
    setTargetStep(0);
  }
  function selectPreset(value: ArpeggioPreset | "custom") {
    stopPlayback("Stopped. Choose Play bar to hear the updated pattern.");
    if (value === "custom") setCustom([...pattern]);
    setPreset(value);
  }
  function editStep(index: number, tone: string) {
    stopPlayback("Stopped. Your note-order edit is ready to play.");
    setCustom(pattern.map((item, position) => (position === index ? tone : item)));
    setPreset("custom");
  }

  function playTone(run: AudioRun, midi: number, when: number, duration: number) {
    const oscillator = run.context.createOscillator();
    const envelope = run.context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(0.12, when + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(envelope);
    envelope.connect(run.output);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.01);
  }

  async function startPlayback() {
    stopPlayback();
    if (!bar || !soundingEvents) {
      setAudioStatus("There are no sounding steps to play. Add a chord tone to the pattern.");
      return;
    }
    const requestId = generationRef.current;
    try {
      const context = contextRef.current ?? new AudioContext();
      contextRef.current = context;
      await context.resume();
      if (generationRef.current !== requestId) return;
      if (context.state !== "running") throw new Error("Audio did not start");

      const output = context.createGain();
      output.gain.value = 0.72;
      output.connect(context.destination);
      const run: AudioRun = {
        context,
        output,
        bar,
        start: context.currentTime + 0.07,
        nextIndex: 0,
        repeat: loop,
        timer: 0,
      };
      runRef.current = run;
      const tick = () => {
        if (runRef.current !== run) return;
        const now = run.context.currentTime;
        const horizon = now + 0.13;
        const totalSteps = run.bar.events.length;
        let scheduled = 0;

        while ((run.repeat || run.nextIndex < totalSteps) && scheduled < 24) {
          const index = run.nextIndex % totalSteps;
          const cycle = Math.floor(run.nextIndex / totalSteps);
          const note = run.bar.events[index];
          const when = run.start + cycle * run.bar.durationSeconds + note.startSeconds;
          if (when > horizon) break;
          if (note.midi !== null && when >= now - 0.02) {
            playTone(run, note.midi, Math.max(now + 0.005, when), note.durationSeconds);
          }
          run.nextIndex++;
          scheduled++;
        }
        const elapsed = now - run.start;
        if (elapsed >= 0) {
          if (!run.repeat && elapsed >= run.bar.durationSeconds) {
            stopPlayback("Completed one 4/4 bar.");
          } else {
            const position = (elapsed % run.bar.durationSeconds) / run.bar.stepSeconds;
            setActiveStep(Math.min(totalSteps - 1, Math.floor(position)));
          }
        }
      };
      run.timer = window.setInterval(tick, 30);
      tick();
      setPlaying(true);
      setAudioStatus(
        loop ? "Playing the 4/4 bar repeatedly. Press Stop to finish." : "Playing one 4/4 bar.",
      );
    } catch {
      setPlaying(false);
      setActiveStep(null);
      setAudioStatus(
        "Audio is unavailable in this browser. The note and rhythm grid remains usable.",
      );
    }
  }

  return (
    <div className="cv2-interactive cv2-arpeggio-engine">
      <span className="cv2-eyebrow">Interactive musical reference · draft</span>
      <h3>Arpeggio sequencer · one bar in 4/4</h3>
      <p>
        Choose a compact chord shape or explore chord tones across the fretboard. Every sounding
        step resolves to a real string, fret and octave.
      </p>
      <div className="cv2-arpeggio-controls">
        <label>
          Source mode
          <select
            aria-label="Arpeggio source mode"
            value={mode}
            onChange={(event) =>
              resetChord(() => {
                const next = event.target.value as typeof mode;
                setMode(next);
                if (next === "fretboard") setStrings(groups.all);
              })
            }
          >
            <option value="voicing">Voicing · compact shape</option>
            <option value="fretboard">Fretboard · free movement</option>
          </select>
        </label>
        <label>
          Chord root
          <select
            aria-label="Arpeggio root"
            value={root}
            onChange={(event) => resetChord(() => setRoot(event.target.value as FretboardRoot))}
          >
            {CHROMATIC_ROOTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quality
          <select
            aria-label="Arpeggio quality"
            value={quality}
            onChange={(event) =>
              resetChord(() => {
                const next = event.target.value as ArpeggioQuality;
                setQuality(next);
                if (mode === "voicing" && strings.length < ARPEGGIO_CHORDS[next].tones.length)
                  setStrings(groups.all);
              })
            }
          >
            {(Object.keys(ARPEGGIO_CHORDS) as ArpeggioQuality[]).map((item) => (
              <option key={item} value={item}>
                {ARPEGGIO_CHORDS[item].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tuning
          <select
            aria-label="Arpeggio tuning"
            value={tuning}
            onChange={(event) => resetChord(() => setTuning(event.target.value as FretboardTuning))}
          >
            {(Object.keys(TUNINGS) as FretboardTuning[]).map((item) => (
              <option key={item} value={item}>
                {TUNINGS[item].title}
              </option>
            ))}
          </select>
        </label>
        <label>
          String set
          <select
            aria-label="Arpeggio string group"
            value={group}
            onChange={(event) =>
              resetChord(() => setStrings(groups[event.target.value] ?? strings))
            }
          >
            {Object.keys(groups).map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All six strings" : "Strings " + item}
              </option>
            ))}
            <option value="custom" disabled>
              Custom strings
            </option>
          </select>
        </label>
        <label>
          Fret range
          <select
            aria-label="Arpeggio fret range"
            value={range}
            onChange={(event) => resetChord(() => setRange(event.target.value))}
          >
            {ranges.map((item) => (
              <option key={item} value={item}>
                Frets {item}
              </option>
            ))}
          </select>
        </label>
        {mode === "voicing" && (
          <>
            <label>
              Inversion (bass tone)
              <select
                aria-label="Arpeggio inversion"
                value={activeInversion === undefined ? "" : inversions[activeInversion]}
                disabled={!availableInversions.length}
                onChange={(event) => {
                  stopPlayback("Stopped. Inversion changed.");
                  resetPattern();
                  setInversion(inversions.indexOf(event.target.value));
                  setVoicingId(null);
                }}
              >
                {!availableInversions.length && <option value="">Unavailable</option>}
                {inversions.slice(0, tones.length).map((item, i) => (
                  <option key={item} value={item} disabled={!availableInversions.includes(i)}>
                    {inversionLabels[i]} · {tones[i].degree}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Voicing
              <select
                aria-label="Arpeggio voicing"
                value={selectedVoicing?.id ?? ""}
                disabled={!selectedVoicing}
                onChange={(event) => {
                  stopPlayback("Stopped. Voicing changed.");
                  resetPattern();
                  setVoicingId(event.target.value);
                }}
              >
                {!selectedVoicing && <option value="">Unavailable</option>}
                {availableVoicings.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.positions.map((p) => p.stringNumber + ":" + p.fret).join(" / ")} ·{" "}
                    {item.positions.map((p) => p.note).join("–")}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      <fieldset className="cv2-arpeggio-strings">
        <legend>Active strings · low to high</legend>
        <div className="cv2-arpeggio-playback">
          {[6, 5, 4, 3, 2, 1].map((s) => (
            <button
              type="button"
              key={s}
              aria-label={"String " + s}
              aria-pressed={strings.includes(s)}
              onClick={() =>
                resetChord(() =>
                  setStrings((old) => (old.includes(s) ? old.filter((x) => x !== s) : [...old, s])),
                )
              }
            >
              {s}
            </button>
          ))}
        </div>
        <small>
          {mode === "voicing"
            ? "Allowed strings; the shape uses one string per chord tone. Choosing a four-tone chord with too few strings enables all six."
            : "Select any combination, even one string. Multiple frets on a string are allowed."}
        </small>
      </fieldset>
      <div className="cv2-arpeggio-source">
        <div>
          <h4>
            {root}
            {ARPEGGIO_CHORDS[quality].suffix} · {ARPEGGIO_CHORDS[quality].label}
          </h4>
          <p>{tones.map((t) => t.degree + " " + t.name).join(" · ")}</p>
          {selectedVoicing && mode === "voicing" && (
            <p>
              {inversionLabels[selectedVoicing.inversion]} ·{" "}
              {selectedVoicing.positions.map((p) => p.note).join(" · ")} · strings{" "}
              {selectedVoicing.positions.map((p) => p.stringNumber).join("–")}, frets{" "}
              {selectedVoicing.positions.map((p) => p.fret || "open").join("–")}
            </p>
          )}
          {!source.length && (
            <p role="status">
              No available {mode === "voicing" ? "complete compact voicing" : "chord tones"} in this
              selection. Broaden the strings or fret range, or use Fretboard mode.
            </p>
          )}
          {mode === "fretboard" && (
            <p>
              {source.length} positions · degree choices use the lowest available pitch; exact
              positions can span octaves.
            </p>
          )}
        </div>
        <div className="cv2-arpeggio-controls">
          <label>
            Assign fretboard note to step
            <select
              aria-label="Arpeggio target step"
              aria-describedby={stepHelpId}
              value={targetStep}
              onChange={(event) => setTargetStep(Number(event.target.value))}
            >
              {Array.from({ length: stepCountForSubdivision(subdivision) }, (_, i) => (
                <option key={i} value={i}>
                  Step {i + 1}
                </option>
              ))}
            </select>
            <small id={stepHelpId}>
              Choose a step, then click a highlighted note on the fretboard below to replace that
              step with its exact string and fret. The selector advances automatically, so you can
              build a sequence by clicking notes in order. The rhythm grid and tablature update
              together.
            </small>
          </label>
        </div>
      </div>
      <div
        className="cv2-fretboard-scroll"
        role="region"
        tabIndex={0}
        aria-label="Arpeggio fretboard, horizontally scrollable"
      >
        <table
          className="cv2-fretboard-table cv2-arpeggio-fretboard"
          style={{ minWidth: Math.max(280, frets.length * 48 + 80) }}
        >
          <thead>
            <tr>
              <th scope="col">String</th>
              {frets.map((f) => (
                <th key={f} scope="col">
                  {f === 0 ? "Open" : f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <tr key={s}>
                <th scope="row">{s}</th>
                {frets.map((f) => {
                  const p = source.find((p) => p.stringNumber === s && p.fret === f);
                  const sounding =
                    activeStep !== null &&
                    bar.events[activeStep]?.stringNumber === s &&
                    bar.events[activeStep]?.fret === f;
                  return (
                    <td key={f}>
                      {p ? (
                        <button
                          type="button"
                          className={
                            "cv2-fretboard-cell " +
                            (sounding
                              ? "is-highlight"
                              : p.role === "root"
                                ? "is-alternate-root"
                                : "is-scale-degree")
                          }
                          aria-label={
                            "Assign " +
                            p.note +
                            ", degree " +
                            p.degree +
                            ", string " +
                            s +
                            ", fret " +
                            f
                          }
                          onClick={() => {
                            editStep(targetStep, p.id);
                            setTargetStep((targetStep + 1) % pattern.length);
                          }}
                        >
                          {p.degree}
                          <small>{p.note}</small>
                        </button>
                      ) : (
                        <span className="cv2-arpeggio-empty-cell" aria-hidden="true">
                          ·
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cv2-arpeggio-controls cv2-arpeggio-rhythm-controls">
        <label>
          Subdivision
          <select
            aria-label="Arpeggio subdivision"
            value={subdivision}
            onChange={(event) => resetRhythm(event.target.value as ArpeggioSubdivision)}
          >
            {subdivisionOptions.map((item) => (
              <option key={item} value={item}>
                {ARPEGGIO_SUBDIVISIONS[item].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Note order preset
          <select
            aria-label="Arpeggio preset"
            value={preset}
            onChange={(event) => selectPreset(event.target.value as ArpeggioPreset | "custom")}
          >
            {presetOptions.map((item) => (
              <option key={item} value={item}>
                {item === "ascending"
                  ? "Chord degrees ascending"
                  : item === "descending"
                    ? "Chord degrees descending"
                    : item === "arch"
                      ? tones.length > 3
                        ? "All four chord tones"
                        : "Root → middle → fifth → middle"
                      : ARPEGGIO_PRESETS[item].title}
              </option>
            ))}
            <option value="custom">Custom edited notes</option>
          </select>
        </label>
        <label>
          Tempo · quarter-note BPM
          <input
            type="number"
            min={40}
            max={200}
            step={1}
            aria-label="Arpeggio tempo BPM"
            inputMode="numeric"
            value={bpmDraft}
            aria-invalid={!validBpmDraft}
            aria-describedby={tempoHelpId}
            onChange={(event) => {
              const draft = event.target.value;
              setBpmDraft(draft);
              stopPlayback("Stopped. Tempo editing.");
              const value = Number(draft);
              if (draft.trim() !== "" && Number.isInteger(value) && value >= 40 && value <= 200) {
                setBpm(value);
              }
            }}
            onBlur={() => {
              setBpmDraft(String(bpm));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
          <small id={tempoHelpId}>
            {validBpmDraft
              ? "40–200 BPM"
              : "Enter a whole number from 40–200. Leaving the field restores the last valid tempo."}
          </small>
        </label>
      </div>

      <div className="cv2-arpeggio-heading">
        <strong>Four beats · {bar?.events.length ?? 0} subdivisions</strong>
        <span>Each attack can use a chord degree, exact string/fret position, or rest.</span>
      </div>
      <div className="cv2-arpeggio-beats" aria-label="Editable arpeggio rhythm grid">
        {Array.from({ length: 4 }, (_, beatIndex) => (
          <div className="cv2-arpeggio-beat" key={beatIndex}>
            <strong>Beat {beatIndex + 1}</strong>
            <div className="cv2-arpeggio-parts">
              {bar?.events
                .filter((event) => event.beat === beatIndex + 1)
                .map((event) => (
                  <label
                    key={event.index}
                    className={activeStep === event.index ? "is-active" : ""}
                  >
                    <span className="cv2-arpeggio-count">{event.count}</span>
                    <select
                      aria-label={`Beat ${event.beat}, part ${event.part}`}
                      value={event.tone}
                      onChange={(change) => editStep(event.index, change.target.value)}
                    >
                      <option value="rest">Rest</option>
                      <optgroup label="Chord degrees">
                        {stepOptions.map((t) => (
                          <option key={t.role} value={t.role}>
                            {t.degree} · {t.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Exact pitch and fret">
                        {source.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.note} · {p.stringNumber}:{p.fret}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <span className="cv2-arpeggio-note">
                      {event.note ?? "Silence"}
                      {event.stringNumber !== null && (
                        <>
                          {" "}
                          · {event.stringNumber}:{event.fret}
                        </>
                      )}
                    </span>
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="cv2-arpeggio-heading">
        <strong>Sequence tablature</strong>
        <span>String 1 at top · sounding fret numbers</span>
      </div>
      <div
        className="cv2-fretboard-scroll"
        role="region"
        tabIndex={0}
        aria-label="Sequence tablature, horizontally scrollable"
      >
        <table
          className="cv2-arpeggio-tab"
          style={{ minWidth: Math.max(300, bar.events.length * 38 + 52) }}
          aria-label="Arpeggio sequence tablature"
        >
          <thead>
            <tr>
              <th scope="col">String</th>
              {bar.events.map((e) => (
                <th
                  key={e.index}
                  scope="col"
                  className={activeStep === e.index ? "is-active" : undefined}
                >
                  {e.count}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <tr key={s}>
                <th scope="row">{s}</th>
                {bar.events.map((e) => (
                  <td key={e.index} className={activeStep === e.index ? "is-active" : undefined}>
                    {e.stringNumber === s ? e.fret : "–"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cv2-arpeggio-playback">
        <button
          type="button"
          disabled={!soundingEvents || playing}
          onClick={() => void startPlayback()}
        >
          ▶ Play bar
        </button>
        <button type="button" disabled={!playing} onClick={() => stopPlayback("Stopped.")}>
          ■ Stop
        </button>
        <label>
          <input
            type="checkbox"
            checked={loop}
            onChange={(event) => {
              stopPlayback("Playback reset. The repeat setting has changed.");
              setLoop(event.target.checked);
            }}
          />
          Repeat bar until stopped
        </label>
      </div>
      <div className="cv2-reference-detail cv2-arpeggio-status" role="status" aria-live="polite">
        <strong>
          {soundingEvents} sounding attacks, {(bar?.events.length ?? 0) - soundingEvents} rests
          {" · "}
          {subdivisionOptions.includes(subdivision) ? ARPEGGIO_SUBDIVISIONS[subdivision].label : ""}
        </strong>
        <p>{audioStatus}</p>
        <p>
          {bar
            ? `One bar lasts ${bar.durationSeconds.toFixed(2)} seconds at ${bpm} quarter-note BPM. The quarter-note pulse stays constant while attack density changes.`
            : "Choose a supported source to generate a sequence."}
        </p>
      </div>
      <p className="cv2-arpeggio-footnote">
        This is a chord-tone sequencing and listening reference, not microphone-based performance
        assessment or a saved Quest. Guitar fingering and sustain are not evaluated.
      </p>
    </div>
  );
}
