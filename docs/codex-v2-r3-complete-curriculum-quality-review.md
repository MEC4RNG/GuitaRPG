# Sound Uncharted — Codex V2 / R3 Curriculum Accuracy & Teaching Review

**Status:** EDITORIAL FIRST PASS; NOT independently educator-approved; NOT published.
**Scope:** three canonical Skill exemplars, 14 applications, 42 instructional-level slots.
**Head content:** `domain/codex/v2/preview-excerpts.json`; published V2 catalog remains intentionally empty.

## Outcome and scope

The first-pass inspection covered all 42 instructional modules and their 42 exercises, including musical examples, exercise setup, count grids, outcome/self-check alignment, and distinctions between instructional levels and Player proficiency. Structural checks and deterministic pitch/rhythm spot checks are automated separately. This record does **not** confer independent pedagogical approval or permission to publish.

**42/42 application×learning-level slots have draft lessons.** There are no missing slots among the three pilots; UI support for showing a disabled unavailable slot stays in place for future Skills.

## High-scrutiny theoretical and instrumental checks

- **Standard-tuning guitar voicings:** open strings 3/2/1 = G3/B3/E4. C major `[5,5,3]` = C4/E4/G4; C minor `[5,4,3]` = C4/E♭4/G4; F major first inversion `[2,1,1]` = A3/C4/F4; F major second inversion `[5,6,5]` = C4/F4/A4; G major first inversion `[4,3,3]` = B3/D4/G4.
- **Four triad qualities from C:** C–E–G (0/4/7), C–E♭–G (0/3/7), C–E♭–G♭ (0/3/6), C–E–G♯ (0/4/8) in 12-TET. Spelling is intentional: C augmented uses G♯, not A♭.
- **Diatonic triads in C major:** C–E–G; D–F–A; E–G–B; F–A–C; G–B–D; A–C–E; B–D–F. Resulting qualities: I, ii, iii, IV, V, vi, vii°.
- **Tonicization is contextual:** D7 (D–F♯–A–C) resolving to G illustrates V7/V in C major; F♯ is chromatic raised degree 4 of C and a leading tone to G when G is locally emphasized. It is not standalone evidence of permanent modulation.
- **Rhythm:** 4/4 has four quarter beats; 1, 2, 3, or 4 subdivisions per beat yield 4, 8, 12, or 16 equal positions. The written two-bar intermediate rhythm uses sixteenth-grid indices A `[0,6,8,15]`, B `[0,6,10,12]`. The existing tool does not perform these custom patterns. 7/8 (2+2+3) examples must not claim the 4/4 metronome demonstrates odd meter.

## Review matrix — all 42 draft modules

