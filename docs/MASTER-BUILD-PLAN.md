# GuitaRPG Master Build Plan

**Plan version:** 1.0  
**Project:** GuitaRPG  
**Status:** ACTIVE  
**Current phase:** Phase 1 — Product Foundation  
**Production-development branch:** `v1-production`  
**Legacy branch:** `main` — preserve until an explicit production cutover ticket passes

---

## 1. Purpose

This document is the shared operating plan for GuitaRPG across ChatGPT Chat, Codex, local development, and repository-based execution.

It answers five questions:

1. What are we building?
2. What authority controls implementation?
3. What must be built before what?
4. What evidence makes a ticket or phase complete?
5. How do Chat and Codex hand work back and forth without losing state or silently changing scope?

The Master Build Plan is an operational authority. It does **not** replace accepted architecture/domain contracts. It organizes implementation against them.

---

## 2. Product objective

> **A guitar practice RPG that turns musical development into generated quests.**

Primary loop:

**Build Character → Generate Quest → Practice → Record Result → Earn Progress → Identify Weaknesses → Generate Better Quest**

Condensed loop:

**Generate → Practice → Complete → Progress → Adapt → Generate**

### v1 promise

GuitaRPG v1 helps a guitarist:

- establish a Player profile and starting development state
- generate a structured practice Quest
- understand exactly what the Quest asks
- run a practice Session
- record a Result and reflection
- earn engagement progress without confusing XP with ability
- build Skill evidence over time
- see Character / Skill development
- receive a more useful next training recommendation
- use the product comfortably on desktop and mobile

### Launch-ready definition

A new user can:

1. enter the app
2. create or continue a Player identity
3. complete onboarding/calibration
4. receive or generate a coherent Quest
5. practice with the Session tools
6. complete or partially complete the Quest
7. see the Result reflected in History and development state
8. understand why the next recommended training item exists
9. repeat the loop without manual repair by an administrator

The core loop must work on both desktop and mobile.

---

## 3. Product principles

### 3.1 One actionable button remains sacred

The original challenge generator's strongest property is immediacy.

GuitaRPG may become deeper, but the product must preserve:

> **Press one button → receive something useful to practice.**

RPG systems organize and motivate the practice. They must not bury it.

### 3.2 Guitar development is the system of record

Character Level, XP, Attributes, badges, and visual progression are interpretations of practice/development evidence.

They are not substitutes for musical truth.

### 3.3 Evidence beats self-declared mastery

Self-report may be valid evidence where the Quest permits it, but:

- experience does not directly grant proficiency
- XP does not determine proficiency
- one clear Result does not establish mastery
- missing evidence is not zero ability
- confidence means system certainty, not player emotion

### 3.4 Mobile is an equal product surface

The core loop may not require:

- hover
- desktop-only controls
- USB audio hardware
- large-screen-only layouts

### 3.5 Audio assistance is optional

Microphone/direct-input analysis may strengthen evidence, but the core product must remain usable without it.

Raw practice audio is not stored by default.

---

## 4. Authority hierarchy

When two instructions conflict, use this order:

1. **Security / platform / legal constraints**
2. **Accepted ADRs and Phase 0 architecture/domain contracts**
3. **Passed phase gates**
4. **This Master Build Plan**
5. **The active ticket**
6. **Remediation ticket attached to the active ticket**
7. **Implementation details / local choices**

A lower layer may make a more specific choice only when it does not contradict a higher authority.

### Contract changes

An implementation ticket may **not** silently redefine an accepted contract.

If implementation reveals that a contract is wrong or incomplete:

1. stop the affected semantic change
2. record the conflict
3. create a remediation ticket or ADR amendment
4. validate the amendment
5. resume implementation against the new authority

---

## 5. Current execution state

