import { describe, expect, it } from "vitest";
import {
  attributeContributorWeightV1,
  evaluateAttributeV1,
  type AttributeContributor,
} from "@/lib/progression/attributes-v1";

const unrated: AttributeContributor = {
  assessmentStatus: "UNRATED",
  proficiencyScore: null,
  confidenceScore: 0,
};
const rated = (
  score: number,
  confidence: number,
  established = false,
  readinessStatus: AttributeContributor["readinessStatus"] = "HIGH",
): AttributeContributor => ({
  assessmentStatus: established ? "ESTABLISHED" : "ESTIMATED",
  proficiencyScore: score,
  confidenceScore: confidence,
  readinessStatus,
});

describe("ATTR_V1", () => {
  it("uses the explicit contributor-confidence formula", () => {
    expect([0, 20, 60, 100].map(attributeContributorWeightV1)).toEqual([0.25, 0.4, 0.7, 1]);
  });

  it("keeps no-evidence Attributes UNASSESSED", () => {
    expect(evaluateAttributeV1([unrated, unrated])).toMatchObject({
      status: "UNASSESSED",
      score: null,
      ratedContributorCount: 0,
      coverageRatio: 0,
    });
  });

  it("implements PROG-FIX-013 by excluding unrated contributors from score", () => {
    expect(evaluateAttributeV1([rated(62, 78, true), unrated])).toMatchObject({
      status: "ESTIMATED",
      score: 62,
      totalContributorCount: 2,
      ratedContributorCount: 1,
      coverageRatio: 0.5,
    });
  });

  it("calculates the exact confidence-weighted aggregate", () => {
    const evaluation = evaluateAttributeV1([rated(80, 100), rated(40, 20), unrated]);
    expect(evaluation.score).toBe(68.57);
    expect(evaluation.meanContributorConfidence).toBe(60);
    expect(evaluation.coverageRatio).toBeCloseTo(2 / 3);
  });

  it("requires all establishment gates and protects against one high Skill", () => {
    expect(evaluateAttributeV1([rated(99, 100, true), unrated, unrated])).toMatchObject({
      status: "ESTIMATED",
      score: 99,
    });
    expect(evaluateAttributeV1([rated(70, 80, true), rated(60, 70, true), unrated])).toMatchObject({
      status: "ESTABLISHED",
    });
    expect(evaluateAttributeV1([rated(70, 80, true), rated(60, 70, false), unrated]).status).toBe(
      "ESTIMATED",
    );
    expect(evaluateAttributeV1([rated(70, 50, true), rated(60, 50, true), unrated]).status).toBe(
      "ESTIMATED",
    );
    expect(
      evaluateAttributeV1([rated(70, 80, true), rated(60, 70, true), unrated, unrated]).status,
    ).toBe("ESTIMATED");
  });

  it("ignores readiness and XP-like concerns entirely", () => {
    const high = evaluateAttributeV1([rated(55.3, 20, false, "HIGH"), unrated]);
    const low = evaluateAttributeV1([rated(55.3, 20, false, "LOW"), unrated]);
    expect(low).toEqual(high);
  });

  it("dampens one Skill's eight-point movement with multiple contributors", () => {
    const before = evaluateAttributeV1([rated(50, 80), rated(60, 80), rated(70, 80)]).score!;
    const after = evaluateAttributeV1([rated(58, 80), rated(60, 80), rated(70, 80)]).score!;
    expect(after - before).toBeGreaterThan(0);
    expect(after - before).toBeLessThan(8);
  });
});
