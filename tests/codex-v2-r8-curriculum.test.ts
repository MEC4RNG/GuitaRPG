import { describe, expect, it } from "vitest";
import expansion from "@/domain/codex/v2/draft-expansion-r8.json";
import pilot from "@/domain/codex/v2/preview-excerpts.json";
import expansionR6 from "@/domain/codex/v2/draft-expansion-r6.json";
import expansionR7 from "@/domain/codex/v2/draft-expansion-r7.json";
import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";
import { PUBLISHED_CODEX_V2_ENTRIES, PUBLISHED_CODEX_V2_TERMS } from "@/lib/codex/v2/catalog";
import { readCodexV2DraftPreview } from "@/lib/codex/v2/preview";

const levels = ["foundational", "intermediate", "advanced"] as const;
const newSlugs = new Set(["scale_mapping", "chord_inversion_navigation"]);

describe("CODEX-V2-A-R8 Scale Mapping and Chord Inversion Navigation", () => {
  it("preserves official V1 and unpublished-only V2 content boundaries", () => {
    const draft = readCodexV2DraftPreview();
    expect(CODEX_ENTRIES).toHaveLength(197);
    expect(PUBLISHED_CODEX_V2_ENTRIES).toHaveLength(0);
    expect(PUBLISHED_CODEX_V2_TERMS).toHaveLength(0);
    expect(draft.entries).toHaveLength(9);
    expect(draft.entries.flatMap((entry) => entry.modules)).toHaveLength(114);
    expect(draft.entries.flatMap((entry) => entry.applications)).toHaveLength(38);
    expect(draft.entries.flatMap((entry) => entry.relationships)).toHaveLength(48);
    expect(draft.terms).toHaveLength(178);
    expect(expansion.terms).toHaveLength(0);
  });

  it("retains all 90 earlier draft lessons verbatim in the composed preview", () => {
    const inherited = [...pilot.entries, ...expansionR6.entries, ...expansionR7.entries];
    const draft = readCodexV2DraftPreview();
    const expectedLessonIds = inherited.flatMap((entry) => entry.modules.map((module) => module.id));
    expect(expectedLessonIds).toHaveLength(90);
    for (const earlier of inherited) {
      const current = draft.entries.find((entry) => entry.slug === earlier.slug);
      expect(current, earlier.slug).toBeDefined();
      expect(current?.modules).toEqual(earlier.modules);
      expect(current?.applications).toEqual(earlier.applications);
    }
    expect(new Set(expectedLessonIds).size).toBe(90);
    expect(expansion.entries.map((entry) => entry.slug)).toEqual([
      "scale_mapping",
      "chord_inversion_navigation",
    ]);
  });

  it("has one actual authored lesson at every application and level for both Skills", () => {
    const added = readCodexV2DraftPreview().entries.filter((entry) => newSlugs.has(entry.slug));
    expect(added.map((entry) => entry.slug)).toEqual([
      "scale_mapping",
      "chord_inversion_navigation",
    ]);
    for (const entry of added) {
      expect(entry.kind).toBe("SKILL");
      expect(entry.editorial_status).toBe("DRAFT_REVIEW");
      expect(entry.reference_blocks).toHaveLength(0);
      expect(entry.applications).toHaveLength(4);
      expect(entry.modules).toHaveLength(12);
      for (const application of entry.applications) {
        expect(application.level_ids).toEqual(levels);
        for (const level of levels) {
          const matching = entry.modules.filter(
            (module) => module.application_id === application.id && module.level === level,
          );
          expect(matching, `${entry.slug}/${application.id}/${level}`).toHaveLength(1);
          const lesson = matching[0];
          expect(lesson.outcomes.length).toBeGreaterThanOrEqual(3);
          expect(lesson.steps.length).toBeGreaterThanOrEqual(4);
          expect(lesson.exercises).toHaveLength(1);
          expect(lesson.exercises[0].steps.length).toBeGreaterThanOrEqual(4);
          expect(lesson.exercises[0].records_progress).toBe(false);
          expect(lesson.editorial_status).toBe("DRAFT_REVIEW");
          expect(lesson.exercises[0].suggested_minutes).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it("retains one globally unique module and exercise identity per authored lesson", () => {
    const draft = readCodexV2DraftPreview();
    const all = draft.entries.flatMap((entry) => entry.modules);
    const moduleIds = all.map((lesson) => lesson.id);
    const exerciseIds = all.flatMap((lesson) => lesson.exercises.map((exercise) => exercise.id));
    expect(new Set(moduleIds).size).toBe(114);
    expect(new Set(exerciseIds).size).toBe(114);
    expect(all.every((lesson) => lesson.exercises.every((exercise) => !exercise.records_progress)))
      .toBe(true);
  });

  it("verifies the full C major map on the standard-tuned second string", () => {
    const openB3 = 59;
    const frets = [1, 3, 5, 6, 8, 10, 12, 13];
    expect(frets.map((fret) => openB3 + fret)).toEqual([
      60, 62, 64, 65, 67, 69, 71, 72,
    ]);
    expect(frets.slice(1).map((fret, index) => fret - frets[index])).toEqual([
      2, 2, 1, 2, 2, 2, 1,
    ]);
    const draft = readCodexV2DraftPreview();
    const skill = draft.entries.find((entry) => entry.slug === "scale_mapping");
    const lesson = skill?.modules.find((module) => module.id === "sm.fretboard.f1");
    expect(lesson?.explanation).toContain("1–3–5–6–8–10–12–13");
  });

  it("checks transposed G major and A harmonic minor on the fifth string", () => {
    const gMajorPitches = [7, 9, 11, 0, 2, 4, 6];
    const semitonePattern = [2, 2, 1, 2, 2, 2, 1];
    const absolute = [67];
    for (const step of semitonePattern) absolute.push(absolute.at(-1)! + step);
    expect(absolute).toEqual([67, 69, 71, 72, 74, 76, 78, 79]);
    expect(absolute.slice(0, 7).map((midi) => midi % 12)).toEqual(gMajorPitches);
    const aOpen = 45;
    expect([0, 2, 3, 5, 7, 8, 11, 12].map((fret) => aOpen + fret)).toEqual([
      45, 47, 48, 50, 52, 53, 56, 57,
    ]);
  });

  it("checks C major root, first and second inversion guitar positions", () => {
    const open = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
    const frets = (strings: readonly (keyof typeof open)[], positions: number[]) =>
      strings.map((stringNumber, index) => open[stringNumber] + positions[index]);

    expect(frets([5, 4, 3], [3, 2, 0])).toEqual([48, 52, 55]);
    expect(frets([4, 3, 2], [2, 0, 1])).toEqual([52, 55, 60]);
    expect(frets([6, 5, 4], [3, 3, 2])).toEqual([43, 48, 52]);

    expect(frets([3, 2, 1], [5, 5, 3])).toEqual([60, 64, 67]);
    expect(frets([3, 2, 1], [9, 8, 8])).toEqual([64, 67, 72]);
    expect(frets([3, 2, 1], [0, 1, 0])).toEqual([55, 60, 64]);
  });

  it("verifies the shared C–Am–F–G top-voice inversion sequence", () => {
    const topOpen = [55, 59, 64] as const;
    const position = (frets: readonly number[]) =>
      frets.map((fret, index) => topOpen[index] + fret);
    const chords = [[5, 5, 3], [5, 5, 5], [5, 6, 5], [4, 3, 3]];
    const pitched = chords.map(position);
    expect(pitched).toEqual([
      [60, 64, 67],
      [60, 64, 69],
      [60, 65, 69],
      [59, 62, 67],
    ]);
    expect(pitched.map((notes) => notes[2])).toEqual([67, 69, 69, 67]);
    const draft = readCodexV2DraftPreview();
    const skill = draft.entries.find((entry) => entry.slug === "chord_inversion_navigation");
    const lesson = skill?.modules.find((module) => module.id === "cin.arrangement.i1");
    expect(lesson?.explanation).toContain("G4–A4–A4–G4");
  });

  it("distinguishes C major triad inversions from seventh-chord third inversion", () => {
    const triad = new Set([0, 4, 7]); // C E G
    expect(triad.has(2)).toBe(false); // D: C/D is not a triad inversion
    const major7 = new Set([0, 4, 7, 11]); // C E G B
    expect(major7.has(11)).toBe(true);
    const entry = readCodexV2DraftPreview().entries.find(
      (candidate) => candidate.slug === "chord_inversion_navigation",
    );
    expect(entry?.modules.find((lesson) => lesson.id === "cin.theory.a1")?.explanation)
      .toContain("third inversion");
  });
});
