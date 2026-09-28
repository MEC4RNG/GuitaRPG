# QST-001 — Canonical Quest Contract

- Status: Accepted
- Ticket: QST-001
- Date: 2026-09-27
- Depends on: TAX-001, TAX-002, PLY-001
- Applies to: GuitaRPG v1 Quest definitions and generated Quest instances

## Purpose

Define the canonical structured Quest object consumed by generation, practice sessions, completion/evidence, difficulty, progression, recommendations, history, and Codex/reference surfaces.

A Quest is a **practice plan**.

A Quest is not:

- the player's attempt
- an outcome record
- proof of completion
- a mastery claim
- a progression mutation
- a reflection record

Those later records reference the Quest.

## 1. Quest identity

Every durable Quest instance must support:

- immutable Quest ID
- stable/local slug where applicable
- human title
- schema version
- Quest Type
- origin/generation metadata

A generated Quest may be player-owned under DATA-001.

System templates/reference fixtures may be canonical global data.

## 2. Quest Types

Canonical v1 Quest Types:

- TECHNIQUE
- PERFORMANCE
- EXPLORATION
- CREATIVE
- KNOWLEDGE

### TECHNIQUE
Primary purpose is deliberate work on an execution capability.

### PERFORMANCE
Primary purpose is sustaining or delivering a defined musical performance condition.

### EXPLORATION
Primary purpose is mapping, discovering, or investigating musical/fretboard material. Exploration can be valuable without producing strong proficiency evidence.

### CREATIVE
Primary purpose is creating, improvising, arranging, interpreting, or composing within constraints.

### KNOWLEDGE
Primary purpose is recall, construction, identification, theory, notation, or other explicit knowledge task.

Quest Type is descriptive. It does not determine verification mode or automatically determine difficulty.

## 3. Purpose

Quest purpose must support:

- primary Domain
- reason
- generation mode

Generation modes may include:

- QUICK
- CUSTOM
- TRAINING
- DAILY
- CALIBRATION
- CAMPAIGN

Purpose reasons may include:

- DEVELOP_SKILL
- REFRESH_SKILL
- EXPLORE
- APPLY_CONCEPT
- CREATE
- ASSESS

The generator/recommender may later add richer recommendation rationale, but the Quest must remain understandable without opaque model output.

## 4. Taxonomy composition

A normal Quest contains:

- exactly 1 Primary Skill
- 0–2 Secondary Skills
- 0–2 Required Technique Skills
- at least 1 relevant Concept
- optional Context
- normally 1–3 Constraints

All Skill references point to canonical TAX-001 Skills.

### Skill roles

- PRIMARY_SKILL
- SECONDARY_SKILL
- REQUIRED_TECHNIQUE

The role is Quest-specific.

It never changes the canonical Skill type.

Example:

Alternate Picking can be a Primary Skill in one Quest and Required Technique in another without creating a second Alternate Picking entity.

### Role uniqueness

The same Skill should normally appear only once inside one Quest's explicit Skill-role set.

If a Skill is the Primary Skill, it should not be repeated as Required Technique merely to emphasize it.

## 5. Concepts

A Quest includes one or more canonical musical Concepts when the Quest uses identifiable musical material.

Examples:

- Dorian
- Major Triad
- Arpeggio
- Syncopation
- 7/8
- Counterpoint

The Concept is not the player's Skill Level.

A Quest using Dorian does not create or require a "Dorian Level."

## 6. Musical Context

Quest Context may include:

- tuning
- tonal center/key
- style
- playing role
- accompaniment/backing environment
- instrument/setup compatibility where needed

Context is optional unless required to interpret the Quest.

Rules:

- maximum one primary style Context in the v1 Quest shape
- tuning is captured as Context, not encoded into Skill identity
- tonal center/key parameters do not create separate Skill records
- changing a Player's default tuning never rewrites historical Quest Context

## 7. Constraints

