# PROG-005 — Character Attribute Derivation

**Status:** COMPLETE
**Phase:** 3 — Progression
**Branch:** `v1-production`
**Started from:** `3482d37be8cb30e9220f52cc085002e593af8053`

## Objective and boundary

PROG-005 implements deterministic `ATTR_V1` Character Attribute derivation from rated Skill proficiency, confidence, and the canonical `ATTRIBUTE_GRAPH_V1` AFFECTS graph. It does not change XP, Character Level, Skill evidence, proficiency, confidence, readiness, taxonomy membership, recommendations, presentation, correction tooling, or cutover behavior.

## ATTR_V1

- only rated Skill contributors participate; UNRATED Skills are excluded
- each contributor weight is `0.25 + 0.75 × (confidence / 100)`
- Attribute score is the confidence-weighted mean of rated contributor proficiency, rounded to two decimals
- coverage is rated contributors divided by all graph contributors
- confidence is the mean confidence of rated contributors
- ESTABLISHED requires coverage at least `0.60`, mean confidence at least `60`, and at least two ESTABLISHED contributing Skills; otherwise a derived Attribute is ESTIMATED
- Attributes with no rated contributors remain UNASSESSED/null
- readiness is deliberately excluded from Attribute derivation

## Architecture

`private.rebuild_player_attributes_v1(player, source, source_result, occurred_at)` is the deterministic trusted evaluator. Result finalization now projects PROF/CONF first, READY second, and ATTR third. `private.rebuild_player_progression_v1` composes Character, Skill, readiness, and Attribute rebuilds in the same explicit order.

`attribute_progression_events` records immutable, change-only history with before/after state, graph/model versions, source Result references, and the complete derivation inputs needed for audit. A partial unique index makes each Result × Attribute projection structurally exactly-once. RLS permits owner reads while grants prevent browser writes.

## DORIAN reference

Hybrid Picking remains ESTIMATED Level III with proficiency `55.30`, confidence `20`, exposure `1`, and evidence `1`. Coordination and Precision become ESTIMATED at `55.30`, each with coverage `1/21`. Secondary Skills and Required Techniques remain exposure-only and do not inflate Fretboard, Theory, Rhythm, or Control. XP remains `15`.

## Migration and validation evidence

- staging pre-migration Attribute states: total 0; UNASSESSED 0; ESTIMATED 0; ESTABLISHED 0; non-null scores 0
- targeted ATTR/progression/TAX regressions: 5 files / 41 tests PASS
- full Vitest: 40 files / 293 tests PASS
- lint: PASS
- strict TypeScript: PASS
- production build: PASS
- fresh replay through `20260929080000`: PASS
- local pgTAP: 12 files / 408 assertions PASS
- staging preview: exactly `20260929080000_prog_005_attribute_derivation.sql`
- linked pgTAP: 12 files / 408 assertions PASS
- final local/remote history: synchronized through `20260929080000`
- final linked dry-run: current, no pending migrations
- implementation Production scaffold CI: [36650184453](https://github.com/MEC4RNG/GuitaRPG/actions/runs/36650184453) — SUCCESS
- implementation Database contract CI: [36650184656](https://github.com/MEC4RNG/GuitaRPG/actions/runs/36650184656) — SUCCESS

## Terminal disposition

**PROG-005 — COMPLETE**

Phase 3 remains IN PROGRESS. The next planned work is Character / Skills progression views, but no concrete follow-on ticket is defined or authorized. Production cutover remains unauthorized and legacy `main` remains preserved.
