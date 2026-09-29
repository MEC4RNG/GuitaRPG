# PROG-002 — Practice XP Ledger and Character Level Derivation

**Status:** IN PROGRESS
**Phase:** 3 — Progression
**Branch:** `v1-production`
**Started from:** `0b5cc08bbe3ee663e5a35f0e66dbbaffffe21373`

## Objective

Implement deterministic `XP_V1` Result awards, an immutable Result-backed Practice XP ledger, and a recomputable `player_character_states` projection using the explicitly versioned `CHAR_V1` curve.

## Authority

- PROG-001, PLY-001, EVD-001, and DATA-001
- PLY-002 and EVD-002 persistence implementations
- Phase 0 progression contract and fixtures
- P2-GATE-001 accepted core-loop baseline

## Scope boundaries

PROG-002 implements only Practice XP and Character Level. It does not implement Skill proficiency, confidence, readiness, Attributes, progression UI, Training, recommendations, or cutover.

## Architecture

- finalization hook: terminal `quest_results` update, never the provisional insert
- ledger authority: immutable Result-backed rows with a structural unique Result source
- eligible time: authoritative Session lifecycle active seconds; pauses excluded
- zero awards: retained as explicit Result processing records with zero eligible seconds and zero XP
- projection: `player_character_states` is a rebuildable cache, not XP authority
- total practice seconds: sum of meaningful XP-eligible seconds represented in the ledger
- backfill: finalized Results are inserted idempotently and projections rebuilt in the forward migration

## XP_V1

For a meaningful Result, XP is `floor(eligible seconds / 60)` plus outcome bonus: ABANDONED 0, ATTEMPTED 1, PARTIAL 3, CLEARED 5. Nonmeaningful Results record zero XP and receive no bonus.

## CHAR_V1

Level `L` begins at `100 × (L - 1)²` cumulative XP. Thus Level 1 begins at 0 XP, Level 2 at 100, Level 3 at 400, Level 4 at 900, and Level 5 at 1600. The curve is monotonic, deterministic for arbitrary nonnegative XP, transparent, and a balancing rule rather than a scientific rating. It has no proficiency authority.

## Local validation evidence

- XP/contract tests: 2 files / 31 tests PASS
- Phase 2 integration regression: 3 files / 12 tests PASS
- full Vitest: 36 files / 264 tests PASS
- lint: PASS
- strict TypeScript: PASS
- production build: PASS
- fresh database replay through `20260929040000`: PASS
- local pgTAP: 8 files / 305 assertions PASS

## Staging protocol

- initial local/remote history: synchronized through `20260929030000`
- initial PROG-002 preview: exactly `20260929040000_prog_002_practice_xp.sql` pending
- initial staging table statistics: zero estimated durable Quest/Session/Result rows, so no observed existing Result required a live backfill; the migration nevertheless includes deterministic idempotent backfill logic
- remote application, linked acceptance, CI, and closure: pending

## Terminal disposition

**PROG-002 — IN PROGRESS**
