export const ATTRIBUTE_MODEL_VERSION = "ATTR_V1" as const;
export const ATTRIBUTE_GRAPH_VERSION = "ATTRIBUTE_GRAPH_V1" as const;

export type AttributeContributor = {
  assessmentStatus: "UNRATED" | "ESTIMATED" | "ESTABLISHED";
  proficiencyScore: number | null;
  confidenceScore: number;
  readinessStatus?: "UNKNOWN" | "LOW" | "MODERATE" | "HIGH";
};

export type AttributeEvaluationV1 = {
  status: "UNASSESSED" | "ESTIMATED" | "ESTABLISHED";
  score: number | null;
  totalContributorCount: number;
  ratedContributorCount: number;
  establishedContributorCount: number;
  coverageRatio: number;
  meanContributorConfidence: number | null;
  modelVersion: typeof ATTRIBUTE_MODEL_VERSION;
  graphVersion: typeof ATTRIBUTE_GRAPH_VERSION;
};

export function attributeContributorWeightV1(confidenceScore: number): number {
  if (!Number.isFinite(confidenceScore) || confidenceScore < 0 || confidenceScore > 100)
    throw new Error("ATTR_V1 confidence must be between 0 and 100");
  return 0.25 + 0.75 * (confidenceScore / 100);
}

export function evaluateAttributeV1(
  contributors: readonly AttributeContributor[],
): AttributeEvaluationV1 {
  if (contributors.length === 0) throw new Error("ATTR_V1 requires canonical graph contributors");
  const rated = contributors.filter((contributor) => contributor.assessmentStatus !== "UNRATED");
  for (const contributor of rated) {
    if (
      contributor.proficiencyScore === null ||
      contributor.proficiencyScore < 0 ||
      contributor.proficiencyScore > 100
    )
      throw new Error("ATTR_V1 rated contributors require proficiency in 0-100");
    attributeContributorWeightV1(contributor.confidenceScore);
  }
  if (rated.length === 0)
    return {
      status: "UNASSESSED",
      score: null,
      totalContributorCount: contributors.length,
      ratedContributorCount: 0,
      establishedContributorCount: 0,
      coverageRatio: 0,
      meanContributorConfidence: null,
      modelVersion: ATTRIBUTE_MODEL_VERSION,
      graphVersion: ATTRIBUTE_GRAPH_VERSION,
    };

  const weightedTotal = rated.reduce(
    (sum, contributor) =>
      sum +
      contributor.proficiencyScore! * attributeContributorWeightV1(contributor.confidenceScore),
    0,
  );
  const weightTotal = rated.reduce(
    (sum, contributor) => sum + attributeContributorWeightV1(contributor.confidenceScore),
    0,
  );
  const score = Math.round((weightedTotal / weightTotal) * 100) / 100;
  const coverageRatio = rated.length / contributors.length;
  const meanContributorConfidence =
    rated.reduce((sum, contributor) => sum + contributor.confidenceScore, 0) / rated.length;
  const establishedContributorCount = rated.filter(
    (contributor) => contributor.assessmentStatus === "ESTABLISHED",
  ).length;
  const status =
    coverageRatio >= 0.6 && meanContributorConfidence >= 60 && establishedContributorCount >= 2
      ? "ESTABLISHED"
      : "ESTIMATED";
  return {
    status,
    score,
    totalContributorCount: contributors.length,
    ratedContributorCount: rated.length,
    establishedContributorCount,
    coverageRatio,
    meanContributorConfidence: Math.round(meanContributorConfidence * 100) / 100,
    modelVersion: ATTRIBUTE_MODEL_VERSION,
    graphVersion: ATTRIBUTE_GRAPH_VERSION,
  };
}
