# PLY-001 — Player & Development State Contract

- Status: Accepted
- Ticket: PLY-001
- Date: 2026-09-27
- Depends on: DATA-001, TAX-001, TAX-002
- Applies to: GuitaRPG v1 player state

## Purpose

Define the durable state that represents a guitarist inside GuitaRPG before Quest, difficulty, evidence, and progression algorithms are implemented.

The Player model must support:

- brand-new players
- experienced players entering with uncertain system knowledge
- optional calibration
- skills with no rating yet
- provisional skill estimates
- established skill proficiency
- reduced readiness after inactivity without erasing historical proficiency
- multiple preferred tunings
- player goals and practice preferences
- Character XP/Level and derived Attributes
- future adaptive recommendations

This contract defines state semantics. It does **not** define the final progression equations; those belong to PROG-001.

## 1. Player identity

The canonical Player identity is the Supabase Auth UUID established by DATA-001.

Rules:

- one authenticated Auth UUID maps to one GuitaRPG Player
- anonymous/guest Auth users use the same Player model as permanent users
- email, username, display name, or OAuth provider identity are not ownership authorities
- guest-to-permanent conversion should preserve the same Player identity whenever the Auth flow permits it
- Player-owned state is private by default

## 2. Player state layers

GuitaRPG separates player state into four semantic layers:

### A. Player-authored profile and preferences

Examples:

- display name
- locale/timezone
- declared experience background
- goals
- preferred tunings
- default tuning
- guitar/setup metadata
- typical session duration
- challenge/intensity preference
- onboarding/calibration choices

The owner may edit these fields.

### B. Skill development state

System-maintained state for each canonical Skill:

- assessment status
- visible Level
- internal proficiency estimate
- confidence
- readiness
- exposure
- recency
- evidence counts

The player may view this state but may not directly overwrite authoritative progression values.

### C. Character progression state

System-maintained aggregate state:

- Practice XP
- Character Level
- total recorded practice time
- Character Attributes
- milestone state

### D. Historical evidence

Sessions, Quest outcomes, verification evidence, and other source records used to justify/recompute derived Skill/Character state.

Historical evidence is not replaced by mutable aggregate totals.

## 3. Experience background

Onboarding may record a broad, self-declared experience background:

- NEW_TO_GUITAR
- SOME_EXPERIENCE
- EXPERIENCED
- UNSPECIFIED

This field is recommendation/calibration context only.

It must **not**:

- directly assign Skill Level
- create high-confidence proficiency
- award XP
- establish mastery
- bypass calibration/evidence

An experienced player may begin with all Skills UNRATED if calibration is skipped.

## 4. Onboarding and calibration state

The Player model must support these independent concepts:

### Onboarding state

- NOT_STARTED
- IN_PROGRESS
- COMPLETE

### Calibration state

- NOT_STARTED
- IN_PROGRESS
- COMPLETE
- SKIPPED

Calibration is optional.

Calibration may create **ESTIMATED** Skill states, but calibration does not automatically create high-confidence established mastery.

The calibration algorithm and diagnostic Quest design belong to ONB/PROG work.

## 5. Skill assessment status

Every Player × Skill state has one assessment status:

### UNRATED

The system does not have enough evidence to display a meaningful proficiency Level.

Rules:

- visible Level is null
- internal proficiency score is null
- readiness is UNKNOWN
- confidence is effectively zero or absent
- exposure may be greater than zero

Important:

> UNRATED does not necessarily mean “never practiced.”

A player may complete exploratory or low-information sessions without producing enough evidence to rate the Skill.

### ESTIMATED

The system has a provisional proficiency estimate but confidence is not yet sufficient to treat it as established.

Typical sources:

- diagnostic calibration
- sparse recent evidence
- inferred placement from related Skills where explicitly permitted later

Rules:

- visible Level is I–V
- UI must qualify the Level as estimated, e.g. “Estimated II”
- proficiency score is present
- confidence remains below the threshold for ESTABLISHED
- readiness may be known or unknown depending on recency/evidence

### ESTABLISHED

The system has sufficient evidence/confidence under the active progression model to present the Skill Level without an “Estimated” qualifier.

Rules:

- visible Level is I–V
- proficiency score is present
- confidence satisfies the active establishment rule
- proficiency may later rise or fall because of performance evidence
- inactivity alone does not reduce established proficiency

Exact thresholds and transition rules are deferred to PROG-001.

