import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("JRN-004-R1 modular workspaces", () => {
  it("keeps Explore module assignment Quest-scoped and excludes global Skill discovery", () => {
    const migration = read("supabase/migrations/20261017040000_jrn_004_r1_modular_workspaces.sql");
    expect(migration).toContain("module_key text");
    expect(migration).toContain("quest_explore_module_keys");
    expect(migration).toContain("auth.uid()");
    expect(migration).not.toContain("global_skill");
  });

  it("renders accessible independent Explore modules and explicit ordering controls", () => {
    const surface = read("components/quest-journey-surface.tsx");
    expect(surface).toContain("aria-expanded={expanded}");
    expect(surface).toContain("explore-module__reorder");
    expect(surface).toContain("Move ${module.name} earlier");
    expect(surface).toContain("Move ${module.name} later");
    expect(surface).toContain("Reset to Suggested Order");
    expect(surface).toContain("General Explore Pages / Unassigned");
    expect(surface).not.toContain("Other Workbooks for This Skill");
  });

  it("gates draft Map lessons on preview access while keeping Map-to-Explore navigation non-writing", () => {
    const page = read("app/quest/[questId]/page.tsx");
    const journey = read("components/quest-journey-surface.tsx");
    const accessCheck = page.indexOf("if (canAccessCodexV2DraftPreview())");
    const draftImport = page.indexOf('await import("@/lib/codex/v2/preview")');
    expect(accessCheck).toBeGreaterThan(0);
    expect(draftImport).toBeGreaterThan(accessCheck);
    expect(page).toContain("mapCodexLearning");
    expect(journey).toContain("exploreSelectedTopic");
    expect(journey).toContain('await chooseStage("EXPLORE")');
    expect(journey).toContain("Create Workbook and open Explore");
    expect(journey).toContain('role="tablist"');
    expect(journey).not.toContain("Target tempo");
    // Hold user's explicit Craft redesign request: existing persistent editor stays.
    expect(journey).toContain("embeddedCraft");
  });

  it("embeds the authoritative persistent editor in Craft without creating progress events", () => {
    const journey = read("components/quest-journey-surface.tsx");
    const workbook = read("components/workbook-persistence-surface.tsx");
    expect(journey).toContain("embeddedCraft");
    expect(workbook).toContain("<WorkbookEditorPrototype");
    expect(workbook).toContain("Nothing has been created automatically");
    expect(workbook).not.toContain("award");
  });
});
