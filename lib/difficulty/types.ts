import type { Quest } from "@/lib/quest/runtime";

export const DIFFICULTY_DIMENSIONS = [
  "TECHNIQUE",
  "FRETBOARD",
  "THEORY",
  "RHYTHM",
  "CREATIVE",
  "TEMPO",
  "CONSTRAINT",
] as const;

export type DifficultyDimension = (typeof DIFFICULTY_DIMENSIONS)[number];
export type DifficultyLevel = "I" | "II" | "III" | "IV" | "V";

export type DifficultyBasis = {
  code: string;
  contribution: number;
  detail?: string | number | boolean;
};

export type ApplicableDimension = {
  applicable: true;
  score: number;
  level: DifficultyLevel;
  basis: DifficultyBasis[];
};

export type InapplicableDimension = {
  applicable: false;
  score: null;
  level: null;
  basis: DifficultyBasis[];
};

export type DimensionEvaluation = ApplicableDimension | InapplicableDimension;

export type AbsoluteDifficultyProfile = {
  model_version: "DIF_V1";
  source: "COMPUTED";
  dimensions: Record<DifficultyDimension, DimensionEvaluation>;
  overall: {
    score: number;
    level: DifficultyLevel;
    basis: DifficultyBasis[];
  };
};

export type DifficultyQuest = Quest;
