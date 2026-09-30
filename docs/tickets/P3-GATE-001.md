# P3-GATE-001 — Phase 3 Progression Gate

**Status:** IN PROGRESS

## Objective

Determine whether finalized Results now update and expose engagement XP, Character Level, Skill proficiency, confidence, readiness, and broad Attributes deterministically while preserving semantic separation, auditability, correction/replay, security, and truthful Player presentation.

## Authority

The user explicitly authorized P3-GATE-001 only on 2026-09-29. Phase 4, TRN-001, recommendation work, Training UI, new progression semantics, production cutover, and replacement of legacy `main` remain unauthorized.

## Prerequisites

| Ticket | Required | Observed |
| --- | --- | --- |
| PROG-002 | COMPLETE | COMPLETE |
| PROG-003 | COMPLETE | COMPLETE |
| PROG-004 | COMPLETE | COMPLETE |
| TAX-004 | COMPLETE | COMPLETE |
| PROG-005 | COMPLETE | COMPLETE |
| UX-003 | COMPLETE | COMPLETE |
| PROG-006 | COMPLETE | COMPLETE |
| REL-003 | COMPLETE | COMPLETE |

## Phase 3 acceptance matrix

| # | Requirement | Authority | Owner | Evidence | Result | Remediation |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Meaningful Result awards XP | XP_V1 | PROG-002 | DORIAN 612s clear = 15 XP | PASS | — |
| 2 | ATTEMPTED earns XP | XP_V1 | PROG-002 | 600s attempted = 11 XP | PASS | — |
| 3 | PARTIAL earns XP | XP_V1 | PROG-002 | 600s partial = 13 XP | PASS | — |
| 4 | CLEARED earns XP | XP_V1 | PROG-002 | 900s cleared = 20 XP | PASS | — |
| 5 | Nonmeaningful ABANDONED has no false progression | XP/PROF/ATTR V1 | REL-003 | Runtime, pgTAP, desktop and Pixel 7 | PASS | — |
| 6 | XP ledger is immutable and auditable | PROG-002/006 | PROG-002 | Append-only Result awards and RLS tests | PASS | — |
| 7 | Character Level derives from cumulative XP | CHAR_V1 | PROG-002 | Quadratic threshold regression | PASS | — |
| 8 | Character Level grants no proficiency | PROG-001 | PROG-002/003 | XP/proficiency separation tests | PASS | — |
| 9 | Primary Skill receives PROF_V1 evidence | PROF_V1 | PROG-003 | Hybrid Picking exact anchor | PASS | — |
| 10 | Supporting Skills default exposure-only | PROF_V1 | PROG-003 | Scale Mapping/Syncopation UNRATED | PASS | — |
| 11 | Per-Result proficiency movement ≤8 | PROF_V1 | PROG-003 | Runtime bound regression | PASS | — |
| 12 | One Result cannot establish mastery | PROF_V1 | PROG-003 | First evidence remains ESTIMATED | PASS | — |
| 13 | UNRATED → ESTIMATED | PROF_V1 | PROG-003 | DORIAN Primary transition | PASS | — |
| 14 | ESTIMATED → ESTABLISHED gates | PROF/CONF V1 | PROG-003 | 3 Results, 2 Sessions, confidence ≥60 | PASS | — |
| 15 | Contradiction blocks false establishment | PROF_V1 | PROG-003 | Deterministic contradiction sequence | PASS | — |
| 16 | Overreach anti-punishment | PROF_V1 | PROG-003 | Isolated attempted Overreach has zero loss | PASS | — |
| 17 | Easy repetition keeps XP but attenuates information | XP/PROF/CONF V1 | REL-003 | Full XP; repetition factor 0.25 | PASS | — |
| 18 | Confidence distinct from proficiency | CONF_V1 | PROG-003 | Independent score and certainty assertions | PASS | — |
| 19 | SELF evidence remains valid | EVD-001/CONF_V1 | PROG-003 | PLAYER authority, MODERATE evidence | PASS | — |
| 20 | Readiness derives from recency | READY_V1 | PROG-004 | 7/30-day anchors | PASS | — |
| 21 | Inactivity lowers readiness only | READY_V1 | PROG-004 | DORIAN +8/+31 invariant checks | PASS | — |
| 22 | Meaningful practice refreshes readiness | READY_V1 | PROG-004 | Result pipeline readiness HIGH | PASS | — |
| 23 | Attribute graph covers canonical taxonomy | ATTRIBUTE_GRAPH_V1 | TAX-004 | 72 Skills, 11 Attributes, 141 edges | PASS | — |
| 24 | Unrated Skills excluded from Attribute score | ATTR_V1 | PROG-005 | PROG-FIX-013 regression | PASS | — |
| 25 | Attribute coverage distinct from score | ATTR_V1 | PROG-005 | 1/21 coverage with score 55.30 | PASS | — |
| 26 | One high Skill cannot establish broad Attribute | ATTR_V1 | PROG-005 | Establishment gate regression | PASS | — |
| 27 | XP/readiness are not Attribute inputs | ATTR_V1 | PROG-005 | Input and invariant tests | PASS | — |
| 28 | Character view truthful | UX-003 | UX-003 | Read model and browser assertions | PASS | — |
| 29 | Skills view truthful | UX-003 | UX-003 | 72 Skills, separated fields, unavailable state | PASS | — |
| 30 | Corrections use compensating ledger entries | PROG-006 | PROG-006 | -5 then +5 immutable rows | PASS | — |
| 31 | Projection recomputation deterministic | PROG-006 | PROG-006 | Fixed-as-of exact restoration/no-op | PASS | — |
| 32 | Unsafe immutable-history gaps block replay | PROG-006 | PROG-006 | Missing Skill event produces BLOCKED receipt | PASS | — |
| 33 | Direct Skill/Attribute overrides absent | PROG-001/006 | PROG-003/005 | Authenticated mutation denied | PASS | — |
| 34 | Browser cannot forge progression | Security contracts | REL-003 | Public key only; trusted operations denied | PASS | — |
| 35 | Owner isolation across progression graph | PLY-001 | Phase 3 stack | RLS owner/non-owner pgTAP | PASS | — |
| 36 | Account deletion removes progression state | DATA-001 | Phase 3 stack | Cascade assertions including receipts | PASS | — |
| 37 | Phase 2 core loop intact | P2-GATE-001 | REL-002 | 3 files / 12 tests and browsers | PASS | — |
| 38 | Migration history synchronized | DATA-001 | Phase 3 stack | Local/remote match through 090000 | PASS | — |
| 39 | Linked staging schema current | DATA-001 | Phase 3 stack | Initial/final dry-run current | PASS | — |
| 40 | Production build succeeds | UX-001 | UX-003 | Next.js production build | PASS | — |

