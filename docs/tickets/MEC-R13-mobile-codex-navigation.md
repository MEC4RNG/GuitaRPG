# MEC-R13 — Global mobile Codex navigation

Disposition: implementation candidate; draft, validation pending. Stacked on the user-approved R14 preview at b1c4c1fdb1ee83897af0659d202b8117d37b1b92 (PR #25).

## Changes
- Add the existing Codex book icon and label as a fifth destination in the fixed mobile navigation bar: Home, Generate, Skills, Codex, Profile.
- Use the canonical /codex library, never an unconditional draft preview link. Active indication covers canonical Codex routes and the already-gated V2 preview.
- Preserve desktop sidebar, existing mobile destinations, Generate styling, bar height, safe-area padding, contextual Peek links, and all learning/workbook/quest logic.
- Update mobile design contract: four non-primary destinations plus the existing universal Generate action; no change to the existing cap.
- Navigation is ordinary same-tab navigation. Durable Player/Quest/Workbook data is not modified by this link; transient unsaved UI state is not guaranteed. Browser Back is the normal return mechanism.

## Review gates
- Existing navigation/design contract unit tests updated, responsive browser cases for 320/390/740px and desktop, plus an active Quest Explore → Codex → Back checkpoint.
- Run formatter, lint, typecheck, Vitest, Playwright and accessibility checks on final head; verify touch target dimensions, no overflow, safe area, active states, saved Workbook recovery, and user visual review on phone. No test execution claimed by connector-only implementation.
- Keep draft/open/unmerged; no production release or migration.
- Follow with stacked branch consolidation and full integration validation, then Craft refinement. Do not blindly merge overlapping R5/R12 implementations.
