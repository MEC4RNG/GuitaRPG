import type { Quest, QuestPersistenceInput, QuestType } from "@/lib/quest/runtime";

export const QUEST_GENERATOR_VERSION = "QST_GEN_V1" as const;
export const QUEST_GENERATOR_RULE_VERSION = "QST_GEN_RULES_V1" as const;

export type DomainSlug =
  | "technique"
  | "fretboard"
  | "harmony_theory"
  | "rhythm"
  | "ear_musicianship"
  | "creativity_expression";

export type ConstraintRequest = {
  slug: string;
  parameters?: Record<string, unknown>;
};

export type GenerationIdentity = {
  id?: string;
  nonce?: string;
  generated_at?: string;
};

export type QuickQuestInput = GenerationIdentity & {
  seed?: string | number;
  primary_domain?: DomainSlug;
  quest_type?: QuestType;
  tuning?: string;
};

export type CustomQuestInput = GenerationIdentity & {
  seed?: string | number;
  primary_skill: string;
  quest_type?: QuestType;
  concepts?: string[];
  secondary_skills?: string[];
  required_techniques?: string[];
  tuning?: string;
  tonal_center?: string;
  style?: string;
  constraints?: ConstraintRequest[];
  strings?: number[];
  fret_range?: { min: number; max: number };
  target_tempo_bpm?: number;
  estimated_minutes?: number;
  meter?: string;
};

export type GeneratedQuest = {
  quest: Quest;
  persistence: QuestPersistenceInput;
};

export class QuestGenerationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "QuestGenerationError";
  }
}

export type GeneratorTemplate = {
  id: string;
  domain: DomainSlug;
  questTypes: QuestType[];
  primarySkills: string[];
  concepts: string[];
  secondarySkills: string[];
  requiredTechniques: string[];
  allowedConstraints: string[];
  defaultConstraints: ConstraintRequest[];
  purpose: Quest["purpose"]["reason"];
  objectiveKind: string;
};
