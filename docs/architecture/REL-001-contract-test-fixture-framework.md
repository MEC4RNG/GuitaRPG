# REL-001 — Contract Test & Fixture Framework

- Status: Accepted
- Ticket: REL-001
- Date: 2026-09-27
- Depends on: TAX-002, PLY-001, QST-001, DIF-001, EVD-001, PROG-001
- Applies to: GuitaRPG Phase 0 semantic contract integration

## Purpose

Create one executable framework that proves the Phase 0 semantic contracts agree with each other rather than only passing in isolation.

REL-001 does not replace the individual ticket tests.

It adds:

- a machine-readable contract manifest
- a shared JSON fixture loader
- a stable cross-contract reference fixture
- cross-contract referential-integrity tests
- cross-contract invariant tests
- a dedicated contract-test command

## Framework artifacts

- `domain/contracts/phase0-contract-manifest.json`
- `domain/contracts/phase0-reference-fixture.json`
- `tests/contracts/fixture-loader.ts`
- `tests/contracts/phase0-integration.test.ts`

The existing ticket-specific fixture files remain authoritative for their own domain.

## Contract manifest

The manifest declares the machine-readable semantic chain:

- TAX-002
- PLY-001
- QST-001
- DIF-001
- EVD-001
- PROG-001

Every declared artifact/test path must exist.

The framework intentionally does not treat UX-001 as part of this machine-readable musical/progression fixture chain. UX-001 remains a separate Phase 0 prerequisite for the final integration gate.

## Shared loader

New integration tests use a shared repository-root JSON loader rather than duplicating path-resolution logic.

This provides one stable access convention for future cross-contract fixtures.

## Cross-contract enum alignment

The integration suite requires agreement on shared symbols:

- Player Skill Levels I–V
- Quest difficulty symbols I–V
- Difficulty absolute Levels I–V
- Progression proficiency bands I–V
- readiness states
- Attribute assessment states
- verification modes

The symbols can carry contract-specific meaning, but incompatible enum drift is prohibited.

## Referential integrity

The framework verifies:

- every Difficulty fixture points to an existing Quest fixture
- every personal-difficulty evaluation points to an existing Quest fixture
- every Evidence Result points to an existing Quest fixture
- every Result's required criteria match the Quest Objective criteria
- criterion evidence uses verification modes allowed by that Quest

REL-001 identified and corrected three pre-existing verification-profile mismatches:

- DORIAN CROSSROADS now permits AUDIO_ASSISTED evidence
- ALTERNATE PRECISION GATE now permits AUDIO_ASSISTED evidence
- ONE-STRING MAP now permits DIRECT_AUDIO evidence

This does not make audio mandatory. It only states that those modes are semantically compatible when available.

## Stable Phase 0 reference: DORIAN CROSSROADS

`DORIAN_CROSSROADS` now has a machine-readable integration fixture spanning:

- TAX normalization
- QST Quest definition
- DIF absolute/personal difficulty
- EVD Result/evidence
- PROG XP policy

The framework verifies the stable identity:

- Quest slug: `dorian_crossroads`
- Primary Skill: Hybrid Picking
- Secondary Skills: Scale Mapping, Syncopation Control
- Concepts: Dorian, Eighth-Note Subdivision, Syncopation
- tonal center: E
- target tempo: 90 BPM
- required practice duration: 600 seconds
- absolute demand: III

## End-to-end reference flow

The accepted DORIAN clear fixture records:

- outcome: CLEARED
- 612 seconds of SESSION-recorded practice
- 90 BPM met
- constraint compliance self-attested

Under XP_V1:

- floor(612 / 60) = 10 completed practice minutes
- CLEARED bonus = 5
- expected XP = 15

The integration test proves that this Result can feed the XP policy while:

- the Quest embeds no progression mutation
- the Result embeds no XP mutation
- the Result embeds no proficiency mutation
- one clear cannot establish mastery

This is the first executable cross-contract path through the Phase 0 semantic model.

## Anti-inflation consistency

REL-001 verifies that the contracts agree that:

- XP cannot directly promote Skill proficiency
- inactivity does not directly erase historical proficiency
- SELF evidence can support a clear
- one clear cannot establish mastery

## Test command

A dedicated command is added:

`npm run test:contracts`

It runs the semantic contract tests and the REL-001 integration suite.

The normal `npm run test` and CI gate still run all unit/contract tests.

## Scope boundary

REL-001 validates contract compatibility.

It does not implement:

- production database tables
- Quest generation runtime
- session runtime
- progression algorithms
- authentication
- recommendation logic
- UI components

## Acceptance evidence

- machine-readable contract manifest: PASS
- shared fixture loader: PASS
- stable DORIAN integration fixture: PASS
- shared enums cross-checked: PASS
- Quest references cross-checked: PASS
- Evidence criterion references cross-checked: PASS
- verification compatibility cross-checked: PASS
- taxonomy backing for stable reference cross-checked: PASS
- DORIAN Result → XP_V1 reference flow tested: PASS
- anti-inflation invariants cross-checked: PASS

## Terminal disposition

**REL-001 — COMPLETE**

Remaining Phase 0 contract work before P0-GATE-001: **UX-001 — Hybrid Design-System Contract**.
