import { describe, expect, it } from "vitest";
import {
  applySkillProgressionV1,
  challengeBand,
  normalizeEvidenceConfidence,
  skillDemandScore,
} from "@/lib/progression/skill-v1";

const unrated = {
  assessment: "UNRATED",
  score: null,
  confidence: 0,
  informativeResults: 0,
  distinctSessions: 0,
  recentDirections: [],
  identicalEasyClears: 0,
} as const;

describe("PROF_V1 / CONF_V1", () => {
  it("uses the canonical 65/35 dimension/overall demand and overall fallback", () => {
    expect(skillDemandScore(56, 54)).toBe(55.3);
    expect(skillDemandScore(null, 54)).toBe(54);
  });

  it("keeps unrated challenge unknown while producing a conservative first estimate", () => {
    expect(challengeBand(55.3, null)).toBe("UNKNOWN");
    const result = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "CLEARED",
      confidenceSummary: "MIXED",
      demandScore: 55.3,
      previous: unrated,
    });
    expect(result).toMatchObject({
      score: 55.3,
      level: "III",
      confidence: 20,
      assessment: "ESTIMATED",
      evidenceConfidence: "MODERATE",
    });
  });

  it("does not treat a nonmeaningful abandoned Result as exposure or evidence", () => {
    expect(
      applySkillProgressionV1({
        meaningfulAttempt: false,
        outcome: "ABANDONED",
        confidenceSummary: "HIGH",
        demandScore: 80,
        previous: unrated,
      }),
    ).toMatchObject({
      exposure: false,
      evidence: false,
      score: null,
      confidence: 0,
      assessment: "UNRATED",
    });
  });

  it("caps one-result movement and prevents a first Result from Level V or ESTABLISHED", () => {
    const first = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "CLEARED",
      confidenceSummary: "HIGH",
      demandScore: 100,
      previous: unrated,
    });
    expect(first.score).toBe(79);
    const moved = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "CLEARED",
      confidenceSummary: "HIGH",
      demandScore: 100,
      previous: { ...unrated, assessment: "ESTIMATED", score: 40 },
    });
    expect(Math.abs(moved.appliedDelta)).toBeLessThanOrEqual(8);
  });

  it("attenuates repeated identical easy clears without changing the base policy", () => {
    const previous = { ...unrated, assessment: "ESTIMATED", score: 70, confidence: 30 } as const;
    const first = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "CLEARED",
      confidenceSummary: "HIGH",
      demandScore: 10,
      previous,
    });
    const repeated = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "CLEARED",
      confidenceSummary: "HIGH",
      demandScore: 10,
      previous: { ...previous, identicalEasyClears: 3 },
    });
    expect(repeated.appliedDelta).toBeLessThan(first.appliedDelta);
    expect(repeated.repetitionFactor).toBe(0.25);
  });

  it("requires repeated directional support to cross an established band", () => {
    const previous = {
      ...unrated,
      assessment: "ESTABLISHED",
      score: 59,
      confidence: 80,
      informativeResults: 5,
      distinctSessions: 5,
    } as const;
    const single = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "CLEARED",
      confidenceSummary: "HIGH",
      demandScore: 65,
      previous,
    });
    expect(single.score).toBe(59.99);
    const supported = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "CLEARED",
      confidenceSummary: "HIGH",
      demandScore: 65,
      previous: { ...previous, recentDirections: [1] },
    });
    expect(supported.score).toBeGreaterThanOrEqual(60);
  });

  it("normalizes mixed evidence and blocks establishment under contradiction", () => {
    expect(normalizeEvidenceConfidence("MIXED")).toBe("MODERATE");
    const result = applySkillProgressionV1({
      meaningfulAttempt: true,
      outcome: "CLEARED",
      confidenceSummary: "HIGH",
      demandScore: 55,
      previous: {
        assessment: "ESTIMATED",
        score: 50,
        confidence: 50,
        informativeResults: 2,
        distinctSessions: 2,
        recentDirections: [-1],
        identicalEasyClears: 0,
      },
    });
    expect(result).toMatchObject({ contradiction: true, assessment: "ESTIMATED" });
  });
});
