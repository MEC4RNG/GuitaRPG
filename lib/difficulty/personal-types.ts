import type { Quest } from "@/lib/quest/runtime";

import type { AbsoluteDifficultyProfile, DifficultyLevel } from "./types";

export const ASSESSMENT_STATUSES = ["UNRATED", "ESTIMATED", "ESTABLISHED"] as const;
export const READINESS_STATUSES = ["UNKNOWN", "LOW", "MODERATE", "HIGH"] as const;
export const CONTEXT_NOVELTY_STATUSES = ["LOW", "MODERATE", "HIGH", "UNKNOWN"] as const;

export type SkillStateSnapshot = {
  skill_slug: string;
  assessment_status: (typeof ASSESSMENT_STATUSES)[number];
  visible_level: DifficultyLevel | null;
  proficiency_score: number | null;
  confidence_score: number;
  readiness_status: (typeof READINESS_STATUSES)[number];
  readiness_score: number | null;
  exposure_count: number;
  evidence_count: number;
  last_practiced_at: string | null;
  last_evidence_at: string | null;
  proficiency_model_version: string;
  confidence_model_version: string;
  readiness_model_version: string;
};

export type ContextNoveltySnapshot = {
  status: (typeof CONTEXT_NOVELTY_STATUSES)[number];
  context_keys: string[];
  source: "EXPLICIT_SNAPSHOT" | "NO_RELEVANT_CONTEXT";
};

export type PlayerRelativeDifficultyInput = {
  quest: Quest;
  absolute_profile: AbsoluteDifficultyProfile;
  skill_states: SkillStateSnapshot[];
  context_novelty: ContextNoveltySnapshot;
  evaluated_at: string;
  player_state_version: string;
};

export type PersonalDifficultyStatus = "UNKNOWN" | "PROVISIONAL" | "RESOLVED";
export type PersonalDifficultyUncertainty = "LOW" | "MODERATE" | "HIGH";
export type PersonalDifficultyModifierKind =
  "READINESS" | "CONTEXT_NOVELTY" | "SUPPORTING_SKILL_BOTTLENECK";

export type PersonalDifficultyModifier = {
  kind: PersonalDifficultyModifierKind;
  personal_band_delta: 1;
  changes_proficiency: false;
  reason: string;
};

export type CapabilityGap = {
  skill_slug: string;
  role: "PRIMARY_SKILL" | "SECONDARY_SKILL" | "REQUIRED_TECHNIQUE";
  demand_dimension: string;
  demand_score: number;
  proficiency_score: number | null;
  gap: number | null;
};

export type PlayerRelativeDifficultyEvaluation = {
  model_version: "DIF_V1";
  resolver_version: "DIF_PERSONAL_V1";
  evaluated_at: string;
  quest: { id: string; slug: string; schema_version: 1 };
  absolute_demand: {
    model_version: "DIF_V1";
    source: "COMPUTED";
    overall_score: number;
    overall_level: DifficultyLevel;
  };
  player_state_version: string;
  status: PersonalDifficultyStatus;
  personal_level: DifficultyLevel | null;
  uncertainty: PersonalDifficultyUncertainty;
  baseline_level: DifficultyLevel | null;
  primary_gap: number | null;
  capability_gaps: CapabilityGap[];
  modifiers: PersonalDifficultyModifier[];
  applied_modifier_band_delta: 0 | 1;
  rationale: string[];
  skill_state_snapshot: SkillStateSnapshot[];
  context_novelty_snapshot: ContextNoveltySnapshot;
};
