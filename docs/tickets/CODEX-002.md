# CODEX-002 — Contextual Codex Peek

**Status:** AWAITING USER VISUAL REVIEW

## Objective

Add a reusable, accessible, presentation-only Codex inspector to Quest-facing surfaces so Players
can inspect verified taxonomy references without leaving or mutating Generate, Journey, Training, or
Session state.

## Authority and boundaries

CODEX-001 remains the content authority, QST-004 remains the Quest-reference resolver, and QST-005
defines the non-destructive Peek experience. This ticket adds no taxonomy, Codex content, database,
RPC, Quest lifecycle, Session, Result, progression, Auth, production, or public-traffic change.

## Implementation decisions

- One app-shell provider owns transient Peek presentation state while every underlying surface stays
  mounted.
- Valid QST-004 references become semantic buttons; unresolved historical references remain plain
  snapshot text.
- Desktop uses a nonmodal right inspector. Narrow viewports use a modal bottom sheet with inert
  background, scroll locking, focus containment, Escape close, and focus restoration.
- Full entries open in a new tab with `noopener noreferrer` so current application context remains
  available.
- Quest relevance is bounded role copy; definitions and relationships come only from the existing
  Codex catalog.

## Current disposition

Implementation and automated validation are complete on `codex-002-contextual-peek`. Draft PR #7
remains open and unmerged. Explicit user visual approval is still required before protected merge.

## Implementation summary

- The application shell owns one transient Peek provider, preserving Generate drafts, Journey stage
  and tab selection, active Session state, and account identity while the inspector is open.
- Existing QST-004 reference controls open authoritative CODEX-001 content. Missing historical
  references retain snapshot text and never open an empty panel.
- Generate, Training, Session, and Journey Map, Explore, and Craft use the shared reference control.
- The Peek presents identity, classification, definition, Quest role, parameters, verified
  relationships, and a secure new-tab link to the full Codex entry.
- Desktop uses a nonmodal right inspector. Mobile uses a modal safe-area bottom sheet with inert
  background, scroll locking, focus containment, Escape close, and trigger-focus restoration.

## Principal files

- `components/codex-peek.tsx`
- `components/quest-codex-reference.tsx`
- `components/quest-journey-surface.tsx`
- `lib/codex/peek-v1.ts`
- `tests/codex-peek.test.ts`
- `tests/codex-peek-surfaces.test.ts`
- `tests/e2e/quest-journey.spec.ts`
- `tests/e2e/phase5-launch-package.spec.ts`

## Validation evidence

- Focused Codex and coordination suites: 5 files / 17 tests PASS.
- Category resolver suite: primary Skill, secondary Skill, required Technique, Concept, Context, and
  parameterized Constraint PASS; missing historical reference fallback PASS.
- Full Vitest: 80 files / 496 tests PASS.
- ESLint and strict TypeScript: PASS.
- Production build: PASS.
- Source/history and browser-bundle secret scans: PASS.
- Dependency audit policy: PASS; zero production high/critical advisories.
- Existing UX gate: axe, keyboard/focus, responsive, Firefox/WebKit, recovery, fresh Generate, and
  performance checks PASS.
- CODEX-002 Journey matrix: Chromium, Pixel 7, Firefox, WebKit, 320px, tablet, and mobile WebKit —
  7/7 PASS.
- Authenticated DADGAD Training/Session context coverage: Chromium and Pixel 7 — 2/2 PASS.
- Production scaffold CI run 39445948245: SUCCESS.
- Release security audit run 39445948121: SUCCESS.
- UX release hardening run 39445948285: SUCCESS.

## Delivery

- Implementation head validated by CI: `88686dd614415855e13ecc62f523dbd4210cacc9`.
- Draft PR: https://github.com/MEC4RNG/GuitaRPG/pull/7
- Preview: https://guitarpg-git-codex-002-contextual-peek-pauls-projects-c365bf51.vercel.app
- Database migration: none.
- Production/public traffic change: none.

## Known limitation and deferred work

The Preview is protected by Vercel deployment authentication, so unauthenticated external Playwright
cannot enter it. Reproducible private-flow evidence comes from protected CI's deterministic local
Supabase stack. User visual review can use the authenticated Preview. Journal/Workbook, fretboard,
audio, editable content, and new instructional content remain deferred to separately authorized
tickets.

## CODEX-002-R1 — inspector surface separation

User visual review on 2026-10-20 confirmed functional PASS for desktop, mobile, and secure new-tab
entry navigation, while requiring stronger visual separation from the underlying application.

### Root cause and remediation

`CodexPeekProvider` wrapped `.app-shell`, which caused the rendered Peek sibling to sit outside the
element defining `--surface-*`. Consequently, the inspector's variable-backed background and text
styles could be unresolved. R1 moves the provider inside the themed shell and gives `.codex-peek`
a bounded Codex token layer using the existing opaque `--codex-surface`, raised surface, border,
text, muted, and gold accent tokens. The panel now has a two-pixel gold boundary, an opaque dark
surface with a subtle Codex gradient, and a stronger separating shadow on desktop and mobile.

No resolver, content, Quest, Map, Session, draft, Auth, navigation, database, environment, or
production behavior changed.

### R1 validation

- Computed browser contract requires `background-color: rgb(28, 27, 23)`, opacity `1`, and the
  appropriate desktop/mobile gold boundary.
- Focused Codex and coordination suites: 5 files / 19 tests PASS.
- Full Vitest: 80 files / 498 tests PASS.
- ESLint and strict TypeScript: PASS.
- Production build: PASS.
- Source/history and browser-bundle secret scans: PASS.
- Dependency audit policy: PASS; zero production high/critical advisories.
- Protected CI and the updated Vercel Preview are required on the R1 branch head before handoff.
