# DIF-001 — Difficulty Model Contract

- Status: Accepted
- Ticket: DIF-001
- Date: 2026-09-27
- Depends on: QST-001, PLY-001
- Applies to: GuitaRPG v1 Quest demand and player-relative difficulty

## Purpose

Define how GuitaRPG represents the difficulty of a Quest without confusing:

- canonical Skill identity
- Player Skill proficiency
- absolute Quest demand
- personal difficulty for a specific Player
- temporary readiness
- uncertainty/confidence

The model must support adaptive training while avoiding false precision for unrated or weakly understood players.

## 1. Four different concepts

### Canonical Skill

A Skill is level-neutral.

Alternate Picking, Voice Leading, or Interval Recognition does not have one inherent difficulty.

### Player Skill proficiency

Player proficiency belongs to Player × Skill state under PLY-001.

It describes demonstrated capability.

### Absolute Quest demand

Absolute demand belongs to a resolved Quest instance.

It describes what the Quest asks, independent of who attempts it.

### Personal difficulty

Personal difficulty is an evaluation of one Quest against one Player state at one point in time.

It is not an intrinsic Quest property.

## 2. Absolute demand scale

Absolute Quest demand uses Levels I–V:

- I — Foundation demand
- II — Developing demand
- III — Functional demand
- IV — Advanced demand
- V — Expert / mastery-grade demand within GuitaRPG

These labels describe the requirements of the Quest.

They do not mean:

- a Level III player should always receive a Level III Quest
- a Skill itself is Level III
- clearing a Level V Quest creates Level V proficiency

## 3. Difficulty dimensions

Every Quest difficulty profile evaluates seven dimensions:

1. TECHNIQUE
2. FRETBOARD
3. THEORY
4. RHYTHM
5. CREATIVE
6. TEMPO
7. CONSTRAINT

Each dimension is either:

- applicable, with a Level I–V and internal score 0–100
- not applicable, with level/score null

Do not encode “not applicable” as Level I.

### TECHNIQUE

Motor/execution demand.

Examples:

- picking/fretting control
- articulation
- coordination
- independence
- string-change precision
- physical execution complexity

### FRETBOARD

Navigation and spatial-mapping demand.

Examples:

- position changes
- note-location knowledge
- register choices
- multi-position navigation
- inversion/voicing location
- fret/string traversal

### THEORY

Conceptual/harmonic knowledge demand.

Examples:

- chord construction
- scale/mode application
- functional harmony
- modulation
- voice-leading logic
- theoretical identification

### RHYTHM

Temporal organization demand.

Examples:

- subdivision
- syncopation
- meter
- polyrhythm
- metric modulation
- placement/feel
- rhythmic independence

### CREATIVE

Generative/interpretive decision demand.

Examples:

- improvisation
- composition
- motif development
- phrasing interpretation
- arrangement
- expressive decision-making under constraints

### TEMPO

Speed or time-pressure demand independent from the other musical dimensions.

Examples:

- target BPM
- timed recall
- response window
- sustained pace

Tempo is not automatically applicable merely because a metronome exists.

A slow Quest can still be technically difficult.

### CONSTRAINT

Difficulty added by restrictions and their interaction.

Examples:

- limited strings
- non-adjacent strings
- fret range
- note-count limits
- phrase-length rules
- simultaneous restrictions
- narrow completion tolerances

## 4. Dimensional score

Applicable dimensions may use an internal normalized score from 0–100.

The score supports later calibration and finer comparison.

Rules:

- 0–100 is a modeling range, not an objective percentage of difficulty
- score is null when the dimension is not applicable
- display Level is derived from the score by a versioned mapping
- exact numeric calibration may evolve without changing the seven dimensions
- historical evaluations retain model version

Initial Level bands for contract/interoperability:

- I: 0–19
- II: 20–39
- III: 40–59
- IV: 60–79
- V: 80–100

These are v1 modeling bands and may be recalibrated only through a versioned model change.

## 5. Absolute demand profile

A resolved Quest must be able to carry:

- seven dimensional evaluations
- overall score
- overall Level I–V
- model version
- source
- rationale/basis metadata

Allowed source classes:

- COMPUTED
- CURATED
- HYBRID

Curated values are valid for early content authoring but still require model/version metadata.

## 6. Overall demand

Overall demand summarizes the Quest.

It is not a simple maximum and must not be a simple unweighted average.

The versioned aggregation algorithm must account for:

- primary Skill/Domain emphasis
- multiple simultaneous demands
- severe bottleneck dimensions
- Constraint interaction
- Quest Type

### Required aggregation invariants

- overall demand is derived only from applicable dimensions
- a non-applicable dimension contributes nothing
- increasing a demand parameter while holding everything else constant must not lower the relevant dimension
- increasing target tempo while holding material constant must not lower TEMPO demand
- adding a meaningful restriction must not lower CONSTRAINT demand
- reducing allowed response time must not lower relevant TEMPO/time-pressure demand
- one extreme bottleneck cannot be completely hidden by several trivial dimensions
- model version must make recalculation behavior auditable

