import { generateTrainingQuest, type GeneratedQuest } from "@/lib/quest/generator";
import { parseQuest, toQuestPersistenceInput } from "@/lib/quest/runtime";
import type {
  RankedRecommendationCandidateV1,
  RankedRecommendationSetV1,
} from "@/lib/training/scoring-v1";

export const TRAINING_MATERIALIZATION_MODEL_VERSION = "TRN_MAT_V1" as const;

export type TrainingSelectionMode =
  "UNIQUE_TOP_ACCEPTED" | "TOP_TIE_USER_SELECTED" | "ALTERNATIVE_USER_SELECTED";

export type TrainingRecommendationProvenanceV1 = {
  materialization_model_version: typeof TRAINING_MATERIALIZATION_MODEL_VERSION;
  candidate_model_version: "TRN_CAND_V1";
  scoring_model_version: "TRN_SCORE_V1";
  candidate_key: string;
  evaluated_at: string;
  semantic_rank: number;
  recommendation_priority_score: number;
  top_tie_count: number;
  selection_mode: TrainingSelectionMode;
  components: Array<{
    key: string;
    points: number;
    max_points: number;
    explanation_codes: string[];
  }>;
};

export type MaterializedTrainingQuestV1 = GeneratedQuest & {
  recommendation: RankedRecommendationCandidateV1;
  provenance: TrainingRecommendationProvenanceV1;
};

function validateSelection(
  set: RankedRecommendationSetV1,
  recommendation: RankedRecommendationCandidateV1,
  mode: TrainingSelectionMode,
) {
  const isTop = recommendation.recommendation_priority_score === set.top_score;
  if (
    (mode === "UNIQUE_TOP_ACCEPTED" &&
      set.unique_top_candidate_key !== recommendation.candidate.candidate_key) ||
    (mode === "TOP_TIE_USER_SELECTED" && (set.diagnostics.top_tie_count < 2 || !isTop)) ||
    (mode === "ALTERNATIVE_USER_SELECTED" && isTop)
  )
    throw new Error(`TRN_MAT_V1 selection mode ${mode} does not match the selected candidate`);
}

export function materializeTrainingQuestV1(input: {
  recommendation_set: RankedRecommendationSetV1;
  candidate_key: string;
  selection_mode: TrainingSelectionMode;
  seed?: string | number;
  id?: string;
}): MaterializedTrainingQuestV1 {
  const recommendation = input.recommendation_set.ranked_candidates.find(
    (item) => item.candidate.candidate_key === input.candidate_key,
  );
  if (!recommendation) throw new Error("TRN_MAT_V1 selected candidate is unavailable");
  validateSelection(input.recommendation_set, recommendation, input.selection_mode);

  const provenance: TrainingRecommendationProvenanceV1 = {
    materialization_model_version: TRAINING_MATERIALIZATION_MODEL_VERSION,
    candidate_model_version: input.recommendation_set.candidate_model_version,
    scoring_model_version: input.recommendation_set.scoring_model_version,
    candidate_key: recommendation.candidate.candidate_key,
    evaluated_at: input.recommendation_set.evaluated_at,
    semantic_rank: recommendation.semantic_rank,
    recommendation_priority_score: recommendation.recommendation_priority_score,
    top_tie_count: input.recommendation_set.diagnostics.top_tie_count,
    selection_mode: input.selection_mode,
    components: recommendation.components.map((component) => ({
      key: component.key,
      points: component.points,
      max_points: component.max_points,
      explanation_codes: [...component.explanation_codes],
    })),
  };
  const generated = generateTrainingQuest({
    id: input.id,
    seed: input.seed,
    primary_skill: recommendation.candidate.skill.slug,
    ...(input.recommendation_set.player_context.default_tuning
      ? { tuning: input.recommendation_set.player_context.default_tuning.slug }
      : {}),
  });
  const quest = parseQuest({
    ...generated.quest,
    metadata: {
      ...generated.quest.metadata,
      training_recommendation: provenance,
    },
  });
  return {
    quest,
    persistence: toQuestPersistenceInput(quest),
    recommendation: structuredClone(recommendation),
    provenance,
  };
}
