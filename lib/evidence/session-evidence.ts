import type { Criterion, Quest } from "../quest/runtime";
import type { ControlEvent } from "../session/controls/runtime";
import { deriveRecordedActiveSeconds, type PracticeSessionEvent } from "../session/runtime";
import { compareCriterionValue, type CriterionState, type Scalar } from "./runtime";

export const SESSION_EVIDENCE_EVALUATOR_VERSION = "SESSION_EVD_V1" as const;
export const SESSION_OBSERVABLE_METRICS = [
  "practice_duration",
  "time_elapsed",
  "target_tempo",
] as const;

export type SessionObservableMetric = (typeof SESSION_OBSERVABLE_METRICS)[number];
export type SessionCriterionObservation = {
  metric: SessionObservableMetric;
  observedValue: number;
  state: CriterionState;
  unit: string;
  rationale: string;
};

const durationMetrics = new Set<SessionObservableMetric>(["practice_duration", "time_elapsed"]);

function latestPersistedBpm(events: readonly ControlEvent[]) {
  return [...events].reverse().find((event) => event.event_type === "METRONOME_BPM_SET")?.payload
    .bpm;
}

export function evaluateSessionCriterion(
  criterion: Criterion,
  sessionEvents: readonly PracticeSessionEvent[],
  controlEvents: readonly ControlEvent[],
): SessionCriterionObservation | null {
  if (!SESSION_OBSERVABLE_METRICS.includes(criterion.metric as SessionObservableMetric))
    return null;
  if (durationMetrics.has(criterion.metric as SessionObservableMetric)) {
    const seconds = deriveRecordedActiveSeconds(sessionEvents);
    return {
      metric: criterion.metric as SessionObservableMetric,
      observedValue: seconds,
      state: compareCriterionValue(criterion.operator, seconds, criterion.value as Scalar),
      unit: criterion.unit,
      rationale: "Derived from authoritative Session lifecycle intervals; paused time is excluded.",
    };
  }
  const bpm = latestPersistedBpm(controlEvents);
  if (bpm === undefined) return null;
  return {
    metric: "target_tempo",
    observedValue: bpm,
    state: compareCriterionValue(criterion.operator, bpm, criterion.value as Scalar),
    unit: criterion.unit,
    rationale:
      "Verifies the latest recorded metronome configuration, not musical performance accuracy.",
  };
}

export function questCriteria(quest: Quest): Criterion[] {
  return quest.objective.criteria;
}
