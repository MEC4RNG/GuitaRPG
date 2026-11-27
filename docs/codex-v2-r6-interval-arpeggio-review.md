# Sound Uncharted — CODEX-V2-A-R6 Curriculum Review

**Status:** DRAFT_REVIEW, content-only editorial expansion; not independently music-educator-approved, not published.
**Branch:** `codex-v2-r6-interval-arpeggio-curriculum`.
**Skills added:** Interval Recognition (canonical Skill 032) and Arpeggio Sequencing (canonical Skill 003).

## Design decision

The user wants more time before changing the Codex's visual layout. Therefore R6 **does not edit any UI component or CSS**. It adds source-controlled lessons to the existing versioned V2 preview while leaving the approved publication corpus, Quest ownership, Workbooks and player progress untouched.

The 3 original pilot Skills retain their 42 draft lessons. This expansion adds 2 Skills, 8 applications and 24 authored lessons (one per application × Foundational/Intermediate/Advanced). The resulting preview has **5 Skills, 22 applications and 66 draft lessons**, plus the previously drafted 178 dictionary terms and 32 proposed educational relationships (24 original + 8 new). The 197 canonical V1 entries remain public; the published V2 catalog remains intentionally empty.

Every new lesson has a distinct ID, three or more outcomes, an explanation, four or more actionable exercise steps, a setup, a self-check, a suggested duration and `records_progress: false`. No interactive reference is invented for these Skills. Future tools are separate designs, not a reason to delay editorial writing.

## R6 review matrix — all 24 draft lessons

| Canonical Skill | Application | Instructional level | Module ID | Draft lesson | Editorial focus |
| --- | --- | --- | --- | --- | --- |
| Interval Recognition | Aural recognition | foundational | `ir.aural.f1` | Hear the second, third, and fifth | Standard — accurate musical progression and executable exercise |
| Interval Recognition | Fretboard navigation | foundational | `ir.fretboard.f1` | Measure distances along one string | Standard — accurate musical progression and executable exercise |
| Interval Recognition | Interval spelling & function | foundational | `ir.theory.f1` | Give an interval its number and quality | Standard — accurate musical progression and executable exercise |
| Interval Recognition | Melody & arrangement | foundational | `ir.composition.f1` | Write a short melody from interval moves | Standard — accurate musical progression and executable exercise |
| Interval Recognition | Aural recognition | intermediate | `ir.aural.i1` | Separate melodic and harmonic thirds | Standard — accurate musical progression and executable exercise |
| Interval Recognition | Fretboard navigation | intermediate | `ir.fretboard.i1` | Find one interval in two string sets | Standard — accurate musical progression and executable exercise |
| Interval Recognition | Interval spelling & function | intermediate | `ir.theory.i1` | Spell the same six semitones two ways | Higher — augmented fourth/diminished fifth notational distinction |
| Interval Recognition | Melody & arrangement | intermediate | `ir.composition.i1` | Design two voices by controlled steps | Standard — accurate musical progression and executable exercise |
| Interval Recognition | Aural recognition | advanced | `ir.aural.a1` | Compare the tritone by spelling and context | Higher — six-semitone aural size versus enharmonic written identity |
| Interval Recognition | Fretboard navigation | advanced | `ir.fretboard.a1` | Account for the G-to-B tuning exception | Higher — standard guitar G/B tuning exception |
| Interval Recognition | Interval spelling & function | advanced | `ir.theory.a1` | Invert and extend intervals without losing quality | Higher — inverted major third and compound major tenth |
| Interval Recognition | Melody & arrangement | advanced | `ir.composition.a1` | Use chromatic approach tones deliberately | Standard — accurate musical progression and executable exercise |
| Arpeggio Sequencing | Chord-tone mapping | foundational | `arp.harmony.f1` | Separate chord tones into a sequence | Standard — accurate musical progression and executable exercise |
| Arpeggio Sequencing | Fretboard routes | foundational | `arp.fretboard.f1` | Find C major on three guitar strings | Standard — accurate musical progression and executable exercise |
| Arpeggio Sequencing | Picking & rhythmic control | foundational | `arp.picking.f1` | Give each chord tone one deliberate attack | Standard — accurate musical progression and executable exercise |
| Arpeggio Sequencing | Melodic arrangement | foundational | `arp.composition.f1` | Make a two-chord arpeggio melody | Standard — accurate musical progression and executable exercise |
| Arpeggio Sequencing | Chord-tone mapping | intermediate | `arp.harmony.i1` | Track chord tones through C–Am–F–G | Standard — accurate musical progression and executable exercise |
| Arpeggio Sequencing | Fretboard routes | intermediate | `arp.fretboard.i1` | Carry C major between two registers | Higher — string/fret labels and note registers |
| Arpeggio Sequencing | Picking & rhythmic control | intermediate | `arp.picking.i1` | Keep tempo while doubling the note density | Standard — accurate musical progression and executable exercise |
| Arpeggio Sequencing | Melodic arrangement | intermediate | `arp.composition.i1` | Make an arpeggio answer from chord-tone targets | Standard — accurate musical progression and executable exercise |
| Arpeggio Sequencing | Chord-tone mapping | advanced | `arp.harmony.a1` | Expand from triads to seventh-chord arpeggios | Higher — maj7 vs m7 spelling and chord-root reference |
| Arpeggio Sequencing | Fretboard routes | advanced | `arp.fretboard.a1` | Voice-lead a four-chord upper-string path | Higher — exact C–Am–F–G upper-string voicings |
| Arpeggio Sequencing | Picking & rhythmic control | advanced | `arp.picking.a1` | Cross strings with a stable triplet subdivision | Higher — two quarter beats versus six triplet attacks |
| Arpeggio Sequencing | Melodic arrangement | advanced | `arp.composition.a1` | Connect harmony and melody on one guitar | Standard — accurate musical progression and executable exercise |

