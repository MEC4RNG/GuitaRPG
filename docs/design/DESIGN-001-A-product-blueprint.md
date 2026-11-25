# DESIGN-001-A — Sound Uncharted North Star & Product Blueprint

**Revision:** 0.1 | **Disposition:** DRAFT — FOR PRODUCT REVIEW  
**Program:** DESIGN-001 — Product Experience & Visual Identity  
**Design baseline:** JRN-UX-001 draft PR #29, commit 56b67a861bea507a243f321128b331c8bb56ca8e.  
**Scope:** Product definition and design target, not implementation or release authorization.

## 1. North Star

Sound Uncharted is a connected learning, practice and creative workspace for guitarists. It helps a musician understand how music works, discover what to practice next, develop capability through evidence-informed challenges, and turn that knowledge into music of their own.

**Product promise:** Know where you are. Know what to work on next. Understand why it matters. Make music with what you learn.

The experience combines an explorer's sense of discovery, a musician's studio and a personal musical journal. The core advantage is not the number of lessons or tools, but the connection between knowledge, capability, practice and creation.

The original one-action Quick Quest must remain: a player who has ten minutes and simply wants something useful to practice should not need to understand the system architecture first.

### Product boundaries

- Guitar-first, not instrument-agnostic at the cost of guitar-specific quality. Alternate tunings and left-handed accessibility should be accounted for in design; neither is promised at full breadth in the first release.
- Learning and creativity coexist. The product is not a linear course, a tab editor with gamification, or a competitive scoring game.
- Evidence supports development; experience, usage, XP and completed lessons are not interchangeable with demonstrated capability.
- All core musical learning remains usable without microphone input, premium peripherals, imported scores or AI.
- Player-owned musical work remains valuable independently of any Quest. Private by default, export and deletion rights preserved.
- Full professional notation and multitrack composition are target capabilities, not conditions for the first private beta.

## 2. Who we serve

| Player situation | Job to be done | Preferred entry |
| --- | --- | --- |
| New guitarist | Find a manageable starting point and understand the foundations | Guided onboarding / suggested challenge |
| Returning or self-taught guitarist | Identify gaps without restarting material already understood | Calibration, Skill Map and Training |
| Developing player | Turn isolated technique/theory into usable musical fluency | Adaptive Quest / Explore |
| Experienced guitarist | Investigate a specific bottleneck or unfamiliar musical context | Search Codex / custom Quest / focused training |
| Creative musician | Capture ideas, develop compositions and practice them | Workbooks / score workspace |
| Time-limited player | Get useful practice immediately | Quick Quest / resume |

These are overlapping intentions, not fixed skill-tier personas. A strong player may be a beginner in an unfamiliar skill or tuning.

## 3. Product pillars

1. **Discover:** a connected Codex and Skill Map expose prerequisites, related concepts, musical applications and possible next directions.
2. **Develop:** calibration and explainable recommendations select manageable challenges near the player's current abilities; the player can accept, simplify, stretch or choose another direction.
3. **Investigate:** interactive musical tools and guided exercises convert abstract understanding into things the player can hear, recognize and perform.
4. **Create:** Workbooks and future scores capture and develop ideas, without forcing every exploration into an assessed exercise.
5. **Reflect:** sessions record observations and evidence, show what changed or remains uncertain, and recommend the next useful action.

These are five aspects of one experience, not five independent applications.

## 4. Learning philosophy and scientific boundary

Design for active retrieval, incremental difficulty, distributed revisiting, useful feedback, varied application, retention and transfer. These are design hypotheses and research directions to be evaluated in DESIGN-001-B, not claims that the application measures brain structure or has established a universal optimal practice protocol.

The Skill Map visualizes **musical relationships and demonstrated development**, not neurons. Avoid claims that a fixed number of repetitions produces myelination, that a brain scan can be inferred from practice data, or that an engagement score measures neural adaptation.

Use the existing distinct concepts: canonical Skill (level-neutral), demonstrated proficiency, confidence/uncertainty, temporary readiness, absolute Quest demand and player-relative challenge. Show missing evidence as unknown, not inability. Keep suggested practice duration and tempo individualized and revisable; accuracy, ease, timing, retention and transfer may matter more than speed. Offer breaks and reduction in demand when fatigue or persistent errors are reported. No rigid universal proficiency thresholds in this draft.

The future graph can distinguish required prerequisites, recommended foundations, related/transfer relationships and develops-toward links. An educational dependency is not necessarily a software access gate. Readiness for a particular exercise is contextual and can remain provisional.

## 5. Experience architecture

Proposed top-level destinations (labels and grouping to test in DESIGN-001-C):