**Phase:** Phase 1 — Product Foundation  
**Last terminal implementation ticket:** `TAX-003-R1 — Canonical Tuning Context Remediation`
**Active ticket:** `PLY-002 — Player Profile & Development Persistence` — BLOCKED on its staging migration evidence
**DATA-002 disposition:** COMPLETE  
**TAX-003 disposition:** COMPLETE  
**Supabase staging project ref:** `vwvuaasgczsmeskhjrsb`  
**Vercel public Supabase environment variables:** configured and redeployed  
**Remote migrations:** DATA-002 `20260928000000`, TAX-003 `20260928010000`, and TAX-003-R1 `20260928015000` applied and verified
**Next planned ticket after PLY-002:** `ONB-001 — Onboarding & Calibration Foundation`  
**Production cutover:** NOT AUTHORIZED  
**Legacy `main`:** preserve

The machine-readable companion is:

`docs/project-state.json`

At the start of a Chat or Codex execution session, inspect the repository/branch directly. Do not assume a commit SHA written in chat is still current.

---

## 6. Branch and repository rules

### `main`

Purpose:

- legacy static GitHub Pages application
- current safety fallback until explicit cutover

Rules:

- do not merge `v1-production` into `main` without a cutover ticket
- do not disable GitHub Pages as an incidental implementation step
- do not change the default branch as an incidental implementation step

### `v1-production`

Purpose:

- production application development
- current implementation authority

Rules:

- normal Phase 1+ implementation lands here unless a ticket explicitly uses a short-lived feature/remediation branch
- every ticket must leave the branch in a testable state
- no ticket is COMPLETE while required CI is failing

### Working-tree safety

Before local/Codex writes:

1. inspect branch
2. inspect `git status`
3. pull/fetch as appropriate
4. identify unexpected local changes
5. do not overwrite or discard user work merely to obtain a clean tree

If unrelated dirty state cannot be understood safely, stop and report it.

---

## 7. Phase map

### Phase 0 — Architecture & Contracts — COMPLETE

Purpose:

Establish the production architecture and semantic contracts before building product behavior.

Terminal gate:

`P0-GATE-001 — COMPLETE / PASS`

Completed authority includes:

- FND-001 — Production Architecture Decision
- FND-002 — Production Application Scaffold
- DATA-001 — Persistence, Identity & Security Contract
- TAX-001 — Canonical Musical Taxonomy Contract
- TAX-002 — Legacy Generator Normalization
- PLY-001 — Player & Development State Contract
- QST-001 — Canonical Quest Contract
- DIF-001 — Difficulty Model Contract
- EVD-001 — Completion & Evidence Contract
- PROG-001 — Progression Contract
- UX-001 — Hybrid Design-System Contract
- REL-001 — Contract Test & Fixture Framework

### Phase 1 — Product Foundation — IN PROGRESS

Purpose:

Turn Phase 0 contracts into the durable application substrate needed by the core Quest loop.

Known ticket sequence:

1. `UX-002 — Application Shell & Navigation` — COMPLETE
2. `DATA-002 — Supabase Runtime & Migration Foundation` — COMPLETE
3. `TAX-003 — Canonical Taxonomy Seed Implementation` — COMPLETE
4. `PLY-002 — Player Profile & Development Persistence`
5. `ONB-001 — Onboarding & Calibration Foundation`
6. `P1-GATE-001 — Product Foundation Integration Gate`

Dependency shape:

`DATA-002 → TAX-003`

`DATA-002 → PLY-002`

`TAX-003 + PLY-002 → ONB-001`

`UX-002 + DATA-002 + TAX-003 + PLY-002 + ONB-001 → P1-GATE-001`

Phase 1 exit criteria:

- production shell is functional
- Supabase runtime/migrations are reproducible
- canonical taxonomy exists in the database
- Player state persists under tested ownership/RLS
- onboarding creates a valid Player starting state
- anonymous/permanent identity boundaries are respected
- Phase 0 regression contracts remain green
- production build succeeds
- required staging evidence exists

### Phase 2 — Core Quest Loop — PLANNED

Purpose:

Deliver the first complete Generate → Practice → Complete loop.

Expected work:

- `QST-002` — Quest runtime/schema implementation
- `DIF-002` — absolute Quest-demand evaluator
- `DIF-003` — Player-relative difficulty resolver
- `QST-003` — Quick/Custom Quest generator v1
- `SES-001` — Practice Session runtime
- `SES-002` — core practice controls: timer/metronome/rep/reference state
- `EVD-002` — Result/completion/reflection workflow
- `HIST-001` — persisted Quest/Session/Result history
- `REL-002` — core-loop integration tests
- `P2-GATE-001` — Core Quest Loop integration gate

This ticket list is a planning skeleton, not implementation authority yet. Exact boundaries may be refined before Phase 2 begins.

Phase 2 exit criterion:

A Player can generate a valid Quest, practice it, complete/partially complete it, persist the Result, and find it in History.

### Phase 3 — Progression — PLANNED

Purpose:

Turn historical practice/evidence into trustworthy development state.

Expected work:

- `PROG-002` — Practice XP ledger + Character Level derivation
- `PROG-003` — Skill evidence/proficiency/confidence implementation
- `PROG-004` — readiness/recency implementation
- `PROG-005` — Character Attribute derivation
- Character / Skills progression views
- correction/recomputation paths
- `REL-003` — progression integration/recomputation tests
- `P3-GATE-001`

Phase 3 exit criterion:

Results can update XP and development evidence deterministically without conflating engagement, proficiency, confidence, readiness, or Attributes.

### Phase 4 — Adaptive GuitaRPG — PLANNED

Purpose:

Use Player development state to generate better next work.

Expected work:

- `TRN-001` — recommendation candidate generation
- `TRN-002` — recommendation scoring/ranking
- `TRN-003` — Training surface integration
- adaptive challenge preference integration
- weakness / refresh / novelty balancing
- recommendation-explanation evidence
- Daily / Recommended Training foundation where appropriate
- `REL-004`
- `P4-GATE-001`

Phase 4 exit criterion:

The system can select and explain a useful next Quest based on actual Player state and recent evidence.

### Phase 5 — Learning & Practice Tooling — PLANNED

Purpose:

Deepen the practice/learning environment without destabilizing the core loop.

Expected work may include:

- `CODEX-001+` — taxonomy-backed Codex/reference system
- fretboard / interval / chord / scale visualizations
- richer Quest reference material
- `AUD-001+` — optional microphone/direct-input infrastructure
- client-side pitch/onset/tempo assistance where reliable
- saved creative work/reference
- deeper History/analytics
- Campaign foundation if it remains in scope for v1.5
- `REL-005`
- `P5-GATE-001`

Audio analysis must remain evidence-scoped and must not claim capabilities it cannot observe, such as physical fingering/pick direction from ambiguous audio.

### Phase 6 — Hardening & Launch — PLANNED

Purpose:

Prove production readiness and perform an explicit cutover.

Expected work:

- complete end-to-end core-loop tests
- RLS/security regression suite
- account deletion tests
- export readiness
- accessibility audit
- mobile/responsive audit
- performance and error-state hardening
- observability that does not capture unnecessary private practice content
- migration/recovery/backup review
- production environment verification
- launch checklist
- cutover / rollback plan
- `P6-GATE-001`
- explicit production cutover ticket

No legacy-site replacement occurs before the cutover ticket passes.

---

## 8. Workstream map

| ID | Workstream | Owns |
| --- | --- | --- |
| FND | Foundation | architecture, framework/tooling, application substrate |
| UX | Product UX | app shell, navigation, design-system implementation, interaction patterns |
| DATA | Persistence & Security | Supabase runtime, migrations, RLS/grants, identity boundaries |
| TAX | Taxonomy | Domains, Skills, Concepts, Contexts, Constraints, Attributes, relationships |
| PLY | Player | profile, preferences, development state, player-owned persistence |
| QST | Quest | Quest schema/runtime, generators, revision semantics |
| DIF | Difficulty | absolute demand and Player-relative difficulty |
| SES | Practice Session | active practice runtime/tools/state |
| EVD | Evidence & Results | completion, criteria, evidence, verification, reflection |
| PROG | Progression | XP, Character Level, proficiency, confidence, readiness, Attributes |
| TRN | Training | adaptive recommendations and next-Quest selection |
| HIST | History | auditable practice/result/progression history |
| CODEX | Learning | reference/educational content tied to canonical taxonomy |
| AUD | Audio | optional microphone/direct-input analysis infrastructure |
| ONB | Onboarding | first-run setup and calibration entry |
| REL | Reliability | integration, regression, E2E, release gates |

