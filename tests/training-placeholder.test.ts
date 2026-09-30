import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("TRN-003 product boundary", () => {
  it("replaces the Training placeholder with the accepted integration surface", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../app/training/page.tsx"), "utf8");
    const surface = readFileSync(
      resolve(import.meta.dirname, "../components/training-surface.tsx"),
      "utf8",
    );
    expect(source).toContain("<TrainingSurface");
    expect(source).not.toContain("FoundationPage");
    expect(surface).toContain("readRankedRecommendationsV1");
    expect(surface).toContain("materializeTrainingQuestV1");
    expect(surface).toContain("startGeneratedQuestPractice");
    expect(surface).not.toContain("service_role");
  });
});