## High-scrutiny music checks

- **Interval number and quality:** C4–D4 = M2/2 semitones; C4–E4 = M3/4; C4–F4 = P4/5; C4–G4 = P5/7. C4–E♭4 is m3/3 semitones.
- **Enharmonic pairs:** C–F♯ is an augmented fourth, C–G♭ a diminished fifth; each spans 6 semitones in 12-tone equal temperament but has different diatonic spelling. The *audible distance alone* cannot establish the notated spelling.
- **Inverted and compound intervals:** C4–E4 is M3 (4 semitones), E4–C5 is m6 (8), C4–E5 is M10 (16). Inverting simple intervals adds their generic numbers to 9, their semitone spans to an octave.
- **Standard-tuning fret positions:** String 5 fret 3 is C3, string 4 fret 2 is E3, open string 3 is G3. String 6 fret 8 is C3 and string 5 fret 7 is E3. Strings 3 and 2 are G3–B3 (major third apart), unlike the perfect-fourth tuning of most adjacent pairs.
- **Upper-three-string C–Am–F–G:** C major [5,5,3] = C4/E4/G4, Am [5,5,5] = C4/E4/A4, F [5,6,5] = C4/F4/A4, G [4,3,3] = B3/D4/G4 on strings 3/2/1. Top line G4–A4–A4–G4. These indicate sound pitches, not mandatory fingering.
- **Seventh chords:** Cmaj7 = C/E/G/B; Am7 = A/C/E/G. A seventh is a chord-root-relative interval, not necessarily the same number as the note's global key degree.
- **Rhythmic arithmetic:** One 4/4 bar at 80 quarter BPM contains four quarter beats and eight eighth attacks at two per beat. Two quarter beats with eighth-note triplets contain six attacks at three per beat; no custom playback is claimed.
- **Context:** Moving from tonic-root triads to chord-root arpeggios must not conflate chord root, key tonic, bass inversion and top melody note. Chromatic F♯ approaching G in a C-major setting does not by itself prove modulation.

## Human teaching review still required

A qualified guitarist/music educator should check note ranges, pitch-register readability, realizable finger transitions, interval hearing difficulty across ages, accessible listening options for players without reliable audio, rhythmic ergonomics and advanced harmonic claims. The parser/unit tests protect structural integrity and spot-check musical examples; they do **not** verify musicianship or guarantee all exercises are suitable.

The layout is intentionally frozen. With no reference block authored for either Skill, their Overview currently presents textual learning material through the existing renderer; a future design pass may choose which visual tool should accompany each topic.

## Source references informing the editorial checklist

- Open Music Theory — Interval number, quality, compound intervals, inversions, and melodic versus harmonic intervals: https://open-musictheory.github.io/docs/fundamentals/intervals/
- Berklee Online — Guitar Handbook, triad and arpeggio basics: https://assets.online.berklee.edu/handbooks/berklee-online-guitar-handbook.pdf

These are references, not independent approval of Sound Uncharted's own lessons.

## Release boundary

Remain draft/unmerged; parent CODEX-V2-A PR #14 and JRN-004 PR #13 are still gated. No production publication, migrations, Player data writes, XP/proficiency changes, or authorized JRN-005 work. All new curriculum requires final-head CI and user/music-editor review before any content promotion.
