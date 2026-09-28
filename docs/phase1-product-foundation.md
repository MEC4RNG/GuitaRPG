# Phase 1 — Product Foundation

**Status:** IN PROGRESS  
**Authorized by:** P0-GATE-001

## Goal

Convert the accepted Phase 0 contracts into a production-ready application foundation without yet implementing the full Quest loop.

Phase 1 establishes the application frame, persistence/runtime boundary, canonical seed data, Player state substrate, and onboarding entry point required by later feature phases.

## Ticket sequence

### UX-002 — Application Shell & Navigation

Implement the responsive AppShell, approved information architecture, surface modes, and primary routes.

Status: COMPLETE.

### DATA-002 — Supabase Runtime & Migration Foundation

Implement:

- environment validation
- browser/server Supabase boundaries
- migration directory and baseline schema mechanism
- identity/ownership helpers
- local/test-safe configuration
- no service-role leakage

Status: COMPLETE.

The staging Supabase project is linked, the DATA-002 baseline migration is applied,
local/remote migration history agrees on `20260928000000`, and the final dry-run
reports the remote database is up to date.

### TAX-003 — Canonical Taxonomy Seed Implementation

Status: BLOCKED — repository implementation/CI complete; staging migration evidence remains.

Turn TAX-001/TAX-002 into production seed data:

- six Domains
- canonical Skills/Concepts/Contexts/Constraints/Attributes
- stable slugs/IDs
- relationships
- idempotent seed process
- legacy provenance where appropriate

### PLY-002 — Player Profile & Development Persistence

Implement the durable Player substrate defined by PLY-001:

- profile/preferences
- tuning preferences
- setup metadata
- goals
- Skill development state
- Character progression aggregates
- RLS ownership rules

### ONB-001 — Onboarding & Calibration Foundation

Implement the first-run flow:

- New / Experienced / Skip
- preferences/goals/tunings
- no self-declared proficiency grants
- calibration entry state
- clear UNRATED behavior

This does not implement the full adaptive diagnostic Quest system.

### P1-GATE-001 — Product Foundation Integration Gate

Require:

- production shell
- runtime/persistence foundation
- canonical taxonomy seed
- Player persistence/security
- onboarding path
- contract/regression tests
- production build
- staging deployment evidence where external services are required

## Dependency shape

`UX-002` can proceed independently after Phase 0.

`DATA-002` is the persistence prerequisite for `TAX-003` and `PLY-002`.

`TAX-003 + PLY-002` are prerequisites for `ONB-001`.

`P1-GATE-001` requires all Phase 1 tickets complete.

## Non-goals

Phase 1 does not yet deliver:

- complete Quest generator
- practice-session runtime
- completion/evidence workflow
- progression engine
- adaptive Training engine
- audio grading
- full Codex content library

Those remain later phases in the Master Build Plan.
