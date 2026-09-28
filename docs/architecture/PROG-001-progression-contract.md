# PROG-001 — Progression Contract

- Status: Accepted
- Ticket: PROG-001
- Date: 2026-09-27
- Depends on: PLY-001, DIF-001, EVD-001
- Applies to: GuitaRPG v1 XP, Skill proficiency, confidence, readiness, Attributes, Character Level, and milestones

## Purpose

Define how GuitaRPG turns practice history into progression without conflating:

- effort with capability
- capability with certainty
- long-term proficiency with current readiness
- Skill development with Character XP
- one Quest clear with mastery
- repetition with evidence quality

The governing model is:

> Practice → XP  
> Performance evidence → Skill proficiency  
> Repeated Skill development → Character Attributes  
> XP → Character Level

## 1. Progression layers

GuitaRPG progression has five separate layers:

1. Practice XP — cumulative engagement/effort
2. Skill Proficiency — demonstrated capability in one Skill
3. Confidence — system certainty in the Skill estimate
4. Readiness — recent preparedness to perform near demonstrated capability
5. Character Attributes — broad development derived from multiple Skills

Character Level is derived from cumulative Practice XP.

No layer may silently substitute for another.

## 2. Practice XP

Practice XP rewards legitimate practice effort rather than only successful outcomes.

### V1 award rule

For a meaningful attempt:

- 1 XP per completed minute of eligible practice time
- ATTEMPTED bonus: +1 XP
- PARTIAL bonus: +3 XP
- CLEARED bonus: +5 XP
- ABANDONED bonus: +0 XP

Example:

A 15-minute CLEARED Quest awards:

- 15 practice XP
- +5 clear bonus
- 20 total XP

### Eligible practice time

Eligible practice time excludes:

- paused time
- known idle/non-practice time
- duplicated timer intervals
- invalid/corrupt session intervals

Exact idle detection belongs to SES implementation.

### XP invariants

- XP may be earned from ATTEMPTED and PARTIAL outcomes
- XP does not require CLEARED
- XP alone cannot change Skill proficiency
- XP alone cannot establish a Skill
- XP normally never decreases
- XP must be ledger-backed and recomputable
- ordinary clients may not directly set XP totals
- outcome bonuses are intentionally small relative to practice time

Administrative corrections may use explicit compensating ledger entries rather than rewriting history.

## 3. Character Level

Character Level is derived from cumulative Practice XP.

Rules:

- new Player starts at Level 1
- Character Level never grants Skill proficiency
- Character Level never changes Quest absolute demand
- Character Level is not an overall guitarist rating
- Character Level normally never decreases because cumulative XP is monotonic

The exact long-term XP threshold curve is a presentation/balancing parameter and remains versioned rather than hard-coded into this semantic contract.

Any implementation must preserve:

- monotonically increasing XP thresholds
- Level 1 at 0 XP
- deterministic recomputation from the XP ledger/versioned curve

## 4. Skill proficiency score

Rated Skills use the internal 0–100 proficiency score defined by PLY-001.

V1 visible bands are:

- I: 0–19
- II: 20–39
- III: 40–59
- IV: 60–79
- V: 80–100

The score is a model state, not an objective percentage of musical competence.

### UNRATED

UNRATED has:

- proficiency_score = null
- visible_level = null

An informative Result may create an ESTIMATED state.

A single Result may not create ESTABLISHED status.

## 5. What proficiency evidence means

A Result contributes proficiency evidence when it contains enough information about the Player's ability on a Skill.

Evidence strength may depend on:

- Skill role in the Quest
- outcome
- criterion performance
- absolute Quest demand
- personal difficulty
- evidence confidence
- consistency with recent results
- contextual variety
- recency

Proficiency evidence is not the same thing as XP.

## 6. Skill role weighting

Quest Skill roles have different evidentiary authority.

### Primary Skill

Primary target of proficiency evidence.

### Secondary Skill

May receive evidence when the Objective materially exercises/measures it.

Evidence weight is normally lower than Primary Skill evidence.

### Required Technique

Participation alone does not prove proficiency.

