export const READINESS_MODEL_VERSION = "READY_V1" as const;

export type ReadinessAssessment = "UNRATED" | "ESTIMATED" | "ESTABLISHED";
export type ReadinessStatus = "UNKNOWN" | "LOW" | "MODERATE" | "HIGH";

export type ReadinessV1Input = {
  assessmentStatus: ReadinessAssessment;
  proficiencyScore: number | null;
  lastPracticedAt: string | null;
  evaluatedAt: string;
  preservedBaseline?: { status: ReadinessStatus; score: number | null };
};

export type ReadinessV1Evaluation = {
  status: ReadinessStatus;
  score: number | null;
  modelVersion: typeof READINESS_MODEL_VERSION;
  reasonCode:
    | "UNRATED_UNKNOWN"
    | "UNKNOWN_RECENCY"
    | "BASELINE_PRESERVED"
    | "RECENT_HIGH"
    | "AGING_MODERATE"
    | "STALE_LOW";
  ageSeconds: number | null;
};

const DAY_SECONDS = 86_400;
export const READY_V1_ANCHORS_SECONDS = {
  highMax: 7 * DAY_SECONDS,
  moderateMax: 30 * DAY_SECONDS,
} as const;
export const READY_V1_FACTORS = { HIGH: 1, MODERATE: 0.8, LOW: 0.6 } as const;

function timestamp(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`READY_V1 ${label} must be a valid timestamp`);
  return parsed;
}

export function readinessStatusForAge(ageSeconds: number): Exclude<ReadinessStatus, "UNKNOWN"> {
  const age = Math.max(0, ageSeconds);
  if (age <= READY_V1_ANCHORS_SECONDS.highMax) return "HIGH";
  if (age <= READY_V1_ANCHORS_SECONDS.moderateMax) return "MODERATE";
  return "LOW";
}

export function readinessFactor(status: Exclude<ReadinessStatus, "UNKNOWN">): number {
  return READY_V1_FACTORS[status];
}

export function evaluateReadinessV1(input: ReadinessV1Input): ReadinessV1Evaluation {
  timestamp(input.evaluatedAt, "evaluatedAt");
  if (input.assessmentStatus === "UNRATED") {
    return {
      status: "UNKNOWN",
      score: null,
      modelVersion: READINESS_MODEL_VERSION,
      reasonCode: "UNRATED_UNKNOWN",
      ageSeconds: null,
    };
  }
  if (input.proficiencyScore === null || input.proficiencyScore < 0 || input.proficiencyScore > 100)
    throw new Error("READY_V1 rated Skills require proficiencyScore in 0-100");
  if (!input.lastPracticedAt) {
    const baseline = input.preservedBaseline;
    if (baseline && baseline.status !== "UNKNOWN" && baseline.score !== null)
      return {
        status: baseline.status,
        score: Math.min(input.proficiencyScore, baseline.score),
        modelVersion: READINESS_MODEL_VERSION,
        reasonCode: "BASELINE_PRESERVED",
        ageSeconds: null,
      };
    return {
      status: "UNKNOWN",
      score: null,
      modelVersion: READINESS_MODEL_VERSION,
      reasonCode: "UNKNOWN_RECENCY",
      ageSeconds: null,
    };
  }

  const ageSeconds = Math.max(
    0,
    (timestamp(input.evaluatedAt, "evaluatedAt") -
      timestamp(input.lastPracticedAt, "lastPracticedAt")) /
      1000,
  );
  const status = readinessStatusForAge(ageSeconds);
  const score = Math.round(input.proficiencyScore * readinessFactor(status) * 100) / 100;
  return {
    status,
    score,
    modelVersion: READINESS_MODEL_VERSION,
    reasonCode:
      status === "HIGH" ? "RECENT_HIGH" : status === "MODERATE" ? "AGING_MODERATE" : "STALE_LOW",
    ageSeconds,
  };
}