Exact dimension weights and bottleneck coefficients are deferred to implementation/calibration, but these invariants are mandatory.

## 7. No inherent Skill difficulty

The same Skill can appear in Quests across multiple demand levels.

Example:

Alternate Picking:

- Level I: open-string eighth notes at a comfortable pace
- Level II: two-string pattern at moderate tempo
- Level III: multi-string scale sequence with synchronization demands
- Level IV: fast non-adjacent string changes
- Level V: highly constrained, fast, rhythmically complex execution

Therefore:

> Skill identity does not own difficulty.

Difficulty emerges from the complete resolved Quest.

## 8. Personal difficulty scale

Personal difficulty uses Levels I–V with player-relative meaning:

- I — Very Comfortable
- II — Comfortable
- III — Target Challenge
- IV — Stretch
- V — Overreach

This Level is not stored as the Quest's absolute difficulty.

It belongs to a player-relative evaluation.

## 9. Personal evaluation status

A personal difficulty evaluation has one status:

### UNKNOWN

The system cannot responsibly assign a personal Level.

Typical case:

- Primary Skill is UNRATED

Result:

- personal Level is null
- uncertainty is HIGH
- recommendation logic should prefer calibration/exploration/conservative training

### PROVISIONAL

The system can estimate personal difficulty, but material uncertainty remains.

Typical cases:

- Primary Skill is ESTIMATED
- important Secondary Skill is UNRATED
- evidence is sparse
- context is unfamiliar

Result:

- personal Level I–V may be present
- UI/recommender must preserve provisional status
- uncertainty is MODERATE or HIGH

### RESOLVED

The system has adequate established Player state for the important capabilities involved.

Result:

- personal Level I–V is present
- uncertainty may still be LOW or MODERATE
- “resolved” does not mean mathematically certain

## 10. Personal difficulty inputs

A personal evaluation may use:

- absolute dimensional demand
- Primary Skill proficiency
- Primary Skill readiness
- Primary Skill confidence
- Secondary Skill proficiency/readiness
- Required Technique proficiency/readiness
- relevant Context exposure
- relevant Constraint exposure
- recent evidence
- model version

Player self-declared experience background may guide conservative onboarding behavior but cannot substitute for Skill proficiency.

XP and Character Level are not personal difficulty inputs.

## 11. Effective capacity

Personal difficulty compares Quest demand to an **effective capacity snapshot**.

Effective capacity is based on demonstrated proficiency plus bounded current-state modifiers.

It is not written back as a new proficiency Level.

### Readiness

Readiness may make a Quest temporarily harder.

Rules:

- LOW readiness may increase personal difficulty
- HIGH readiness does not create proficiency above demonstrated capability
- readiness adjustment must not mutate historical proficiency
- v1 readiness effect is bounded to at most one personal-difficulty band

### Confidence

Confidence changes uncertainty, not capability.

Rules:

- low confidence does not automatically mean low proficiency
- confidence does not directly raise/lower the Quest's absolute demand
- lower confidence should widen uncertainty and may force PROVISIONAL status

### Context novelty

Unfamiliar tuning/style/context may make a Quest temporarily harder.

Rules:

- novelty does not duplicate the Skill
- novelty does not lower Skill proficiency
- v1 context-novelty effect is bounded to at most one personal-difficulty band
- novelty should be represented in rationale/evidence

## 12. Multi-Skill Quests

Personal difficulty must not compare only the Primary Skill while ignoring bottlenecks.

For Quests with Secondary Skills or Required Techniques:

- Primary Skill remains the main capacity anchor
- important supporting Skills may raise personal difficulty
- an UNRATED required capability may force PROVISIONAL status
- a severe supporting-skill mismatch may raise the personal Level
- supporting Skills do not automatically receive equal evidence weight after the Quest

Evidence weighting belongs to EVD/PROG, not DIF-001.

## 13. Unrated players

For Primary Skill = UNRATED:

- personal status = UNKNOWN
- personal Level = null
- the system must not quietly assume Level I
- self-declared experience does not resolve the uncertainty

Training may still generate:

- calibration Quests
- exploratory Quests
- conservative low-demand practice

The absence of a personal Level is valid state.

## 14. Estimated players

For Primary Skill = ESTIMATED:

- personal status is normally PROVISIONAL
- personal Level may be computed
- uncertainty should reflect Player confidence and supporting-state coverage
- recommendations should seek informative evidence as well as useful practice

An estimated Level III Player is not treated identically to an established Level III Player.

## 15. Established but stale players

For established proficiency with LOW readiness:

- proficiency remains unchanged
- personal difficulty may rise
- REFRESH_SKILL purpose may be appropriate
- absolute Quest demand remains unchanged

