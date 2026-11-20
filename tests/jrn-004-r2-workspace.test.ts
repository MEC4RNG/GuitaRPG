import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const journey = readFileSync("components/quest-journey-surface.tsx", "utf8");
const persistence = readFileSync("components/workbook-persistence-surface.tsx", "utf8");
const repository = readFileSync("lib/workbook/repository.ts", "utf8");

describe("JRN-004-R2 Quest workspace contract", () => {
  it("uses snapshot topics and truthful Map regions without the redundant Journey eyebrow", () => {
    expect(journey).toContain("questJourneyTopics(quest)");
    expect(journey).toContain("What it is");
    expect(journey).toContain("Within this Quest");
    expect(journey).toContain("How to explore");
    expect(journey).not.toContain("QUEST JOURNEY</p>");
  });

  it("reuses one receipt across create retries and links accepted pages to Map and Explore", () => {
    expect(journey).toContain("mapCreateRequest.current");
    expect(journey).toContain('stage: "MAP"');
    expect(journey).toContain('stage: "EXPLORE"');
    expect(repository).toContain("options.requestId ?? crypto.randomUUID()");
  });

  it("opens the persistent editor inline and keeps Craft on the same authority", () => {
    expect(journey).toContain("embeddedExplore={openExplorePage}");
    expect(journey).toContain("embeddedCraft");
    expect(persistence).toContain("persistent\n          workbookTitle={owner.title}");
    expect(persistence).toMatch(/savePage\(\s*getClient\(\)/);
  });
});
