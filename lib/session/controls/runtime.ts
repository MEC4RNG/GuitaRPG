export const BPM_MIN = 30;
export const BPM_MAX = 240;
export const DEFAULT_BPM = 90;

export type RepAdjustControlEvent = {
  sequence: number;
  event_type: "REP_ADJUST";
  payload: { delta: 1 | -1 };
};

export type MetronomeBpmControlEvent = {
  sequence: number;
  event_type: "METRONOME_BPM_SET";
  payload: { bpm: number };
};

export type ControlEvent = RepAdjustControlEvent | MetronomeBpmControlEvent;

export function validateControlEvents(events: readonly ControlEvent[]) {
  let previousSequence = 0;

  for (const event of events) {
    if (event.sequence !== previousSequence + 1) throw new Error("Invalid control event order");
    previousSequence = event.sequence;

    if (
      event.event_type === "REP_ADJUST" &&
      event.payload.delta !== 1 &&
      event.payload.delta !== -1
    )
      throw new Error("Invalid rep delta");

    if (
      event.event_type === "METRONOME_BPM_SET" &&
      (!Number.isInteger(event.payload.bpm) ||
        event.payload.bpm < BPM_MIN ||
        event.payload.bpm > BPM_MAX)
    )
      throw new Error("Invalid BPM");
  }

  return events;
}

export function deriveRepCount(events: readonly ControlEvent[]) {
  validateControlEvents(events);
  const repCount = events.reduce(
    (total, event) => total + (event.event_type === "REP_ADJUST" ? event.payload.delta : 0),
    0,
  );

  if (repCount < 0) throw new Error("Negative rep count");
  return repCount;
}

export function deriveLatestBpm(events: readonly ControlEvent[], fallback = DEFAULT_BPM) {
  validateControlEvents(events);
  return (
    [...events].reverse().find((event) => event.event_type === "METRONOME_BPM_SET")?.payload.bpm ??
    fallback
  );
}
