"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ARPEGGIO_PRESETS,
  ARPEGGIO_STEP_TONES,
  ARPEGGIO_SUBDIVISIONS,
  buildArpeggioBar,
  createArpeggioPattern,
  type ArpeggioBar,
  type ArpeggioPreset,
  type ArpeggioStepTone,
  type ArpeggioSubdivision,
} from "@/lib/codex/v2/arpeggio-sequencer";
import {
  chordLabel,
  generateTriadVoicings,
  TRIAD_INVERSION_LABELS,
  TRIAD_STRING_GROUPS,
  type NamedTriad,
  type TriadInversion,
  type TriadQuality,
  type TriadStringGroup,
} from "@/lib/codex/v2/chord-voicings";
import {
  CHROMATIC_ROOTS,
  TUNINGS,
  type FretboardRoot,
  type FretboardTuning,
} from "@/lib/codex/v2/fretboard-engine";
import { ChordDiagram } from "./codex-v2-chord-voicings";

const qualityOptions: readonly TriadQuality[] = ["major", "minor"];
const groupOptions: readonly TriadStringGroup[] = ["1-3", "2-4", "3-5", "4-6"];
const inversionOptions: readonly TriadInversion[] = ["root", "first", "second"];
const subdivisionOptions = Object.keys(ARPEGGIO_SUBDIVISIONS) as ArpeggioSubdivision[];
const presetOptions = Object.keys(ARPEGGIO_PRESETS) as ArpeggioPreset[];

type AudioRun = {
  context: AudioContext;
  output: GainNode;
  bar: ArpeggioBar;
  start: number;
  nextIndex: number;
  repeat: boolean;
  timer: number;
};

