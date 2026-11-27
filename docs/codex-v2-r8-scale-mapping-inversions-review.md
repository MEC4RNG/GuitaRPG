# Sound Uncharted Codex V2 — R8 Curriculum Review

**Disposition:** First-pass editorial draft, not independent guitar/music-educator approval. No publication authorization.

**Source:** `domain/codex/v2/draft-expansion-r8.json`, appended to draft-only preview with existing R3, R6 and R7 data. This is a **content-only expansion** while the product layout remains intentionally undecided.

## Authored scope

- Existing canonical Skill **Scale Mapping** (UUID `20000000-0000-4000-8000-000000000057`) — 4 applications × 3 instructional levels = 12 new lessons
- Existing canonical Skill **Chord Inversion Navigation** (UUID `20000000-0000-4000-8000-000000000010`) — 4 applications × 3 instructional levels = 12 new lessons
- Together: **24 draft lessons**, each with 3+ learning outcomes, 4+ procedural practice steps, setup, music-specific self-check and no progress award
- Total preview after R8: **9 draft Skills / 38 applications / 114 lessons / 178 draft dictionary terms / 48 proposed educational relationships**; public canonical V1 remains 197 entries and published V2 corpus remains empty

## Review matrix

| Skill | Musical application | Level | Lesson ID | Working title | Suggested practice | Factual/editorial check |
| --- | --- | --- | --- | --- | ---: | --- |
| Scale Mapping | Scale formula & pitch spelling | foundational | `sm.theory.f1` | Build the major-scale step pattern | 6 min | Major-scale W–W–H–W–W–W–H / one letter per degree |
| Scale Mapping | Guitar scale locations | foundational | `sm.fretboard.f1` | Map one C-major octave on the B string | 8 min | B3 string 2: C4 through C5, frets 1–3–5–6–8–10–12–13 |
| Scale Mapping | Improvisation & targeting | foundational | `sm.improvisation.f1` | Make a three-degree call and response | 7 min | Confirm meaningful objectives, authentic pitch examples and playable instructions |
| Scale Mapping | Melody & transposition | foundational | `sm.composition.f1` | Write a four-bar mapped melody | 8 min | Confirm meaningful objectives, authentic pitch examples and playable instructions |
| Scale Mapping | Scale formula & pitch spelling | intermediate | `sm.theory.i1` | Transpose the major-scale formula to G | 8 min | G major F♯ leading tone, not G♭ |
| Scale Mapping | Guitar scale locations | intermediate | `sm.fretboard.i1` | Connect the same C-major notes across two strings | 8 min | C4/E4/G4 unisons across genuine string positions |
| Scale Mapping | Improvisation & targeting | intermediate | `sm.improvisation.i1` | Find targets over a C–Am–F–G progression | 9 min | Confirm meaningful objectives, authentic pitch examples and playable instructions |
| Scale Mapping | Melody & transposition | intermediate | `sm.composition.i1` | Keep one contour while changing the key | 9 min | Confirm meaningful objectives, authentic pitch examples and playable instructions |
| Scale Mapping | Scale formula & pitch spelling | advanced | `sm.theory.a1` | Distinguish relative major from natural minor | 10 min | C major vs A natural minor share pitch classes, not tonic |
| Scale Mapping | Guitar scale locations | advanced | `sm.fretboard.a1` | Re-map A natural and harmonic minor | 11 min | A harmonic minor A–B–C–D–E–F–G♯ and augmented second F–G♯ |
| Scale Mapping | Improvisation & targeting | advanced | `sm.improvisation.a1` | Map a temporary leading tone without declaring a new key | 11 min | D7 F♯ approaching G in C major is tonicization, not automatic modulation |
| Scale Mapping | Melody & transposition | advanced | `sm.composition.a1` | Write a motif across C major and A minor contexts | 11 min | Confirm meaningful objectives, authentic pitch examples and playable instructions |
| Chord Inversion Navigation | Harmony & slash chords | foundational | `cin.theory.f1` | Name inversions by the lowest chord tone | 6 min | C/E and C/G inversions from bass, not root replacement |
| Chord Inversion Navigation | Inversion fretboard routes | foundational | `cin.fretboard.f1` | Play C-major inversions on neighboring strings | 8 min | C triad root / first / second exact low-string MIDI |
| Chord Inversion Navigation | Bass & harmonic listening | foundational | `cin.aural.f1` | Hear the bass change while the chord stays C | 7 min | Confirm meaningful objectives, authentic pitch examples and playable instructions |
| Chord Inversion Navigation | Composition & chord melody | foundational | `cin.arrangement.f1` | Use inversions to connect C and F | 8 min | Confirm meaningful objectives, authentic pitch examples and playable instructions |
| Chord Inversion Navigation | Harmony & slash chords | intermediate | `cin.theory.i1` | Separate inversion from a new bass chord | 7 min | Confirm meaningful objectives, authentic pitch examples and playable instructions |
| Chord Inversion Navigation | Inversion fretboard routes | intermediate | `cin.fretboard.i1` | Compare C major across a single upper-string group | 9 min | Upper G3/B3/E4 strings: 5–5–3, 9–8–8, 0–1–0 |
| Chord Inversion Navigation | Bass & harmonic listening | intermediate | `cin.aural.i1` | Hear an inversion against a pedal bass | 9 min | Added bass can change overall inversion while upper notes stay |
| Chord Inversion Navigation | Composition & chord melody | intermediate | `cin.arrangement.i1` | Use inversions to keep a connected melody | 11 min | C–Am–F–G exact pitches and G4–A4–A4–G4 |
| Chord Inversion Navigation | Harmony & slash chords | advanced | `cin.theory.a1` | Extend inversion counting to seventh chords | 10 min | Cmaj7 B bass is third inversion of a seventh chord |
| Chord Inversion Navigation | Inversion fretboard routes | advanced | `cin.fretboard.a1` | Choose inversion from an independent bass line | 11 min | Independent bass determines full guitar texture inversion |
| Chord Inversion Navigation | Bass & harmonic listening | advanced | `cin.aural.a1` | Distinguish inversion changes from harmonic changes | 10 min | Confirm meaningful objectives, authentic pitch examples and playable instructions |
| Chord Inversion Navigation | Composition & chord melody | advanced | `cin.arrangement.a1` | Balance melody, bass and inversion choices | 12 min | Root bass overrides inverted upper triad for total chord |

