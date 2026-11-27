# Sound Uncharted — Codex V2 R7 Curriculum Review

**Status:** EDITORIAL DRAFT ONLY; not independently educator-approved; not published.

**Scope:** Note Location and Voice Leading, two already-canonical Skills. Each has 4 applications with a Foundational, Intermediate and Advanced lesson: 24 original modules and 24 exercises.

**Design constraint:** Content-only release. The user is considering a redesign. R7 makes **no React/CSS/layout changes**, no new media tools, no Account/Quest/Session/Result/XP/Workbook writes, and no Supabase schema changes. A lesson with no verified interactive reference deliberately has an empty `reference_blocks` array rather than a placeholder claiming functionality.

## Exact lesson review matrix

| Skill | Application | Level | Module ID | Title | Suggested time | Editorial priority |
| --- | --- | --- | --- | --- | ---: | --- |
| Note Location | Fretboard navigation | foundational | `nl.fretboard.f1` | Name all six open strings | 5 min | Standard — check pitch names, clear exercise and level progression |
| Note Location | Pitch naming & notation | foundational | `nl.reading.f1` | Find one C4 in several places | 6 min | Standard — check pitch names, clear exercise and level progression |
| Note Location | Tuning & recalculation | foundational | `nl.tuning.f1` | Use frets as measured semitone steps | 6 min | Standard — check pitch names, clear exercise and level progression |
| Note Location | Melody & transposition | foundational | `nl.melody.f1` | Play a melody on a single string | 7 min | Standard — check pitch names, clear exercise and level progression |
| Note Location | Fretboard navigation | intermediate | `nl.fretboard.i1` | Compare matching notes and octaves | 7 min | Standard — check pitch names, clear exercise and level progression |
| Note Location | Pitch naming & notation | intermediate | `nl.reading.i1` | Recognize enharmonic pitch labels | 8 min | Higher — enharmonic F♯3/G♭3 and correct key-context spelling |
| Note Location | Tuning & recalculation | intermediate | `nl.tuning.i1` | Update your note map in DADGAD | 9 min | Higher — DADGAD string 2 A3 and altered C4 fret mapping |
| Note Location | Melody & transposition | intermediate | `nl.melody.i1` | Transpose a one-string melody by a whole step | 8 min | Standard — exact note/fret transposition C4–D4–E4 to D4–E4–F♯4 |
| Note Location | Fretboard navigation | advanced | `nl.fretboard.a1` | Find a pitch beyond its first position | 10 min | Higher — C4 four locations vs C5 separate register |
| Note Location | Pitch naming & notation | advanced | `nl.reading.a1` | Account for the guitar's notated octave | 9 min | Higher — standard treble-clef guitar notation sounds octave below written pitches |
| Note Location | Tuning & recalculation | advanced | `nl.tuning.a1` | Relocate notes after dropping the low string | 9 min | Higher — drop-D C3 string-6 fret recalculation |
| Note Location | Melody & transposition | advanced | `nl.melody.a1` | Preserve a melody across different fingerings | 10 min | Standard — check pitch names, clear exercise and level progression |
| Voice Leading | Harmony & inversions | foundational | `vl.harmony.f1` | Keep two notes while one voice moves | 7 min | Standard — check pitch names, clear exercise and level progression |
| Voice Leading | Guitar voicing routes | foundational | `vl.fretboard.f1` | Move one note on three guitar strings | 7 min | Standard — check pitch names, clear exercise and level progression |
| Voice Leading | Aural voice tracking | foundational | `vl.aural.f1` | Listen for held tones across neighboring chords | 8 min | Standard — check pitch names, clear exercise and level progression |
| Voice Leading | Composition & arrangement | foundational | `vl.composition.f1` | Write a two-bar top-voice line | 8 min | Standard — check pitch names, clear exercise and level progression |
| Voice Leading | Harmony & inversions | intermediate | `vl.harmony.i1` | Choose efficient motion across three triads | 9 min | Higher — three-voice C→F→G semitone movements |
| Voice Leading | Guitar voicing routes | intermediate | `vl.fretboard.i1` | Connect four triads on upper strings | 10 min | Higher — standard G/B/E fret triples and inversions |
| Voice Leading | Aural voice tracking | intermediate | `vl.aural.i1` | Distinguish oblique from contrary motion | 8 min | Standard — check pitch names, clear exercise and level progression |
| Voice Leading | Composition & arrangement | intermediate | `vl.composition.i1` | Maintain a melodic destination through C–Am–F–G | 10 min | Standard — check pitch names, clear exercise and level progression |
| Voice Leading | Harmony & inversions | advanced | `vl.harmony.a1` | Voice-lead from Cmaj7 to Fmaj7 | 11 min | Higher — Cmaj7→Fmaj7 inversion and four-voice motion |
| Voice Leading | Guitar voicing routes | advanced | `vl.fretboard.a1` | Plan bass and melody as separate guitar roles | 11 min | Higher — physically plausible alternating bass and melody, not mandatory grips |
| Voice Leading | Aural voice tracking | advanced | `vl.aural.a1` | Hear a prepared 4-to-3 resolution | 11 min | Higher — prepared versus unprepared 4–3 suspension; C4→B3 |
| Voice Leading | Composition & arrangement | advanced | `vl.composition.a1` | Arrange four independent voices across extended chords | 12 min | Higher — extended-chord voice-leading registers and melodic independence |

