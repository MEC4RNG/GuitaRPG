# CODEX-V2-A-R2 — Musical Curriculum Editorial Review Sheet

**Product:** Sound Uncharted
**Branch:** `codex-v2-a-content-renderer`
**Status:** DRAFT_REVIEW — NOT PUBLISHED
**Preview:** `/prototype/codex-v2`

## Review objective

Preserve the approved design, media tools, and read-only Codex model while authoring the most useful missing combinations of instructional level and musical application. The 9 new modules below are illustrative, editorially unreviewed, and do not grant progress, XP, proficiency, or completion evidence.

## Draft module review queue

| Skill | Application · level | New module | Musical/editorial verification |
| --- | --- | --- | --- |
| Scale-Degree Recognition | Theory & function · Advanced | `sdr.theory.a1` | Distinguish secondary-dominant tonicization (D7 to G in C) from a proven key change; F♯ as raised fourth of C and leading tone to G. |
| Scale-Degree Recognition | Fretboard navigation · Advanced | `sdr.fretboard.a1` | Same sounding pitch with different scale-degree role against C and G tonics; check standard-tuning position instructions. |
| Scale-Degree Recognition | Composition · Foundational | `sdr.composition.f1` | C–D–E–D and E–D–C–C correctly match 1–2–3–2 and 3–2–1–1 in C major. |
| Scale-Degree Recognition | Composition · Intermediate | `sdr.composition.i1` | Degree motif 1–2–3–5 transposes C–D–E–G to G–A–B–D in G major. |
| Triad Construction | Listening & chord quality · Foundational | `triad.aural.f1` | C–E–G vs C–E♭–G; root/fifth unchanged, third difference audible without universal emotional claims. |
| Triad Construction | Harmony & construction · Intermediate | `triad.theory.i1` | Seven diatonic C-major triads, including B–D–F as diminished; appropriate Roman numerals. |
| Triad Construction | Arrangement & voice leading · Foundational | `triad.composition.f1` | Common tones C and E across C major and A minor, without implying a specific guitar fingering. |
| Subdivision Control | Listening & internal pulse · Advanced | `subdiv.aural.a1` | Syncopated offbeat accents coexist with an even 4/4 quarter-note pulse; built-in player is not represented as a custom-accent editor. |
| Subdivision Control | Composing rhythm · Foundational | `subdiv.composition.f1` | At fixed quarter-note BPM, a 4/4 measure can have four quarter-note attacks or eight eighth-note attacks. |

## Coverage and remaining gaps

The three exemplar Skills have 14 musical applications, each with three possible level slots (42 combinations). Before this revision, 28 had modules; after this first-pass writing, **37 are populated and 5 remain empty**:

- Scale-Degree Recognition: Improvisation / Foundational.
- Triad Construction: Harmony & construction / Advanced.
- Triad Construction: Listening & chord quality / Advanced.
- Triad Construction: Arrangement & voice leading / Intermediate.
- Subdivision Control: Composing rhythm / Intermediate.

The empty combinations remain **visible but dimmed** in the relevant Lessons and How to Explore application dropdown. Selecting a new level clears an incompatible choice. Application cards remain discoverable even when a lesson is absent.

## Review and QA gate

1. **Theory accuracy:** confirm note spellings, Roman numerals, modulation/tonicization distinction, chord-tone vs scale-degree role, and standard-tuning references. Do not imply a single chromatic chord proves modulation.
2. **Rhythm correctness:** ensure BPM is a quarter-note reference for the 4/4 examples, not a number of attacks per beat. No claim that the reference audio plays custom offbeat patterns.
3. **Educational progression:** each lesson is appropriate for its Foundational, Intermediate or Advanced *instructional* level. Instructional level must not be conflated with the Player's current proficiency.
4. **Content integrity:** each module has goals, explanation, setup, at least four actionable steps, a check for understanding, reasonable suggested duration, and `records_progress: false`.
5. **Publication safety:** all new modules remain `DRAFT_REVIEW` in `domain/codex/v2/preview-excerpts.json`; `domain/codex/v2/published.json` stays empty and all 197 V1 canonical entries remain live.
6. **Interaction:** verify new module titles via the applicable level/application filters, expandable Lessons, and How to Explore. Confirm missing combinations still render disabled rather than vanishing.
7. **Regression:** formatting, strict TypeScript, lint, unit tests, production build, focused Chromium/mobile WebKit Playwright and broader UX/Workbook gates must pass before review. User desktop/mobile review remains required before protected merge.

This sheet is an editorial planning artifact; it does not establish new canonical taxonomy relationships, authored Skill mastery, or authorization to merge PR #14 or implement JRN-005.

## Focused browser regression note

The first R2 browser suite surfaced a **stale assertion** inherited from R1: the Foundational Triad Construction / How to Explore view previously had two exercises but now correctly has four after adding Listening and Composition. The implementation rendered all four. The test has been updated to assert the expanded, authored exercise count. This was a test expectation mismatch, not lost instructional data. Recheck the final-head Chromium/mobile WebKit result before accepting the R2 gate.
