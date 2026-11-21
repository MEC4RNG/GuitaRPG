# CODEX-V2-A-R5 — Configurable Triad Reference and Lesson-to-Workbook Creation

**Status:** ISOLATED DRAFT IMPLEMENTATION — AWAITING FINAL-HEAD CI, INTEGRATION SECURITY, MOBILE/DESKTOP VISUAL AND MUSICAL REVIEW.
**Branch:** `codex-v2-r5-learning-workbook`
**PR:** #15, stacked on CODEX-V2-A PR #14, which is stacked on JRN-004 PR #13.
**Authorization:** User (2026-11-21): “Let's get this implemented when we can.”
**Production/public V2 publication:** Not authorized. Do not merge or publish while parent gates remain open.

## Scope implemented

1. Replaced the three hardcoded top-string triad buttons with a generic standard-tuning 3-string voicing resolver. Selection now includes all 12 chromatic roots (explicit sharp/flat spellings), major/minor quality, strings 1–3 / 2–4 / 3–5 / 4–6, inversion (where playable) and alternative voicings. Voicing pitches are calculated from open-string MIDI numbers and frets, spelled according to chord degree and rendered with a five-fret diagram; frets 0 appear as open strings. Inversion uses the lowest sounding tone. Finger assignments are deliberately not implied.
2. Preserved C major `G/B/E = 5/5/3`, C minor `5/4/3` and F-major first inversion `2/1/1` as existing reference examples, now produced by the resolver.
3. Added `Practice in Workbook` action on expanded Codex Lessons and How to Explore modules (preview only); all 42 pilot modules map to an internal source ID, not a user-controlled lesson document.
4. The existing Workbooks server route resolves module IDs against the **trusted draft catalog** only when the preview environment is authorized. The owned editor shows a source panel for explicit `Add Page to selected Workbook` or `Create new Workbook from lesson`. It also finds Pages containing an editable source marker for convenient `Open existing`, without claiming a durable provenance uniqueness constraint.
5. The source document generator uses the established `GUITARPG_WORKBOOK_DOCUMENT_V1` parser with objectives, original instructions, exercises, self-check, and editable notes. Existing owner-checked `create_player_workbook_v1` and `create_player_workbook_page_v1` RPCs save private data. A requested Quest context uses the existing owner-validated attach operation only after successful Page creation. A failed attach leaves the saved Page intact, with truthful status copy. Creating/opening a Page never creates Sessions, Results, XP, proficiency or mastery evidence.
6. Added deterministic tests spanning 12 roots × 2 qualities × 4 string groups (96 input combinations), selected historical voicings, enharmonic note spelling, unique tones/actual frets/inversion positions, and valid source documents for all 42 lessons. Browser assertions verify the route action from both Codex section types and the triad controls.

## Limitations and follow-on

- This is a **preview pilot**, not a production-ready lesson provenance registry. A Workbook Page's editable source marker is a best-effort discovery aid, not an immutable stored association. A future owner-scoped link table or explicit metadata authority requires a separately approved schema/security ticket.
- Generator initially supports standard tuning and major/minor triads only; not all alternate tunings, diminished/augmented/jazz extensions or physical fingering algorithms. Voicings satisfy bounded fret span and correct note membership, but need hands-on guitar and music-educator review for ergonomics.
- From an unassociated Codex lesson the user can create a private Workbook Page. They can subsequently attach an existing Page from a Quest's Map/Explore/Craft interface (JRN-004). A validated Quest/stage context passed to Workbooks triggers owner-checked attach only after creation; no untrusted client owner or Quest ID is accepted.
- The current `published.json` V2 catalog stays empty and the original V1 catalog remains authoritative. No migration, production data, public content, Player schema, Session timer, Result or XP change has been made.

## Required verification

- Format, lint, strict TypeScript, Vitest, production build, database/security CI, and Codex/mobile browser E2E on final head; do not claim a pass before terminal receipts.
- Authenticated guest/protected-Player browser test: click Codex Lesson/How to Explore action, create Page in existing Workbook and separate new Workbook, refresh, reopen without duplicating, edit content and preserve autosave; then attach from an owned Quest and confirm same Page is editable in Journey with no new Session/XP.
- Cross-owner attempt/invalid source URLs/archived Workbook/conflict and failed context-attach cases must be exercised. A source ID submitted directly in a production environment must not expose draft content.
- Desktop Chromium + phone Chromium/WebKit/320px: verify five selectors, open strings, inversion status, accurate string/fret and note labels, no overflow, keyboard disclosure/focus, and accessible source actions.
- Obtain explicit user interactive review and independent music-editor approval before any release or merge.

## Stop condition

Keep PR #15 **draft/open/unmerged** with target PR #14. PR #14 and JRN-004 PR #13 also stay draft/unmerged until user acceptance. This work authorizes no production release.
