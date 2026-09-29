export const EVIDENCE_MODEL_VERSION = "EVD_V1" as const;
export const RESULT_OUTCOMES = ["ABANDONED", "ATTEMPTED", "PARTIAL", "CLEARED"] as const;
export const CRITERION_STATES = ["MET", "NOT_MET", "UNKNOWN", "NOT_EVALUATED"] as const;
export const VERIFICATION_MODES = [
  "SELF",
  "SESSION",
  "AUDIO_ASSISTED",
  "DIRECT_AUDIO",
  "APP_VERIFIED",
] as const;
export const EVIDENCE_CONFIDENCES = ["LOW", "MODERATE", "HIGH"] as const;
export const RESULT_CONFIDENCE_SUMMARIES = ["LOW", "MODERATE", "HIGH", "MIXED"] as const;
export const SOURCE_AUTHORITIES = [
  "PLAYER",
  "SESSION_SYSTEM",
  "AUDIO_ANALYZER",
  "DIRECT_AUDIO_ANALYZER",
  "APP_GRADER",
] as const;
export const REFLECTION_VALUES = ["TOO_EASY", "GOOD_CHALLENGE", "TOO_HARD"] as const;

export type ResultOutcome = (typeof RESULT_OUTCOMES)[number];
export type CriterionState = (typeof CRITERION_STATES)[number];
export type VerificationMode = (typeof VERIFICATION_MODES)[number];
export type EvidenceConfidence = (typeof EVIDENCE_CONFIDENCES)[number];
export type ResultConfidenceSummary = (typeof RESULT_CONFIDENCE_SUMMARIES)[number];
export type SourceAuthority = (typeof SOURCE_AUTHORITIES)[number];
export type ReflectionValue = (typeof REFLECTION_VALUES)[number];
export type Scalar = string | number | boolean;
export type CriterionOperator = "EQ" | "GTE" | "LTE";

export class EvidenceRuntimeError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "EvidenceRuntimeError";
  }
}

export function deriveResultOutcome(
  meaningfulAttempt: boolean,
  requiredCriterionStates: readonly CriterionState[],
): ResultOutcome {
  if (!meaningfulAttempt) return "ABANDONED";
  if (!requiredCriterionStates.length)
    throw new EvidenceRuntimeError("NO_REQUIRED_CRITERIA", "Result requires Objective criteria");
  if (requiredCriterionStates.every((state) => state === "MET")) return "CLEARED";
  if (requiredCriterionStates.some((state) => state === "MET")) return "PARTIAL";
  return "ATTEMPTED";
}

function comparableType(value: Scalar) {
  return typeof value;
}

export function compareCriterionValue(
  operator: CriterionOperator,
  observed: Scalar,
  target: Scalar,
): Extract<CriterionState, "MET" | "NOT_MET"> {
  if (comparableType(observed) !== comparableType(target))
    throw new EvidenceRuntimeError(
      "INVALID_SCALAR_TYPE",
      "Observed and target values must have the same scalar type",
    );
  if ((operator === "GTE" || operator === "LTE") && typeof target !== "number")
    throw new EvidenceRuntimeError(
      "INVALID_SCALAR_TYPE",
      `${operator} requires numeric observed and target values`,
    );
  const met =
    operator === "EQ"
      ? observed === target
      : operator === "GTE"
        ? (observed as number) >= (target as number)
        : (observed as number) <= (target as number);
  return met ? "MET" : "NOT_MET";
}

export function deriveConfidenceSummary(
  confidences: readonly EvidenceConfidence[],
): ResultConfidenceSummary {
  if (!confidences.length)
    throw new EvidenceRuntimeError("NO_EVIDENCE", "Confidence summary requires evidence");
  return new Set(confidences).size === 1 ? confidences[0]! : "MIXED";
}

export function validateMeaningfulAttemptContract(
  completionContract: Record<string, unknown>,
  recordedActiveSeconds: number,
) {
  if (
    completionContract.attempt_rule !== "MEANINGFUL_ACTIVITY" ||
    typeof completionContract.minimum_attempt_seconds !== "number" ||
    !Number.isFinite(completionContract.minimum_attempt_seconds) ||
    completionContract.minimum_attempt_seconds < 0
  )
    throw new EvidenceRuntimeError(
      "UNSUPPORTED_ATTEMPT_CONTRACT",
      "Quest does not contain a supported meaningful-activity threshold",
    );
  return recordedActiveSeconds >= completionContract.minimum_attempt_seconds;
}

export type ContractEvidence = {
  verification_mode: VerificationMode;
  criterion_state: CriterionState;
  confidence: EvidenceConfidence;
  source_authority: SourceAuthority;
};

const authorityForMode: Record<VerificationMode, SourceAuthority> = {
  SELF: "PLAYER",
  SESSION: "SESSION_SYSTEM",
  AUDIO_ASSISTED: "AUDIO_ANALYZER",
  DIRECT_AUDIO: "DIRECT_AUDIO_ANALYZER",
  APP_VERIFIED: "APP_GRADER",
};

export function validateEvidenceAuthority(evidence: ContractEvidence) {
  if (authorityForMode[evidence.verification_mode] !== evidence.source_authority)
    throw new EvidenceRuntimeError(
      "SOURCE_AUTHORITY_MISMATCH",
      "Evidence source authority does not match its verification mode",
    );
  return evidence;
}
