# PROG-003 — Skill Evidence, Proficiency, and Confidence Implementation

**Status:** COMPLETE
**Phase:** 3 — Progression
**Branch:** `v1-production`
**Started from:** `053d3e0b3846b542f3087c3dce2e207ac3ffbb38`

## Objective and boundary

PROG-003 implements deterministic `PROF_V1` / `CONF_V1` Result-backed Skill development. Primary Skills receive exposure and informative evidence; Secondary Skills and Required Techniques receive exposure only. Readiness, Attributes, XP, Character Level, recommendations, Training, UI, cutover, and PROG-004/005 remain outside scope.

## PROF_V1

- Primary demand is 65% of the applicable domain dimension plus 35% overall demand, falling back to overall when the dimension is absent.
- Challenge uses the pre-Result score and DIF_PERSONAL_V1 gap bands: `<=-50` Very Comfortable, `<=-20` Comfortable, `<=15` Target, `<=35` Stretch, otherwise Overreach; UNRATED is UNKNOWN.
- Raw ATTEMPTED/PARTIAL/CLEARED signals are, respectively: Very Comfortable `-4/-2/+1`, Comfortable `-3/-1/+2`, Target `-2/+1/+4`, Stretch `-1/+2/+6`, Overreach `0/+2/+5`.
- LOW/MODERATE/HIGH evidence scales magnitude by `.5/.75/1`; MIXED is MODERATE. Direction never reverses.
- Initial score is demand plus the confidence-weighted outcome adjustment (`ATTEMPTED -12`, `PARTIAL -6`, `CLEARED 0`), clamped to 0–79. It is always ESTIMATED.
- Every later delta is clamped to ±8 and the score to 0–100. Repeated identical easy clears use `max(.25, 1 - .25 × prior count)`.
- ESTABLISHED boundary crossing requires two same-direction recent signals; a single poor Result cannot demote.

## CONF_V1 and establishment

LOW, MODERATE, and HIGH evidence add 10, 20, and 25 confidence points, with easy-repetition attenuation. A five-event recent window containing both positive and negative evidence is a deterministic contradiction and blocks establishment. ESTABLISHED requires at least three informative Results, two Sessions, confidence at least 60, and no contradiction. Confidence never determines outcome or directly raises proficiency.

## Persistence and replay

`skill_progression_events` is the owner-readable, system-written audit ledger. `(source_result_id, skill_id)` structurally enforces exactly-once processing. Events retain roles, inputs, demand/challenge snapshots, model versions, before/delta/after values, visible Levels, reason codes, and timestamps. `private.skill_progression_baselines` preserves pre-existing and post-migration bootstrap state, including readiness. Trusted replay reconstructs `player_skill_states` from baseline plus events. Historical Results backfill transactionally in `(finalized_at, id)` order.

## DORIAN reference

For a new UNRATED player, the DORIAN profile gives Hybrid Picking demand `55.30`. A CLEARED / MIXED Result produces ESTIMATED Level III, proficiency `55.30`, confidence `20`, exposure `1`, and evidence `1`. Scale Mapping and Syncopation Control are exposure-only. Readiness stays UNKNOWN/null, Attributes do not change, and the independent XP_V1 award remains 15 XP for 612 eligible seconds.

## Validation evidence

- targeted progression/contract/DIF/XP/Phase 2: 7 files / 62 tests PASS
- full Vitest: 37 files / 271 tests PASS
- lint: PASS
- strict TypeScript: PASS
- production build: PASS
- fresh replay through `20260929050000`: PASS
- local pgTAP: 9 files / 326 assertions PASS
- staging preview: exactly `20260929050000_prog_003_skill_progression.sql`
- linked pgTAP: 9 files / 326 assertions PASS
- final local/remote history: synchronized through `20260929050000`
- final linked dry-run: current, no pending migrations

## Terminal disposition

**PROG-003 — COMPLETE**

Phase 3 remains IN PROGRESS. PROG-004 requires separate explicit authorization. Production cutover remains unauthorized and legacy `main` remains preserved.
