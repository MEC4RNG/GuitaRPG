import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  journeyStageContent,
  journeyStatusLabel,
  questConstraintText,
} from "@/lib/quest/journey-presentation";
import { parseQuest } from "@/lib/quest/runtime";

const root = process.cwd();
const surface = readFileSync(join(root, "components/quest-journey-surface.tsx"), "utf8");
const generate = readFileSync(join(root, "components/generate-quest-surface.tsx"), "utf8");
const training = readFileSync(join(root, "components/training-surface.tsx"), "utf8");
const fixture = JSON.parse(
  readFileSync(join(root, "domain/quest/phase0-quest-fixtures.json"), "utf8"),
)[0];

describe("UX-006 Quest Journey presentation", () => {
  it("uses human lifecycle and revisitable MEC stage language", () => {
    expect(journeyStatusLabel).toEqual({
      SAVED: "Saved",
      ACTIVE: "In progress",
      CONCLUDED: "Concluded",
      ABANDONED: "Stopped",
      ARCHIVED: "Archived",
    });
    expect(journeyStageContent).toEqual({
      MAP: { label: "Map", verb: "Understand" },
      EXPLORE: { label: "Explore", verb: "Play / Investigate" },
      CRAFT: { label: "Craft", verb: "Create" },
    });
    expect(surface).toContain("aria-pressed={current}");
    expect(surface).not.toMatch(/\d+%|of 3 complete|stage locked/i);
  });

  it("corrects time semantics wherever the Quest duration is presented", () => {
    expect(surface).toContain("Suggested Session");
    expect(surface).toContain("This Quest can span multiple practice Sessions.");
    expect(generate).toContain("Suggested Session");
    expect(training).toContain("Suggested Session");
    expect(generate).not.toContain("Estimated Time");
    expect(training).not.toContain("Estimated Time");
  });

  it("keeps Start Quest, practice, and lifecycle actions semantically distinct", () => {
    expect(surface).toContain('lifecycle("START")');
    expect(surface).toContain("startJourneyPractice");
    expect(surface).toContain('lifecycle("CONCLUDE")');
    expect(surface).toContain('lifecycle("ABANDON")');
    expect(surface).toContain('lifecycle("REOPEN")');
    expect(surface).toContain('lifecycle("ARCHIVE")');
    expect(surface).toContain('lifecycle("UNARCHIVE")');
  });

  it("uses canonical DORIAN_CROSSROADS ingredients and human constraints", () => {
    const quest = parseQuest(fixture);
    expect(quest.execution.primary_skill.name).toBe("Hybrid Picking");
    expect(quest.execution.secondary_skills.map((skill) => skill.name)).toEqual([
      "Scale Mapping",
      "Syncopation Control",
    ]);
    expect(quest.execution.estimated_minutes).toBe(10);
    expect(quest.difficulty_profile.declared_overall_demand).toBe("III");
    expect(questConstraintText(quest).join(" ")).toMatch(/90/);
  });

  it("keeps Craft invitational and avoids fake completion or artifact persistence", () => {
    expect(surface).toContain("Create something using what you discovered.");
    expect(surface).toMatch(/These prompts do not save or\s+grade an artifact\./);
    expect(surface).not.toMatch(/Submit creation|Mark Craft complete|Artifact saved|upload/i);
  });
});