## 6. Skill Level

The user-facing Skill Level scale is:

- I — Foundation
- II — Developing
- III — Functional
- IV — Advanced
- V — Mastery within the GuitaRPG model

“Mastery” means the top proficiency band inside GuitaRPG’s evidence model, not universal or absolute mastery of guitar.

Rules:

- Skill Level belongs to Player × Skill state
- canonical Skills themselves are level-neutral
- Quest demand uses a separate I–V scale
- XP alone cannot change Skill Level
- one successful Quest does not normally establish high-confidence Level V
- Concepts, Contexts, Constraints, Tags, and Attributes do not receive this direct proficiency Level

## 7. Internal proficiency score

A rated Skill may maintain an internal continuous proficiency score on a normalized **0–100** scale.

Rules:

- UNRATED → proficiency score is null
- ESTIMATED/ESTABLISHED → proficiency score is 0–100
- the score supports smooth evidence accumulation and Level transitions
- exact I–V threshold boundaries are defined by PROG-001
- the numeric score need not be displayed directly to the user
- score changes are server/system-authoritative

The 0–100 range is a storage/modeling convention, not a claim of objective percentage competence.

## 8. Confidence

Confidence represents **how certain GuitaRPG is about its proficiency estimate**.

It is not:

- the player’s emotional self-confidence
- a motivational rating
- a Quest difficulty rating

The model may maintain a normalized 0–100 confidence score.

Confidence may depend later on:

- quantity of evidence
- verification quality
- recency
- consistency
- contextual variety

Rules:

- UNRATED confidence is 0 or functionally absent
- calibration may create a low/moderate-confidence ESTIMATED state
- repeated evidence may move ESTIMATED → ESTABLISHED
- high confidence does not imply high proficiency; GuitaRPG can be highly confident a player is Level I

Exact confidence math belongs to PROG-001.

## 9. Readiness

Readiness represents recent preparedness to perform the Skill near the player’s demonstrated proficiency.

Readiness is separate from historical proficiency.

Canonical readiness states:

- UNKNOWN
- LOW
- MODERATE
- HIGH

The model may also retain an internal normalized 0–100 readiness score.

Rules:

- UNRATED → readiness is UNKNOWN
- inactivity may reduce readiness without lowering proficiency
- refresh/recent successful practice may restore readiness
- repeated poor performance may eventually affect proficiency through evidence, but recency decay alone does not
- readiness is recommendation input, not permanent achievement

Example:

> Sweep Picking — Proficiency III, Readiness LOW, last practiced 61 days ago

This should lead toward a refresh Quest rather than erasing Level III.

## 10. Exposure

Exposure tracks how much meaningful contact a player has had with a Skill.

Exposure is not proficiency.

Useful durable measures include:

- Quest/session encounter count
- practice time involving the Skill
- evidence count
- distinct Context count
- last practiced timestamp

Exposure can increase when:

- the player attempts a Quest
- the player explores a Skill without clearing it
- the activity is legitimate practice but weak proficiency evidence

Therefore:

> more exposure ≠ higher proficiency

A scalar exposure score may be derived later, but source counts/history should remain available.

## 11. Minimum Player × Skill state

A persistent Skill state must be able to represent at least:

- player_id
- skill_id
- assessment_status
- visible_level (nullable)
- proficiency_score (nullable)
- confidence_score
- readiness_status
- readiness_score (nullable)
- exposure_count
- evidence_count
- last_practiced_at (nullable)
- last_evidence_at (nullable)
- model/version metadata
- updated_at

Exact SQL names are deferred to schema implementation.

## 12. Recency and staleness

Staleness is not a separate Skill Level.

The state model supports stale Skills using:

- last_practiced_at
- last_evidence_at
- readiness
- confidence where appropriate

Inactivity behavior:

- proficiency remains historically demonstrated unless later evidence changes it
- readiness may decline
- confidence may decline if the active progression model decides old evidence is less predictive
- historical evidence remains preserved
- recommendation logic may create Refresh recommendations

No visible proficiency downgrade may happen solely because a clock elapsed.

## 13. Multiple tunings

A Player may prefer multiple tunings.

The model must support:

- zero or more preferred Tuning Contexts
- one optional default tuning
- preference/rank/order
- future per-guitar/setup tuning association

Examples:

- Standard
- DADGAD
- Drop D

Rules:

- changing default tuning does not rewrite historical sessions
- a Skill is not duplicated per tuning
- DADGAD remains Context, not a separate Skill
- evidence records may retain the tuning Context used so recommendation/difficulty systems can later reason about contextual variety
- a player can be generally rated in a Skill while having less evidence in a particular tuning

V1 may begin with canonical tuning Contexts only. Custom tuning authoring may be added later.

## 14. Guitar/setup state

The Player model must support minimal guitar/setup metadata without turning v1 into gear inventory software.

A setup may include:

- setup_id
- player_id
- user label
- broad guitar type (electric/acoustic/classical/other guitar)
- string count
- associated/default tuning Context
- default flag
- optional future capability metadata

Rules:

- setup metadata is player-authored
- setup does not itself determine proficiency
- gear brand/model/serial number is not required for v1
- Quest compatibility may later use string count/tuning/setup capabilities

## 15. Goals

A Player may maintain one or more active practice goals.

A goal must be able to reference, when relevant:

- a Domain
- a Skill
- a broader practice objective
- priority/order
- active/inactive status

Examples:

- improve Alternate Picking
- strengthen Fretboard navigation
- improve rhythm consistency
- develop improvisation
- practice in DADGAD more often

Exact goal taxonomy and goal-completion logic are deferred.

Goals influence recommendation priority but do not directly award progression.

## 16. Practice preferences

The Player model must support at least:

- preferred/typical session duration
- challenge/intensity preference
- preferred/default tuning
- optional metronome/tempo preferences later
- onboarding/calibration choices

Challenge preference values:

- RELAXED
- BALANCED
- CHALLENGE
- PUSH_ME

These values describe how aggressively the recommendation engine should target the player’s training zone.

The exact percentage mix of comfortable/appropriate/stretch/wildcard Quests is intentionally deferred to TRN/PROG work.

## 17. Timezone and locale

Player profile may store:

- IANA timezone
- locale/language preference

These fields are presentation/scheduling context only.

They must not be used as authorization identity.

Durable event timestamps remain UTC-compatible `timestamptz` under DATA-001.

## 18. Character XP

Practice XP represents cumulative engagement/effort within GuitaRPG.

Rules:

- XP is system-authoritative
- direct browser writes are prohibited
- XP is backed by ledger/evidence history
- legitimate unsuccessful/partial practice may still earn XP
- XP never determines Skill proficiency
- XP normally does not decrease

The exact XP award formula belongs to PROG-001.

## 19. Character Level

Character Level is derived from cumulative Practice XP.

Rules:

- a new Player begins at Character Level 1
- Character Level is not an objective guitarist rating
- Character Level does not grant Skill proficiency
- Character Level is an engagement/progression identity inside GuitaRPG
- exact XP thresholds are deferred to PROG-001

UI should avoid language implying that Character Level is equivalent to real-world overall guitar competence.

## 20. Total practice time

Total recorded practice time is system-derived from valid session history.

Rules:

- player cannot directly overwrite the total
- the aggregate should be recomputable from source sessions
- historical imported practice, if ever supported, must be explicitly marked rather than silently mixed with verified in-app session time

## 21. Character Attributes

The canonical Attributes are inherited from TAX-001.

### Physical

- Dexterity
- Precision
- Coordination
- Control
- Endurance

### Musical

- Fretboard
- Rhythm
- Theory
- Ear
- Creativity
- Expression

Each Player × Attribute state must support:

- assessment/status state
- nullable internal score
- updated_at
- model/version metadata

New players should not be displayed as “0% good” at every Attribute merely because no evidence exists.

Attribute state therefore supports:

- UNASSESSED
- ESTIMATED
- ESTABLISHED

Rules:

- Attributes are system-derived from Skill development
- players cannot manually set Attribute scores
- Skill-to-Attribute influence comes from TAX relationships plus PROG weights
- Attributes change more slowly than individual Skills
- Attribute values do not replace Skill-specific proficiency

Exact scoring/thresholds belong to PROG-001.

## 22. Milestones

Milestones are meaningful progression events, not the primary progression currency.

Examples:

- first Cleared Quest
- first Level III Skill
- 10 hours recorded practice
- first creative artifact
- breadth milestone across Domains

Milestone definitions are system-owned.

Player milestone state should be derived or issued by trusted logic and should preserve awarded-at time.

A large achievement/badge system is not required for v1.

## 23. User reflection versus system confidence

