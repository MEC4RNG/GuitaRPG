# CODEX-V2-A-R11 — Arpeggio Sequencer (Draft, Interactive)

**Disposition:** DRAFT IMPLEMENTATION; editorial and human review still required.
**Branch:** `codex-v2-r11-arpeggio-sequencer`, stacked on R10 draft PR #21.
**Direction:** User approved proceeding with the Arpeggio Sequencer after the shared chord/voicing engine.

## Product scope implemented

One reusable *one-bar 4/4* chord-tone sequencing experience for the existing **Arpeggio Sequencing** Skill's Codex Overview. It reuses R10's physically verified triad voicings and R9's guitar pitch/register calculations rather than authoring a new fingering algorithm.

### Musical source
- Choose among the 12 canonical chromatic roots, major or minor triad, standard/Drop D/DADGAD tuning, four adjacent three-string groups (1–3, 2–4, 3–5, 4–6), the available root/first/second inversion, and a verified alternative physical voicing.
- The actual bass-to-treble guitar strings and sounding pitches come from `generateTriadVoicings`. **Selecting the root always means the current chord's root** even when a first/second inversion puts its third/fifth in the bass. No arbitrary chord notes or unsupported fret positions are invented.
- Display a reused three-string chord diagram, the exact selected notes, real frets and chord-tone identity.

### Sequencer and rhythm
- The engine is a deterministic immutable calculation of **four quarter-note beats**; the metronomic reference is the quarter note, not the individual attacks.
- Subdivisions: quarter = 4 events, eighth = 8, eighth-note triplet = 12, sixteenth = 16. Each event records its beat, subdivision part, spoken count, selected chord-tone role or rest, real MIDI pitch, spelled note, exact string and fret, onset relative to beat 1, and duration. Tempo is an explicit bounded integer **40–200 BPM**.
- Five preset note orders: root–third–fifth–third, ascending, descending, alternating root and upper notes, and a phrase with a rest. Each event can independently select **Root, Third, Fifth or Rest** from a native accessible control. Changing subdivision reinitializes the current preset; manually edited sequences display Custom. No staff/tab export is claimed.
- Audible demonstration uses a short, user-initiated synthesized note per non-rest event. **Play bar**, **Stop**, and optional loop are available. Playback is scheduled from AudioContext time in a short bounded lookahead; changing the pattern/tempo/voicing stops the previous arrangement. Audio nodes/timers are disconnected on Stop/unmount. When browser audio is blocked, the note/rhythm display remains fully usable and truthful.
- Active event highlighting follows the current musical subdivision. Responsive beat cards and a contained SVG diagram preserve small-screen layout without page-level sideways scrolling.
- This first phase **does not record microphone pitch, evaluate picking technique, persist the generated pattern, award XP, or create Quest/Workbook content**.

## Source and review boundaries

- `lib/codex/v2/arpeggio-sequencer.ts`: pure metrical engine, preset templates and event resolver.
- `components/codex-v2-arpeggio-sequencer.tsx`: accessible draft UI and on-demand playback.
- `components/codex-v2-chord-voicings.tsx`: explicitly export the existing verified chord diagram for reuse; existing inversion and voice-leading tools are functionally unchanged.
- `lib/codex/v2/content.ts` and `components/codex-v2-reference.tsx`: allowlist **ARPEGGIO_SEQUENCER** only on canonical `arpeggio_sequencing`, location `overview`. The R6 draft source receives precisely one reference registration. No arbitrary HTML or untrusted media kinds.
- R3, R6, R7, R8, R9, R10 published/baselined curricula remain unchanged except the new Arpeggio reference registration. All **9/9 draft Skills now have interactive learning references**. The current preview still contains 114 draft lessons, 38 applications, 178 terms and 48 proposed relationships; 197 published V1 entries remain intact; published V2 corpus remains empty.
- No Player-owned data writes, Quest, Session, Result, Workbook, Supabase migrations, production exposure, consent or progression logic changed. This is a preview-only draft.

## Test and release checklist

1. Deterministic Vitest tests for C4/E4/G4 quarter-note C–E–G–E, first-inversion tone-role mapping, 4/8/12/16 metrical subdivisions, 12 root × 2 qualities × 3 tunings × 4 string groups where valid, silence during rests, bounded BPM, and strict media kind/Skill gating.
2. Browser tests on Chromium and mobile WebKit for the source diagram, inversion, C♯-major E♯ spelling, custom editing, subdivision changes, user-initiated start/stop/loop, and no page-level overflow at 320px portrait or 740px landscape.
3. Final-head formatting, ESLint, TypeScript, Vitest, Next build, security, database, identity, Player-data and UX suites must be explicitly checked. Vercel success does not certify browser behavior.
4. Independent guitar/music educator check: true register/fret positions, rhythm counts, chord-tone roles, note lengths vs attack density, usability on phones; user visual acceptance remains open.
5. R11 PR remains **DRAFT / OPEN / UNMERGED** stacked on R10 PR #21. No publication, automatic XP, or protected merges without separate approval.

**Next potential phase after visual approval:** player-selected chord-tone sequences as an editable, owner-scoped Workbook artifact; that feature requires an explicit design and integration ticket with the existing JRN-004/R5 draft branches, not an implicit write from Codex.
