export const PROFICIENCY_MODEL_VERSION = "PROF_V1" as const;
export const CONFIDENCE_MODEL_VERSION = "CONF_V1" as const;

export type SkillOutcome = "ABANDONED" | "ATTEMPTED" | "PARTIAL" | "CLEARED";
export type EvidenceConfidence = "LOW" | "MODERATE" | "HIGH" | "MIXED";
export type SkillAssessment = "UNRATED" | "ESTIMATED" | "ESTABLISHED";
export type SkillLevel = "I" | "II" | "III" | "IV" | "V";
export type ChallengeBand =
  "VERY_COMFORTABLE" | "COMFORTABLE" | "TARGET" | "STRETCH" | "OVERREACH" | "UNKNOWN";

export type SkillProgressionState = {
  assessment: SkillAssessment;
  score: number | null;
  confidence: number;
  informativeResults: number;
  distinctSessions: number;
  recentDirections: readonly number[];
  identicalEasyClears: number;
};

export type SkillProgressionInput = {
  meaningfulAttempt: boolean;
  outcome: SkillOutcome;
  confidenceSummary: EvidenceConfidence;
  demandScore: number;
  previous: SkillProgressionState;
};

export type SkillProgressionEvaluation = {
  exposure: boolean;
  evidence: boolean;
  evidenceConfidence: Exclude<EvidenceConfidence, "MIXED">;
  challenge: ChallengeBand;
  rawDelta: number;
  appliedDelta: number;
  score: number | null;
  confidence: number;
  assessment: SkillAssessment;
  level: SkillLevel | null;
  repetitionFactor: number;
  contradiction: boolean;
};

const DELTAS: Record<
  Exclude<ChallengeBand, "UNKNOWN">,
  Record<Exclude<SkillOutcome, "ABANDONED">, number>
> = {
  VERY_COMFORTABLE: { ATTEMPTED: -4, PARTIAL: -2, CLEARED: 1 },
  COMFORTABLE: { ATTEMPTED: -3, PARTIAL: -1, CLEARED: 2 },
  TARGET: { ATTEMPTED: -2, PARTIAL: 1, CLEARED: 4 },
  STRETCH: { ATTEMPTED: -1, PARTIAL: 2, CLEARED: 6 },
  OVERREACH: { ATTEMPTED: 0, PARTIAL: 2, CLEARED: 5 },
};

const CONFIDENCE_WEIGHT = { LOW: 0.5, MODERATE: 0.75, HIGH: 1 } as const;
const CONFIDENCE_GAIN = { LOW: 10, MODERATE: 20, HIGH: 25 } as const;

export function normalizeEvidenceConfidence(
  value: EvidenceConfidence,
): Exclude<EvidenceConfidence, "MIXED"> {
  return value === "MIXED" ? "MODERATE" : value;
}

export function skillLevelForScore(score: number): SkillLevel {
  if (score < 20) return "I";
  if (score < 40) return "II";
  if (score < 60) return "III";
  if (score < 80) return "IV";
  return "V";
}

export function skillDemandScore(dimensionScore: number | null, overallScore: number): number {
  return Math.round(((dimensionScore ?? overallScore) * 0.65 + overallScore * 0.35) * 100) / 100;
}

export function challengeBand(demandScore: number, proficiencyScore: number | null): ChallengeBand {
  if (proficiencyScore === null) return "UNKNOWN";
  const gap = demandScore - proficiencyScore;
  if (gap <= -50) return "VERY_COMFORTABLE";
  if (gap <= -20) return "COMFORTABLE";
  if (gap <= 15) return "TARGET";
  if (gap <= 35) return "STRETCH";
  return "OVERREACH";
}

export function repetitionFactor(priorIdenticalEasyClears: number): number {
  return Math.max(0.25, 1 - Math.max(0, priorIdenticalEasyClears) * 0.25);
}