- **Home:** return, resume, quick practice, current recommendation and recent work.
- **Quests:** discover/generate, build, save, resume and manage journeys.
- **Training:** calibration, targeted recommendations, review/reinforcement and challenge adjustment.
- **Skill Map:** interconnected capabilities, learning paths, evidence and why the next skill matters.
- **Codex:** structured musical knowledge, lessons, applications, glossary and interactive tools.
- **Workbooks:** personal knowledge, ideas, pages, musical scores and a focused editing/reading/practice workspace.
- **History:** completed Sessions, Results, reflections and evidence timeline.
- **Profile / settings:** identity, privacy, preferences, accessibility and data controls.

A persistent resume/practice action should not become another competing destination. Character/XP/Attributes can remain accessible within progress and profile without dominating practice. Navigation labels and consolidation are provisional; retain access to existing surfaces during migration.

### Surface responsibilities

| Surface | The player's question | Primary action | Full-product design target |
| --- | --- | --- | --- |
| Home | Where was I and what now? | Resume or begin useful practice | Active Quest, review prompt, recent Workbook, progress glance |
| Quest discovery | What can I work on? | Select/generate a challenge | Quick, guided/custom, adaptive and future curated paths |
| Quest Map | What am I trying to understand? | Choose an exploration | Objective, success criteria, constraints, relevant skill graph, contextual knowledge |
| Quest Explore | How does this work on guitar? | Try or capture an exercise | Focused lesson, interactive tool, saved notes, related alternatives |
| Quest Craft | What can I make with this? | Develop an idea | Shared Workbook/score editor, relevant toolkit and playback |
| Practice Session | Can I play it? | Start/pause/resume/finish | Timing, metronome, loop, target and optional evidence capture |
| Results/reflection | What happened? | Record an honest result | Criteria, observations, difficulty, evidence and useful follow-up |
| Skill Map | How does this connect? | Inspect or train a skill | Dependency network, alternate routes, readiness and evidence |
| Codex | What does this mean? | Learn/try/apply | Search, structured lessons, examples, tools, related skills and glossary |
| Workbook | Where are my ideas? | Open/create/edit/display | Searchable library, pages, origin, associations, musical blocks, exports |
| Score workspace | How can I develop this music? | Edit or play a score | Rhythmic tab, notation, arrangement, track/voice, guitar articulations |
| History | What have I done? | Review evidence or revisit | Session-first timeline; not a duplicate of Saved Quests |

## 6. One Quest workspace, three revisitable modes

Retain MEC's original semantics: Map = understand; Explore = investigate; Craft = create. A Quest is the organizing intent, not the owner of the player's notes. MEC modes are not mandatory chronological locks, and switching modes does not start practice or award progress.

Proposed common shell: compact Quest identity/objective, mode switch, current focus, contextual reference region, main working canvas, and a deliberate Practice action. Context persists as the main canvas changes. Desktop may reveal a supporting side region; mobile uses one focused surface with accessible sheets and clear Back behavior. Avoid opening multiple adjacent panels as a default.

**Map:** present the challenge and relevant ingredients; expose learning choices with concise explanations. Select an exercise and carry its identity into Explore; do not force a detour through a full Codex page or automatically create a Workbook.

**Explore:** open the selected exercise with its instructions, interactive tool if applicable and relevant personal material. Show an understandable action such as Save to Workbook; choose existing/new destination only when needed. An accepted save creates the page/association once, with confirmation and safe retry. Preserve independent Codex browsing and explicit attachment of existing pages.

**Craft:** start with the player's material rather than a second journal. Choose or create a composition, use a focused editing workspace, and reference the Quest ingredients or existing ideas without losing the working context. Practice is always available explicitly; creativity is not automatically graded.

**Context rule:** Codex supplies authoritative knowledge; Workbook preserves personal work; Quest supplies current intent; Session and Result supply practice evidence. Visual integration does not merge these authorities.

## 7. Reference journey for every design prototype

Use one synthetic example across all screens: an intermediate guitarist, comfortable identifying notes on one string, wants to apply Scale-Degree Recognition to melodic navigation in C major. All example values and recommendations are fictional prototype data, not current Player state.

1. Home offers Resume or a Quick Quest; player chooses a suggested melodic navigation Quest and sees its rationale and estimated session duration.
2. Map shows the objective, current skill and relevant foundations (e.g., note location and interval recognition; exact relationship classes must be verified in the canonical graph). Player selects a foundational aural exercise.
3. Explore shows the actual exercise and a degree/fretboard reference together. Player recalls/hears scale degrees, tests a phrase and chooses Save to Workbook. Existing/new Workbook selection is explicit; the page is linked to the relevant ingredient only after acceptance.
4. Craft reuses the saved phrase as musical material. Player develops a short motif or variation in the same document system. Future prototype may show score editing as a labeled concept.
5. Practice starts a bounded Session; the player works at a manageable challenge and may change a permitted practice setting without rewriting the canonical Quest.
6. Reflection records what was consistent, what was difficult and what was observed against criteria. No claim of mastery merely for creating a page.
7. Skill Map shows accepted evidence if available, uncertainty and the reason for a future review or next challenge. Player can repeat, simplify or choose a different application.
8. Workbook remains independently accessible with the saved material, contextual links and Edit/Display/future Practice modes.