| Skill | Level | Musical application | Module ID | First-pass musical check | Review priority |
| --- | --- | --- | --- | --- | --- |
| scale degree recognition | foundational | Aural recognition | `sdr.aural.f1` | C tonic with C/E/G as degrees 1/3/5; avoid fixed emotions. | Standard music-educator review |
| scale degree recognition | foundational | Fretboard navigation | `sdr.fretboard.f1` | C/E/G degrees on actual standard-tuning strings; avoid false fret defaults. | Instrument verification |
| scale degree recognition | foundational | Theory & function | `sdr.theory.f1` | C- and G-major scale spelling, including F♯ in G. | Standard music-educator review |
| scale degree recognition | foundational | Improvisation | `sdr.improv.f1` | C/D/E pitches as 1/2/3; beginner phrase ending independent of fingering. | Standard music-educator review |
| scale degree recognition | foundational | Composition | `sdr.composition.f1` | C–D–E–D and E–D–C–C map to numbered degree patterns. | Standard music-educator review |
| scale degree recognition | intermediate | Aural recognition | `sdr.aural.i1` | D/F/A/B vs C as tonic; differences in color are contextual. | Standard music-educator review |
| scale degree recognition | intermediate | Fretboard navigation | `sdr.fretboard.i1` | Degree 3 shifts E in C to B in G; degree 7 shifts B to F♯. | Instrument verification |
| scale degree recognition | intermediate | Theory & function | `sdr.theory.i1` | E is degree 3 in C, yet not a note of F major (F–A–C). | Standard music-educator review |
| scale degree recognition | intermediate | Improvisation | `sdr.improv.i1` | Target tonic/third/fifth over C major; no fixed affect claims. | Standard music-educator review |
| scale degree recognition | intermediate | Composition | `sdr.composition.i1` | 1–2–3–5 correctly transposes C–D–E–G to G–A–B–D. | Standard music-educator review |
| scale degree recognition | advanced | Aural recognition | `sdr.aural.a1` | Maintain C tonic through C–Am–F–G while local chord roles vary. | Standard music-educator review |
| scale degree recognition | advanced | Fretboard navigation | `sdr.fretboard.a1` | C=1 in C and 4 in G; E=3 in C and 6 in G. | Instrument verification |
| scale degree recognition | advanced | Theory & function | `sdr.theory.a1` | D7→G tonicization, F♯ raised degree 4 of C and leading tone of G; not proof of modulation. | Higher — harmonic, voicing, or meter nuance |
| scale degree recognition | advanced | Improvisation | `sdr.improv.a1` | Chord membership differs from global scale-degree role across C–Am–F–G. | Standard music-educator review |
| scale degree recognition | advanced | Composition | `sdr.compose.a1` | Unresolved-to-tonic melodic ending as an illustrative choice, not a universal emotion. | Standard music-educator review |
| triad construction | foundational | Harmony & construction | `triad.theory.f1` | C–E–G versus C–E♭–G: major/minor third, common root and fifth. | Standard music-educator review |
| triad construction | foundational | Fretboard shapes & inversions | `triad.fretboard.f1` | G/B/high-E strings: 5–5–3 C/E/G and 5–4–3 C/E♭/G. | Instrument verification |
| triad construction | foundational | Listening & chord quality | `triad.aural.f1` | Control register/dynamics when comparing E versus E♭. | Standard music-educator review |
| triad construction | foundational | Arrangement & voice leading | `triad.composition.f1` | C major and A minor share C and E; choose accurate voices. | Standard music-educator review |
| triad construction | intermediate | Harmony & construction | `triad.theory.i1` | C Dm Em F G Am B° triads; B–D–F is diminished. | Standard music-educator review |
| triad construction | intermediate | Fretboard shapes & inversions | `triad.fretboard.i1` | C major inversion pitch orders C–E–G / E–G–C / G–C–E. | Instrument verification |
| triad construction | intermediate | Listening & chord quality | `triad.aural.i1` | Major/minor triad comparison without assigning innate emotional meanings. | Standard music-educator review |
| triad construction | intermediate | Arrangement & voice leading | `triad.composition.i1` | G/B/E voicings C 5–5–3, Am 5–5–5, F 5–6–5, G 4–3–3; top voice G–A–A–G. | Higher — harmonic, voicing, or meter nuance |
| triad construction | advanced | Harmony & construction | `triad.theory.a1` | C major (0,4,7), minor (0,3,7), diminished (0,3,6), augmented (0,4,8); G♭/G♯ spelling. | Higher — harmonic, voicing, or meter nuance |
| triad construction | advanced | Fretboard shapes & inversions | `triad.fretboard.a1` | C→F second inversion on top strings 5–5–3 to 5–6–5: C held, E→F, G→A. | Instrument verification |
| triad construction | advanced | Listening & chord quality | `triad.aural.a1` | C4 E4 G4 to C4 F4 A4: F second inversion, C held, upper voices +1 and +2 semitones. | Higher — harmonic, voicing, or meter nuance |
| triad construction | advanced | Arrangement & voice leading | `triad.compose.a1` | C–Am–F–G triad spelling and deliberate top-voice movement. | Standard music-educator review |
| subdivision control | foundational | Listening & internal pulse | `subdiv.aural.f1` | Quarter-note pulse persists when eighth-note events increase. | Standard music-educator review |
| subdivision control | foundational | Picking & coordination | `subdiv.picking.f1` | At 80 BPM beat=0.75 s and each eighth=0.375 s. | Instrument verification |
| subdivision control | foundational | Groove & accents | `subdiv.groove.f1` | Sixteenth count 1-e-&-a repeats four positions per beat. | Standard music-educator review |
| subdivision control | foundational | Counting & notation | `subdiv.reading.f1` | Four quarter-note beats support grids of 4/8/12/16 events. | Standard music-educator review |
| subdivision control | foundational | Composing rhythm | `subdiv.composition.f1` | Four quarter vs eight eighth attacks in the same 4/4 tempo. | Standard music-educator review |
| subdivision control | intermediate | Listening & internal pulse | `subdiv.aural.i1` | Straight eighths: 2/beat; eighth-note triplets: 3/beat; triplet ≠ automatic swing. | Standard music-educator review |
| subdivision control | intermediate | Picking & coordination | `subdiv.picking.i1` | Two versus four attacks per beat without accelerating quarter BPM. | Instrument verification |
| subdivision control | intermediate | Groove & accents | `subdiv.groove.i1` | Accent the eighth-note ‘ands’ while beats 1–4 remain constant. | Standard music-educator review |
| subdivision control | intermediate | Counting & notation | `subdiv.reading.i1` | Attacks at 1, 2a, 4& in a continuous 16-slot grid; silence does not change time. | Standard music-educator review |
| subdivision control | intermediate | Composing rhythm | `subdiv.composition.i1` | Bar A 16th indices [0,6,8,15]; bar B [0,6,10,12] at one quarter BPM. | Higher — harmonic, voicing, or meter nuance |
| subdivision control | advanced | Listening & internal pulse | `subdiv.aural.a1` | Recover quarter pulse under syncopated accents; player does not synthesize custom patterns. | Standard music-educator review |
| subdivision control | advanced | Picking & coordination | `subdiv.picking.a1` | Three versus four notes per quarter beat without changing quarter tempo. | Instrument verification |
| subdivision control | advanced | Groove & accents | `subdiv.groove.a1` | Accent shift one sixteenth; preserve underlying beat and 4/4. | Standard music-educator review |
| subdivision control | advanced | Counting & notation | `subdiv.reading.a1` | 7/8 grouped 2+2+3, separate from the 4/4 reference player. | Higher — harmonic, voicing, or meter nuance |
| subdivision control | advanced | Composing rhythm | `subdiv.composition.a1` | Quarter/eighth/sixteenth density creates activity at fixed BPM. | Standard music-educator review |

