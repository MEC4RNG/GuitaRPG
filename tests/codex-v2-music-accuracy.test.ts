import { describe, expect, it } from "vitest";
import draft from "@/domain/codex/v2/preview-excerpts.json";

/**
 * Spot-check the pitch/rhythm facts that the draft lessons explicitly teach.
 * These checks do not substitute for independent music-educator approval.
 */
const getLesson = (id: string) =>
  draft.entries.flatMap((entry) => entry.modules).find((lesson) => lesson.id === id);

describe("Codex V2 42-lesson draft musical and teaching-quality checks", () => {
  it("provides exactly one draft lesson for each of the 42 level/application cells", () => {
    const levels = ["foundational", "intermediate", "advanced"];
    const seen = new Set<string>();
    const allLessons = draft.entries.flatMap((entry) => entry.modules);
    for (const entry of draft.entries) {
      for (const application of entry.applications) {
        for (const level of levels) {
          const key = `${entry.slug}/${application.id}/${level}`;
          const lessons = entry.modules.filter(
            (lesson) =>
              lesson.application_id === application.id && lesson.level === level,
          );
          expect(lessons, key).toHaveLength(1);
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      }
    }
    expect(seen.size).toBe(42);
    expect(allLessons).toHaveLength(42);
  });

  it("keeps every exercise actionable, reviewed-as-draft and non-grading", () => {
    const allLessons = draft.entries.flatMap((entry) => entry.modules);
    const ids = new Set<string>();
    for (const lesson of allLessons) {
      expect(ids.has(lesson.id)).toBe(false);
      ids.add(lesson.id);
      expect(lesson.editorial_status).toBe("DRAFT_REVIEW");
      expect(lesson.outcomes.length).toBeGreaterThanOrEqual(2);
      expect(lesson.explanation.length).toBeGreaterThan(85);
      expect(lesson.exercises.length).toBeGreaterThan(0);
      for (const exercise of lesson.exercises) {
        expect(exercise.setup.length).toBeGreaterThan(35);
        expect(exercise.steps.length).toBeGreaterThanOrEqual(3);
        expect(exercise.self_check.length).toBeGreaterThanOrEqual(35);
        expect(exercise.records_progress).toBe(false);
        expect(exercise.suggested_minutes).toBeGreaterThanOrEqual(3);
        expect(exercise.suggested_minutes).toBeLessThanOrEqual(20);
      }
    }
  });

  it("verifies standard-tuned guitar triads and the intermediate top-voice line", () => {
    // Guitar strings 3, 2 and 1 are G3, B3 and E4 in concert-pitch MIDI.
    const open: readonly number[] = [55, 59, 64];
    const sounds = (frets: readonly number[]) =>
      open.map((pitch, index) => pitch + frets[index]);
    expect(sounds([5, 5, 3])).toEqual([60, 64, 67]); // C4 E4 G4
    expect(sounds([5, 4, 3])).toEqual([60, 63, 67]); // C4 Eb4 G4
    expect(sounds([2, 1, 1])).toEqual([57, 60, 65]); // A3 C4 F4: F first inversion
    expect(sounds([5, 5, 5])).toEqual([60, 64, 69]); // C4 E4 A4: Am first inversion
    expect(sounds([5, 6, 5])).toEqual([60, 65, 69]); // C4 F4 A4: F second inversion
    expect(sounds([4, 3, 3])).toEqual([59, 62, 67]); // B3 D4 G4: G first inversion

    const line = [[5, 5, 3], [5, 5, 5], [5, 6, 5], [4, 3, 3]].map(
      (frets) => sounds(frets)[2],
    );
    expect(line).toEqual([67, 69, 69, 67]); // G4 A4 A4 G4
    expect(getLesson("triad.composition.i1")?.explanation).toContain("G4–A4–A4–G4");
    expect(getLesson("triad.aural.a1")?.explanation).toContain("second inversion");
  });

  it("verifies triad qualities and diatonic spelling in C major", () => {
    // 12-TET semitone distances from C4.
    expect([60, 64, 67].map((pitch) => pitch - 60)).toEqual([0, 4, 7]);
    expect([60, 63, 67].map((pitch) => pitch - 60)).toEqual([0, 3, 7]);
    expect([60, 63, 66].map((pitch) => pitch - 60)).toEqual([0, 3, 6]);
    expect([60, 64, 68].map((pitch) => pitch - 60)).toEqual([0, 4, 8]);

    const scale = ["C", "D", "E", "F", "G", "A", "B"];
    const triads = scale.map((_, degree) =>
      [0, 2, 4].map((offset) => scale[(degree + offset) % 7]).join("–"),
    );
    expect(triads).toEqual([
      "C–E–G", "D–F–A", "E–G–B", "F–A–C",
      "G–B–D", "A–C–E", "B–D–F",
    ]);
    expect(getLesson("triad.theory.i1")?.explanation).toContain("B°");
    expect(getLesson("triad.theory.a1")?.explanation).toContain("C–E–G♯");
  });

  it("verifies transposition and secondary-dominant relationships", () => {
    const cMajor = ["C", "D", "E", "F", "G", "A", "B"];
    const gMajor = ["G", "A", "B", "C", "D", "E", "F♯"];
    const degrees = [1, 2, 3, 5];
    expect(degrees.map((n) => cMajor[n - 1])).toEqual(["C", "D", "E", "G"]);
    expect(degrees.map((n) => gMajor[n - 1])).toEqual(["G", "A", "B", "D"]);
    expect(cMajor[3]).toBe("F");
    expect(gMajor[3]).toBe("C"); // C = 4 against tonic G
    expect(gMajor[5]).toBe("E"); // E = 6 against tonic G
    expect(getLesson("sdr.theory.a1")?.explanation).toContain("D–F♯–A–C");
    expect(getLesson("sdr.theory.a1")?.explanation).toContain("V7/V");
  });

  it("distinguishes quarter-note beats from grid density and written accents", () => {
    const bpm = 72;
    const quarterSeconds = 60 / bpm;
    for (const subdivision of [1, 2, 3, 4]) {
      const attacks = 4 * subdivision;
      const spacing = quarterSeconds / subdivision;
      expect(attacks * spacing).toBeCloseTo(4 * quarterSeconds);
    }
    expect([1, 2, 3, 4].map((n) => 4 * n)).toEqual([4, 8, 12, 16]);

    // With four sixteenths per beat, the "and" is index 2, "a" index 3.
    const barA = [0, 4 + 2, 8, 12 + 3]; // 1, 2&, 3, 4a
    const barB = [0, 4 + 2, 8 + 2, 12]; // 1, 2&, 3&, 4
    expect(barA).toEqual([0, 6, 8, 15]);
    expect(barB).toEqual([0, 6, 10, 12]);
    expect(getLesson("subdiv.composition.i1")?.explanation).toContain("16 equally spaced");
    expect(getLesson("subdiv.reading.a1")?.explanation).toContain("2+2+3");
    expect(getLesson("subdiv.reading.i1")?.exercises[0].steps[1]).toContain(
      "the “&” of beat 4",
    );
  });
});
