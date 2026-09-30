import { evaluateAbsoluteQuestDemand } from "@/lib/difficulty/dif-v1";
import { resolvePlayerRelativeDifficulty } from "@/lib/difficulty/personal-v1";
import type {
  ContextNoveltySnapshot,
  PlayerRelativeDifficultyEvaluation,
  SkillStateSnapshot,
} from "@/lib/difficulty/personal-types";
import type { DifficultyLevel } from "@/lib/difficulty/types";
import { generateTrainingQuest, type TrainingQuestInput } from "@/lib/quest/generator";
import { parseQuest, toQuestPersistenceInput, type Quest } from "@/lib/quest/runtime";
import {
  materializeTrainingQuestV1,
  type MaterializedTrainingQuestV1,
  type TrainingSelectionMode,
} from "./materialize-v1";
import type { RankedRecommendationSetV1 } from "./scoring-v1";

export const TRAINING_ADAPTATION_MODEL_VERSION = "TRN_ADAPT_V1" as const;
export const TRAINING_CHALLENGE_TARGET_VERSION = "TRN_CHALLENGE_TARGET_V1" as const;
export const TRAINING_VARIANT_CATALOG_VERSION = "TRN_VARIANTS_V1" as const;

export type TrainingChallengePreference = "RELAXED" | "BALANCED" | "CHALLENGE" | "PUSH_ME";
export type TrainingVariantKey = "LOW" | "BASE" | "HIGH" | "MAX";
export type TrainingAdaptationFit =
  "EXACT_PREFERRED_BAND" | "CLOSEST_AVAILABLE_BAND" | "PRIMARY_UNRATED_CALIBRATION_FALLBACK";

export const TRAINING_CHALLENGE_TARGETS: Record<
  TrainingChallengePreference,
  { level_order: DifficultyLevel[]; primary_gap_anchor: number }
> = {
  RELAXED: { level_order: ["II", "I", "III", "IV", "V"], primary_gap_anchor: -20 },
  BALANCED: { level_order: ["III", "II", "IV", "I", "V"], primary_gap_anchor: 0 },
  CHALLENGE: { level_order: ["IV", "III", "II", "V", "I"], primary_gap_anchor: 25 },
  PUSH_ME: { level_order: ["IV", "V", "III", "II", "I"], primary_gap_anchor: 35 },
};

const VARIANT_ORDER: TrainingVariantKey[] = ["LOW", "BASE", "HIGH", "MAX"];
const UNCERTAINTY_ORDER = { LOW: 0, MODERATE: 1, HIGH: 2 } as const;

type VariantRecipe = TrainingQuestInput["constraints"];
const RECIPES: Record<string, Record<TrainingVariantKey, VariantRecipe>> = {
  execution_grid_v1: {
    LOW: [
      { slug: "string_set", parameters: { strings: [2, 3] } },
      { slug: "target_tempo", parameters: { bpm: 60 } },
    ],
    BASE: [
      { slug: "string_set", parameters: { strings: [2, 3, 4, 5] } },
      { slug: "target_tempo", parameters: { bpm: 90 } },
    ],
    HIGH: [
      { slug: "string_set", parameters: { strings: [1, 2, 3, 4, 5, 6] } },
      { slug: "target_tempo", parameters: { bpm: 140 } },
    ],
    MAX: [
      { slug: "string_set", parameters: { strings: [1, 2, 3, 4, 5, 6] } },
      { slug: "target_tempo", parameters: { bpm: 200 } },
      { slug: "fret_range", parameters: { min: 3, max: 15 } },
    ],
  },
  rhythm_lock_v1: {
    LOW: [{ slug: "target_tempo", parameters: { bpm: 60 } }],
    BASE: [{ slug: "target_tempo", parameters: { bpm: 80 } }],
    HIGH: [{ slug: "target_tempo", parameters: { bpm: 120 } }],
    MAX: [{ slug: "target_tempo", parameters: { bpm: 180 } }],
  },
  fretboard_route_v1: {
    LOW: [{ slug: "fret_range", parameters: { min: 5, max: 8 } }],
    BASE: [{ slug: "fret_range", parameters: { min: 3, max: 10 } }],
    HIGH: [
      { slug: "fret_range", parameters: { min: 2, max: 16 } },
      { slug: "string_set", parameters: { strings: [2, 3, 4, 5] } },
    ],
    MAX: [
      { slug: "fret_range", parameters: { min: 0, max: 24 } },
      { slug: "string_set", parameters: { strings: [1, 2, 3, 4, 5, 6] } },
    ],
  },
  theory_builder_v1: {
    LOW: [{ slug: "time_limit", parameters: { seconds: 240 } }],
    BASE: [{ slug: "time_limit", parameters: { seconds: 120 } }],
    HIGH: [{ slug: "time_limit", parameters: { seconds: 60 } }],
    MAX: [{ slug: "time_limit", parameters: { seconds: 30 } }],
  },
  ear_prompt_v1: {
    LOW: [{ slug: "prompt_count", parameters: { count: 6 } }],
    BASE: [{ slug: "prompt_count", parameters: { count: 10 } }],
    HIGH: [{ slug: "prompt_count", parameters: { count: 16 } }],
    MAX: [{ slug: "prompt_count", parameters: { count: 24 } }],
  },
  creative_counterpoint_v1: {
    LOW: [{ slug: "output_length", parameters: { bars: 2 } }],
    BASE: [{ slug: "output_length", parameters: { bars: 4 } }],
    HIGH: [{ slug: "output_length", parameters: { bars: 8 } }],
    MAX: [{ slug: "output_length", parameters: { bars: 16 } }],
  },
};

