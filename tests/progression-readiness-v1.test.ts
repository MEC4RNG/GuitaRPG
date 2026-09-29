import { describe, expect, it } from "vitest";
import { evaluateReadinessV1, readinessStatusForAge } from "@/lib/progression/readiness-v1";

const evaluatedAt = "2026-09-29T12:00:00.000Z";
const daysAgo = (days: number, extraMilliseconds = 0) =>
  new Date(Date.parse(evaluatedAt) - days * 86_400_000 - extraMilliseconds).toISOString();
const rated = (
  lastPracticedAt: string | null,
  assessmentStatus: "ESTIMATED" | "ESTABLISHED" = "ESTIMATED",
) =>
  evaluateReadinessV1({ assessmentStatus, proficiencyScore: 55.3, lastPracticedAt, evaluatedAt });

describe("READY_V1", () => {
  it("keeps UNRATED Skills UNKNOWN regardless of recency", () => {
    expect(
      evaluateReadinessV1({
        assessmentStatus: "UNRATED",
        proficiencyScore: null,
        lastPracticedAt: evaluatedAt,
        evaluatedAt,
      }),
    ).toMatchObject({ status: "UNKNOWN", score: null, reasonCode: "UNRATED_UNKNOWN" });
  });

  it.each([
    [0, 0, "HIGH", 55.3],
    [7, 0, "HIGH", 55.3],
    [7, 1, "MODERATE", 44.24],
    [30, 0, "MODERATE", 44.24],
    [30, 1, "LOW", 33.18],
  ] as const)("maps %s days plus %s ms to %s", (days, milliseconds, status, score) => {
    expect(rated(daysAgo(days, milliseconds))).toMatchObject({ status, score });
  });

  it("clamps future practice age to zero", () => {
    expect(rated(new Date(Date.parse(evaluatedAt) + 60_000).toISOString())).toMatchObject({
      status: "HIGH",
      score: 55.3,
      ageSeconds: 0,
    });
  });

  it("preserves an auditable rated baseline when recency is unknown", () => {
    expect(
      evaluateReadinessV1({
        assessmentStatus: "ESTABLISHED",
        proficiencyScore: 57,
        lastPracticedAt: null,
        evaluatedAt,
        preservedBaseline: { status: "MODERATE", score: 44 },
      }),
    ).toMatchObject({ status: "MODERATE", score: 44, reasonCode: "BASELINE_PRESERVED" });
  });

  it("implements PROG-FIX-011 without changing proficiency", () => {
    const evaluation = evaluateReadinessV1({
      assessmentStatus: "ESTABLISHED",
      proficiencyScore: 57,
      lastPracticedAt: daysAgo(61),
      evaluatedAt,
    });
    expect(evaluation).toMatchObject({ status: "LOW", score: 34.2 });
  });

  it("exposes exact inclusive boundary semantics", () => {
    expect(readinessStatusForAge(7 * 86_400)).toBe("HIGH");
    expect(readinessStatusForAge(7 * 86_400 + 0.001)).toBe("MODERATE");
    expect(readinessStatusForAge(30 * 86_400)).toBe("MODERATE");
    expect(readinessStatusForAge(30 * 86_400 + 0.001)).toBe("LOW");
  });
});
