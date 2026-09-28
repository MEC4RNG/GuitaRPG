# P1-GATE-001 — Product Foundation Integration Gate

**Status:** VALIDATING  
**Phase:** 1 — Product Foundation  
**Depends on:** UX-002, DATA-002, TAX-003, TAX-003-R1, PLY-002, ONB-001

## Objective

Determine whether the completed Phase 1 foundation is coherent, reproducible, secure,
contract-compatible, and sufficiently evidenced to close Phase 1 without beginning
Phase 2 implementation.

## Authority

- `docs/MASTER-BUILD-PLAN.md` Phase 1 exit criteria
- `P0-GATE-001` and the accepted Phase 0 DATA, TAX, PLY, QST, DIF, EVD, PROG, UX,
  and REL contracts
- the completed Phase 1 implementation and remediation tickets
- current implementation, regression suites, migration chain, and observed external evidence

## Prerequisites

| Ticket | Terminal state | Gate finding |
| --- | --- | --- |
| UX-002 | COMPLETE | Audit in progress |
| DATA-002 | COMPLETE | Audit in progress |
| TAX-003 | COMPLETE | Audit in progress |
| TAX-003-R1 | COMPLETE | Audit in progress |
| PLY-002 | COMPLETE | Audit in progress |
| ONB-001 | COMPLETE | Audit in progress |

## Phase 1 acceptance matrix

| Requirement | Authority | Implementation | Evidence | Result | Remediation |
| --- | --- | --- | --- | --- | --- |
| Production shell is functional | UX-001, UX-002 | UX-002 | Desktop/mobile route inventory, active state, skip link, focus, touch targets, and three surface modes inspected; navigation tests pass | PASS | None |
| Supabase runtime and migrations are reproducible | DATA-001, DATA-002 | DATA-002 | Public-only client credentials, strict partial-env failure, anonymous Auth configuration, ordered source migrations, and current staging dry-run verified | PASS | None |
| Canonical taxonomy exists in the database | TAX-001, TAX-003, TAX-003-R1 | TAX-003, TAX-003-R1 | Seed tests verify 6 Domains, 72 Skills, stable IDs, read-only client access, and three TUNING Contexts; staging history matches | PASS | None |
| Player state persists under ownership and RLS | DATA-001, PLY-001, PROG-001 | PLY-002 | Current implementation tests pass; accepted clean replay workflow `36433592618` passed 42/42 pgTAP assertions | PASS | None |
| Onboarding creates a valid Player starting state | PLY-001, ONB-001 | ONB-001 | Current onboarding tests and source audit pass; no derived-state or XP write path exists | PASS | None |
| Anonymous/permanent identity boundary is respected | DATA-001 | DATA-002, PLY-002, ONB-001 | Anonymous Auth uses the same Auth UUID trigger/bootstrap and Player tables; no parallel local profile exists | PASS | None |
| Phase 0 contracts remain green | P0-GATE-001, REL-001 | Phase 0 contract suite | Current local full suite passes 119/119, including `DORIAN_CROSSROADS` | PASS | None |
| Production build succeeds | Master Build Plan | Current application | Current local Node 24 production build passes; validation CI pending | BLOCKED | Await validation CI |
| Required staging evidence exists | Master Build Plan | DATA-002 through PLY-002 | Fresh migration history and dry-run show all four versions matched and staging up to date | PASS | None |

The remaining `BLOCKED` result is the required current-head validation CI, not a known
implementation defect. The gate cannot become terminal PASS until that CI succeeds.

## Audit findings

### Prerequisite ticket audit

All six prerequisite records are terminal COMPLETE. Their dependency sequence remains
coherent:

`DATA-002 → TAX-003 → TAX-003-R1`, `DATA-002 + TAX-003-R1 → PLY-002`, and
`UX-002 + PLY-002 → ONB-001`.

The older handoff statements about later tickets being unauthorized accurately record
their historical boundaries and are superseded by later authorized work. No ticket
contains an unresolved material blocker contradicting its terminal state.

### Contract compatibility

The current contract and integration suites keep the Phase 0 taxonomy → Player → Quest
→ Difficulty → Evidence → Progression chain aligned. `DORIAN_CROSSROADS` remains:

- `QFIX-TECH-001`, slug `dorian_crossroads`
- Hybrid Picking with Scale Mapping and Syncopation Control
- E tonal center, 90 BPM, 10 minutes, absolute demand III
- clear `EVD-FIX-001`, partial `EVD-FIX-002`, and 15 XP under XP_V1

Phase 1 adds persistence and onboarding substrate without redefining Quest, evidence,
difficulty, or progression semantics.

### Application validation

- runtime: Node `24.19.0` from the bundled Codex runtime
- lint: PASS
- strict TypeScript typecheck: PASS
- tests: PASS — 18 files, 119 assertions
- production build: PASS — all 11 application routes and root Proxy compiled
- format: changed gate files pass targeted Prettier; repository-wide local check is
  affected by the Windows CRLF checkout and protected untracked `package-lock.json`;
  the required clean-checkout CI format result remains pending

One gate-coordination repair made the PLY migration assertion normalize CRLF to LF
before checking a multiline SQL grant. This removes a Windows-only false failure and
does not alter the applied migration or product behavior.

### Database, RLS, and migration validation

The four source-controlled migrations remain in the required order. Fresh staging
evidence observed during this gate:

- migration list: local and remote both contain `20260928000000`, `20260928010000`,
  `20260928015000`, and `20260928020000`
- `supabase db push --dry-run`: PASS — remote database is up to date; no migrations,
  seeds, or roles pending

Docker is not installed locally, so this gate did not claim a new clean local replay.
The accepted database workflow `36433592618` remains the fresh-database baseline:
the complete four-migration chain replayed successfully and all 42/42 pgTAP Player,
RLS, ownership, lifecycle, anonymous-equivalence, service-path, and cascade assertions
passed.

Static and unit tests reconfirm that a new Auth UUID receives one profile, Level 1,
0 XP, 0 practice seconds, 72 UNRATED Skills, and 11 UNASSESSED Attributes. Owners can
edit only permitted profile/tuning/setup/goal fields; derived Skill, Character, and
Attribute state remains system-authoritative. Tuning references require TUNING
Contexts, ownership is immutable, and Auth deletion cascades Player state.

### UX and accessibility foundation

The shell provides desktop and mobile navigation, semantic `aria-current` route state,
a focusable skip link, visible `:focus-visible` treatment, and token-backed 44 px touch
targets. Active state uses class/shape/text semantics rather than color alone. Core
mobile navigation uses links and requires no hover. Instrument HUD, Codex, and Practice
Lab surfaces remain distinct.

Onboarding controls use native labels, fieldset/legend grouping, radio semantics, a
status live region, and keyboard-operable native controls. Full screen-reader,
cross-browser, and device-matrix testing remains appropriately deferred to Phase 6.

Onboarding uses `signInAnonymously()` only when no current Auth user exists, updates the
canonical profile to IN_PROGRESS, persists Player-authored fields, and completes with
calibration either SKIPPED or IN_PROGRESS. Completed Players are not replayed through
the form. It writes no XP, Character Level, Skill state, Attribute state, Result, or
diagnostic evidence. The architecture is compatible with later identity conversion,
but this gate does not claim conversion UX is implemented.

## Deferred and non-blocking items

Phase 2+ behavior, including the Quest runtime, progression algorithms, adaptive
recommendations, advanced audio analysis, achievements, Campaign scope, and full
launch accessibility auditing, remains outside this gate unless an existing Phase 1
exit criterion depends on it.

## Remediation findings

No implementation-ticket remediation is required. The only gate-local repair is the
line-ending-independent SQL assertion described under application validation.

## Evidence

- validating commit: pending creation
- validation CI run: pending
- terminal commit: pending
- terminal CI run: pending
- fresh database replay: not rerun locally (Docker unavailable); accepted workflow
  `36433592618` and 42/42 pgTAP assertions retained as the explicit baseline
- staging migration history and dry-run: PASS — all four versions matched; remote up to date

## Gate decision

**PENDING**

## Terminal disposition

Not terminal. Phase 1 remains IN PROGRESS while validation is underway.

## Next planned unauthorized work

Phase 2 and `QST-002 — Quest runtime/schema implementation` remain unauthorized.
Production cutover remains unauthorized, and legacy `main` remains preserved.