function stableUuid(value: string): string {
  const words = Array.from({ length: 4 }, (_, offset) => {
    let hash = 2166136261 ^ offset;
    for (const char of `${value}:${offset}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return (hash >>> 0).toString(16).padStart(8, "0");
  }).join("");
  return `${words.slice(0, 8)}-${words.slice(8, 12)}-4${words.slice(13, 16)}-8${words.slice(17, 20)}-${words.slice(20, 32)}`;
}

function contextNovelty(quest: Quest): ContextNoveltySnapshot {
  const context = quest.musical_context as Record<string, unknown>;
  const keys: string[] = [];
  const ref = (name: string) => (context[name] as { slug?: string } | null)?.slug;
  if (ref("tuning")) keys.push(`tuning:${ref("tuning")}`);
  const tonal = (context.tonal_center as { pitch_class?: string } | null)?.pitch_class;
  if (tonal) keys.push(`tonal_center:${tonal}`);
  for (const name of ["style", "playing_role", "accompaniment"])
    if (ref(name)) keys.push(`${name}:${ref(name)}`);
  return keys.length
    ? { status: "UNKNOWN", source: "EXPLICIT_SNAPSHOT", context_keys: keys }
    : { status: "LOW", source: "NO_RELEVANT_CONTEXT", context_keys: [] };
}

function skillSnapshot(
  state: MaterializedTrainingQuestV1["recommendation"]["candidate"]["skill"],
): SkillStateSnapshot {
  return {
    skill_slug: state.slug,
    assessment_status: state.assessment_status,
    visible_level: state.visible_level,
    proficiency_score: state.proficiency_score,
    confidence_score: state.confidence_score,
    readiness_status: state.readiness_status,
    readiness_score: state.readiness_score,
    exposure_count: state.exposure_count,
    evidence_count: state.evidence_count,
    last_practiced_at: state.last_practiced_at,
    last_evidence_at: state.last_evidence_at,
    proficiency_model_version: state.proficiency_model_version,
    confidence_model_version: state.confidence_model_version,
    readiness_model_version: state.readiness_model_version,
  };
}

export type TrainingVariantEvaluationV1 = {
  variant_key: TrainingVariantKey;
  quest: Quest;
  personal_difficulty: PlayerRelativeDifficultyEvaluation;
};

export type TrainingAdaptationProvenanceV1 = {
  adaptation_model_version: typeof TRAINING_ADAPTATION_MODEL_VERSION;
  challenge_target_version: typeof TRAINING_CHALLENGE_TARGET_VERSION;
  variant_catalog_version: typeof TRAINING_VARIANT_CATALOG_VERSION;
  challenge_preference: TrainingChallengePreference;
  preference_applied: boolean;
  fit: TrainingAdaptationFit;
  selected_variant_key: TrainingVariantKey;
  target_level_order: DifficultyLevel[];
  target_gap_anchor: number;
  personal_difficulty: PlayerRelativeDifficultyEvaluation;
  context_novelty: ContextNoveltySnapshot;
  evaluated_variants: Array<{
    variant_key: TrainingVariantKey;
    absolute_level: DifficultyLevel;
    absolute_score: number;
    personal_status: string;
    personal_level: DifficultyLevel | null;
    uncertainty: string;
    primary_gap: number | null;
  }>;
};

export type AdaptiveTrainingQuestV1 = MaterializedTrainingQuestV1 & {
  adaptation: TrainingAdaptationProvenanceV1;
  variants: TrainingVariantEvaluationV1[];
};

export function materializeAdaptiveTrainingQuestV1(input: {
  recommendation_set: RankedRecommendationSetV1;
  candidate_key: string;
  selection_mode: TrainingSelectionMode;
  seed: string | number;
  id?: string;
}): AdaptiveTrainingQuestV1 {
  const base = materializeTrainingQuestV1({
    recommendation_set: input.recommendation_set,
    candidate_key: input.candidate_key,
    selection_mode: input.selection_mode,
    seed: input.seed,
    id: stableUuid(`${input.seed}:BASELINE`),
  });
  const template = String(base.quest.metadata.template_id);
  const recipes = RECIPES[template];
  if (!recipes) throw new Error(`TRN_ADAPT_V1 has no variant catalog for ${template}`);
  const primary = skillSnapshot(base.recommendation.candidate.skill);
  const stateVersion = `TRN_STATE_V1:${base.recommendation.candidate.candidate_key}:${input.recommendation_set.evaluated_at}`;
  const concept = base.quest.concepts[0]!.slug;
  const tuning = input.recommendation_set.player_context.default_tuning?.slug;

  const variants = VARIANT_ORDER.map((variantKey) => {
    const generated = generateTrainingQuest({
      id: stableUuid(`${input.seed}:${variantKey}`),
      seed: input.seed,
      primary_skill: base.recommendation.candidate.skill.slug,
      quest_type: base.quest.identity.type,
      concepts: [concept],
      constraints: recipes[variantKey],
      ...(tuning ? { tuning } : {}),
    });
    const absolute = evaluateAbsoluteQuestDemand(generated.quest);
    const novelty = contextNovelty(generated.quest);
    const personal = resolvePlayerRelativeDifficulty({
      quest: generated.quest,
      absolute_profile: absolute,
      skill_states: [primary],
      context_novelty: novelty,
      evaluated_at: input.recommendation_set.evaluated_at,
      player_state_version: stateVersion,
    });
    return { variant_key: variantKey, quest: generated.quest, personal_difficulty: personal };
  });

  const preference = input.recommendation_set.player_context
    .challenge_preference as TrainingChallengePreference;
  const target = TRAINING_CHALLENGE_TARGETS[preference];
  let selected = variants.find((variant) => variant.variant_key === "BASE")!;
  let fit: TrainingAdaptationFit = "PRIMARY_UNRATED_CALIBRATION_FALLBACK";
  let preferenceApplied = false;
  if (primary.assessment_status !== "UNRATED") {
    preferenceApplied = true;
    selected = [...variants].sort((left, right) => {
      const leftLevel = target.level_order.indexOf(left.personal_difficulty.personal_level!);
      const rightLevel = target.level_order.indexOf(right.personal_difficulty.personal_level!);
      return (
        leftLevel - rightLevel ||
        Math.abs(left.personal_difficulty.primary_gap! - target.primary_gap_anchor) -
          Math.abs(right.personal_difficulty.primary_gap! - target.primary_gap_anchor) ||
        UNCERTAINTY_ORDER[left.personal_difficulty.uncertainty] -
          UNCERTAINTY_ORDER[right.personal_difficulty.uncertainty] ||
        VARIANT_ORDER.indexOf(left.variant_key) - VARIANT_ORDER.indexOf(right.variant_key)
      );
    })[0]!;
    fit =
      selected.personal_difficulty.personal_level === target.level_order[0]
        ? "EXACT_PREFERRED_BAND"
        : "CLOSEST_AVAILABLE_BAND";
  }

  const selectedQuest = input.id
    ? generateTrainingQuest({
        id: input.id,
        seed: input.seed,
        primary_skill: base.recommendation.candidate.skill.slug,
        quest_type: base.quest.identity.type,
        concepts: [concept],
        constraints: recipes[selected.variant_key],
        ...(tuning ? { tuning } : {}),
      }).quest
    : selected.quest;
  const context = contextNovelty(selectedQuest);
  const personal = resolvePlayerRelativeDifficulty({
    quest: selectedQuest,
    absolute_profile: evaluateAbsoluteQuestDemand(selectedQuest),
    skill_states: [primary],
    context_novelty: context,
    evaluated_at: input.recommendation_set.evaluated_at,
    player_state_version: stateVersion,
  });
  const adaptation: TrainingAdaptationProvenanceV1 = {
    adaptation_model_version: TRAINING_ADAPTATION_MODEL_VERSION,
    challenge_target_version: TRAINING_CHALLENGE_TARGET_VERSION,
    variant_catalog_version: TRAINING_VARIANT_CATALOG_VERSION,
    challenge_preference: preference,
    preference_applied: preferenceApplied,
    fit,
    selected_variant_key: selected.variant_key,
    target_level_order: [...target.level_order],
    target_gap_anchor: target.primary_gap_anchor,
    personal_difficulty: personal,
    context_novelty: context,
    evaluated_variants: variants.map((variant) => ({
      variant_key: variant.variant_key,
      absolute_level: variant.personal_difficulty.absolute_demand.overall_level,
      absolute_score: variant.personal_difficulty.absolute_demand.overall_score,
      personal_status: variant.personal_difficulty.status,
      personal_level: variant.personal_difficulty.personal_level,
      uncertainty: variant.personal_difficulty.uncertainty,
      primary_gap: variant.personal_difficulty.primary_gap,
    })),
  };
  const quest = parseQuest({
    ...selectedQuest,
    metadata: {
      ...selectedQuest.metadata,
      training_recommendation: base.provenance,
      training_adaptation: adaptation,
    },
  });
  return {
    quest,
    persistence: toQuestPersistenceInput(quest),
    recommendation: base.recommendation,
    provenance: base.provenance,
    adaptation,
    variants,
  };
}

export function comparePersonalChallenge(
  left: PlayerRelativeDifficultyEvaluation,
  right: PlayerRelativeDifficultyEvaluation,
): number {
  const levels: Array<DifficultyLevel | null> = [null, "I", "II", "III", "IV", "V"];
  return (
    levels.indexOf(left.personal_level) - levels.indexOf(right.personal_level) ||
    (left.primary_gap ?? Number.NEGATIVE_INFINITY) - (right.primary_gap ?? Number.NEGATIVE_INFINITY)
  );
}
