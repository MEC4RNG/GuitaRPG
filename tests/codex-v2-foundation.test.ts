import { describe, expect, it } from "vitest";
import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";
import { parseCodexV2 } from "@/lib/codex/v2/content";
import { PUBLISHED_CODEX_V2_ENTRIES, PUBLISHED_CODEX_V2_TERMS } from "@/lib/codex/v2/catalog";
import { readCodexV2DraftPreview } from "@/lib/codex/v2/preview";
import draft from "@/domain/codex/v2/preview-excerpts.json";

const copy = (): Record<string, unknown> => structuredClone(draft);

describe("CODEX-V2-A editorially gated content foundation", () => {
  it("does not publish unreviewed source material into official routes", () => {
    expect(PUBLISHED_CODEX_V2_ENTRIES).toHaveLength(0);
    expect(PUBLISHED_CODEX_V2_TERMS).toHaveLength(0);
    expect(CODEX_ENTRIES).toHaveLength(197);
  });

  it("validates the full three-Skill pilot and 178 draft dictionary terms", () => {
    const catalog = readCodexV2DraftPreview();
    expect(catalog.entries).toHaveLength(3);
    expect(catalog.terms).toHaveLength(178);
    expect(catalog.entries.map((entry) => entry.modules.length)).toEqual([10, 6, 12]);
    expect(catalog.entries.reduce((sum, entry) => sum + entry.applications.length, 0)).toBe(14);
    expect(catalog.entries.reduce((sum, entry) => sum + entry.relationships.length, 0)).toBe(24);
    expect(catalog.entries.every((entry) => entry.reference_blocks.length === 1)).toBe(true);
    expect(catalog.entries.every((entry) => entry.editorial_status === "DRAFT_REVIEW")).toBe(true);
  });

  it("rejects unpublished entries in the public content resolver", () => {
    expect(() => parseCodexV2(draft)).toThrow(/not published/);
  });

  it("rejects orphan or mismatched canonical entry IDs", () => {
    const broken = copy();
    const entries = broken.entries as Array<Record<string, unknown>>;
    entries[0].entity_id = "00000000-0000-0000-0000-000000000000";
    expect(() => parseCodexV2(broken, true)).toThrow(/UUID mismatch/);
  });

  it("rejects invented canonical skills", () => {
    const broken = copy();
    const entries = broken.entries as Array<Record<string, unknown>>;
    entries[0].slug = "invented_skill";
    expect(() => parseCodexV2(broken, true)).toThrow(/unknown canonical reference/);
  });

  it("rejects duplicated entry identities", () => {
    const broken = copy();
    const entries = broken.entries as unknown[];
    entries.push(structuredClone(entries[0]));
    expect(() => parseCodexV2(broken, true)).toThrow(/duplicate entry/);
  });

  it("rejects duplicated module identities even across entries", () => {
    const broken = copy();
    const entries = broken.entries as Array<{ modules: Array<{ id: string }> }>;
    entries[1].modules[0].id = entries[0].modules[0].id;
    expect(() => parseCodexV2(broken, true)).toThrow(/duplicate or invalid module id/);
  });

  it("rejects unknown module applications and levels", () => {
    const badApplication = copy();
    (
      badApplication.entries as Array<{ modules: Array<{ application_id: string }> }>
    )[0].modules[0].application_id = "imaginary";
    expect(() => parseCodexV2(badApplication, true)).toThrow(/unknown module level or application/);
    const badLevel = copy();
    (badLevel.entries as Array<{ modules: Array<{ level: string }> }>)[0].modules[0].level =
      "mastery";
    expect(() => parseCodexV2(badLevel, true)).toThrow(/unknown module level or application/);
  });

  it("rejects missing glossary annotations", () => {
    const broken = copy();
    const entries = broken.entries as Array<{ intro: Array<{ term_id?: string }> }>;
    entries[0].intro[1].term_id = "vocab:not_registered";
    expect(() => parseCodexV2(broken, true)).toThrow(/missing glossary annotation/);
  });

  it("rejects duplicated glossary identities", () => {
    const broken = copy();
    const terms = broken.terms as unknown[];
    terms.push(structuredClone(terms[0]));
    expect(() => parseCodexV2(broken, true)).toThrow(/duplicate or mismatched term identity/);
  });

  it("rejects publication if any relationship is only proposed", () => {
    const broken = copy();
    const entries = broken.entries as Array<Record<string, unknown>>;
    entries[0].editorial_status = "PUBLISHED";
    for (const item of entries[0].modules as Array<Record<string, unknown>>) {
      item.editorial_status = "PUBLISHED";
    }
    expect(() => parseCodexV2(broken, true)).toThrow(/proposed relationship/);
  });

  it("retains exercise setup, self-check, application purpose and connection rationale", () => {
    const entries = readCodexV2DraftPreview().entries;
    for (const entry of entries) {
      for (const application of entry.applications) {
        expect(application.summary.length).toBeGreaterThan(15);
        expect(application.level_ids.length).toBeGreaterThan(0);
      }
      for (const lesson of entry.modules) {
        expect(lesson.outcomes.length).toBeGreaterThan(0);
        expect(lesson.exercises.length).toBeGreaterThan(0);
        expect(lesson.exercises[0].steps.length).toBeGreaterThan(0);
        expect(lesson.exercises[0].setup.length).toBeGreaterThan(0);
        expect(lesson.exercises[0].self_check.length).toBeGreaterThan(0);
        expect(lesson.exercises[0].records_progress).toBe(false);
      }
      for (const edge of entry.relationships) {
        expect(edge.why.length).toBeGreaterThan(15);
        expect(edge.scope.length).toBeGreaterThan(0);
        expect(edge.review_status).toBe("PROPOSED");
      }
    }
  });

  it("rejects unauthorized musical references and progress claims", () => {
    const badMedia = copy();
    const entries = badMedia.entries as Array<{ reference_blocks: Array<{ kind: string }> }>;
    entries[1].reference_blocks[0].kind = "UNSAFE_HTML";
    expect(() => parseCodexV2(badMedia, true)).toThrow(/unsupported reference block/);

    const badProgress = copy();
    const lesson = (
      badProgress.entries as Array<{
        modules: Array<{ exercises: Array<{ records_progress: boolean }> }>;
      }>
    )[0].modules[0];
    lesson.exercises[0].records_progress = true;
    expect(() => parseCodexV2(badProgress, true)).toThrow(/cannot record progress/);
  });

  it("keeps missing application-level combinations explicit in the draft pilot", () => {
    const entries = readCodexV2DraftPreview().entries;
    const coverage = entries.flatMap((entry) =>
      entry.applications.flatMap((application) =>
        (["foundational", "intermediate", "advanced"] as const).map((level) => ({
          skill: entry.slug,
          application: application.id,
          level,
          hasLesson: entry.modules.some(
            (lesson) => lesson.application_id === application.id && lesson.level === level,
          ),
        })),
      ),
    );

    expect(coverage).toHaveLength(42);
    expect(coverage.filter((item) => item.hasLesson)).toHaveLength(28);
    expect(coverage.filter((item) => !item.hasLesson)).toHaveLength(14);
    expect(
      coverage.find(
        (item) =>
          item.skill === "scale_degree_recognition" &&
          item.application === "theory" &&
          item.level === "advanced",
      )?.hasLesson,
    ).toBe(false);
  });

  it("never conflates learning material level with Quest demand or Player proficiency", () => {
    const entries = readCodexV2DraftPreview().entries;
    expect(entries.flatMap((entry) => entry.modules.map((module) => module.level))).toEqual(
      expect.arrayContaining(["foundational", "intermediate", "advanced"]),
    );
    expect(JSON.stringify(entries)).not.toMatch(/mastery_claimed|awarded_xp|player_rating/);
  });
});