## Teaching-quality and UX checks

1. **Intentional progression:** Foundational builds recognition and simple execution, Intermediate adds context/transfer, Advanced combines independent functions and more complex harmony, rhythm, or listening. All applications now have all three levels **in this pilot only**; this does not mandate exactly one lesson per slot in the eventual full library.
2. **Exercises:** every module includes outcomes, an explanatory passage, actionable setup, discrete steps, a self-check and suggested duration. None invokes a Session, writes a Workbook, awards XP, or implies mastery.
3. **Terminology:** tonic vs root and scale degree vs chord tone remain distinct; major/minor chord quality does not imply an intrinsic fixed emotion. Chord inversion is determined by the lowest sounding chord tone.
4. **Instrument context:** all specific string/fret triples above refer to standard tuning. Other tunings must regenerate actual notes; never reuse these shapes unchanged for DADGAD.
5. **Player-facing truthfulness:** the reference tools demonstrate only the functions actually implemented (C-major degrees, three triad voicings, and even 4/4 subdivisions). They are not evidence that custom riffs, accents or 7/8 playback are available.
6. **Vocabulary:** the 178 draft terms remain editorial candidates separate from the 197 canonical taxonomy entries. Glossary cross-references may be candidates and should not imply semantic equivalence or prerequisite authority.

## Corrections made in this review pass

- Clarified `subdiv.reading.i1` to specify attacks at beat 1, the **a of beat 2**, and the **& of beat 4**, eliminating ambiguity from the old phrase “4 and.”
- Expanded concise setup directions in `sdr.aural.i1` and `sdr.improv.a1` to make the listening drone and chord progression explicit.
- Final five modules were authored with exact note spelling, inversion labels, and count-grid directions, and their application level metadata is now validated against actual lesson coverage.

## Editorial gates still open

This is an internal first-pass quality check, not an external music-educator review. Before promotion, obtain human editorial review of advanced harmonic function, note spelling, voice-leading registers, odd meter, accessibility of diagrams/audio, and pedagogical suitability across age/ability. Test real guitar playback and mobile UI visually. Keep the published corpus empty, leave PR #14 draft/unmerged while parent JRN-004 is awaiting acceptance, and do not begin JRN-005 or CODEX-V2-B solely on content coverage.

## Reviewer interaction checklist (pre-acceptance)

This checklist is a **human visual and musical acceptance guide**, not an automated result or substitute for external educator sign-off.

1. On a desktop viewport, open the nonproduction `/prototype/codex-v2` Library; verify three canonical Skill cards, Library-only banner, and full-width entry panels in Overview, Lessons, How to Explore, Applications and Connections. On mobile, repeat at phone widths, checking readable dialogs/diagrams, visible controls and no horizontal clipping.
2. Open each Skill and inspect the Foundational, Intermediate and Advanced filters. The 14 named applications have **42/42** authored drafts, so the availability note should state that all applications have lessons for each selected level. If a future entry lacks a level/application lesson, its option should remain visible but disabled, and selection should recover when changing levels.
3. Expand and collapse lessons using pointer and keyboard. Check the disclosure arrow, setup, objectives, ordered exercise steps, self-check and suggested minutes. None should claim automatic proficiency, completed Quests, grades, rewards, or XP.
4. Use the interactive C-major scale-degree selector, switching degrees 1–7; verify labeling and user-initiated tone playback. In the Triad Construction entry check standard-tuning top-string C major, C minor and F major first-inversion note/fret labels. In Subdivision Control check the 4/8/12/16-position 4/4 reference grids and explicit Play/Stop/BPM behavior; the demonstration is not a custom rhythm sequencer.
5. Open a glossary definition from the entry, close with Escape, and confirm keyboard focus returns to the same term. Use the full Dictionary route inside the preview, filter its 178 draft definitions, and verify related canonical Codex links open to meaningful V1 entries.
6. Open official `/codex` separately and confirm the original 197 published V1 references and their canonical URLs still work. A normal Vercel production deployment must not expose the draft preview route or its navigation link; local browser tests use an explicit test-only opt-in.
7. Musically scrutinize each R3 lesson using the 42-row matrix above; give special attention to chromatic tonicization versus modulation, enharmonic spelling, actual guitar note registers, inversion bass notes, subdivision metrical grouping and instructional difficulty progression.

**Status:** Review guide prepared. The 42 lessons, 178 dictionary entries and 24 proposed relationships remain `DRAFT_REVIEW`; no human visual acceptance or independent music-editor approval has been recorded.
