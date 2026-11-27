# CODEX-V2-A-R7 — Content-First Expansion: Note Location & Voice Leading

**Status:** DRAFT REVIEW — branch `codex-v2-r7-note-location-voice-leading` / PR #17.
**User direction:** "Please keep developing" (2026-11-22), after explicitly reserving additional time for the visual layout.
**Branch structure:** R7 PR #17 is stacked on R6 PR #16, which is stacked on CODEX-V2-A PR #14, ultimately above JRN-004 PR #13. All are held from protected merge/publication pending their explicit gates.

## Scope authorized and delivered

- Author 24 instructional lessons for exactly two previously canonical Skills, **Note Location** and **Voice Leading**, in `domain/codex/v2/draft-expansion-r7.json`.
- Each Skill contains four applications and one Foundational, Intermediate and Advanced lesson for each. Lessons contain meaningful music-specific explanation, 3+ outcomes, 4+ exercise steps, setup, self-check, suggested duration, and `records_progress: false`.
- Compose the two new draft Skills into the existing nonproduction preview catalog. Keep the original three pilot Skills and R6's Interval Recognition / Arpeggio Sequencing complete.
- Add music-example checks, deterministic count/identity tests, browser discoverability checks, and an itemized external music-editor review queue.
- **Do not change the appearance, layout, existing interactive tools or Workbook/Quest implementation.** The user will revisit aesthetic direction separately.

## Structural and publication boundaries

- New canonical identities are the existing SKILL UUIDs: `note_location` = `20000000-0000-4000-8000-000000000038`; `voice_leading` = `20000000-0000-4000-8000-000000000071`.
- Preview totals: **7 draft Skills; 30 applications; 90 modules/exercises; 178 draft terms; 40 proposed educational relationships**.
- Only the preview source resolver imports `draft-expansion-r7.json`. The published V2 corpus remains **zero** entries/terms; 197 canonical V1 entries/URLs continue unchanged. No migration, Session, Result, XP, Player proficiency, Workbook write, progression or Quest mutation.
- Note Location proposes **development toward** Scale Mapping, not that Scale Mapping is already a required foundation. All R7 new relationships remain `PROPOSED` and do not become progression gates.
- Entries deliberately have `reference_blocks: []` until separately verified interactive content is approved; no false audio/fretboard tool claim.

## Verification checklist

1. Parser accepts both canonical Skill UUID/kind/slug combinations and rejects duplicates, bad relationship references, missing lessons, empty exercises, and draft publication through the existing tests.
2. Full catalog has 90 unique module and exercise IDs; each of the 8 new applications has one authored module for all three instructional levels. Existing pilot and R6 assertions remain correctly scoped and valid.
3. Unit checks verify exact guitar string/fret MIDI, retuned string positions, registral octaves and upper-three-string triad progression; R7 review matrix documents musical cases requiring human scrutiny.
4. Browser smoke checks 7 preview cards, both new Skills, complete level filtering, expanding Lessons/How to Explore, proposed connection links, and no desktop/mobile horizontal overflow.
5. Final-head CI must pass formatting, lint, strict TS, Vitest, Next production build, UX browser work and relevant security/data gates. Vercel deployment alone is insufficient.
6. **External music-educator review and explicit user visual acceptance remain outstanding.** No automated result constitutes publication permission.

**Review document:** `docs/codex-v2-r7-note-location-voice-leading-review.md`.

## Future integration note

R5 Codex→Workbook PR #15 still exists separately and was authored when 42 pilot lessons existed. Once the content branch and R5 are deliberately combined, update its 42-lesson assumptions to include the full 90-lesson dataset and retest owner-scoped Workbook creation. Do not merge independent stacked branches opportunistically or bypass their approval gates.
