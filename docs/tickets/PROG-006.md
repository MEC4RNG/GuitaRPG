# PROG-006 — Progression Correction & Recomputation Operations

**Status:** IN PROGRESS
**Phase:** 3 — Progression
**Branch:** `v1-production`
**Started from:** `bbc37e77ecf0d11a35d07ba96617e11b2c43a84a`

## Objective and boundary

Provide service-only integrity audit, deterministic projection recomputation, and explicit compensating XP corrections by composing the accepted V1 progression authorities. PROG-006 does not edit immutable Quest/Session/Result/evidence history, permit direct Skill or Attribute overrides, add product UI, redefine model constants, or begin REL-003.

## Source-of-truth hierarchy

1. immutable product history: Quest, Session lifecycle, Result, criteria, and evidence
2. progression audit history: Result XP awards, Skill events, readiness/Attribute observations, and explicit corrections
3. rebuildable current Character, Skill, readiness, and Attribute projections

## Planned operations

- append-only signed XP/practice-seconds correction ledger with idempotency and nonnegative aggregate protection
- non-destructive structural integrity report that fails closed on incomplete or incompatible immutable progression history
- service-only full recomputation in Character → PROF/CONF → READY → ATTR order
- semantic before/after snapshots and idempotent operational receipts

## Terminal disposition

**PROG-006 — IN PROGRESS**
