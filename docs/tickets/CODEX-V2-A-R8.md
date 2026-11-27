# CODEX-V2-A-R8 — Scale Mapping and Chord Inversion Navigation

**Status:** IMPLEMENTED AS DRAFT — pending final-head CI, educator review and user acceptance.
**Branch:** `codex-v2-r8-scale-mapping-inversions`.
**Parent:** CODEX-V2-A-R7 PR #17, above R6 PR #16 and CODEX-V2-A PR #14; JRN-004 PR #13 remains draft.
**User authorization:** 2026-11-22 — "Please continue with development", following recommendation to expand these two Skills.
**Production publishing:** NOT AUTHORIZED.

## Scope implemented

1. Authored 24 genuinely distinct guitar-music lessons for two existing canonical Skills, preserving the authoritative taxonomy UUID, kind and slug:
   - Scale Mapping — theoretical pitch spelling, fretboard mapping, improvisational note targeting, melodic composition; Foundational, Intermediate, Advanced under each.
   - Chord Inversion Navigation — theoretical triad/seventh inversions, accurate string/fret routes, identifying the whole sounding bass, one-guitar arrangement; all three levels under each application.
2. Source-controlled `domain/codex/v2/draft-expansion-r8.json` is added to the **nonproduction draft preview resolver only**. Each instructional module has meaningful explanation, 3+ outcomes, 4+ exercise steps, setup, self-check, suggested minutes, and `records_progress=false`.
3. All lessons remain `DRAFT_REVIEW`. Two new canonical Skill entries each have 4 applications, 12 lessons and 4 proposed knowledge relationships. No asserted interactive media `reference_blocks` or modified layouts.
4. Updated R3/R6/R7 unit totals and browser card discovery to cover the new draft corpus. Added R8-specific structural and numerical music-accuracy tests.
5. Recorded every new lesson and critical guitar-music assertions in `docs/codex-v2-r8-scale-mapping-inversions-review.md`.

## Final catalog disposition

- Nonproduction V2 preview: **9 draft Skills, 38 musical applications, 114 unique lessons and exercises, 178 glossary terms, 48 proposed educational relationships**.
- Existing published V1: **197 canonical entries, unchanged**.
- Published V2 catalog: **zero entries, zero terms**.
- No Supabase migration, production traffic modification, Quest/MEC/Workbook write, Session/Result/XP/proficiency evidence, account setting or navigation/CSS change.

## Invariants

- Written scale spelling and tonic relative degrees must be distinguished from physical frets and local chord-tone identities.
- Inversions are defined by the lowest *sounding* chord tone of the *whole* harmony; an upper string shape alone cannot determine a full guitar arrangement's inversion.
- String/fret examples must match open standard-tuning pitches, including open strings, octave registers and G3/B3 tuning.
- Seventh-chord third inversion cannot be mislabeled as a triad inversion.
- Fret spans beyond one comfortable hand position are described as positional shifts, not mandatory finger stretches or implied fingering.

## Required final-head verification

- Formatting, lint, strict TypeScript, Vitest, Next production build, database/security/player-control CI and desktop/mobile browser E2E.
- Independent guitarist/music-educator accuracy check for scale formulas, guitar positions, enharmonic spelling, inversions, upper-register voicings and practical constraints.
- Explicit user visual review remains open; the user is intentionally still deciding on future Codex layout.
- The R8 PR must remain **draft/open/unmerged** until parent PRs, music review and all relevant CI/acceptance gates clear. No V2 publication is included.

## Integration follow-on

The R5 Codex-to-Workbook feature remains separate in draft PR #15 and was originally tested against 42 lessons. Any future integration with this expanded curriculum should update template tests for 114 lessons, then verify owner-scoped creation and Quest attachment, before combining branches.