## Semantic-separation audit

XP_V1 measures meaningful engagement only; CHAR_V1 derives solely from cumulative XP. PROF_V1 consumes Primary Skill Result evidence, while CONF_V1 records certainty independently. READY_V1 applies recency to current proficiency without rewriting it. ATTR_V1 aggregates rated Skills through ATTRIBUTE_GRAPH_V1 and accepts neither XP, Character Level, nor readiness. One Result remains ESTIMATED, supporting Skills receive exposure only, UNRATED is never coerced to Level I, and UNASSESSED is never rendered as numeric zero.

## DORIAN full-chain evidence

The canonical 612-second CLEARED Result produces 15 XP, Character Level 1, and 612 meaningful seconds. Hybrid Picking is ESTIMATED Level III at proficiency 55.30, confidence 20, exposure 1, and evidence 1. Readiness is HIGH 55.30 immediately, MODERATE 44.24 at +8 days, and LOW 33.18 at +31 days. Across decay, XP, proficiency, confidence, Level, assessment, Coordination, and Precision remain unchanged.

Scale Mapping and Syncopation Control remain exposure-only UNRATED. Coordination and Precision are ESTIMATED 55.30 with rated coverage 1/21. Fretboard, Theory, Rhythm, and Control remain UNASSESSED/null.

## XP and Character audit

XP_V1 remains one XP per completed meaningful minute plus outcome bonuses ATTEMPTED +1, PARTIAL +3, CLEARED +5, and ABANDONED +0. A meaningful 900-second CLEARED Result yields 20 XP; DORIAN yields 15. CHAR_V1 remains `100 × (L - 1)²`, deterministic and monotonic under normal awards. Explicit compensating corrections may reduce the projected Level; Character Level has no Skill authority.

## Skill and confidence audit