Test alternate paths too: five-minute Quick Quest with no Workbook; direct Codex study with no Quest; standalone composition; revisit an old page from another Quest; offline/failed save; uncertain beginner; mobile one-handed navigation.

## 8. Full feature horizon, distinct from release scope

| Workstream | Current foundation or draft | Future experience to design |
| --- | --- | --- |
| Identity & practice | Player, onboarding, calibration, Quick generation, Sessions, Results, history, recovery | Clear resume, custom discovery, reliable guided journeys, low-friction review |
| Learning graph | Canonical taxonomy, dependency relationships, proficiency/confidence/readiness, adaptive ranking | Navigable skill network, prerequisite rationale, spaced review/transfer hypotheses and personalized paths |
| Codex | Canonical V1; V2 draft lessons and interactive tools on stacked preview | Complete editorially reviewed library, contextual learning, linked personal content |
| MEC & Workbook | Persistent Journey; private Workbooks, basic tabs/chords; modular Explore/Craft and redesigned standalone Edit/Display in draft | Unified modes, page origin and association summary, capture from interactive tools, fretboard/rhythm/audio blocks, reusable personal material |
| Scores & playback | Structured blocks; isolated Codex playback | Evaluate alphaTab, versioned score model, import/export, advanced notation, looping, speed trainer, multitrack and backing tracks |
| Trust & operation | Existing auth, access, revision and security contracts | Complete export/deletion coverage, accessibility, recovery, reliable deployment |
| Extended ecosystem | Not a launch dependency | Optional campaigns, teacher/learner, sharing/collaboration and advanced analytics; explicit later review |

The first private beta needs an intelligible, verified core loop, not every planned capability. Design all major future surfaces now with clearly labeled mock data and deferred features; implement in slices. Existing release prerequisites and protected merge/cutover rules remain unchanged.

## 9. Visual direction — Studio × Explorer × Journal

Studio: charcoal/ink frame, restrained warm metal accents, confident controls and tactile precision. Explorer: cartographic lines, connected skill constellations, distinctive domain imagery and visual sense of direction. Journal: readable type, quiet surfaces, generous spacing and a music-first canvas.

Use purpose-built art for Quest/Skill/domain recognition and selected discovery moments. Use real diagrams, semantic controls and readable labels for musical truth; decorative imagery never carries the sole meaning. Avoid making every section a card, overly ornate fantasy interfaces, tiny text, constant reward animation or color-only states.

Reserve distinctive colors for stable semantic roles, with contrast and non-color indicators. Reading and score surfaces may use a warm paper treatment within the dark application; offer accessible alternatives. Build mobile navigation and reduced-motion variants from the start, not as a desktop afterthought.

## 10. Design program and acceptance

- **DESIGN-001-A:** product blueprint (this draft).
- **DESIGN-001-B:** research-backed learning model; audit accepted graph and scoring rules, evaluate practice evidence and retention/transfer, propose model changes only through explicit architecture amendments.
- **DESIGN-001-C:** experience architecture, navigation alternatives, complete task flows, low-fidelity wireframes and resolution of Map/Explore/Workbook responsibilities.
- **DESIGN-001-D:** visual system and custom asset direction; representative high-fidelity screens across desktop/mobile.
- **DESIGN-001-E:** isolated navigable prototype with fictional representative data, real task transitions and clearly labeled nonfunctional future features.
- **DESIGN-001-F:** implementation migration plan after review, with accessibility, security, data preservation and acceptance gates.

Review the design by asking an unfamiliar player to resume a Quest, find a prerequisite, select an exercise, save it to a Workbook, find it again, develop it, practice, reflect and understand the next recommendation. Measure task success, unnecessary detours, loss of context, accidental creation, understanding of saved state and ability to recover. Set quantitative thresholds after baseline observation, not invented targets.

## 11. Open decisions and preservation

Proposed, not final: grouping Skill Map/Character/Training, initial landing page for new vs returning players, exact responsive MEC shell, visual asset style and future score editor choice. AlphaTab remains an evaluation candidate, not an installed dependency. Lesson editorial approval, automatic progression policy, graph changes, persistent source provenance and sharing require separate authority.

Preserve the existing Master Build Plan, QST-005, JRN-000, DIF-001, evidence/progression/training contracts and all outstanding branches. Prior INT-001 passed at 40fcf16; JRN-UX-001 #29 has a pending formatting remediation and is not a verified release baseline. The experimental contextual Peek work is held separately. No application code, database migration, project-state change, release merge, or production change is authorized by this document.

**Decision requested:** approve or revise the North Star and product boundaries, then proceed to DESIGN-001-B and C. Visual exploration can start in parallel, but final navigation and learning semantics depend on their review.