A workstream does not gain authority to change another workstream's accepted semantics merely because implementation touches both.

---

## 9. Ticket lifecycle

Allowed terminal dispositions:

- **COMPLETE** — acceptance evidence exists and required validation passes
- **BLOCKED** — progress cannot continue without a concrete unmet dependency
- **NOT RECOVERABLE / SUPERSEDED** — only when explicitly documented and appropriate

Non-terminal states may include:

- PLANNED
- READY
- IN PROGRESS
- VALIDATING
- AWAITING EXTERNAL EVIDENCE

### COMPLETE means

A ticket is COMPLETE only when:

1. objective is satisfied
2. scope/non-goals were respected
3. required artifacts exist
4. tests/evidence exist
5. required CI is terminal success
6. external acceptance evidence exists where required
7. ticket record reflects the actual terminal state

"Code written" is not COMPLETE.

### Remediation tickets

Use:

`<PARENT>-R1`, `<PARENT>-R2`, etc.

Examples:

- `DATA-002-R1`
- `QST-003-R1`

A remediation must state:

- defect
- affected authority
- repair scope
- evidence required
- whether parent completion is revoked or merely pending

---

## 10. Standard ticket contract

Every implementation ticket should contain:

### Identity

- Ticket ID
- phase
- dependencies
- authority

### Objective

One explicit outcome.

### Scope

What the ticket may change.

### Non-goals

What it must not build or redefine.

### Inputs / authority

Relevant ADRs, contracts, fixtures, migrations, existing implementation.

### Implementation requirements

Concrete requirements without prescribing irrelevant internal details.

### Acceptance criteria

Observable pass/fail conditions.

### Validation

Required:

- format
- lint
- strict typecheck
- relevant unit/contract tests
- production build

Add as applicable:

- DB/RLS tests
- E2E/Playwright
- accessibility
- migration dry-run/push
- deployment evidence
- deletion/recomputation evidence

### Evidence

Record:

- validating commit
- CI run ID
- migration receipt/history where relevant
- staging/deployment evidence
- known informational warnings

### Terminal disposition

Explicit COMPLETE / BLOCKED / other approved disposition.

### Next authorized ticket

Name it when dependency order is known.

---

## 11. No-open-ended-work protocol

Chat and Codex must execute **one authorized ticket or remediation at a time**.

An execution session may:

- inspect all dependencies needed to understand the active ticket
- make all changes required to finish that ticket
- repair defects discovered inside that ticket's scope
- run validation
- update ticket evidence

It may **not** automatically begin the next ticket after completion unless the user has authorized continuing to that next ticket.

Examples:

Allowed:

- DATA-002 migration fails because a baseline SQL privilege statement is invalid → repair DATA-002 and retest.

Not allowed:

- DATA-002 completes → immediately create taxonomy tables for TAX-003 without authorization.

If adjacent work is discovered:

- record it
- assign/defer it
- do not smuggle it into the active ticket

---

## 12. Chat ↔ Codex operating model

### Chat is best used for

- product/architecture reasoning
- contract interpretation
- ticket definition
- cross-workstream dependency analysis
- scope decisions
- acceptance review
- resolving contradictions
- deciding whether a remediation/ADR is required
- sequencing the next authorized ticket

Chat may also perform GitHub-native repository work when appropriate.

### Codex is best used for

- local repository inspection
- terminal commands
- package/tool installation
- local migrations
- Supabase CLI operations
- implementation/refactoring
- test/debug loops
- Git operations
- tasks requiring the user's local machine/files

