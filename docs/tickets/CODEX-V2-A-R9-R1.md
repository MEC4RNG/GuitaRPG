# CODEX-V2-A-R9-R1 — Browser Back / Mobile Landscape Fretboard

**Status:** Draft UX remediation awaiting final-head CI and user visual acceptance.
**Authorized feedback:** 2026-11-23 — navigating into one of the 9 Codex Skills does not add browser history, and in mobile landscape the rightmost (12th) fret remains slightly off-screen.
**Branch:** `codex-v2-r9-r1-history-landscape`, stacked on R9 PR #19. No production publication or merge.

## Diagnosis

1. `CodexV2Library` navigated internally between Library, Skill and Dictionary with local React state only; browser Back, mobile Android gesture and Forward could not observe those transitions.
2. The shared fretboard table had `min-width: 830px` and fret buttons `min-width: 43px`. At mobile landscape widths near 740–915px, combined viewport/content padding caused the last fret to fall outside the visible scroller.

## Bounded remediation

- Give each selected Skill an addressable same-origin `?skill=canonical_slug` history entry. Similarly, Dictionary receives `?dictionary=1` and selected terms receive `?dictionary=1&term=...`. Only catalog-validated Skill and term identities activate their respective views. On mount and `popstate`, derive displayed view from URL, so browser Back and Forward restore Library, Skill and Dictionary, including deep links. Preserve Next's existing `window.history.state` and all other route query parameters; do not introduce external redirects.
- Retain the existing internal **← Library** action, now consistent with URL state. No change to published Codex routes or draft gating.
- Only at mobile landscape viewport widths 35–64rem, allow the fretboard's 14 visible columns (string labels, open notes, frets 1–12) to fit the scroller width by dropping the fixed minimum, tightening cell spacing and scaling text. Keep fret button heights at 44px. Preserve the portrait layout with its own local scrolling; do not force page-level horizontal overflow or change desktop sizing.
- Add Chromium/mobile WebKit Playwright coverage for browser Back and Forward, dictionary history and direct Skill deep-link; test mobile landscape at 844×390, 740×390 and 568×320, asserting no internal horizontal scroll and a visible 12th fret; retain the portrait 320×720 scrolling contract.

## Boundaries and verification

- Do not touch `lib/codex/v2/fretboard-engine.ts`, music-theory calculations, the nine Skills' 114 draft lessons, their interactive reference registrations, 178 glossary terms, 48 proposed relationships, or official V1's 197 entries.
- No Account, Quest, Player Workbook, Session, Result, XP/proficiency, Supabase or production publishing changes.
- Final-head Prettier, lint, strict TypeScript, Vitest, Next production build, UX browser suites, identity/data/security and Vercel preview all require terminal evidence. Mobile real-device visual acceptance is still separate from automation.
- R9 and ancestors remain draft/open/unmerged; this PR targets R9, not production.
