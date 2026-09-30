# P5-SCOPE-001 — Phase 5 Launch-Critical Scope Review

**Status:** COMPLETE

## Objective

Define the minimum coherent Phase 5 package required before Phase 6 hardening can reasonably begin. This ticket changes planning and coordination only: no product behavior, database schema, migration, or UI implementation.

## Current-state and v1-promise audit

The accepted loop is already functional: identity/onboarding, QUICK generation, adaptive Training, canonical Quest persistence, Session controls, Result/evidence, History attempt/detail, Character and Skills progression, desktop/mobile flows, security, and recomputation are implemented and passed through P4-GATE-001.

The remaining launch gaps are concentrated in exposed surface truthfulness and the accepted limited learning/reference promise:

- Home and shell visibly describe obsolete Phase 1/foundation state and future work that already exists.
- Codex is a `FoundationPage` placeholder despite the accepted `taxonomy-backed limited Codex/reference` v1 scope.
- Profile links to onboarding, but a completed Player sees only the completion state and cannot review/edit the promised profile preferences.
- Settings is a navigation-visible `FoundationPage` with no current independent setting worth inventing.
- History already exposes attempts, duration, Quest facts, outcome, verification, reflection, criteria, and evidence; this satisfies History/basic analytics for v1.
- Training is production-functional and explains ranking, challenge preference, absolute/personal difficulty, uncertainty, and calibration fallback.
- The generator supports 15 useful Primary targets across all six Domains and current Quest families; unsupported canonical Skills are surfaced honestly.

## Route and surface audit

| Surface | Current classification | Launch disposition |
| --- | --- | --- |
| `/` Home | PRODUCTION_FUNCTIONAL, STALE_PRESENTATION, LAUNCH_BLOCKING | UX-004 replaces development-era copy/status with truthful v1 entry points |
| `/generate` | PRODUCTION_FUNCTIONAL | Preserve; regression only |
| `/training` | PRODUCTION_FUNCTIONAL | Preserve; add reference links only through QST-004 |
| `/character` | PRODUCTION_FUNCTIONAL | Preserve |
| `/skills` | PRODUCTION_FUNCTIONAL | Preserve |
| `/history` | PRODUCTION_FUNCTIONAL | Current v1 History/basic analytics is sufficient |
| `/history/[sessionId]` | PRODUCTION_FUNCTIONAL | Preserve |
| `/codex` | PLACEHOLDER, LAUNCH_BLOCKING | Implement minimum taxonomy-backed Codex in CODEX-001 |
| `/profile` | PARTIAL, LAUNCH_BLOCKING | Implement review/edit of existing Player-owned setup in PLY-003 |
| `/settings` | PLACEHOLDER, REMOVE_OR_HIDE_FOR_V1 | Remove from exposed v1 navigation in UX-004; retain no misleading route claim |
| `/onboarding` | PRODUCTION_FUNCTIONAL, PARTIAL as editor | Preserve first-run flow; PLY-003 reuses accepted fields for post-onboarding editing |
| `/session/*` | PRODUCTION_FUNCTIONAL | Preserve; QST-004 may add contextual reference links without changing Session semantics |

## Phase 5 candidate matrix