### User-only / user-controlled boundaries

The user should directly handle or explicitly approve:

- passwords
- access tokens
- secret keys
- browser login/SSO
- MFA
- billing/paid-resource creation
- destructive external operations when confirmation is appropriate
- other credential prompts

Secrets must not be pasted into tickets, commits, logs, or chat merely to make automation easier.

---

## 13. Codex session startup protocol

At the beginning of a Codex session:

1. read `AGENTS.md`
2. read this Master Build Plan
3. read `docs/project-state.json`
4. read the active ticket
5. read the contracts/ADRs referenced by that ticket
6. inspect current branch
7. inspect `git status`
8. inspect current HEAD and recent ticket-related commits
9. do not assume chat-reported state is newer than the repository
10. begin only the authorized ticket/remediation

If repository state contradicts the Master Build Plan, report the conflict before making semantic changes.

---

## 14. Handoff protocol

A handoff between Chat and Codex should contain this information:

```text
PROJECT: GuitaRPG
PHASE:
ACTIVE TICKET:
BRANCH:
CURRENT DISPOSITION:

OBJECTIVE:
<single ticket objective>

AUTHORITY:
<relevant ADRs/contracts/master-plan sections>

COMPLETED:
- ...

EVIDENCE:
- commit:
- CI:
- migration/deployment evidence:

REMAINING:
- ...

BLOCKERS:
- ...

DO NOT CHANGE:
- ...

USER-ONLY ACTIONS:
- ...

NEXT AUTHORIZED ACTION:
- ...

TERMINAL CONDITION:
<what makes this ticket COMPLETE>
```

The handoff should preserve facts/evidence, not hidden reasoning.

---

## 15. Validation and evidence policy

### Repository CI

Normal ticket validation should include:

- dependency install
- formatting
- lint
- strict TypeScript typecheck
- tests
- Next.js production build

### Database tickets

Database tickets additionally require, as applicable:

- source-controlled migrations
- dry-run evidence before remote push
- remote migration-history verification
- RLS/grant tests
- owner/non-owner/unauthenticated tests
- derived-authoritative mutation denial
- deletion/cascade evidence

### UI tickets

UI tickets additionally require, as applicable:

- keyboard/focus behavior
- mobile layout
- non-color state cues
- reduced-motion behavior
- semantic labels
- E2E path coverage once behavior is interactive

### No fabricated evidence

Never mark an external migration/deployment/test as PASS because it "should" work.

If it was not observed, it is not evidence.

---

## 16. Security invariants

These are non-negotiable unless superseded by an explicit accepted security ADR:

- Supabase Auth UUID is canonical Player identity
- ownership is never based on email/display name
- exposed application tables require explicit grants + RLS
- browser code never receives elevated Supabase secrets
- service/elevated access is server-only and exceptional
- Player-derived authoritative values cannot be directly forged by clients
- guest mode uses anonymous Auth rather than a separate local-only data model
- raw practice audio is not uploaded/stored by default
- production schema changes are migration-driven
- account deletion must remove private Player state
- UI restrictions are not treated as security boundaries

---

## 17. Stable cross-contract reference

`DORIAN_CROSSROADS` remains the Phase 0 integration reference.

Canonical identity:

- Quest fixture ID: `QFIX-TECH-001`
- slug: `dorian_crossroads`
- primary Skill: Hybrid Picking
- secondary Skills: Scale Mapping, Syncopation Control
- Context: E tonal center
- target: 90 BPM / 10 minutes
- absolute demand: III
- canonical clear Result: `EVD-FIX-001`
- canonical partial Result: `EVD-FIX-002`
- clear fixture XP under XP_V1: 15 XP

Later implementation should preserve this fixture as a regression anchor unless an explicit contract remediation changes it.

---

## 18. Design-system authority

Visual synthesis:

> **Play like Instrument HUD. Learn like Codex. Measure like Practice Lab.**

Surfaces:

