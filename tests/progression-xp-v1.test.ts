import { describe, expect, it } from "vitest";

import {
  calculateXpV1,
  characterLevelThresholdV1,
  deriveCharacterLevelV1,
} from "@/lib/progression/xp-v1";

describe("XP_V1", () => {
  it.each([
    [0, "ABANDONED", false, 0],
    [59, "ATTEMPTED", true, 1],
    [60, "ATTEMPTED", true, 2],
    [600, "ATTEMPTED", true, 11],
    [600, "PARTIAL", true, 13],
    [600, "CLEARED", true, 15],
    [612, "CLEARED", true, 15],
    [899, "CLEARED", true, 19],
    [900, "CLEARED", true, 20],
  ] as const)(
    "awards %i seconds / %s / meaningful=%s as %i XP",
    (seconds, outcome, meaningful, xp) => {
      expect(calculateXpV1(seconds, outcome, meaningful).totalXp).toBe(xp);
    },
  );

  it("keeps nonmeaningful active time ineligible for minute and outcome XP", () => {
    expect(calculateXpV1(612, "CLEARED", false)).toMatchObject({
      eligiblePracticeSeconds: 0,
      completedPracticeMinutes: 0,
      outcomeBonusXp: 0,
      totalXp: 0,
    });
  });
});

describe("CHAR_V1", () => {
  it("uses explicit monotonic quadratic thresholds", () => {
    expect([1, 2, 3, 4, 5].map(characterLevelThresholdV1)).toEqual([0, 100, 400, 900, 1600]);
  });

  it.each([
    [0, 1],
    [99, 1],
    [100, 2],
    [399, 2],
    [400, 3],
    [899, 3],
    [900, 4],
    [10_000, 11],
  ])("derives %i XP as Level %i", (xp, level) => {
    expect(deriveCharacterLevelV1(xp)).toBe(level);
  });
});