function bandBounds(level: SkillLevel) {
  const index = ["I", "II", "III", "IV", "V"].indexOf(level);
  return { low: index * 20, high: index === 4 ? 100 : index * 20 + 19.99 };
}

export function applySkillProgressionV1(input: SkillProgressionInput): SkillProgressionEvaluation {
  const evidenceConfidence = normalizeEvidenceConfidence(input.confidenceSummary);
  const exposure = input.meaningfulAttempt && input.outcome !== "ABANDONED";
  const evidence = exposure;
  const challenge = challengeBand(input.demandScore, input.previous.score);
  const repetition =
    input.outcome === "CLEARED" && (challenge === "VERY_COMFORTABLE" || challenge === "COMFORTABLE")
      ? repetitionFactor(input.previous.identicalEasyClears)
      : 1;

  if (!evidence)
    return {
      exposure,
      evidence,
      evidenceConfidence,
      challenge,
      rawDelta: 0,
      appliedDelta: 0,
      score: input.previous.score,
      confidence: input.previous.confidence,
      assessment: input.previous.assessment,
      level: input.previous.score === null ? null : skillLevelForScore(input.previous.score),
      repetitionFactor: 1,
      contradiction: false,
    };

  let rawDelta: number;
  let score: number;
  if (input.previous.score === null) {
    rawDelta = 0;
    const initialAdjustment =
      input.outcome === "CLEARED" ? 0 : input.outcome === "PARTIAL" ? -6 : -12;
    score = Math.min(
      79,
      Math.max(0, input.demandScore + initialAdjustment * CONFIDENCE_WEIGHT[evidenceConfidence]),
    );
  } else {
    rawDelta =
      DELTAS[challenge as Exclude<ChallengeBand, "UNKNOWN">][
        input.outcome as Exclude<SkillOutcome, "ABANDONED">
      ];
    const proposedDelta = Math.max(
      -8,
      Math.min(8, rawDelta * CONFIDENCE_WEIGHT[evidenceConfidence] * repetition),
    );
    score = Math.max(0, Math.min(100, input.previous.score + proposedDelta));

    if (input.previous.assessment === "ESTABLISHED") {
      const currentLevel = skillLevelForScore(input.previous.score);
      const proposedLevel = skillLevelForScore(score);
      const recent = [...input.previous.recentDirections, Math.sign(proposedDelta)].slice(-3);
      const support = recent.filter((direction) => direction > 0).length;
      const contradictionSupport = recent.filter((direction) => direction < 0).length;
      const bounds = bandBounds(currentLevel);
      if (proposedLevel > currentLevel && support < 2) score = bounds.high;
      if (proposedLevel < currentLevel && contradictionSupport < 2) score = bounds.low;
    }
  }

  score = Math.round(score * 100) / 100;
  const appliedDelta =
    input.previous.score === null ? 0 : Math.round((score - input.previous.score) * 100) / 100;
  const confidence = Math.min(
    100,
    input.previous.confidence + CONFIDENCE_GAIN[evidenceConfidence] * repetition,
  );
  const directions = [
    ...input.previous.recentDirections,
    Math.sign(appliedDelta || (input.outcome === "CLEARED" ? 1 : -1)),
  ].slice(-5);
  const contradiction =
    directions.some((value) => value > 0) && directions.some((value) => value < 0);
  const canEstablish =
    input.previous.informativeResults + 1 >= 3 &&
    input.previous.distinctSessions + 1 >= 2 &&
    confidence >= 60 &&
    !contradiction;
  const assessment =
    input.previous.assessment === "ESTABLISHED" || canEstablish ? "ESTABLISHED" : "ESTIMATED";

  return {
    exposure,
    evidence,
    evidenceConfidence,
    challenge,
    rawDelta,
    appliedDelta,
    score,
    confidence,
    assessment,
    level: skillLevelForScore(score),
    repetitionFactor: repetition,
    contradiction,
  };
}