## Core musical-accuracy assertions

**Note Location:**
- Standard tuning from strings 6→1 is E2/A2/D3/G3/B3/E4; string 1 is high E4. E2→E4 spans two octaves, not one.
- C4 has the **same sounding register** on string 4 fret 10, string 3 fret 5, string 2 fret 1, and string 5 fret 15; C5 on string 1 fret 8 is **an octave higher**. Check this difference whenever using two written C's.
- C3 is string 5 fret 3 and string 6 fret 8 in standard tuning; string 6 fret 10 in drop D (D2 open). DADGAD open strings 6→1 are D2/A2/D3/G3/A3/D4; string 2 fret 3 is C4 in DADGAD.
- String 4 fret 4 in standard tuning is MIDI 54 (F♯3/G♭3 in 12-TET). Written spelling is contextual, not determined by the single fret.
- Conventional octave-transposing treble-clef guitar notation generally writes sounding E2 as E3 and sounding E4 as E5; check any digital score's transposition setting rather than hardcoding a second octave shift.
- Second-string standard-tuning frets 1/3/5/1 sound C4/D4/E4/C4. Transposing up a whole tone changes these to frets 3/5/7/3, sounding D4/E4/F♯4/D4.

**Voice Leading:**
- On standard G3/B3/E4 strings 3→1: C 5–5–3 = C4/E4/G4; Am 5–5–5 = C4/E4/A4 (first inversion); F 5–6–5 = C4/F4/A4 (second inversion); G 4–3–3 = B3/D4/G4 (first inversion). Top line G4/A4/A4/G4. A displayed fretting triple is not a prescribed physical fingering.
- C→F upper voicing movement C4→C4 (0), E4→F4 (+1), G4→A4 (+2). F→G movement C4→B3 (−1), F4→D4 (−3), A4→G4 (−2). These are signed semitone movements for the aligned lower/middle/upper voices.
- Cmaj7 C4/E4/G4/B4 to Fmaj7 C4/E4/F4/A4 holds C4 and E4; G4 and B4 each move down 2 semitones. Fmaj7 with C4 in the bass is an inversion, not a root-position F chord.
- A prepared C4 retained from C harmony over G harmony can resolve to B3 as 4→3 above G. Do **not** universally label any C→B melodic move a suspension: proper preparation and placement must be present.
- For guitar bass+melody, C3 string 5 fret 3, A2 open string 5, F2 string 6 fret 1, G2 string 6 fret 3 are true pitches. G4/A4/A4/G4 can be found on string 1 frets 3/5/5/3. Teach alternating bass and top line first; do not imply an ergonomically unverified all-at-once stretch.

## Teaching and release gates

1. Independent guitar-educator review of all 24 exercises, standard and alternate tuning notes, hand-span ergonomics, and appropriately accessible ear-learning instruction.
2. Final-head deterministic tests and desktop/mobile browser smoke, with no fake reference media or horizontal overflow. The existing V1 Codex's 197 official routes and 178 draft dictionary terms must remain intact.
3. R7 is an expansion of preview source content only. The authoritative `domain/codex/v2/published.json` remains **zero entries, zero terms**. No editorial review is implied by successful typechecks, generated renderings, or one internal spot check.
4. Parent PR #16, #14 and #13 remain draft/unmerged. Any later combination with the separate Codex→Workbook PR #15 requires updating integration tests for the final 90-lesson catalog and obtaining separate permissions for publication.

## Product note

The approved conceptual work can proceed independently of aesthetic design. Notes, authentic exercises, and machine-readable Skill/application/level identities should be preserved through a later redesign. No new interactive musical tool is necessary merely to display these draft lessons.
