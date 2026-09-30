import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("TRN-001 product boundary", () => {
  it("leaves the Training route as its FoundationPage placeholder", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../app/training/page.tsx"), "utf8");
    expect(source).toContain("<FoundationPage");
    expect(source).not.toContain("RecommendationCandidate");
  });
});
