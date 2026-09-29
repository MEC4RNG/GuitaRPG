# PROG-004 — Readiness and Recency Implementation

**Status:** COMPLETE
**Phase:** 3 — Progression
**Branch:** `v1-production`
**Started from:** `b997e07851a0d4704cde8b9819d2fefaacb62964`

## Objective and boundary

PROG-004 implements deterministic `READY_V1` readiness from rated proficiency and server-authoritative practice recency. It does not change proficiency, confidence, exposure, evidence, XP, Character Level, Attributes, recommendations, presentation, or cutover behavior. PROG-005 remains outside scope.

## READY_V1

- elapsed age at or below 7 days: HIGH, factor `1.00`
- elapsed age above 7 and at or below 30 days: MODERATE, factor `0.80`
- elapsed age above 30 days: LOW, factor `0.60`
- score is `round(proficiency × factor, 2)` and never exceeds proficiency
- UNRATED is always UNKNOWN/null
- rated state without trustworthy recency preserves an auditable non-UNKNOWN baseline when present; otherwise it remains UNKNOWN/null
- future practice timestamps clamp age to zero
- Result quality is deliberately not double-counted; richer quality-sensitive behavior is deferred to a future model

## Architecture

`private.refresh_player_readiness_v1(player, as_of, source)` is the deterministic trusted evaluator. `public.refresh_player_readiness()` accepts no parameters, derives the caller from `auth.uid()`, and uses database time. The PROG-003 terminal projection function is forward-replaced so PROF/CONF/exposure completes first and READY_V1 then consumes the resulting state explicitly. `private.rebuild_player_progression_v1` composes Skill replay with an explicit readiness as-of evaluation.

`skill_readiness_events` records change-only, owner-readable audit history with before/after state, proficiency/assessment/recency snapshots, authoritative evaluation time, source, and reason. RLS and grants prevent browser mutation and cross-player reads.

## DORIAN reference

Hybrid Picking remains ESTIMATED Level III, proficiency `55.30`, confidence `20`, exposure `1`, and evidence `1`. Its readiness is HIGH / `55.30` immediately, MODERATE / `44.24` after eight days, and LOW / `33.18` after 31 days. UNRATED supporting Skills remain UNKNOWN/null. XP remains `15`; Attributes remain unchanged.

## Migration and validation evidence

- staging pre-migration Skill states: total 0; UNRATED 0; ESTIMATED 0; ESTABLISHED 0; rated with null recency 0; non-UNKNOWN readiness 0
- targeted READY/progression/contract/DIF tests: 4 files / 41 tests PASS
- full Vitest: 38 files / 281 tests PASS
- lint: PASS
- strict TypeScript: PASS
- production build: PASS
- fresh replay through `20260929060000`: PASS
- local pgTAP: 10 files / 355 assertions PASS
- staging preview: exactly `20260929060000_prog_004_readiness_recency.sql`
- linked pgTAP: 10 files / 355 assertions PASS
- final local/remote history: synchronized through `20260929060000`
- final linked dry-run: current, no pending migrations

## Terminal disposition

**PROG-004 — COMPLETE**

Phase 3 remains IN PROGRESS. PROG-005 requires separate explicit authorization. Production cutover remains unauthorized and legacy `main` remains preserved.