Constraints are structured restrictions.

A Quest normally contains 1–3 constraints.

Examples:

- string set
- fret range
- non-adjacent strings only
- target tempo
- phrase length
- note-count limit
- time limit

Parameterized Constraints use a canonical Constraint Definition plus parameters.

Examples:

`string_set + { strings: [2,3,4,5] }`

`target_tempo + { bpm: 90 }`

A compound practice idea should be expressed as multiple structured fields rather than minted as one vague taxonomy label.

## 8. Execution

Execution contains operational practice parameters that are not themselves taxonomy identity.

It may contain:

- estimated minutes
- meter
- repetitions
- starting tempo
- target tempo where not represented as a Constraint
- phrase/bar structure
- rest/work pattern
- reference material identifiers

Execution parameters must not contain Player proficiency or derived progression effects.

## 9. Objective

Every Quest requires a machine-readable Objective.

The Objective contains:

- objective kind
- human summary
- clear rule
- one or more structured criteria

### Authority rule

The structured criteria are authoritative.

The human summary is presentation copy derived from or consistent with the structured semantics.

The app must not rely on parsing prose such as:

> "Play this cleanly a few times."

to determine completion.

### Criterion shape

A criterion supports:

- metric
- operator
- value
- unit

Initial operators:

- EQ
- GTE
- LTE

Examples:

- clean_repetitions GTE 8 repetitions
- target_tempo EQ 100 bpm
- practice_duration GTE 600 seconds
- correct_answers GTE 8 answers

QST-001 does not require every criterion to be machine-verifiable. A criterion may be self-reported later under EVD-001.

## 10. Completion Contract

The Quest contains a Completion Contract describing what the Quest asks the player to accomplish.

It does not itself store the outcome.

Minimum fields:

- meaningful-attempt rule
- minimum-attempt threshold where useful
- clear rule
- explicit `mastery_claimed = false`

Core rule:

> Clearing one Quest is evidence; it is not mastery.

Possible session outcomes such as Attempted/Partial/Cleared belong to EVD-001/session records.

## 11. Verification Profile

The Quest declares which verification modes are compatible with its Objective.

Reserved modes:

- SELF
- SESSION
- AUDIO_ASSISTED
- DIRECT_AUDIO
- APP_VERIFIED

QST-001 defines compatibility only.

EVD-001 defines what these modes mean as evidence.

### Core v1 rule

Verification is not required for a Quest to be legitimately attempted or self-reported as cleared.

Therefore:

- lower verification is not treated as illegitimate practice
- verification confidence may affect later evidence confidence
- microphone/direct audio is never required for the core Quest loop
- app-verifiable Knowledge Quests may recommend APP_VERIFIED without making all Knowledge practice dependent on it

## 12. Difficulty container

A Quest reserves a Difficulty Profile containing at least an overall demand Level I–V.

During QST-001 fixtures, demand values are explicitly marked:

`ILLUSTRATIVE_PENDING_DIF_001`

DIF-001 defines:

- dimensional difficulty
- calculation
- personalization relative to Player state
- overall demand semantics

Quest demand is separate from Player Skill Level.

## 13. Rewards container

A Quest reserves a Rewards container but QST-001 does not assign fixed XP.

Until PROG-001:

- reward policy may be referenced symbolically
- fixed XP remains null
- progression mutations are never embedded in the Quest

The eventual progression engine computes/records awards from actual session/evidence records.

## 14. Quest immutability and versioning

A generated Quest is a historical practice plan.

If the player attempts the same generated Quest multiple times:

- the Quest definition remains stable
- each attempt creates a separate session/result
- later taxonomy wording changes do not rewrite historical semantics
- relevant canonical IDs/slugs and parameters are retained
- schema version identifies the Quest contract version

If a Quest is edited into materially different practice requirements, create a new revision/Quest identity rather than rewriting already-attempted history.

## 15. Quest versus template