A Required Technique receives proficiency evidence only when:

- the Objective/criteria materially measure it, or
- later explicit evidence logic establishes a valid assessment path

This prevents a Quest from inflating every referenced Skill.

Exact numeric role weights are versioned implementation parameters.

## 7. Outcome signal

Outcome is evidence, not a direct point award to proficiency.

General direction:

- CLEARED → positive proficiency signal when difficulty is informative
- PARTIAL → mixed/informative signal
- ATTEMPTED → may be limiting/negative/neutral evidence depending on difficulty and criteria
- ABANDONED → normally no proficiency update

Outcome must be interpreted relative to challenge.

A failure on an Overreach Quest must not be treated the same as failing a Very Comfortable Quest.

## 8. Challenge relevance

Personal difficulty from DIF-001 determines how informative the Result is.

General rules:

- Very Comfortable clear → weak positive proficiency evidence
- Comfortable clear → moderate positive evidence
- Target Challenge clear → strong positive evidence
- Stretch clear → strong positive evidence
- Overreach non-clear → weak evidence against current proficiency
- non-clear on Comfortable/Very Comfortable work → stronger evidence that the current estimate may be too high

The progression engine must avoid punishing Players for attempting deliberately difficult work.

## 9. Evidence confidence

Verification confidence primarily affects how strongly GuitaRPG trusts an observation.

Rules:

- SELF evidence is valid
- higher-confidence evidence may increase model confidence faster
- higher-confidence evidence does not make a CLEARED outcome “more cleared”
- low-confidence evidence may still move proficiency modestly
- verification confidence must not be used to invalidate self-reported practice
- criterion-specific confidence is preferred over a simplistic global verification rank

Two otherwise similar CLEARED Results may produce similar proficiency direction but different confidence gains.

## 10. Proficiency update bounds

Progression must resist large jumps from isolated events.

V1 invariant:

- one Result may change one Skill's internal proficiency score by at most 8 points in either direction

Additional rules:

- one Result may not establish Level V mastery
- one poor Result may not demote an ESTABLISHED Skill by more than one visible band
- one Result should not normally move a visible Skill Level more than one band
- repeated coherent evidence is required for durable large changes

Calibration placement is a separate initialization flow and may create an ESTIMATED score directly without pretending it is accumulated progression.

## 11. Promotion and demotion

A visible Level is derived from proficiency score bands plus evidence gates.

### Promotion

Promotion requires:

- score entering the higher band
- sufficient evidence support
- no single Result shortcut to Level V establishment

### Demotion

Demotion may occur only from contradictory performance evidence.

Inactivity alone cannot cause demotion.

A single poor Result must not by itself demote an established Skill unless a later explicitly versioned safety rule provides compelling deterministic evidence; v1 does not use such a shortcut.

### Boundary hysteresis

Implementation must use hysteresis or equivalent evidence gating around Level boundaries so repeated tiny score fluctuations do not cause visible Level oscillation.

Exact hysteresis size is versioned implementation detail.

## 12. Assessment status transitions

### UNRATED → ESTIMATED

May occur after at least one informative proficiency Result or accepted calibration estimate.

### ESTIMATED → ESTABLISHED

Requires:

- at least 3 informative Results
- evidence across at least 2 distinct sessions
- confidence_score >= 60
- no unresolved contradiction that makes the displayed Level misleading

### ESTABLISHED

Once established, inactivity alone does not revert the Skill to ESTIMATED.

Contradictory evidence can:

- reduce proficiency
- reduce confidence
- eventually change Level

but a passing clock does not erase establishment.

## 13. Confidence

Confidence is system certainty in the proficiency estimate.

It increases through:

- repeated informative evidence
- higher criterion-specific evidence confidence
- consistent outcomes
- evidence across varied relevant Contexts
- evidence near useful challenge levels

It decreases or grows more slowly with:

- conflicting evidence
- very weak/ambiguous evidence
- repeated evidence from only one narrow context
- stale evidence where appropriate

Rules:

- confidence does not directly change capability
- high confidence can exist at low proficiency
- confidence_score range is 0–100
- ESTABLISHED threshold is 60 in v1
- inactivity alone may reduce the recency contribution but must not by itself de-establish a Skill

## 14. Variety and diminishing returns

Repeated identical practice remains valid effort and can earn XP.

However, identical low-demand repetition has diminishing proficiency-information value.

The progression model should distinguish:

- effort reward → XP can continue
- evidence novelty → proficiency/confidence gains may diminish

Variety may include:

- different Contexts/tunings
- different Constraints
- different tempo ranges
- different fretboard regions
- different musical Concepts
- different Quest Types where relevant

Variety must not become a requirement to practice music unnaturally; it is an evidence-quality factor, not a content quota.

## 15. Consistency

Consistency is repeated evidence supporting a similar proficiency estimate.

Rules:

- consistent evidence raises confidence
- one outlier should not dominate a mature estimate
- repeated contradictory evidence should eventually move proficiency
- contradictory evidence at low personal difficulty is more concerning than failure at Overreach

Exact statistical method is versioned implementation detail.

## 16. Readiness

Readiness tracks recent preparedness and is intentionally more responsive than proficiency.

Readiness inputs may include:

- time since last meaningful practice
- recent outcomes
- recent practice volume
- recent difficulty relative to capability

### Default v1 recency anchors

For an already rated Skill, absent stronger recent evidence:

- practiced within 7 days → HIGH anchor
- 8–30 days → MODERATE anchor
- more than 30 days → LOW anchor

These anchors may be adjusted by recent Result quality.

Rules:

- readiness can change without proficiency changing
- inactivity may lower readiness
- successful refresh practice may restore readiness quickly
- readiness does not exceed demonstrated proficiency
- UNRATED Skills remain readiness UNKNOWN
- readiness model is versioned

## 17. Exposure

Meaningful ATTEMPTED, PARTIAL, and CLEARED Results increase exposure.

Exposure may include:

- encounter count
- meaningful practice time
- evidence count
- distinct Context count
- last practiced timestamp

ABANDONED normally does not increase meaningful exposure unless the recorded activity independently satisfies the meaningful-practice definition.

Exposure does not guarantee proficiency increase.

## 18. Negative evidence and anti-punishment

Progression must distinguish challenge-seeking from regression.

Examples:

- Level III Player attempts personal V Overreach and does not clear → little/no negative proficiency signal
- Level III Player repeatedly fails personal I–II Quests with high-confidence evidence → meaningful negative signal
- one bad day → readiness may fall before proficiency does
- repeated poor evidence across appropriate difficulty → proficiency may eventually fall

This prevents the system from teaching Players to avoid difficult Quests just to protect their stats.

## 19. Character Attributes

Attributes are broad development summaries derived from Skill state.

Canonical Attributes remain:

Physical:
- Dexterity
- Precision
- Coordination
- Control
- Endurance

Musical:
- Fretboard
- Rhythm
- Theory
- Ear
- Creativity
- Expression

### Attribute inputs

Attributes may use:

- Skill proficiency scores
- TAX AFFECTS relationships
- relationship weights
- Skill confidence
- breadth/coverage across contributing Skills

Attributes do not use Practice XP directly.

### Status

- UNASSESSED — insufficient rated contributing Skills
- ESTIMATED — some meaningful contributing state, but incomplete/uncertain coverage
- ESTABLISHED — broad enough evidence/confidence for stable presentation

### Attribute behavior

- Attributes move more slowly than individual Skills
- one Quest Result should not produce a dramatic Attribute jump
- inactivity alone does not lower Attributes
- a broad Attribute may eventually decline if underlying Skill proficiency genuinely declines through repeated evidence
- Attribute values do not replace individual Skill detail

Exact Skill-to-Attribute weights require the finalized contributing Skill graph and are versioned data, not hard-coded global constants.

## 20. Attribute calculation principle

A v1 Attribute score should be derived from a confidence-weighted combination of contributing Skill proficiency values through TAX AFFECTS relationships.

Required properties:

- unrated Skills do not count as zero
- missing evidence reduces coverage rather than dragging the score down
- low-confidence Skill estimates contribute less certainty
- broad coverage raises Attribute confidence/status
- a single high Skill cannot automatically establish the entire broad Attribute

The exact weighted aggregation and smoothing coefficients remain versioned implementation parameters.

## 21. Milestones

Milestones are event recognitions, not progression currency.

Examples:

- first CLEARED Quest
- first ESTABLISHED Skill
- first Skill Level III
- 10 hours recorded practice
- practice across all six Domains

Rules:

- milestone definitions are system-owned
- milestone awards are durable and timestamped
- milestone award does not directly alter Skill proficiency
- milestone award does not directly alter Character Attributes
- XP bonuses for future milestone design would require an explicit versioned rule

## 22. Progression events and ledgering

Derived changes must remain auditable.

Progression implementation should be able to record events such as:

- XP_AWARDED
- SKILL_EVIDENCE_APPLIED
- SKILL_ESTIMATE_CREATED
- SKILL_LEVEL_CHANGED
- CONFIDENCE_UPDATED
- READINESS_UPDATED
- ATTRIBUTE_UPDATED
- CHARACTER_LEVEL_CHANGED
- MILESTONE_AWARDED

Every system-authored progression event should retain:

- player ID
- source Result/session where applicable
- model version
- before/after state or reproducible delta
- timestamp

Aggregate state must be recomputable or explainable from source history plus model/version data.

## 23. Corrections and replay

When Result evidence is corrected:

- progression must be replayable/recomputable
- the system must not silently retain stale derived state
- historical source evidence remains auditable
- XP corrections use explicit ledger adjustments if necessary
- Skill/Attribute state may be recalculated under the appropriate model version

## 24. Versioning

Progression models evolve.

V1 requires explicit versions for:

- XP policy
- Skill proficiency model
- confidence model
- readiness model
- Attribute model
- Character Level curve

Historical progression events retain their producing version.

A model upgrade may intentionally recompute current derived state, but the migration/recalculation must be recorded.

## 25. Phase 0 progression fixtures

Fixtures cover at least:

- meaningful ATTEMPTED practice earning XP
- PARTIAL practice earning XP
- 15-minute CLEARED Quest producing 20 XP under v1
- SELF versus high-confidence verification with different confidence gains
- Very Comfortable clear producing weak proficiency evidence
- Target Challenge clear producing stronger proficiency evidence
- Overreach non-clear avoiding punitive proficiency loss
- low-difficulty repeated non-clear producing negative evidence
- UNRATED Skill becoming ESTIMATED, not ESTABLISHED
- stale Skill losing readiness but not proficiency
- repeated identical easy clears showing diminishing proficiency information
- broad Attribute state changing more slowly than Skill state

These fixtures are semantic expectations rather than final statistical calibration.

## 26. Required invariants

Implementation/tests must prove:

- ATTEMPTED can earn XP
- PARTIAL can earn XP
- CLEARED is not required for XP
- 15-minute CLEARED practice yields 20 XP under XP_V1
- XP cannot directly change Skill proficiency
- one Result cannot establish Level V
- one Result cannot create ESTABLISHED from UNRATED
- SELF evidence remains valid
- higher evidence confidence can raise model confidence faster
- personal Overreach failure is not heavily punitive
- inactivity changes readiness, not historical proficiency
- repeated identical easy clears have diminishing proficiency information
- unrated contributing Skills are not treated as zero in Attributes
- Character Level cannot grant Skill Level
- Attributes do not use XP directly
- all derived updates are versioned/auditable

## 27. Deferred decisions

PROG-001 does not finalize:

- exact per-result proficiency delta formula
- exact evidence-confidence multipliers
- exact role weights
- exact consistency/variety functions
- exact Attribute relationship weights
- Character Level XP threshold curve
- milestone catalog
- data-driven calibration from production population

Those values may be tuned while preserving the semantic invariants established here.

## Terminal disposition

**PROG-001 — COMPLETE**

The Progression contract is accepted.

Next dependent work: **REL-001 — Contract Test & Fixture Framework** and downstream adaptive Training/History implementation.
