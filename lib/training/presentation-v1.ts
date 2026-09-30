import type {
  RankedRecommendationCandidateV1,
  RankedRecommendationSetV1,
  ScoreExplanationCode,
} from "./scoring-v1";

export const INTENT_LABELS = {
  CALIBRATION: "Build a starting estimate",
  REFRESH: "Refresh current readiness",
  DEVELOPMENT: "Develop and strengthen evidence",
  MAINTENANCE: "Maintain established ability",
} as const;

const EXPLANATIONS: Record<ScoreExplanationCode, string> = {
  INTENT_CALIBRATION: "We need more evidence for this Skill.",
  INTENT_REFRESH: "Your demonstrated ability is ahead of your current readiness.",
  INTENT_DEVELOPMENT: "This Skill is still an estimate and can benefit from more development.",
  INTENT_MAINTENANCE: "This Skill is established and remains available for maintenance.",
  GOAL_SKILL: "This directly matches one of your structured goals.",
  GOAL_DOMAIN: "This matches one of your goal areas.",
  RECENCY_NEED: "You haven't practiced this recently.",
  LOW_EXPOSURE: "You have limited recorded exposure to this Skill.",
  PROFICIENCY_NEED: "Current evidence suggests room for development.",
  EVIDENCE_NEED: "The system is still uncertain about this estimate.",
};

export type TrainingRecommendationView = {
  key: string;
  rank: number;
  skill: string;
  domain: string;
  intent: keyof typeof INTENT_LABELS;
  intentLabel: string;
  score: string;
  reasons: string[];
  source: RankedRecommendationCandidateV1;
};

export function recommendationReasons(candidate: RankedRecommendationCandidateV1): string[] {
  return [
    ...new Set(
      candidate.components.flatMap((component) =>
        component.explanation_codes.map((code) => EXPLANATIONS[code]),
      ),
    ),
  ];
}

export function trainingPresentationV1(set: RankedRecommendationSetV1) {
  const recommendations: TrainingRecommendationView[] = set.ranked_candidates.map((item) => ({
    key: item.candidate.candidate_key,
    rank: item.semantic_rank,
    skill: item.candidate.skill.name,
    domain: item.candidate.skill.domain_name,
    intent: item.candidate.intent,
    intentLabel: INTENT_LABELS[item.candidate.intent],
    score: item.recommendation_priority_score.toFixed(2),
    reasons: recommendationReasons(item),
    source: item,
  }));
  return {
    recommendations,
    top: recommendations.filter((item) => item.rank === 1),
    uniqueTop: set.unique_top_candidate_key
      ? (recommendations.find((item) => item.key === set.unique_top_candidate_key) ?? null)
      : null,
    initialSelectionKey: set.unique_top_candidate_key,
    isTopTie: set.diagnostics.top_tie_count > 1,
    missingProjectionCount: set.diagnostics.missing_player_skill_state.length,
    hasUnmappedGoals:
      set.diagnostics.unsupported_goal_skill.length > 0 ||
      set.diagnostics.unparsed_objective_goal.length > 0,
  };
}