Do not conflate these separate concepts:

### User reflection
Examples:

- Too Easy
- Good Challenge
- Too Hard
- self-reported confidence
- notes

This is player-authored session evidence/input.

### System confidence
The model’s certainty in its Skill estimate.

Player reflection may inform the progression model later, but it does not directly overwrite system confidence/proficiency.

## 24. State authority matrix

| State | Owner may edit directly? | System derived? |
|---|---:|---:|
| display/profile preferences | yes | no |
| experience background | yes | no |
| goals | yes | no |
| tuning preferences | yes | no |
| guitar/setup metadata | yes | no |
| challenge preference | yes | no |
| Skill proficiency | no | yes |
| Skill confidence | no | yes |
| Skill readiness | no | yes |
| Skill exposure aggregates | no | yes |
| Practice XP | no | yes |
| Character Level | no | yes |
| Attribute scores | no | yes |
| total practice time | no | yes |
| milestones | no | yes |
| session reflection/notes | yes | source evidence |

This matrix is subordinate to DATA-001 security requirements.

## 25. Required representative states

Implementation/contract tests must be able to represent:

### New player

- Character Level 1
- XP 0
- no proficiency assigned
- Skills UNRATED
- Attributes UNASSESSED
- optional default tuning/preferences

### Experienced but uncalibrated player

- experience background = EXPERIENCED
- Skills may still be UNRATED
- recommendations can begin conservatively
- no automatic proficiency grant

### Calibrated experienced player

- one or more Skills may be ESTIMATED I–V
- confidence remains provisional
- UI marks estimated Levels clearly

### Stale established player

- established Skill Level remains intact
- last practiced is old
- readiness may be LOW
- refresh recommendation is possible

### Uncertain player

- sparse/conflicting evidence
- Level may be ESTIMATED
- confidence is low
- system should seek informative practice rather than pretend certainty

### Multi-tuning player

- multiple preferred tuning Contexts
- one optional default
- one base Skill state per canonical Skill
- evidence retains tuning context instead of duplicating Skills

## 26. Prohibited state shortcuts

The implementation must not:

- create Level I rows for every Skill merely because the player is new
- convert self-declared experience directly into established proficiency
- use XP as proficiency evidence
- lower proficiency solely because of elapsed time
- duplicate Skills by tuning
- attach proficiency directly to Concepts/Contexts/Constraints
- allow browser clients to directly set derived progression values
- overwrite historical evidence when aggregate state changes
- use null/zero interchangeably where “unknown” and “zero” mean different things

## 27. Versioning

Derived Player state depends on algorithms that will evolve.

System-derived state should carry enough version metadata to identify which model/rule set produced it.

At minimum, schema/implementation must support versioning for:

- Skill assessment/proficiency model
- readiness model
- Attribute model
- Character progression model

This allows later recalculation/migration without pretending older derived values were produced under the current model.

## 28. Relationship to later tickets

### QST-001

Quest state references Player Skill state for personalization but must not mutate it directly.

### DIF-001

Personal difficulty compares Quest demand to Player proficiency/readiness; Quest difficulty and Player Level remain separate.

### EVD-001

Completion/evidence records feed Player development state.

### PROG-001

Defines formulas/transitions for XP, proficiency, confidence, readiness, Attributes, and Character Level.

### TRN

Consumes Player goals, proficiency, confidence, readiness, exposure, recency, and taxonomy relationships to recommend training.

### ONB

Defines onboarding/calibration UX using the states defined here.

## Acceptance evidence

- canonical Player identity boundary defined: PASS
- player-authored vs system-derived state separated: PASS
- new player state defined: PASS
- experienced uncalibrated state defined: PASS
- optional calibration state defined: PASS
- UNRATED semantics defined: PASS
- ESTIMATED/ESTABLISHED states defined: PASS
- visible Skill Levels I–V defined: PASS
- proficiency/confidence/readiness/exposure separated: PASS
- inactivity/readiness behavior defined: PASS
- multiple tuning support defined: PASS
- Character XP/Level semantics defined: PASS
- Attribute state defined: PASS
- goals/preferences/setup defined: PASS
- authority/security matrix defined: PASS
- model versioning requirement defined: PASS

## Terminal disposition

**PLY-001 — COMPLETE**

The Player and Development State contract is accepted.

Next dependent ticket: **QST-001 — Canonical Quest Contract**.
