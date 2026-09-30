import type {
  RecommendationCandidateSetV1,
  RecommendationCandidateV1,
  TrainingIntent,
} from "./candidates-v1";

export const TRAINING_SCORING_MODEL_VERSION = "TRN_SCORE_V1" as const;
export const TRAINING_RANKING_SEMANTICS = "SCORE_DESCENDING_DENSE_RANK" as const;

export type ScoreComponentKey =
  "INTENT_NEED" | "PROFICIENCY_NEED" | "EVIDENCE_NEED" | "GOAL_ALIGNMENT" | "ROTATION_NEED";

export type ScoreExplanationCode =
  | "INTENT_REFRESH"
  | "INTENT_DEVELOPMENT"
  | "INTENT_CALIBRATION"
  | "INTENT_MAINTENANCE"
  | "PROFICIENCY_NEED"
  | "EVIDENCE_NEED"
  | "GOAL_SKILL"
  | "GOAL_DOMAIN"
  | "RECENCY_NEED"
  | "LOW_EXPOSURE";

export type ScoreComponent = {
  key: ScoreComponentKey;
  points: number;
  max_points: number;
  explanation_codes: ScoreExplanationCode[];
  evidence: Record<string, string | number | boolean | null>;
};

export type RankedRecommendationCandidateV1 = {
  semantic_rank: number;
  recommendation_priority_score: number;
  components: ScoreComponent[];
  candidate: RecommendationCandidateV1;
};

export type RankedRecommendationSetV1 = {
  scoring_model_version: typeof TRAINING_SCORING_MODEL_VERSION;
  candidate_model_version: "TRN_CAND_V1";
  evaluated_at: string;
  ranking_semantics: typeof TRAINING_RANKING_SEMANTICS;
  generator_version: "QST_GEN_V1";
  generator_rule_version: "QST_GEN_RULES_V1";
  player_context: RecommendationCandidateSetV1["player_context"];
  ranked_candidates: RankedRecommendationCandidateV1[];
  top_score: number | null;
  top_candidate_keys: string[];
  unique_top_candidate_key: string | null;
  diagnostics: RecommendationCandidateSetV1["diagnostics"] & {
    scored_candidate_count: number;
    minimum_score: number | null;
    maximum_score: number | null;
    top_tie_count: number;
  };
};

const INTENT_POINTS: Record<TrainingIntent, number> = {
  REFRESH: 30,
  DEVELOPMENT: 28,
  CALIBRATION: 24,
  MAINTENANCE: 10,
};

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function requireRange(value: number, minimum: number, maximum: number, label: string) {
  if (!Number.isFinite(value) || value < minimum || value > maximum)
    throw new Error(`TRN_SCORE_V1 ${label} must be ${minimum}-${maximum}`);
}

function validateCandidate(candidate: RecommendationCandidateV1) {
  const state = candidate.skill;
  requireRange(state.confidence_score, 0, 100, "confidence_score");
  if (!Number.isSafeInteger(state.exposure_count) || state.exposure_count < 0)
    throw new Error("TRN_SCORE_V1 exposure_count must be a nonnegative integer");
  if (state.proficiency_score !== null)
    requireRange(state.proficiency_score, 0, 100, "proficiency_score");
  if (state.last_practiced_at && Number.isNaN(Date.parse(state.last_practiced_at)))
    throw new Error("TRN_SCORE_V1 last_practiced_at is invalid");

  const expected =
    state.assessment_status === "UNRATED"
      ? "CALIBRATION"
      : state.readiness_status === "LOW"
        ? "REFRESH"
        : state.assessment_status === "ESTIMATED"
          ? "DEVELOPMENT"
          : "MAINTENANCE";
  if (candidate.intent !== expected)
    throw new Error(`TRN_SCORE_V1 intent ${candidate.intent} is inconsistent with Skill state`);
  if (state.assessment_status === "UNRATED" && state.readiness_status !== "UNKNOWN")
    throw new Error("TRN_SCORE_V1 UNRATED Skill readiness must be UNKNOWN");
  if (state.assessment_status !== "UNRATED" && state.proficiency_score === null)
    throw new Error("TRN_SCORE_V1 rated Skill requires proficiency_score");
}

export function intentNeedV1(intent: TrainingIntent): ScoreComponent {
  return {
    key: "INTENT_NEED",
    points: INTENT_POINTS[intent],
    max_points: 30,
    explanation_codes: [`INTENT_${intent}` as ScoreExplanationCode],
    evidence: { intent },
  };
}

export function proficiencyNeedV1(candidate: RecommendationCandidateV1): ScoreComponent {
  const state = candidate.skill;
  const reliability = 0.5 + 0.5 * (state.confidence_score / 100);
  const points =
    state.assessment_status === "UNRATED"
      ? 0
      : round(20 * (1 - state.proficiency_score! / 100) * reliability);
  return {
    key: "PROFICIENCY_NEED",
    points,
    max_points: 20,
    explanation_codes: points ? ["PROFICIENCY_NEED"] : [],
    evidence: {
      assessment_status: state.assessment_status,
      proficiency_score: state.proficiency_score,
      confidence_score: state.confidence_score,
      confidence_reliability: round(reliability),
    },
  };
}

export function evidenceNeedV1(candidate: RecommendationCandidateV1): ScoreComponent {
  const state = candidate.skill;
  const points =
    state.assessment_status === "UNRATED"
      ? 15
      : state.assessment_status === "ESTIMATED"
        ? round(15 * clamp((60 - state.confidence_score) / 60, 0, 1))
        : 0;
  return {
    key: "EVIDENCE_NEED",
    points,
    max_points: 15,
    explanation_codes: points ? ["EVIDENCE_NEED"] : [],
    evidence: {
      assessment_status: state.assessment_status,
      confidence_score: state.confidence_score,
      evidence_count: state.evidence_count,
    },
  };
}