## Musical accuracy checklist (high scrutiny)

1. **Major scale intervals:** C major C–D–E–F–G–A–B–C and G major G–A–B–C–D–E–F♯–G both use 2,2,1,2,2,2,1 semitone steps. Written note spelling must use one letter per degree. C major on string 2 (B3 open) is frets 1,3,5,6,8,10,12,13, sounding MIDI 60,62,64,65,67,69,71,72.
2. **Key versus chord:** Relative C major / A natural minor share the same pitch classes but not tonal center. E is degree 3 of C major, but fifth of Am chord. A chord tone should not be presented as an automatic tonic-relative scale degree.
3. **Harmonic minor:** A harmonic minor A–B–C–D–E–F–G♯–A, on open A2 string 5 frets 0,2,3,5,7,8,11,12. Written F–G♯ is augmented second, three equal-tempered semitones. This single-scale explanation must not claim that all music in A minor always uses G♯.
4. **Guitar inversion fundamentals:** C major C–E–G; bass C=root, bass E=first, bass G=second. Standard tuning low C3 E3 G3: strings 5/4/3 frets 3/2/0; E3 G3 C4: strings 4/3/2 frets 2/0/1; G2 C3 E3: strings 6/5/4 frets 3/3/2. C/D has a nontriad bass D and is not a triad inversion.
5. **Upper string inversions:** On strings 3/2/1 (G3/B3/E4 open), C root [5,5,3] = C4 E4 G4; first [9,8,8] = E4 G4 C5; second [0,1,0] = G3 C4 E4. Verify any notes sounded beyond the diagram are part of the *actual whole texture* before naming inversion.
6. **Four-chord voice movement:** The previously reviewed upper-string progression C [5,5,3] = C4 E4 G4; Am [5,5,5] = C4 E4 A4; F [5,6,5] = C4 F4 A4; G [4,3,3] = B3 D4 G4. Harmonic roots C, A, F and G differ from actual low pitches C4, C4, C4, B3. Top line G4–A4–A4–G4.
7. **Seventh chords and full textures:** Cmaj7 includes C E G B; bass B is its third inversion (not a triad inversion). Root-position upper-string C4 E4 G4 placed above independent lower E3 makes the *whole C-major sonority* first inversion, not root position. Bass position must be determined from the lowest actually sounded tone.
8. **Single guitar playability:** Some reference intervals span the fretboard; students should shift positions rather than stretch one grip across 12 frets. Bass and top-line exercises initially use alternation/arpeggiation, not an implied simultaneous four-voice shape.

## Verification and release gates

- Parser must accept only existing canonical UUID/kind/slug identities and preserve `DRAFT_REVIEW`; require all 24 exercise structures and verify uniqueness with earlier 90 modules
- Deterministic unit checks must cover semitone arithmetic, actual standard tuning, octave registers, inversion bass identity and major/minor chord spelling
- Browser smoke must confirm the two Skill cards, learning-level/app navigation, disclosure on Lessons and How to Explore, proposed connections and no overflow at desktop/mobile widths
- Independent music educator should assess physical accessibility, advanced harmonic terminology, alternate pitch spellings and instructional progression; automated test success is **not** editorial approval
- **No** `published.json` entries, migration, Quest/Session/Result/XP/proficiency mutation or Workbook write; CODEX-V2-A-R8 PR remains draft/open/unmerged above R7 until parent approvals

## UX note

The user is still deciding how the Codex should look. R8 does **not** modify React components, CSS, navigation or interactive widgets. Missing interactive reference blocks stay omitted rather than presenting unsupported controls.