| Candidate capability | Current repository state | Accepted v1 authority | User value | Launch dependency | Classification | Owner / ticket | Dependencies | Explicit non-goals |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Limited taxonomy-backed Codex | Placeholder | Explicit v1 scope | Understand canonical terms | Required for learning/reference promise and Quest comprehension | V1_LAUNCH_CRITICAL | CODEX / CODEX-001 | TAX-001 | Courses, lesson plans, multimedia |
| Richer Quest reference/help | Quest facts exist; no learning links | Understand exactly what Quest asks | Connects generated work to concise definitions | Required after Codex exists | V1_LAUNCH_CRITICAL | QST / QST-004 | CODEX-001 | Generator/adaptation changes |
| Fretboard visualization | Absent | Not required | Spatial learning aid | Optional | V1_LAUNCH_SUPPORTING | CODEX / future CODEX-002 | CODEX-001 | Full interactive trainer |
| Interval visualization | Absent | Not required | Concept clarity | Optional | V1_5 | CODEX / CODEX-002 | CODEX-001 | Audio recognition |
| Chord visualization | Absent | Not required | Voicing clarity | Optional | V1_5 | CODEX / CODEX-002 | CODEX-001 | Exhaustive chord library |
| Scale/mode visualization | Absent | Not required | Mode/scale clarity | Optional; concise text suffices for v1 | V1_LAUNCH_SUPPORTING | CODEX / future CODEX-002 | CODEX-001 | Interactive fretboard engine |
| Richer History analytics | Basic history is functional | History/basic analytics | Trends and totals | Current surface satisfies v1 | V1_5 | HIST / HIST-002 | Existing History | Dashboard suite |
| Profile completion | Placeholder plus ineffective editor link | Player profile is explicit v1 scope | Review/edit existing preferences | Required for normal repeat use | V1_LAUNCH_CRITICAL | PLY / PLY-003 | PLY-002, ONB-001 | New identity/account subsystem |
| Settings minimum | Placeholder; no distinct settings | No major v1 promise | Avoid misleading navigation | Hide rather than invent | REMOVE_OR_HIDE_FOR_V1 | UX / UX-004 | UX-001 | Audio/accessibility settings not yet backed by behavior |
| Home/current-state cleanup | Functional but materially stale | Launch truthfulness | Accurate entry point | Required before cutover | V1_LAUNCH_CRITICAL | UX / UX-004 | Completed Phases 1–4 | Marketing redesign |
| Microphone/audio infrastructure | Absent | Audio explicitly optional | Assisted evidence | None | FUTURE | AUD / AUD-001 | Separate privacy/evidence scope | Required audio, raw cloud storage |
| Pitch assistance | Absent | Optional | Pitch feedback | None | V1_5 | AUD / AUD-002 | AUD-001 | Mastery inference |
| Onset/rhythm assistance | Absent | Optional | Timing feedback | None | V1_5 | AUD / AUD-003 | AUD-001 | Fingering/pick-direction claims |
| Saved creative work | Results/reflection only | Deferred in plan | Preserve artifacts | Core loop works without it | V1_5 | QST/HIST / QST-005 | Explicit artifact/privacy contract | Raw media storage |
| Daily systems | Deliberately unsupported | Deferred | Habit loop | None | V1_5 | TRN / TRN-005 | Later product decision | Silent DAILY enablement |
| Campaign foundation | Absent | Likely v1.5 | Long-form progression | None | FUTURE | QST / QST-006 | Separate campaign contract | Campaign implementation in v1 |
| Generator coverage beyond 15/72 | 15 capable, six Domains | Phase 4 accepted limitation | More variety | Current breadth is coherent | V1_5 | QST / QST-007 | Coverage/product research | Percentage-driven expansion |
| Goal interpretation beyond structured goals | Free text diagnostic only | Phase 4 accepted boundary | Easier targeting | Structured goals are sufficient | V1_5 | PLY/TRN / PLY-004 | Explicit deterministic mapping contract | Default LLM inference |
| Generalized Context familiarity | UNKNOWN truthfully | Phase 4 accepted boundary | Better personal difficulty | Not required for truthful v1 | V1_5 | PROG/DIF / PROG-007 | Context evidence contract | Fabricated familiarity |
| Typical-session-duration adaptation | Carried but ranking-inert | Not required | Better time fit | Core loop remains functional | V1_LAUNCH_SUPPORTING | TRN / future TRN-006 | Product decision | Hidden ranking changes |
| Shell/navigation status cleanup | Phase 1/foundation labels | Launch truthfulness | Removes false state | Required | V1_LAUNCH_CRITICAL | UX / UX-004 | Completed Phases 1–4 | Broad visual redesign |

## Placeholder dispositions

- Home: implement truthful v1 content and remove Phase 1/future-work claims in UX-004.
- Codex: implement the minimum taxonomy-backed reference surface in CODEX-001.
- Profile: implement review/edit for existing profile, tuning, duration, challenge preference, and structured goal state in PLY-003; do not create a new identity subsystem.
- Settings: hide/remove from v1 navigation in UX-004. Do not manufacture settings for absent systems.

## Codex minimum v1 scope

CODEX-001 must provide searchable/browsable canonical Skills, Concepts, Contexts, and Constraints with concise definitions, entity kind/domain, aliases where present, and existing taxonomy relationships. Content identity must derive from TAX-001; no second taxonomy is allowed.

Initial content should be source-controlled alongside canonical taxonomy/reference data for reproducibility and review. Database persistence is not required unless implementation proves an existing accepted storage need. Full courses, exhaustive articles, multimedia, custom lesson plans, and interactive visualizations are out of scope.

QST-004 must add relevant links from generated/training Quest presentation and active practice where a referenced canonical entity has Codex content. A missing article must degrade to existing truthful Quest facts, never block practice or fabricate instruction.