export function goalAlignmentV1(candidate: RecommendationCandidateV1): ScoreComponent {
  const skill = candidate.goal_matches.some((match) => match.match === "SKILL");
  const domain = candidate.goal_matches.some((match) => match.match === "DOMAIN");
  return {
    key: "GOAL_ALIGNMENT",
    points: skill ? 20 : domain ? 10 : 0,
    max_points: 20,
    explanation_codes: skill ? ["GOAL_SKILL"] : domain ? ["GOAL_DOMAIN"] : [],
    evidence: {
      skill_match: skill,
      domain_match: domain,
      matched_goal_count: candidate.goal_matches.length,
    },
  };
}

export function recencyNeedV1(lastPracticedAt: string | null, evaluatedAt: string): number {
  if (!lastPracticedAt) return 10;
  const age = Math.max(0, (Date.parse(evaluatedAt) - Date.parse(lastPracticedAt)) / 86_400_000);
  if (age > 30) return 10;
  if (age > 7) return 7;
  if (age > 1) return 3;
  return 0;
}

export function exposureNeedV1(exposureCount: number): number {
  if (exposureCount === 0) return 5;
  if (exposureCount <= 2) return 4;
  if (exposureCount <= 5) return 2;
  return 0;
}

export function rotationNeedV1(
  candidate: RecommendationCandidateV1,
  evaluatedAt: string,
): ScoreComponent {
  const recency = recencyNeedV1(candidate.skill.last_practiced_at, evaluatedAt);
  const exposure = exposureNeedV1(candidate.skill.exposure_count);
  return {
    key: "ROTATION_NEED",
    points: recency + exposure,
    max_points: 15,
    explanation_codes: [
      ...(recency ? (["RECENCY_NEED"] as const) : []),
      ...(exposure ? (["LOW_EXPOSURE"] as const) : []),
    ],
    evidence: {
      last_practiced_at: candidate.skill.last_practiced_at,
      exposure_count: candidate.skill.exposure_count,
      recency_points: recency,
      exposure_points: exposure,
    },
  };
}

export function scoreRecommendationCandidateV1(
  candidate: RecommendationCandidateV1,
  evaluatedAt: string,
): Omit<RankedRecommendationCandidateV1, "semantic_rank"> {
  if (Number.isNaN(Date.parse(evaluatedAt)))
    throw new Error("TRN_SCORE_V1 evaluated_at is invalid");
  validateCandidate(candidate);
  const components = [
    intentNeedV1(candidate.intent),
    proficiencyNeedV1(candidate),
    evidenceNeedV1(candidate),
    goalAlignmentV1(candidate),
    rotationNeedV1(candidate, evaluatedAt),
  ];
  const total = round(
    clamp(
      components.reduce((sum, component) => sum + component.points, 0),
      0,
      100,
    ),
  );
  return {
    recommendation_priority_score: total,
    components,
    candidate: structuredClone(candidate),
  };
}

export function denseRankRecommendationScoresV1(
  candidates: Array<Omit<RankedRecommendationCandidateV1, "semantic_rank">>,
): RankedRecommendationCandidateV1[] {
  const scored = candidates.map((candidate, stableIndex) => ({ ...candidate, stableIndex }));
  scored.sort(
    (left, right) =>
      right.recommendation_priority_score - left.recommendation_priority_score ||
      left.stableIndex - right.stableIndex,
  );
  let semanticRank = 0;
  let previousScore: number | null = null;
  return scored.map((scoredCandidate) => {
    const { stableIndex, ...candidate } = scoredCandidate;
    void stableIndex;
    if (previousScore === null || candidate.recommendation_priority_score !== previousScore) {
      semanticRank += 1;
      previousScore = candidate.recommendation_priority_score;
    }
    return { ...candidate, semantic_rank: semanticRank };
  });
}

export function rankRecommendationCandidatesV1(
  candidateSet: RecommendationCandidateSetV1,
): RankedRecommendationSetV1 {
  if (candidateSet.model_version !== "TRN_CAND_V1")
    throw new Error("TRN_SCORE_V1 requires TRN_CAND_V1 candidates");
  if (Number.isNaN(Date.parse(candidateSet.evaluated_at)))
    throw new Error("TRN_SCORE_V1 evaluated_at is invalid");

  const ranked = denseRankRecommendationScoresV1(
    candidateSet.candidates.map((candidate) =>
      scoreRecommendationCandidateV1(candidate, candidateSet.evaluated_at),
    ),
  );
  const topScore = ranked[0]?.recommendation_priority_score ?? null;
  const topKeys = ranked
    .filter((candidate) => candidate.recommendation_priority_score === topScore)
    .map((candidate) => candidate.candidate.candidate_key);
  const scores = ranked.map((candidate) => candidate.recommendation_priority_score);

  return {
    scoring_model_version: TRAINING_SCORING_MODEL_VERSION,
    candidate_model_version: candidateSet.model_version,
    evaluated_at: candidateSet.evaluated_at,
    ranking_semantics: TRAINING_RANKING_SEMANTICS,
    generator_version: candidateSet.generator_version,
    generator_rule_version: candidateSet.generator_rule_version,
    player_context: structuredClone(candidateSet.player_context),
    ranked_candidates: ranked,
    top_score: topScore,
    top_candidate_keys: topKeys,
    unique_top_candidate_key: topKeys.length === 1 ? topKeys[0]! : null,
    diagnostics: {
      ...structuredClone(candidateSet.diagnostics),
      scored_candidate_count: ranked.length,
      minimum_score: scores.length ? Math.min(...scores) : null,
      maximum_score: scores.length ? Math.max(...scores) : null,
      top_tie_count: topKeys.length,
    },
  };
}
