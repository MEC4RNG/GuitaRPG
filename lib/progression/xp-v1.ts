export const XP_MODEL_VERSION = "XP_V1" as const;
export const CHARACTER_MODEL_VERSION = "CHAR_V1" as const;

export type QuestOutcome = "ABANDONED" | "ATTEMPTED" | "PARTIAL" | "CLEARED";

const OUTCOME_BONUS: Record<QuestOutcome, number> = {
  ABANDONED: 0,
  ATTEMPTED: 1,
  PARTIAL: 3,
  CLEARED: 5,
};

export type XpAward = {
  eligiblePracticeSeconds: number;
  completedPracticeMinutes: number;
  practiceMinuteXp: number;
  outcomeBonusXp: number;
  totalXp: number;
  xpModelVersion: typeof XP_MODEL_VERSION;
};

export function calculateXpV1(
  activeSeconds: number,
  outcome: QuestOutcome,
  meaningfulAttempt: boolean,
): XpAward {
  if (!Number.isSafeInteger(activeSeconds) || activeSeconds < 0) {
    throw new RangeError("activeSeconds must be a nonnegative safe integer");
  }

  const eligiblePracticeSeconds = meaningfulAttempt ? activeSeconds : 0;
  const completedPracticeMinutes = Math.floor(eligiblePracticeSeconds / 60);
  const practiceMinuteXp = completedPracticeMinutes;
  const outcomeBonusXp = meaningfulAttempt ? OUTCOME_BONUS[outcome] : 0;

  return {
    eligiblePracticeSeconds,
    completedPracticeMinutes,
    practiceMinuteXp,
    outcomeBonusXp,
    totalXp: practiceMinuteXp + outcomeBonusXp,
    xpModelVersion: XP_MODEL_VERSION,
  };
}

export function characterLevelThresholdV1(level: number): number {
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new RangeError("level must be a positive safe integer");
  }

  return 100 * (level - 1) ** 2;
}

export function deriveCharacterLevelV1(cumulativeXp: number): number {
  if (!Number.isSafeInteger(cumulativeXp) || cumulativeXp < 0) {
    throw new RangeError("cumulativeXp must be a nonnegative safe integer");
  }

  return Math.floor(Math.sqrt(cumulativeXp / 100)) + 1;
}