PROF_V1 remains bounded to 0–100 and at most eight points per Result. Only Primary Skills receive proficiency evidence by default. Overreach protects isolated attempts from strong loss, while repeated easy clears retain full engagement XP and attenuate proficiency/confidence information. CONF_V1 changes with evidence quality, does not change Result outcome, and requires confidence 60 plus three informative Results, two Sessions, and no contradiction before ESTABLISHED.

## Readiness and Attribute audit

READY_V1 remains HIGH through seven days, MODERATE after seven through 30, LOW after 30, and UNKNOWN for UNRATED Skills. Its score never exceeds proficiency, and inactivity changes neither proficiency nor confidence.

ATTRIBUTE_GRAPH_V1 contains 72 active Skills, 11 Attributes, 141 unweighted AFFECTS edges, complete Skill and Attribute coverage, and the preserved 72-edge BELONGS_TO graph. ATTR_V1 excludes unrated contributors, separately tracks score and coverage, weights rated contributors by confidence, and requires 60% coverage, mean confidence 60, and two ESTABLISHED contributors for an ESTABLISHED Attribute.

## Progression views and accessibility smoke

Character presents Level/XP and recorded meaningful practice without an overall guitarist rating; UNASSESSED remains textual/null. Skills presents all 72 canonical Skills by Domain and keeps assessment, proficiency, confidence, readiness, exposure, and evidence distinct. Missing projections display unavailable rather than Level I.

Desktop and Pixel 7 both pass anonymous onboarding, new-player Character and Skills states, Generate, Session, truthful short ABANDONED Result, History, and post-Result anti-inflation. Filters and controls are labelled, disclosures use native keyboard-operable `details`, state is explicit text rather than color-only, global focus-visible styling remains present, and loading/errors use status/alert roles.

## Correction and recomputation audit

PROG-006 retains its structural integrity report, service-only fixed-as-of rebuild, before/after semantic snapshots, durable receipt, idempotency, and BLOCKED unsafe-history behavior. Valid drift restores exactly; healthy replay is a no-op; missing immutable Skill history refuses replay without projection mutation.

Original Result XP awards remain immutable. Corrections append compensation rows, correction-of-correction appends another row, negative aggregate XP/time is rejected, and XP correction leaves Skill, readiness, and Attributes unchanged.

## Security and deletion audit

Ordinary authenticated clients cannot write XP awards/corrections or Skill/readiness/Attribute projections and events, nor invoke recompute or XP correction. The browser bundle receives only Supabase public configuration and no service-role credential. RLS isolates Character, XP, correction, Skill/readiness, and Attribute data by owner. Auth Player deletion removes projections, ledgers, progression events, corrections, and operational receipts without orphans.

## Application and database validation

- Phase 3 integration: 5 files / 26 tests PASS
- progression regressions: 6 files / 60 tests PASS
- Phase 2 integration: 3 files / 12 tests PASS
- UX progression regressions: 3 files / 13 tests PASS
- full Vitest: 45 files / 319 tests PASS
- gate-touched formatting: PASS
- ESLint: PASS
- strict TypeScript: PASS
- production build: PASS
- desktop Chromium core loop: PASS
- Pixel 7 core loop: PASS
- fresh migration replay through `20260929090000`: PASS
- local pgTAP: 14 files / 540 assertions PASS

## Staging evidence

Staging project `vwvuaasgczsmeskhjrsb` matches local history through `20260929090000`. Initial and final linked dry-runs report current with no pending migrations. Linked pgTAP passes 14 files / 540 assertions in rolled-back transactions. No migration was added and no real staging Player state was changed.

## Deferred Phase 4 work

Recommendation candidate generation/ranking, weakness balancing, refresh/novelty selection, adaptive next-Quest explanation, and Training UI are non-blocking Phase 4 work. None was started by this gate.

## Remediation findings

NONE. No substantive defect, missing Phase 3 feature, schema change, or model change is required.

## Gate decision

PASS. Finalized Results deterministically produce and truthfully expose engagement XP, Character Level, Skill proficiency, confidence, readiness, and broad Attributes while preserving semantic separation, auditability, correction/replay, security, deletion, and product truthfulness. Normal progression requires no administrator repair.

## Terminal disposition

Pending validation and closure CI before recording **P3-GATE-001 — COMPLETE / PASS**.
