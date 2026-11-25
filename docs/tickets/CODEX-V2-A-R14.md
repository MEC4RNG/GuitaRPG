# CODEX-V2-A-R14 — Expanded arpeggio sequencer

Status: DRAFT / implementation candidate / validation pending. Stacked on MEC-R12 PR #23 at 7f6c1b85c506f58814422819fc3ac4fcb5ee7ec2. Incorporates the proposed R15 free-fretboard and tablature scope so the user can review one coherent sequencer.

## Implemented
- Fourteen chord qualities, 12 chromatic roots, Standard / Drop D / DADGAD. Diatonic spellings and sounding octaves reuse the existing fretboard engine.
- Compact voicing mode: complete distinct-tone shapes, up to four chord tones, bass-derived inversion, nonadjacent strings, one note per string. Four-fret span and nearby open-string heuristic; no fingering guarantee. All six strings are an allowed pool, not a six-note shape. Choosing a four-tone quality from a too-small allowed pool enables all six.
- Fretboard mode: arbitrary individual strings, even one or zero, positions through fret 24, exact note/register/string/fret step assignment, clickable fretboard with advancing target step, synchronized tablature. Degree selection uses the lowest available pitch; exact-position selection preserves octave and string. Presets are degree-order, not necessarily ascending sounding register.
- Retains existing quarter/eighth/triplet/sixteenth 4/4 grid, quarter-note BPM, user-started audio, stop/loop and playback highlighting. Source changes reset incompatible custom edits explicitly.
- Existing triad, inversion and voice-leading engine and legacy pure sequencer tests remain untouched. No database, persistence, curriculum publication, XP, or Craft changes. Mobile global Codex navigation is a separate ticket.

## Validation required before visual review
- Run formatter on the changed TS/TSX/CSS files (connector-only edits have not been formatted); then npm run check.
- Run new R14 pure tests plus existing R11 tests; run Codex preview Playwright tests on desktop Chromium, small phone, mobile Chromium/WebKit and landscape.
- Verify exact-position audio and rhythm, enharmonic spelling, compact shapes, no-source state, one-string octave sequence, and horizontal scrolling on mobile. Independent musical review and user visual review required.
- No merge or publication until final-head CI and review. No preview URL is claimed here.

## Follow-up
Workbook export, multi-bar sequences, larger/doubled voicings and global mobile Codex navigation are out of scope.