/** One-bar chord-tone sequence editor, independent of Quest and Player persistence. */
export function CodexV2ArpeggioSequencer() {
  const [root, setRoot] = useState<FretboardRoot>("C");
  const [quality, setQuality] = useState<TriadQuality>("major");
  const [tuning, setTuning] = useState<FretboardTuning>("standard");
  const [group, setGroup] = useState<TriadStringGroup>("1-3");
  const [inversion, setInversion] = useState<TriadInversion>("root");
  const [voicingId, setVoicingId] = useState<string | null>(null);
  const [subdivision, setSubdivision] = useState<ArpeggioSubdivision>("quarter");
  const [preset, setPreset] = useState<ArpeggioPreset | "custom">("arch");
  const [pattern, setPattern] = useState<ArpeggioStepTone[]>(() =>
    createArpeggioPattern("quarter", "arch"),
  );
  const [bpm, setBpm] = useState(80);
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

  const chord: NamedTriad = useMemo(() => ({ root, quality }), [root, quality]);
  const choices = useMemo(
    () => generateTriadVoicings(chord, tuning, group),
    [chord, tuning, group],
  );
  const availableInversions = inversionOptions.filter((item) =>
    choices.some((candidate) => candidate.inversion === item),
  );
  const activeInversion = availableInversions.includes(inversion)
    ? inversion
    : availableInversions[0];
  const availableVoicings = choices.filter((candidate) => candidate.inversion === activeInversion);
  const visibleVoicings = availableVoicings.slice(0, 30);
  const selectedVoicing =
    visibleVoicings.find((candidate) => candidate.id === voicingId) ??
    visibleVoicings[0] ??
    null;
  const bar = useMemo(
    () =>
      selectedVoicing
        ? buildArpeggioBar(selectedVoicing, subdivision, bpm, pattern)
        : null,
    [selectedVoicing, subdivision, bpm, pattern],
  );
  const definitions = selectedVoicing
    ? selectedVoicing.tones.map((tone, index) => ({
        tone,
        midi: selectedVoicing.midi[index],
        note: selectedVoicing.notes[index],
        stringNumber: selectedVoicing.strings[index],
        fret: selectedVoicing.frets[index],
      }))
    : [];
  const spelled = new Map(definitions.map((item) => [item.tone, item]));
  const soundingEvents = bar?.events.filter((event) => event.midi !== null).length ?? 0;

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

  function resetChord(next: () => void) {
    stopPlayback("Stopped. Select Play bar to hear the updated notes.");
    setInversion("root");
    setVoicingId(null);
    next();
  }

  function resetRhythm(next: ArpeggioSubdivision) {
    stopPlayback("Stopped. The rhythmic grid has changed.");
    const nextPreset = preset === "custom" ? "arch" : preset;
    setSubdivision(next);
    setPreset(nextPreset);
    setPattern(createArpeggioPattern(next, nextPreset));
  }

  function selectPreset(value: ArpeggioPreset | "custom") {
    stopPlayback("Stopped. Choose Play bar to hear the updated pattern.");
    if (value === "custom") {
      setPreset("custom");
      return;
    }
    setPreset(value);
    setPattern(createArpeggioPattern(subdivision, value));
  }

  function editStep(index: number, tone: ArpeggioStepTone) {
    stopPlayback("Stopped. Your note-order edit is ready to play.");
    setPreset("custom");
    setPattern((previous) =>
      previous.map((item, position) => (position === index ? tone : item)),
    );
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

        while (
          (run.repeat || run.nextIndex < totalSteps) &&
          scheduled < 24
        ) {
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
        Turn the notes of a chord into a melody. Choose a real guitar voicing, set the rhythmic
        subdivision, and decide which chord tone sounds on each step. A rest makes that step silent.
      </p>
      <div className="cv2-arpeggio-controls">
        <label>
          Chord root
          <select
            aria-label="Arpeggio root"
            value={root}
            onChange={(event) =>
              resetChord(() => setRoot(event.target.value as FretboardRoot))
            }
          >
            {CHROMATIC_ROOTS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Quality
          <select
            aria-label="Arpeggio quality"
            value={quality}
            onChange={(event) =>
              resetChord(() => setQuality(event.target.value as TriadQuality))
            }
          >
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
        </label>
        <label>
          Tuning
          <select
            aria-label="Arpeggio tuning"
            value={tuning}
            onChange={(event) =>
              resetChord(() => setTuning(event.target.value as FretboardTuning))
            }
          >
            {(Object.keys(TUNINGS) as FretboardTuning[]).map((item) => (
              <option key={item} value={item}>{TUNINGS[item].title}</option>
            ))}
          </select>
        </label>
        <label>
          Three-string group
          <select
            aria-label="Arpeggio string group"
            value={group}
            onChange={(event) =>
              resetChord(() => setGroup(event.target.value as TriadStringGroup))
            }
          >
            {groupOptions.map((item) => (
              <option key={item} value={item}>Strings {TRIAD_STRING_GROUPS[item].join("–")}</option>
            ))}
          </select>
        </label>
        <label>
          Inversion
          <select
            aria-label="Arpeggio inversion"
            value={activeInversion ?? ""}
            disabled={!availableInversions.length}
            onChange={(event) => {
              stopPlayback("Stopped. Inversion selection updated.");
              setInversion(event.target.value as TriadInversion);
              setVoicingId(null);
            }}
          >
            {inversionOptions.map((item) => (
              <option key={item} value={item} disabled={!availableInversions.includes(item)}>
                {TRIAD_INVERSION_LABELS[item]}
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
              stopPlayback("Stopped. The voicing has changed.");
              setVoicingId(event.target.value);
            }}
          >
            {visibleVoicings.map((item) => (
              <option key={item.id} value={item.id}>
                {item.frets.map((fret) => fret === 0 ? "open" : fret).join(" / ")}
                {" · "}{item.notes.join("–")}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedVoicing ? (
        <div className="cv2-arpeggio-source">
          <div>
            <h4>{chordLabel(chord)} · {TRIAD_INVERSION_LABELS[selectedVoicing.inversion]}</h4>
            <p>
              {selectedVoicing.notes.join(" · ")} · strings {selectedVoicing.strings.join("–")},
              frets {selectedVoicing.frets.map((fret) => fret || "open").join("–")}
            </p>
            <p>
              The chord tone, not the position of the note on the strings, determines the selected
              root/third/fifth pattern.
            </p>
          </div>
          <div className="cv2-arpeggio-diagram">
            <ChordDiagram voicing={selectedVoicing} />
          </div>
        </div>
      ) : (
        <p role="status">
          No verified three-string triad is available in this position range. Try another string
          group or tuning.
        </p>
      )}

      <div className="cv2-arpeggio-controls cv2-arpeggio-rhythm-controls">
        <label>
          Subdivision
          <select
            aria-label="Arpeggio subdivision"
            value={subdivision}
            onChange={(event) => resetRhythm(event.target.value as ArpeggioSubdivision)}
          >
            {subdivisionOptions.map((item) => (
              <option key={item} value={item}>{ARPEGGIO_SUBDIVISIONS[item].label}</option>
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
              <option key={item} value={item}>{ARPEGGIO_PRESETS[item].title}</option>
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
            value={bpm}
            onChange={(event) => {
              stopPlayback("Stopped. Tempo changed.");
              const value = Number(event.target.value);
              if (Number.isFinite(value)) {
                setBpm(Math.max(40, Math.min(200, Math.round(value))));
              }
            }}
          />
        </label>
      </div>

      <div className="cv2-arpeggio-heading">
        <strong>Four beats · {bar?.events.length ?? 0} subdivisions</strong>
        <span>Each select edits one attack. R = root, 3 = third, 5 = fifth.</span>
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
                      onChange={(change) =>
                        editStep(event.index, change.target.value as ArpeggioStepTone)
                      }
                    >
                      {ARPEGGIO_STEP_TONES.map((tone) => (
                        <option key={tone} value={tone}>
                          {tone === "rest" ? "Rest" : tone === "root" ? "Root" : tone === "third" ? "Third" : "Fifth"}
                        </option>
                      ))}
                    </select>
                    <span className="cv2-arpeggio-note">
                      {event.note ?? "Silence"}
                    </span>
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="cv2-arpeggio-playback">
        <button
          type="button"
          disabled={!selectedVoicing || !soundingEvents || playing}
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
          {" · "}{subdivisionOptions.includes(subdivision) ? ARPEGGIO_SUBDIVISIONS[subdivision].label : ""}
        </strong>
        <p>{audioStatus}</p>
        <p>
          {bar
            ? `One bar lasts ${bar.durationSeconds.toFixed(2)} seconds at ${bpm} quarter-note BPM. The quarter-note pulse stays constant while attack density changes.`
            : "Choose a supported voicing to generate a sequence."}
        </p>
      </div>
      <p className="cv2-arpeggio-footnote">
        This is a chord-tone sequencing and listening reference, not microphone-based performance
        assessment or a saved Quest. Guitar fingering and sustain are not evaluated.
      </p>
    </div>
  );
}
