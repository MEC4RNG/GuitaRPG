# PROG-001 — Progression Contract

**Status:** COMPLETE  
**Date:** 2026-09-27  
**Authority:** Phase 0 — Architecture & Contracts

## Objective

Define how effort, performance evidence, confidence, readiness, broad Attributes, Practice XP, and Character Level interact without inflating progression.

## Result

Core progression model:

- Practice → XP
- Performance evidence → Skill proficiency
- repeated Skill development → Attributes
- XP → Character Level

V1 XP policy:

- 1 XP per completed meaningful practice minute
- ATTEMPTED +1
- PARTIAL +3
- CLEARED +5
- ABANDONED +0

Therefore a 15-minute CLEARED Quest awards 20 XP.

Critical invariants:

- XP does not change Skill proficiency
- Character Level does not grant Skill Level
- one Result cannot establish mastery
- UNRATED can become ESTIMATED from informative evidence, not immediately ESTABLISHED
- ESTABLISHED requires repeated evidence and confidence
- inactivity lowers readiness, not historical proficiency
- Overreach failures are not strongly punitive
- repeated identical easy clears keep rewarding effort but provide diminishing proficiency information
- SELF evidence remains valid
- stronger verification can raise system confidence faster without changing the meaning of outcome
- Attributes derive from Skill state, not XP
- unrated Skills are missing evidence, not zero-valued Skills

## Artifacts

- `docs/architecture/PROG-001-progression-contract.md`
- `domain/progression/progression-contract.json`
- `domain/progression/phase0-progression-fixtures.json`
- `tests/progression-contract.test.ts`

## Terminal disposition

**COMPLETE**

Next dependent Phase 0 ticket: **REL-001 — Contract Test & Fixture Framework**.
