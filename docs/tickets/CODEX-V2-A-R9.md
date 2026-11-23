# CODEX-V2-A-R9 — Shared Interactive Fretboard Engine

**Status:** DRAFT IMPLEMENTATION. User authorization: "sounds good lets build it" (2026-11-23).
**Branch:** `codex-v2-r9-shared-fretboard-engine`. Stacked above R8 draft PR #18; no merge or publication authorization.
**Focus:** Three Skills: Note Location, Scale Mapping, Interval Recognition.
**Layout decision:** Deliberately retain existing Codex overview/reference containers while the user considers the final visual redesign.

## Implemented vertical slice

1. **One pure music engine** in `lib/codex/v2/fretboard-engine.ts` maps real guitar string/fret coordinates to *sounding* MIDI pitches, pitch classes, correctly spelled notes and registers. Guitar string 1 = high string, 6 = low. Supported open tunings: standard E2/A2/D3/G3/B3/E4, drop D D2/A2/D3/G3/B3/E4, DADGAD D2/A2/D3/G3/A3/D4.
2. **Three reusable modes** in `components/codex-v2-fretboard.tsx`:
   - **Note Location:** select any of 12 chromatic pitch classes; highlight each location in the visible 0–12 fret range and show its actual sounding octave. Selecting an unrelated fret changes the search note deliberately.
   - **Scale Mapping:** select one of 12 roots, major/natural-minor/harmonic-minor collections and guitar tuning. Seven degrees are calculated from chromatic intervals **and diatonic letter spelling**, including E♯, B♯, C♭, F♭ and other accidentals where theoretically justified. Select a note to see its true sounding pitch and degree, or discover that a played note is outside the collection.
   - **Interval Recognition:** select root and ascending interval (m2, M2, m3, M3, P4, augmented fourth, diminished fifth, P5, m6, M6, m7, M7, P8). Select an **actual fretboard reference note**; destinations are highlighted by **exact sounding MIDI value** above that reference, not merely matching a pitch class in any octave. Augmented fourth and diminished fifth use distinct correct spellings even when equal-tempered pitches coincide.
3. **Presentation:** a shared semantically labelled six-string fretboard table with local horizontal scrolling for narrow phones, large touch targets, one roving keyboard tab stop with arrow navigation, native select controls, user-initiated synthesized tone playback with visual fallback, live pitch/degree/interval status and a compact explicit legend. Existing Overview, Lessons, How to Explore, Applications and Connections layout remains unchanged.
4. **Codex parser:** only the three matching canonical Skill identities are permitted to use the new `FRETBOARD_NOTE_LOCATION`, `FRETBOARD_SCALE_MAP` or `FRETBOARD_INTERVALS` block types, with `location: "overview"`. Untrusted media-kind, cross-Skill and unsupported location requests are rejected.
5. **Draft curriculum:** added one real `reference_blocks` record to `note_location` (R7), `scale_mapping` (R8) and `interval_recognition` (R6). All other modules and editorial content remain untouched and `DRAFT_REVIEW`. The existing three pilot Skill demonstrations remain available, now bringing interactive coverage to **six of the nine expanded Skills**.
6. **Tests:** deterministic unit tests cover all 3 tunings × 6 strings × 13 frets, fret input bounds, 12 chromatic note identities, 36 root/scale combinations with correct spellings, 13 intervals × 12 roots, exact-register destination availability, canonical block validation; Playwright covers the three Skill modes, keyboard/touch behavior, local overflow at 320px, changing tunings, enharmonic notation and unchanged Skill navigation.

## Boundaries

- **No V2 publication** (`published.json` remains zero entries/terms); existing 197 V1 entries, prior 114 draft lessons, 178 glossary terms and 48 draft proposed relationships remain authoritative/unchanged. New references are `DRAFT_REVIEW` instructional aids, not automatic practice evidence.
- **No microphone recording, automatic pitch judgment, chord or fingering detection.** Audio playback is optional, starts only after a user's selection and has a truthful fallback when browser audio is unavailable. No claim that a selected fret is a mandatory fingering.
- **No untrusted MIDI, Quest/session/proficiency/XP/Player data mutation**, database migration or production traffic changes.
- This is an initial exploration window **frets 0–12**; open positions and octave distinction are supported, and more frets/tunings can be considered in later iterations with tested UI behavior.
- Independent guitar-educator review is still required for enharmonics, accurate register, useful pedagogical levels and mobile playability; browser/CI success does **not** imply educational sign-off.

## Acceptance gates

1. Final-head Prettier, lint, strict TypeScript, unit tests, production Next build, database/security/identity/player-control workflows and UX browser suite.
2. Desktop and 320px/mobile interactive inspection (scroll, focus, touch, audio blocked, selected pitch changes) plus user visual approval.
3. Validate inherited R8, R7, R6 and original pilot Skills unchanged aside from these three explicit reference blocks.
4. Keep PR **draft/open/unmerged**, targeting R8 PR #18. All ancestor PRs remain independently gated. No protected release or publication is authorized.

**Next engine candidates:** Chord/Voicing for Voice Leading and Chord Inversion Navigation, and Sequence/Playback for Arpeggio Sequencing; reuse this verified pitch/interval core rather than duplicating music logic.
