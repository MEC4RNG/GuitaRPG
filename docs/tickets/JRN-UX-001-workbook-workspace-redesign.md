# JRN-UX-001 — Workbook workspace redesign

Draft review candidate. Standalone Workbooks: searchable library, page navigator, horizontal desktop app navigation, collapsible library/pages, Focus page, contextual management disclosures, Edit and saved-page Display. Display derives rich text, lists, tab and chord diagrams from the accepted document; no separate copy. Count real owner-scoped Quest and module links, not inferred independent Skill/Concept tags. Embedded Explore/Craft unchanged; mobile uses stacked collapsible regions. No schema/auth/progression changes.

## Long-term architecture (retained)

Keep the versioned Workbook document container and distinct rendering/editing layers. Preserve lightweight tabs/chords. Future score block: bounded, versioned score data with stable note IDs, pitch, tuning/string/fret, timing, voice/track and articulation; do not make SDK UI state the persistence authority.

- MUS-001: evaluate alphaTab in isolated prototype. Official docs: https://www.alphatab.net/docs/introduction/ and https://docs.alphatab.net/docs/features/export/. Browser SDK supports GP3–8 import, MusicXML/alphaTex, notation/tab rendering, score JSON, GP7/MIDI/WAV exports and playback. MPL-2.0; separately review assets/fonts/SoundFonts. Test Next.js client loading/workers, mobile performance, accessibility, security limits, model/editing and round-trip fidelity. No dependency adoption until validated.
- MUS-002: safe score blocks/import; MUS-003: notation/rhythmic tab editor and articulations; MUS-004: Codex-to-score integration; MUS-005: Practice mode/loop/tempo/speed trainer; MUS-006+: multitrack/mixing, advanced export, backing-track synchronization; real-time processing later R&D.

Fretboard blocks, sharing, PDF, score editing and Practice mode deferred. No full Guitar Pro parity commitment.

## Gates

Prior INT-001 head 40fcf16 passed all six workflows; R1 97c6917 has formatter and ambiguous triad test locator failures. Correct locator on this branch. New UI and regression cases require formatter, lint, typecheck, tests, build, browser/accessibility, visual review. No production merge or publication. Preserve PR #27.
