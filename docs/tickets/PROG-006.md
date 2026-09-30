# PROG-006 — Progression Correction & Recomputation Operations

**Status:** COMPLETE
**Phase:** 3 — Progression
**Branch:** `v1-production`
**Started from:** `bbc37e77ecf0d11a35d07ba96617e11b2c43a84a`

## Objective and boundary

Provide service-only integrity audit, deterministic projection recomputation, and explicit compensating XP corrections by composing the accepted V1 progression authorities. PROG-006 does not edit immutable Quest/Session/Result/evidence history, permit direct Skill or Attribute overrides, add product UI, redefine model constants, or begin REL-003.

## Source-of-truth hierarchy

1. immutable product history: Quest, Session lifecycle, Result, criteria, and evidence
2. progression audit history: Result XP awards, Skill events, readiness/Attribute observations, and explicit corrections
3. rebuildable current Character, Skill, readiness, and Attribute projections

## Correction boundary

Projection drift is repaired only through the accepted rebuild functions. Quest, Session, Result, criterion, evidence, Result-award, and Skill-event history is never rewritten by these operations. Direct proficiency, Level, confidence, readiness, and Attribute overrides do not exist.

Source-evidence correction remains outside PROG-006. A missing historical Skill event blocks recomputation because PROF_V1 is sequential and cannot be reconstructed casually from today's projection.

## XP compensating entries

`practice_xp_correction_ledger` is a separate append-only owner-readable ledger. Each row records signed XP and meaningful-practice-seconds deltas, V1 model versions, a required reason, optional owned Result/operator references, and a Player-scoped idempotency key. Ordinary clients may read only their own rows and cannot mutate them; service role receives INSERT but no UPDATE/DELETE privilege.

`private.apply_practice_xp_correction_v1` validates Player and optional Result ownership, rejects empty reasons/keys, prevents negative cumulative XP or meaningful seconds, appends exactly once, and rebuilds only the Character projection. An erroneous correction is repaired with a new opposite compensation rather than editing history.

## Integrity audit and recomputation

`private.progression_integrity_report_v1` is non-destructive. It reports finalized Results, normal awards, corrections, expected/actual Result×Skill events, model-version mismatches, Character drift, structural blockers, and `safe_to_recompute`. It checks exact award/event identities, duplicate constraints, event-bearing Skill baselines, and the complete V1 model bundle.

`private.admin_recompute_player_progression_v1` requires Player, explicit `as_of`, reason, and idempotency key. It captures a deterministic semantic snapshot, persists a private operational receipt, refuses unsafe history with `BLOCKED`, or composes Character → PROF/CONF → READY → ATTR rebuilding. Completed receipts retain the audit report, full model bundle, before/after snapshots, and whether the semantic projection changed.

Event-free canonical Skills rebuild to their known UNRATED bootstrap. Event-bearing Skills without preserved baselines remain blockers. The dry report deliberately does not claim independent numerical Skill parity: exact structural history is proven before APPLY, and authoritative replay plus the receipt snapshot proves the repaired state.

## Security and lifecycle

- correction and recompute functions are private, SECURITY DEFINER, empty-search-path, and service-executable only
- no browser elevated credential, route, button, cron, or scheduled recomputation exists
- correction rows and private recompute receipts cascade with Auth Player deletion
- migration creates no correction or receipt rows and performs no bulk Player recomputation

## DORIAN repair fixture

The rolled-back operational fixture restores 15 XP, Hybrid Picking ESTIMATED Level III / 55.30 / confidence 20 / exposure 1 / evidence 1, Coordination and Precision ESTIMATED 55.30, and supporting Skills as exposure-only UNRATED. Readiness is HIGH 55.30 immediately, MODERATE 44.24 at +8 days, and LOW 33.18 at +31 days while XP, proficiency, confidence, and Attributes remain stable.

It also proves combined Character/Skill/readiness/Attribute corruption repair, semantic no-op replay, correction idempotency, recompute idempotency, negative aggregate rejection, immutable source history, blocker refusal, and account cleanup.

## Validation

- staging pre-migration audit: Players 0; finalized Results 0; Result awards 0; Skill events 0; readiness events 0; Attribute events 0; corrections 0
- PROG-006 application contracts: 2 files / 12 tests PASS
- progression model regressions: 5 files / 48 tests PASS
- UX-003 read-model regressions: 3 files / 13 tests PASS
- Phase 2 integration regression: 3 files / 12 tests PASS
- full Vitest: 44 files / 313 tests PASS
- changed-file formatting: PASS
- lint: PASS
- strict TypeScript: PASS
- production build: PASS
- fresh migration replay through `20260929090000`: PASS
- local pgTAP: 13 files / 477 assertions PASS
- initial local/remote history: synchronized through `20260929080000`
- staging preview: exactly `20260929090000_prog_006_recompute_ops.sql`
- linked pgTAP and operational acceptance: 13 files / 477 assertions PASS
- final local/remote history: synchronized through `20260929090000`
- final linked dry-run: current, no pending migrations
- implementation Production scaffold CI: [36655332043](https://github.com/MEC4RNG/GuitaRPG/actions/runs/36655332043) — SUCCESS
- implementation Database contract CI: [36655332080](https://github.com/MEC4RNG/GuitaRPG/actions/runs/36655332080) — SUCCESS

## Limitations and non-goals

No Result/evidence amendment model, manual progression override, admin UI, V2 model migration, recommendation logic, automatic recompute schedule, REL-003 work, or Phase 3 gate work is included.

## Terminal disposition

**PROG-006 — COMPLETE**

Phase 3 remains IN PROGRESS. REL-003 remains unauthorized pending separate explicit approval. Production cutover remains unauthorized and legacy `main` remains preserved.