Example:

A Quest with absolute demand III might evaluate as personal difficulty IV for a Level III player with low readiness.

## 16. Training-zone semantics

DIF-001 defines the meaning of personal difficulty bands but does not lock final recommendation percentages.

Training systems may generally favor:

- II — Comfortable
- III — Target Challenge
- IV — Stretch

Level I may be useful for:

- warm-up
- recovery
- confidence building
- repetition/fluency

Level V should be used deliberately, not as the default adaptive target.

The exact mixture of Comfortable / Target / Stretch / wildcard work belongs to TRN.

## 17. Difficulty versus outcome

A player's actual result does not retroactively rewrite the Quest's historical absolute demand.

Actual performance may later:

- update Player proficiency/readiness
- inform future difficulty calibration
- change future personal evaluations

But the attempted Quest retains the demand model/version used when it was created/evaluated.

## 18. Difficulty versus verification

Verification mode does not change what the Quest asks.

Therefore:

- SELF versus APP_VERIFIED does not alter absolute demand
- verification may alter evidence confidence under EVD/PROG
- difficult-to-verify is not the same as difficult-to-perform

## 19. Difficulty versus rewards

Higher difficulty does not directly define XP or progression magnitude.

PROG-001 may use difficulty as one input, but must still respect:

- effort
- outcome
- evidence quality
- anti-inflation rules

DIF-001 does not assign reward values.

## 20. Personal-evaluation persistence

A personal difficulty evaluation is a snapshot.

It should be able to retain:

- player ID
- Quest ID
- evaluated_at
- model version
- Player-state/evidence version or snapshot identifier
- status
- personal Level
- uncertainty
- relevant dimension gaps/modifiers
- rationale

A later evaluation of the same Quest may differ as the Player develops.

Historical evaluations must not be silently rewritten.

## 21. Phase 0 reference examples

DIF-001 fixtures include:

- absolute profiles covering all seven dimensions
- DORIAN CROSSROADS absolute demand
- unrated-player evaluation
- estimated-player evaluation
- established matched-player evaluation
- stale/low-readiness evaluation
- overqualified-player evaluation
- context-novelty evaluation
- supporting-skill bottleneck evaluation

These fixtures define contract semantics, not the final calibrated recommendation model.

## 22. DORIAN CROSSROADS

The accepted absolute profile for the Phase 0 reference Quest is:

- TECHNIQUE III
- FRETBOARD III
- THEORY II
- RHYTHM III
- CREATIVE not applicable
- TEMPO III
- CONSTRAINT III
- Overall III

The same Quest may evaluate differently per Player:

- UNRATED Hybrid Picking → personal UNKNOWN
- ESTIMATED III / moderate readiness → provisional III
- ESTABLISHED III / high readiness → resolved III
- ESTABLISHED III / low readiness → resolved IV
- ESTABLISHED V / high readiness → resolved II

These examples do not mutate the Quest.

## 23. Required implementation invariants

Future implementation must test:

- seven dimensions always exist in the profile
- non-applicable dimensions use null score/Level
- applicable scores stay in 0–100
- Level matches the versioned score band
- Primary Skill UNRATED never produces RESOLVED personal difficulty
- UNKNOWN personal status has null personal Level
- ESTIMATED Primary Skill does not produce RESOLVED status by default
- readiness/context modifiers do not alter stored proficiency
- readiness modifier is bounded
- context-novelty modifier is bounded
- Character Level/XP are not difficulty inputs
- absolute Quest demand is player-independent
- personal evaluation preserves model version and timestamp

## 24. Deferred decisions

DIF-001 does not finalize:

- calibrated per-Quest-Type weights
- exact bottleneck coefficient
- data-driven score calibration
- recommendation distribution percentages
- outcome-to-calibration learning
- automatic difficulty tuning from population data
- exact modifier score deltas beneath the bounded band rules

These may be implemented/versioned later without changing the core semantic separation established here.

## Acceptance evidence

- seven dimensions defined: PASS
- absolute demand I–V defined: PASS
- internal 0–100 dimension score defined: PASS
- player-relative difficulty I–V defined: PASS
- UNKNOWN / PROVISIONAL / RESOLVED defined: PASS
- UNRATED behavior defined: PASS
- ESTIMATED behavior defined: PASS
- readiness/confidence/context roles separated: PASS
- multi-Skill bottleneck rule defined: PASS
- no inherent Skill difficulty rule defined: PASS
- Quest/result/verification/reward boundaries defined: PASS
- personal-evaluation persistence defined: PASS
- DORIAN CROSSROADS reference profile defined: PASS
- machine-readable fixtures created: PASS

## Terminal disposition

**DIF-001 — COMPLETE**

The Difficulty Model contract is accepted.

Next dependent ticket: **EVD-001 — Completion & Evidence Contract**.
