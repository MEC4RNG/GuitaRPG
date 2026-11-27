import { describe, expect, it } from "vitest";
import expansion from "@/domain/codex/v2/draft-expansion-r7.json";
import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";
import { PUBLISHED_CODEX_V2_ENTRIES, PUBLISHED_CODEX_V2_TERMS } from "@/lib/codex/v2/catalog";
import { readCodexV2DraftPreview } from "@/lib/codex/v2/preview";

const levels = ["foundational", "intermediate", "advanced"] as const;
const newSlugs = new Set(["note_location", "voice_leading"]);
const newSkill = (slug: string) => newSlugs.has(slug);

describe("CODEX-V2-A-R7 Note Location and Voice Leading editorial pilot", () => {
  it("keeps all 197 official V1 entries and the V2 publication gate", () => {
    const catalog = readCodexV2DraftPreview();
    expect(CODEX_ENTRIES).toHaveLength(197);
    expect(PUBLISHED_CODEX_V2_ENTRIES).toHaveLength(0);
    expect(PUBLISHED_CODEX_V2_TERMS).toHaveLength(0);
    expect(catalog.entries).toHaveLength(9);
    expect(catalog.terms).toHaveLength(178);
    expect(catalog.entries.flatMap((entry) => entry.modules)).toHaveLength(114);
    expect(catalog.entries.flatMap((entry) => entry.applications)).toHaveLength(38);
    expect(catalog.entries.flatMap((entry) => entry.relationships)).toHaveLength(48);
  });

  it("authors exactly 24 R7 lessons in 8 application-by-level progressions", () => {
    const added = readCodexV2DraftPreview().entries.filter((entry) => newSkill(entry.slug));
    expect(added.map((entry) => entry.slug)).toEqual(["note_location", "voice_leading"]);
    expect(added.flatMap((entry) => entry.modules)).toHaveLength(24);
    for (const entry of added) {
      expect(entry.editorial_status).toBe("DRAFT_REVIEW");
      expect(entry.reference_blocks.map((block) => block.kind)).toEqual(
        entry.slug === "note_location" ? ["FRETBOARD_NOTE_LOCATION"] : ["VOICE_LEADING_EXPLORER"],
      );
      expect(entry.applications).toHaveLength(4);
      expect(entry.modules).toHaveLength(12);
      for (const application of entry.applications) {
        expect(application.level_ids).toEqual(levels);
        for (const level of levels) {
          const lessons = entry.modules.filter(
            (lesson) => lesson.application_id === application.id && lesson.level === level,
          );
          expect(lessons, `${entry.slug}/${application.id}/${level}`).toHaveLength(1);
          const lesson = lessons[0];
          expect(lesson.outcomes.length).toBeGreaterThanOrEqual(3);
          expect(lesson.steps.length).toBeGreaterThanOrEqual(4);
          expect(lesson.exercises).toHaveLength(1);
          expect(lesson.exercises[0].steps.length).toBeGreaterThanOrEqual(4);
          expect(lesson.exercises[0].setup.length).toBeGreaterThan(25);
          expect(lesson.exercises[0].self_check.length).toBeGreaterThan(30);
          expect(lesson.exercises[0].records_progress).toBe(false);
          expect(lesson.editorial_status).toBe("DRAFT_REVIEW");
        }
      }
    }
  });

  it("preserves global module and exercise uniqueness across all seven draft Skills", () => {
    const catalog = readCodexV2DraftPreview();
    const allLessons = catalog.entries.flatMap((entry) => entry.modules);
    const moduleIds = allLessons.map((lesson) => lesson.id);
    const exerciseIds = allLessons.flatMap((lesson) =>
      lesson.exercises.map((exercise) => exercise.id),
    );
    expect(new Set(moduleIds).size).toBe(114);
    expect(new Set(exerciseIds).size).toBe(114);
    expect(expansion.terms).toHaveLength(0);
  });

  it("checks standard tuning, same-pitch positions and note registers", () => {
    const open = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
    expect([open[6], open[5], open[4], open[3], open[2], open[1]]).toEqual([
      40, 45, 50, 55, 59, 64,
    ]);
    expect([open[4] + 10, open[3] + 5, open[2] + 1, open[5] + 15]).toEqual([60, 60, 60, 60]); // Four genuine C4 locations
    expect(open[1] + 8).toBe(72); // C5, not C4
    expect(open[4] + 4).toBe(54); // F♯3/G♭3 in equal temperament
    expect(open[3] + 5).toBe(open[2] + 1); // C4 on two string sets
    expect(open[5] + 3).toBe(open[6] + 8); // C3
  });

  it("checks alternate tuning and guitar notation assertions", () => {
    const dadgadOpen = [38, 45, 50, 55, 57, 62] as const;
    const dropDOpenSixth = 38;
    expect(dadgadOpen[4] + 3).toBe(60); // String 2 fret 3 = C4 in DADGAD
    expect(dadgadOpen[3] + 5).toBe(60); // Unchanged G3 string 3
    expect(dropDOpenSixth + 10).toBe(48); // Drop-D string 6 fret 10 = C3
    expect(40 + 8).toBe(48); // Standard string 6 fret 8 = C3
    expect(40 + 12).toBe(52); // Sounding E3, one octave above E2
  });

  it("checks exact triad voice movement and prepared suspension language", () => {
    const openTop = [55, 59, 64] as const; // Strings 3, 2, 1
    const voiced = (frets: readonly [number, number, number]) =>
      frets.map((fret, index) => openTop[index] + fret);
    expect(voiced([5, 5, 3])).toEqual([60, 64, 67]); // C
    expect(voiced([5, 5, 5])).toEqual([60, 64, 69]); // Am
    expect(voiced([5, 6, 5])).toEqual([60, 65, 69]); // F
    expect(voiced([4, 3, 3])).toEqual([59, 62, 67]); // G
    const r7 = readCodexV2DraftPreview().entries.find((entry) => entry.slug === "voice_leading");
    expect(r7).toBeDefined();
    const theory = r7!.modules.find((module) => module.id === "vl.harmony.a1");
    expect(theory?.explanation).toContain("G4 descends two semitones");
    expect(theory?.explanation).toContain("B4 descends two");
    const suspension = r7!.modules.find((module) => module.id === "vl.aural.a1");
    expect(suspension?.explanation).toContain("preparation");
    expect(suspension?.explanation).toContain("C4→B3");
  });
});
