# CODEX-V2-A-R10 — Reusable Chord and Voicing Explorer

**Disposition:** DRAFT IMPLEMENTATION, not a production publication or independent music-editor approval.
**User direction:** 2026-11-23 — "Lets do the chord and voicing expansion next if you're ready to move on to that".
**Branch:** `codex-v2-r10-chord-voicing-engine` stacked on R9-R1 PR #20. Keep all ancestor PRs draft/unmerged.
**Scope:** Existing canonical Skills **Chord Inversion Navigation** and **Voice Leading**. Do not redesign the overall Codex layout.

## Delivered

- Pure, reusable `lib/codex/v2/chord-voicings.ts` built on R9's trusted `fretboard-engine.ts` for standard, Drop D and DADGAD tuning, 12 chromatic roots, major/minor triads and adjacent three-string groups (3–2–1, 4–3–2, 5–4–3, 6–5–4).
- Generate possible chord shapes from *actual sounding MIDI pitches*, not a hardcoded picture. Each candidate must have exactly root/third/fifth, ascending register from low to high string, bounded fretted span of at most four frets, and limited open-string/high-fret mixing. Invalid shapes are excluded rather than displayed. No mandatory finger assignments.
- Spell each chord tone diatonically from its root (for example, C♯ major uses E♯ as its third; A♭ minor uses C♭). Register calculations honor enharmonic octave boundaries such as B♯3/C4.
- Classify root position, first inversion, and second inversion from the **lowest sounding chord tone**. Maintain chord-root identity distinct from the bass. The UI offers tuning, root, quality, string group, inversion and selectable alternative voicing; displays three-string diagram, pitch names/frets, and explicit user-initiated chord/arpeggio audition with visual fallback.
- Shared **Voice-Leading Explorer** uses the same verified shapes. Choose one of three four-chord progressions: C–Am–F–G; C–F–G–C; G–Em–C–D. Per-chord voicings are selectable. Show exact semitone movement of the three aligned string voices, including held, upward and downward movement. Dynamic programming proposes a path minimizing total absolute sounding-pitch motion across these chord changes. Suggested low-motion paths are neither a physical ergonomics claim nor automatic progression evidence.
- Musical exemplar from earlier lessons remains available for C–Am–F–G on standard top strings: C major [5,5,3] = C4/E4/G4, Am [5,5,5] = C4/E4/A4, F [5,6,5] = C4/F4/A4, G [4,3,3] = B3/D4/G4, with **9 total semitones of summed three-voice movement** and top line G4–A4–A4–G4. Dynamic optimization can select another connected path if lower motion exists.
- Two new allowlisted V2 reference blocks `CHORD_INVERSION_EXPLORER` and `VOICE_LEADING_EXPLORER` are permitted **only for their matching canonical Skills** and only in the draft overview. They are attached to R8 and R7 source content respectively. Previously authored exercises/lesson data remains untouched.
- Browser and unit checks cover correctness, 12 roots, multiple tunings and string groups, inversion bass logic, deterministic voice-motion arithmetic, selection controls, responsive layouts, and rejection of untrusted media types.

## Accuracy notes and educational limitations

- These are *three-string triad* experiments, not four-voice extended chords or comprehensive fingering analysis. A chord with an independently sounded lower bass can have a different **total texture inversion** than this three-string voicing. If future tools add bass tracks, inversion must be recomputed from the entire sounding sonority.
- The movement objective sums **absolute MIDI semitone distances along corresponding strings**. Minimal pitch movement does not always imply easiest hand transitions, a pleasing composition, good technique or best musical taste. Student-selected variants remain permitted.
- Notes are sounded via short Web Audio oscillators on deliberate user gestures, without microphone capture, grading, Session creation or XP award. No audio availability implies no loss of visual pitch information.
- The chord-tone spelling must be correct in 12-tone equal temperament. Guitar educator review is required for usable positions and appropriately staged student examples.

## Publication, Player and UX boundaries

- All nine expanded Skill curricula (114 lessons), 178 draft terms, 48 proposed relationships and the prior R9 fretboard references are retained. With the new two tools, **eight of nine** expanded Skills have interactive references; Arpeggio Sequencing remains the next candidate for a shared sequence/playback engine.
- No production V2 publication: `domain/codex/v2/published.json` stays empty and the 197 official V1 Codex routes remain unchanged. No Quest, Player, Workbook, Session, Result, proficiency, XP, Supabase, migrations or protected production merge.
- Keep R10 PR **DRAFT / OPEN / UNMERGED** above R9-R1 PR #20. Final-head format/lint/typecheck/Vitest/production build and authenticated browser/multi-device tests must pass. Human audio/musical and phone/desktop visual review is required prior to any acceptance/merge.