A Quest Template is reusable system/editorial logic.

A Quest Instance is the concrete playable object after choices and parameters are resolved.

For example:

Template:
- train Scale Mapping using a mode
- choose tonal center
- choose fret range
- choose string constraint

Instance:
- E Dorian
- frets 5–12
- strings 2–5
- 90 BPM

The player practices the resolved Quest Instance.

QST-001 fixtures represent resolved Quest Instances.

## 16. Quest versus session/result

Session/result data is intentionally separate.

The Quest does **not** contain:

- actual start/end time
- actual duration
- actual achieved tempo
- outcome
- verification evidence
- player reflection
- notes
- earned XP
- proficiency changes
- readiness changes
- recommendation adaptation

Those fields belong to SES/EVD/PROG records referencing the Quest.

This prevents a second attempt from overwriting the first attempt's history.

## 17. DORIAN_CROSSROADS reference fixture

`DORIAN CROSSROADS` is the stable Phase 0 reference Quest.

Its structured semantics include:

- Primary Skill: Hybrid Picking
- Secondary Skill: Scale Mapping
- Secondary Skill: Syncopation Control
- Concept: Dorian
- tonal center: E
- strings 2–5
- frets 5–12
- syncopated eighth-note material
- target tempo: 90 BPM
- focused practice duration: 10 minutes
- illustrative overall demand: III

Its Objective is structured and does not depend on parsing the title or description.

## 18. Fixture coverage

Phase 0 includes **24** Quest fixtures:

- 4 Technique-domain primary Quests
- 4 Fretboard-domain primary Quests
- 4 Harmony & Theory primary Quests
- 4 Rhythm primary Quests
- 4 Ear & Musicianship primary Quests
- 4 Creativity & Expression primary Quests

The fixture set covers all five Quest Types.

Fixtures are contract evidence, not the exhaustive v1 content library.

## 19. Generation invariants

The later generator must output Quest objects satisfying this contract.

At minimum:

- exactly one Primary Skill
- no more than two Secondary Skills
- at least one Concept
- one to three normal Constraints
- machine-readable Objective criteria
- compatible verification modes
- no embedded result/progression mutation
- schema version
- primary Domain
- resolved parameter values

Random selection must operate over compatible taxonomy relationships/rules rather than independently drawing unrelated fields.

## 20. Historical integrity

Durable Quest history should retain enough data to understand what the player was asked to do even if:

- taxonomy display names change
- generator rules change
- difficulty algorithms change
- progression algorithms change
- the Quest is no longer generated for new users

Canonical IDs/slugs and the resolved Quest payload provide this historical record.

## 21. Deferred decisions

QST-001 does not finalize:

- difficulty math
- personalized challenge-zone selection
- verification evidence scoring
- outcome semantics
- XP awards
- progression effects
- recommendation adaptation
- final generator compatibility graph
- backing-track/audio asset schema
- user-authored Quest publishing
- campaign sequencing

Those belong to DIF, EVD, PROG, TRN, AUD, and later tickets.

## Acceptance evidence

- Quest identity/versioning defined: PASS
- five Quest Types defined: PASS
- purpose/generation modes defined: PASS
- exactly one Primary Skill rule defined: PASS
- 0–2 Secondary Skills rule defined: PASS
- Required Technique role defined: PASS
- Concept/Context/Constraint composition defined: PASS
- machine-readable Objective defined: PASS
- Completion Contract separated from outcome: PASS
- Verification Profile defined: PASS
- Difficulty/Rewards containers bounded: PASS
- Quest/session/result separation defined: PASS
- DORIAN_CROSSROADS stable reference defined: PASS
- 24 fixtures across all six Domains created: PASS
- all five Quest Types represented: PASS

## Terminal disposition

**QST-001 — COMPLETE**

The canonical Quest contract is accepted.

Next dependent ticket: **DIF-001 — Difficulty Model Contract**.
