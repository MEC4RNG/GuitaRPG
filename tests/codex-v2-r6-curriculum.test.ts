import { describe, expect, it } from "vitest";

import expansion from "@/domain/codex/v2/draft-expansion-r6.json";
import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";
import { PUBLISHED_CODEX_V2_ENTRIES, PUBLISHED_CODEX_V2_TERMS } from "@/lib/codex/v2/catalog";
import { readCodexV2DraftPreview } from "@/lib/codex/v2/preview";

const levels = ["foundational", "intermediate", "advanced"] as const;
const newSlugs = new Set(["interval_recognition", "arpeggio_sequencing"]);
const isNew = (slug: string) => newSlugs.has(slug);

describe("CODEX-V2-A-R6 editorial curriculum expansion", () => {
  it("adds exactly 24 new lessons in canonical Skills without publishing content", () => {
    const catalog = readCodexV2DraftPreview();
    expect(catalog.entries).toHaveLength(9);
    expect(catalog.terms).toHaveLength(178);
    expect(PUBLISHED_CODEX_V2_ENTRIES).toHaveLength(0);
    expect(PUBLISHED_CODEX_V2_TERMS).toHaveLength(0);
    expect(CODEX_ENTRIES).toHaveLength(197);

    const added = catalog.entries.filter((entry) => isNew(entry.slug));
    expect(added).toHaveLength(2);
    expect(added.flatMap((entry) => entry.modules)).toHaveLength(24);
    expect(added.flatMap((entry) => entry.applications)).toHaveLength(8);
    expect(added.flatMap((entry) => entry.relationships)).toHaveLength(8);
    expect(added.every((entry) => entry.editorial_status === "DRAFT_REVIEW")).toBe(true);
    expect(
      added.find((entry) => entry.slug === "interval_recognition")?.reference_blocks[0]?.kind,
    ).toBe("FRETBOARD_INTERVALS");
    expect(
      added.find((entry) => entry.slug === "arpeggio_sequencing")?.reference_blocks[0]?.kind,
    ).toBe("ARPEGGIO_SEQUENCER");
  });

  it("uses exactly one real module per application and learning level", () => {
    const catalog = readCodexV2DraftPreview();
    const added = catalog.entries.filter((entry) => isNew(entry.slug));
    for (const entry of added) {
      expect(entry.applications).toHaveLength(4);
      expect(entry.modules).toHaveLength(12);
      for (const app of entry.applications) {
        expect(app.level_ids).toEqual(levels);
        for (const level of levels) {
          const lessons = entry.modules.filter(
            (module) => module.application_id === app.id && module.level === level,
          );
          expect(lessons, `${entry.slug}/${app.id}/${level}`).toHaveLength(1);
          const lesson = lessons[0];
          expect(lesson.outcomes.length).toBeGreaterThanOrEqual(3);
          expect(lesson.exercises).toHaveLength(1);
          expect(lesson.exercises[0].steps.length).toBeGreaterThanOrEqual(4);
          expect(lesson.exercises[0].records_progress).toBe(false);
          expect(lesson.editorial_status).toBe("DRAFT_REVIEW");
        }
      }
    }
  });

  it("preserves the previous 42 lessons and all review-only glossary terms", () => {
    const catalog = readCodexV2DraftPreview();
    const earlier = catalog.entries.filter((entry) =>
      ["scale_degree_recognition", "triad_construction", "subdivision_control"].includes(
        entry.slug,
      ),
    );
    expect(earlier).toHaveLength(3);
    expect(earlier.flatMap((entry) => entry.modules)).toHaveLength(42);
    expect(catalog.entries.flatMap((entry) => entry.modules)).toHaveLength(114);

    const lessons = catalog.entries.flatMap((entry) => entry.modules);
    const lessonIds = lessons.map((lesson) => lesson.id);
    const exerciseIds = lessons.flatMap((lesson) =>
      lesson.exercises.map((exercise) => exercise.id),
    );
    expect(new Set(lessonIds).size).toBe(114);
    expect(new Set(exerciseIds).size).toBe(114);
    expect(expansion.terms).toHaveLength(0);
  });

  it("keeps interval spelling, guitar register, and rhythmic assumptions explicit", () => {
    const entries = readCodexV2DraftPreview().entries;
    const interval = entries.find((entry) => entry.slug === "interval_recognition");
    const arpeggio = entries.find((entry) => entry.slug === "arpeggio_sequencing");
    expect(interval).toBeDefined();
    expect(arpeggio).toBeDefined();
    const intervals = interval!.modules.map((module) => module.explanation).join(" ");
    const arpeggios = arpeggio!.modules.map((module) => module.explanation).join(" ");
    expect(intervals).toContain("C–F♯");
    expect(intervals).toContain("C–G♭");
    expect(intervals).toContain("E4–C5");
    expect(intervals).toContain("major tenth");
    expect(arpeggios).toContain("C3");
    expect(arpeggios).toContain("Cmaj7");
    expect(arpeggios).toContain("80 BPM");
    expect(arpeggios).toContain("C4–E4–G4");
    expect(JSON.stringify(expansion)).not.toMatch(/awarded_xp|mastery_claimed|player_rating/);
  });
});