- Instrument HUD — Home, Generate, Training, Quest, Session
- Codex — learning/reference
- Practice Lab — Character, Skills, History, analytics

Core rules:

- color is never the only state signal
- mobile core loop requires no hover
- keyboard focus remains visible
- reduced motion is respected
- minimum touch target is 44 px
- Skills means capability/progress
- Codex means learn/explain
- Character means RPG development identity
- Profile means account/preferences/setup
- Generate means user knows what they want
- Training means system recommends what matters next

---

## 19. v1 scope

### In v1

- Home
- Generate
- Quest
- Practice Session
- completion/reflection
- Character
- Skills
- History/basic analytics
- Player profile
- onboarding/calibration
- accounts/persistence
- metronome/timer/session tools
- taxonomy-backed limited Codex/reference
- adaptive Training/recommendations
- mobile-first/equal core loop
- optional/basic microphone infrastructure only where reliable

### Not required for v1

- full automatic performance grading
- camera-based technique grading
- native mobile apps
- social network
- leaderboards
- teacher/student platform
- marketplace
- elaborate avatars
- huge achievement catalog
- fully polyphonic transcription
- raw-audio cloud storage

### Likely v1.5

- richer audio assistance
- fretboard visualization expansion
- Campaigns
- richer Skill map
- Daily systems
- saved creative work
- deeper analytics

### v2+

- adaptive Campaign systems
- backing-track systems
- teacher/community features
- creator ecosystem
- advanced video/audio coaching
- native applications
- broader AI coaching

---

## 20. Deferred-decision policy

Future uncertainty should be recorded as **DEFERRED**, not guessed.

Examples currently suitable for progressive elaboration:

- exact adaptive recommendation formula
- final Character Level curve
- complete Codex content architecture
- advanced audio-analysis pipeline
- achievement/badge catalog
- Campaign scope/timing
- exact later-phase ticket boundaries

A deferred decision becomes blocking only when an active ticket requires it.

---

## 21. Change-control rule

Before expanding scope, ask:

1. Is this required by the active ticket?
2. Is it required to preserve an accepted contract?
3. Is it a necessary remediation for failing evidence?
4. Can it safely be deferred?

If the answer is "no" to the first three and "yes" to the fourth, defer it.

The goal is not to minimize ambition. The goal is to prevent unrelated ambition from making the critical path unfinishable.

---

## 22. Critical path

Current high-level critical path:

**FOUNDATION → PERSISTENCE → TAXONOMY → PLAYER → ONBOARDING → QUEST ENGINE → PRACTICE SESSION → RESULT/EVIDENCE → PROGRESSION → TRAINING/RECOMMENDATION → HARDENING → CUTOVER**

The product should not build deep secondary systems ahead of the critical path merely because they are interesting.

---

## 23. Phase-gate rule

A phase is closed only by its integration gate.

Individual ticket completion is necessary but not sufficient.

Each phase gate should verify:

- all prerequisite tickets terminal
- contract compatibility
- regression tests
- build
- external/deployment evidence where applicable
- unresolved deferrals are either non-blocking or explicitly promoted
- next phase is explicitly authorized

Current gate status:

- `P0-GATE-001` — PASS
- `P1-GATE-001` — FUTURE
- later gates — FUTURE

---

## 24. Immediate next execution

TAX-003-R1 is terminal COMPLETE. Its three canonical Tuning Contexts are applied to
staging, and PLY-002 is again the active ticket.

PLY-002 repository/fresh-database validation is complete. Its only remaining acceptance
is applying and verifying `20260928020000_ply_002_player_persistence.sql` on staging.

PLY-002 is the active authorized ticket. Complete only its staging migration acceptance.

Do **not** begin ONB-001.

---

## 25. Definition of project success

GuitaRPG succeeds when the RPG layer creates a durable reason to practice while the underlying system remains musically honest.

The product should make this loop feel obvious:

> **What should I practice? → Why this? → Do it → What happened? → What changed? → What should I practice next?**

Every major system should strengthen that loop.