## Generator-coverage decision

The current 15/72 Primary coverage is sufficient for coherent v1 because it spans all six canonical Domains, supports the current generator families and Quest types, and produces useful beginner/intermediate practice while truthfully excluding unsupported Skills. Expansion is V1_5; no raw-percentage target is imposed.

## Launch packages

### PHASE 5 V1 LAUNCH PACKAGE

1. UX-004 — Launch Surface Truthfulness & Placeholder Cleanup
2. PLY-003 — Functional Player Profile Editing
3. CODEX-001 — Minimum Taxonomy-Backed Codex
4. QST-004 — Quest-to-Codex Reference Integration
5. REL-005 — Phase 5 Launch-Package Integration Tests
6. P5-GATE-001 — Phase 5 Learning & Practice Tooling Gate

### V1 launch supporting

- Minimal scale/mode or fretboard visual aids if usability evidence during CODEX-001 shows text alone is inadequate; otherwise defer.
- Typical-session-duration adaptation only after an explicit semantic ticket; it does not block Phase 5 closure.

### DEFERRED TO V1.5

- Interactive fretboard/interval/chord/scale visualization suite
- richer History analytics and trends
- pitch and onset/rhythm assistance after audio infrastructure
- saved creative artifacts
- Daily systems
- generator expansion beyond 15 Primary Skills
- deterministic goal mapping beyond structured goals
- generalized Context exposure/familiarity
- typical-session-duration adaptation

### FUTURE / EXPERIMENTAL

- microphone/direct-input infrastructure and advanced coaching
- Campaign foundation
- exhaustive courses, multimedia, and custom lesson plans
- raw-audio storage or automatic mastery inference

## Ordered dependencies and tickets

1. UX-004 removes stale Home/shell claims and hides Settings so every exposed route is honest.
2. PLY-003 makes the existing Player profile fields reviewable/editable; depends on PLY-002 and ONB-001 only.
3. CODEX-001 builds the bounded TAX-001-backed reference model and surface; independent of Profile and depends on canonical taxonomy.
4. QST-004 links Quest/Training/Session entities to available Codex entries; depends on CODEX-001 and existing Quest surfaces.
5. REL-005 proves taxonomy consistency, Profile editing, exposed-route truthfulness, Quest→Codex navigation, desktop/mobile behavior, security boundaries, and regressions through Phases 2–4.
6. P5-GATE-001 determines whether the bounded launch package satisfies the refined exit criterion.

This sequence contains four implementation tickets before integration/gate. No feature ticket is authorized by this review alone.

## Refined Phase 5 exit criterion

A Player can understand the canonical musical terms and practice references used by v1 Quests, review and edit the existing Player preferences that shape practice, navigate every exposed v1 surface without placeholder or development-state claims, and complete the learning/practice loop on desktop and mobile without optional audio, expanded generation, Daily, Campaign, or v1.5 systems.

## REL-005 scope

REL-005 must prove Codex taxonomy/content consistency, search/browse and entity relationships, Quest/Training/Session reference navigation and graceful missing-content behavior, Profile ownership/edit persistence, truthful Home/shell/navigation disposition, desktop/mobile/accessibility behavior, security for any new persistence boundary, and full Phase 2–4 regressions. It must not introduce new feature semantics.

## P5-GATE-001 scope

The gate must answer whether every launch-critical Phase 5 ticket is terminal, every exposed navigation surface is functional and truthful, Players can understand v1 Quest terminology, Profile preferences are safely editable, optional systems are explicitly deferred, no second taxonomy exists, and the adaptive core loop remains intact.

## Validation

- Touched documentation/workflow formatting: PASS
- Lifecycle/project-state tests: PASS
- Full Vitest: 52 files / 380 tests PASS
- Lint: PASS
- Strict TypeScript: PASS
- Production build: PASS
- Deterministic clean dependency install: PASS
- Production scaffold CI after R4: [36735934714](https://github.com/MEC4RNG/GuitaRPG/actions/runs/36735934714) SUCCESS
- R1: BLOCKED / SUPERSEDED after exact Node/npm pin retained the Arborist crash
- R2: BLOCKED / SUPERSEDED after the peer bypass exposed unlocked registry drift
- R3: BLOCKED / investigation-only after a legacy-generated lock omitted required Vite
- R4: COMPLETE with explicit Vite peer and deterministic shrinkwrap

## Terminal disposition

COMPLETE — the bounded Phase 5 v1 launch package is decided and validated. UX-004 is next but remains unauthorized.
