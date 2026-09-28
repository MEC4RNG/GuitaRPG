# TAX-001 — Canonical Musical Taxonomy Contract

- Status: Accepted
- Ticket: TAX-001
- Date: 2026-09-27
- Applies to: GuitaRPG v1 canonical musical vocabulary

## Purpose

Define the canonical musical entities and relationships that GuitaRPG will use for Quest generation, player progression, Codex content, recommendations, history, and future analytics.

This contract replaces the prototype's overlapping dropdown categories with a normalized semantic model.

It does **not** perform the legacy `challenge.js` migration. That mapping belongs to TAX-002.

## 1. Core model

The canonical taxonomy consists of:

- Domain
- Skill
- Concept
- Context
- Constraint Definition
- Attribute
- Tag
- Relationship

### Explicit normalization: Technique is not a duplicate entity type

A physical execution method such as Alternate Picking, Sweep Picking, Hybrid Picking, Bending, Vibrato, or Tapping is represented as a **Skill** when GuitaRPG tracks proficiency in it.

A Quest may reference that same Skill in a role such as:

- PRIMARY_SKILL
- SECONDARY_SKILL
- REQUIRED_TECHNIQUE

The Quest role does not create another canonical record.

Therefore GuitaRPG must **not** create both an `alternate_picking` Skill and an `alternate_picking` Technique entity merely because the same term is used differently in different Quests.

This resolves the earlier provisional "Technique" entity category in favor of one canonical source of truth.

## 2. Domain

A Domain is a broad, stable area of guitar/musical development.

The six canonical v1 Domains are:

| Slug | Display name |
|---|---|
| `technique` | Technique |
| `fretboard` | Fretboard |
| `harmony_theory` | Harmony & Theory |
| `rhythm` | Rhythm |
| `ear_musicianship` | Ear & Musicianship |
| `creativity_expression` | Creativity & Expression |

Rules:

- Domains are few and intentionally stable.
- A Skill has exactly one primary Domain.
- Cross-domain influence is modeled with relationships, not duplicate Skills.
- Domains do not have player proficiency of their own unless a later progression contract derives a summary from underlying Skills.
- Domains are not generator options that independently add random material to every Quest.

## 3. Skill

A Skill is a trainable ability for which GuitaRPG may maintain player-specific evidence, proficiency, confidence, readiness, or exposure.

Examples:

- Alternate Picking
- String Crossing
- Finger Independence
- Hand Synchronization
- Interval Mapping
- Scale Mapping
- Triad Construction
- Voice Leading
- Steady Pulse
- Syncopation
- Interval Recognition
- Transcription
- Improvisation
- Motif Development
- Phrasing

A Skill answers:

> What ability is the player developing or demonstrating?

### Skill rules

- Skills are canonical and reusable across Quests.
- Skills do not contain inherent player levels.
- Skills do not contain one permanent Quest difficulty.
- Player proficiency I–V belongs to the Player/Progression model.
- Quest demand I–V belongs to the Quest/Difficulty model.
- A single Skill may be primary in one Quest and supporting/required in another.
- A Skill should describe an ability, not merely a body of musical material.
- A Skill should not encode a specific key, tuning, tempo, fret range, or string set in its identity.

### Skill hierarchy

Skills may optionally use a directed `SUBSKILL_OF` relationship when both parent and child are meaningful trainable abilities.

Examples:

- Alternate Picking SUBSKILL_OF Pick Control
- Interval Recognition SUBSKILL_OF Pitch Recognition

Presentation-only headings such as "Picking Hand" do not need to become player-rated Skills merely to organize a screen.

`SUBSKILL_OF` must be acyclic.

## 4. Concept

A Concept is musical material, knowledge, or a formal musical object used by a Quest.

A Concept answers:

> What musical material or idea is being used?

Canonical Concept families include:

- Interval
- Chord / chord quality
- Scale / mode
- Arpeggio
- Progression
- Meter
- Rhythm pattern
- Harmonic device
- Tonal/harmonic system

Examples:

- Minor Third
- Major Triad
- Minor 7
- Dorian
- Harmonic Minor
- I–V–vi–IV
- 7/8
- Tresillo
- Secondary Dominant
- Modal Interchange
- Polytonality

### Concept rules

- Dorian is a Concept, not a Skill.
- "Play/apply/navigate Dorian" can be a Skill expression using the Dorian Concept.
- A specific transposition such as E Dorian should normally be represented as Concept `dorian` plus tonal/key context, not as a new canonical "E Dorian" Concept.
- A specific C major chord should normally be represented by the appropriate chord Concept plus root/key data, not by creating twelve copies of every chord quality.
- Concept definitions may contain formulas/structured educational metadata later, but TAX-001 does not define those payload schemas.

## 5. Context

Context describes the musical environment in which a Skill or Concept is applied.

A Context answers:

> Under what musical conditions is the Quest taking place?

Canonical Context families include:

- Tuning
- Style / genre
- Tonal center / key
- Instrument/setup where relevant
- Accompaniment/backing environment
- Harmonic environment where it is contextual rather than the trained Concept

Examples:

- Standard Tuning
- DADGAD
- Drop D
- Blues
- Flamenco
- Metal
- E as tonal center
- Solo guitar
- Backing track

### Context rules

- DADGAD is Context, not a separate Skill.
- Blues, Metal, Flamenco, Djent, and similar style labels are Context, not Skill levels.
- "Lead Guitar" and "Rhythm Guitar" are playing-role contexts unless a specific trainable ability is named.
- Context does not by itself earn proficiency.
- A Context may influence generation compatibility, difficulty, recommendations, and evidence variety.

## 6. Constraint Definition

A Constraint Definition describes a reusable restriction imposed on execution.

A Constraint answers:

> What restriction must the player obey?

Constraint families include:

- String
- Fretboard
- Pitch
- Rhythm
- Technique-role
- Time
- Tempo
- Harmony
- Creative
- Dynamic
- Register

Examples:

- Non-adjacent strings only
- Strings 2–5
- Frets 5–12
- Start each phrase on a different scale degree
- Use only chord tones on beat 1
- Maintain 90 BPM
- Four-bar phrase
- One string per measure

### Parameterized constraints

Do not create a unique canonical row for every numerical combination.

For example:

- `string_set` may be a canonical Constraint Definition with parameters `[2,3,4,5]`
- `fret_range` may receive `min=5, max=12`
- `target_tempo` may receive `90 BPM`

Named/reusable rules such as `non_adjacent_strings_only` may have their own canonical Constraint Definition.

### Skill vs Constraint distinction

"String Skipping" as the ability to intentionally traverse non-adjacent strings is a Skill.

"Use only non-adjacent strings in this Quest" is a Constraint.

The same musical situation may therefore train a Skill while also applying a related Constraint, but they are semantically distinct.

## 7. Attribute

Attributes are broad Character-development dimensions derived from Skill development.

Attributes are **not** selected as random Quest ingredients.

### Physical Attributes

| Slug | Display name |
|---|---|
| `dexterity` | Dexterity |
| `precision` | Precision |
| `coordination` | Coordination |
| `control` | Control |
| `endurance` | Endurance |

### Musical Attributes

| Slug | Display name |
|---|---|
| `fretboard` | Fretboard |
| `rhythm` | Rhythm |
| `theory` | Theory |
| `ear` | Ear |
| `creativity` | Creativity |
| `expression` | Expression |

Rules:

- Attributes summarize development; they do not replace Skill proficiency.
- Skill-to-Attribute relationships use `AFFECTS`.
- Numeric contribution weights are deferred to PROG-001/calibration work.
- Attributes move more slowly than individual Skills.
- The prototype's "Physical Attribute" and "Mental Attribute" generator inputs are deprecated conceptually.

## 8. Tag

Tags are lightweight metadata for search, discovery, filtering, generation hints, editorial grouping, aliases, and non-authoritative relationships.

Examples:

- `classical`
- `beginner_friendly`
- `pick_required`
- `single_note`
- `polyphonic`

Rules:

- Tags must not substitute for a Skill, Concept, Context, Constraint, or Attribute when one of those semantics applies.
- Tags do not earn proficiency.
- Tags do not become authorization or progression authorities.
- Freeform user tags, if ever supported, are separate from canonical system tags.

## 9. Relationship semantics

Canonical relationships are typed and directional unless specified otherwise.

### Structural / skill graph relationships

#### BELONGS_TO
- Skill → Domain
- exactly one primary Domain per Skill

#### SUBSKILL_OF
- Skill → Skill
- directed
- acyclic

#### REQUIRES
- Skill → Skill
- directed prerequisite/dependency
- should remain acyclic for hard prerequisites
- means meaningful prerequisite evidence is expected before advanced use

#### SUPPORTS
- Skill → Skill
- directed
- softer than REQUIRES
- means development in the source tends to help the target

#### RELATED_TO
- taxonomy entity ↔ compatible taxonomy entity
- symmetric
- informational/discovery relationship
- not a prerequisite

#### AFFECTS
- Skill → Attribute
- directed
- optional strength/weight may be added later by Progression
- does not itself award Attribute progress

### Quest semantic roles reserved for QST-001

The following relationship names are reserved for Quest composition:

#### TRAINS
- Quest → Skill

#### USES
- Quest → Concept

#### CONTEXTUALIZED_BY
- Quest → Context

#### APPLIES
- Quest → Constraint Definition

A Quest may additionally mark a trained Skill with a role such as PRIMARY_SKILL, SECONDARY_SKILL, or REQUIRED_TECHNIQUE.

## 10. Canonical identity and naming

Every canonical taxonomy entity requires:

- immutable database UUID
- stable unique machine slug
- display name
- entity kind
- lifecycle status

Recommended optional fields later:

- short description
- aliases
- sort/display metadata
- Codex eligibility
- Quest-generation eligibility

### Slug rules

- lowercase snake_case
- stable after publication
- never reused for a different semantic entity
- spelling/display-name changes do not require slug changes unless the original slug is materially misleading
- deprecated entities keep their IDs/slugs for historical references

Examples:

- `alternate_picking`
- `interval_mapping`
- `dorian`
- `dadgad`
- `non_adjacent_strings_only`

## 11. Lifecycle and deprecation

Canonical taxonomy data is historical infrastructure.

Lifecycle states should support at least:

- ACTIVE
- DEPRECATED

A deprecated entity:

- remains resolvable by old Quest/session records
- is excluded from new generation unless explicitly allowed
- may point to a replacement entity
- is not hard-deleted merely because terminology changes

Merges/renames should preserve historical identity and provide aliases/replacement links rather than rewriting old sessions.

## 12. Canonical entity boundaries

### These are Skills

- Alternate Picking
- Sweep Picking
- String Crossing
- Bending
- Vibrato
- Finger Independence
- Fretboard Navigation
- Interval Mapping
- Triad Construction
- Voice Leading
- Tempo Control
- Syncopation application
- Interval Recognition
- Transcription
- Improvisation
- Motif Development

### These are Concepts

- Major Triad
- Minor 7
- Dorian
- Harmonic Minor
- 7/8
- I–IV–V
- Secondary Dominant
- Modal Interchange
- Polytonality

### These are Contexts

- DADGAD
- Standard Tuning
- Blues
- Metal
- Flamenco
- E tonal center
- Solo Guitar

### These are Constraints

- Non-adjacent strings only
- Frets 5–12
- High strings only
- One string per measure
- 90 BPM target
- Four-bar limit

### These are Attributes

- Precision
- Coordination
- Fretboard
- Ear
- Creativity
- Expression

## 13. Ambiguity rules

When a term could fit more than one category, classify it by the function being modeled rather than the word alone.

Examples:

### Alternate Picking
- canonical entity: Skill
- Quest role may be PRIMARY_SKILL or REQUIRED_TECHNIQUE
- must not be duplicated under Rhythm

### Chord Inversions
If GuitaRPG is tracking the player's ability to locate/use inversions:
- Skill: Chord Inversion Navigation/Application

The inversion itself is musical material/voicing structure:
- Concept metadata or chord Concept structure

Do not duplicate "Chord Inversions" in multiple Domains merely because it appeared in multiple prototype lists.

### Double Stops
- the interval/chordal object can be Concept
- executing double-stop technique can be a Skill
- a Quest may constrain the texture to double stops

If two records are needed, their names/descriptions must make the semantic distinction explicit rather than silently duplicating one label.

### Polyrhythm
- the polyrhythmic structure is a Concept
- performing/maintaining polyrhythms is a Rhythm Skill

Again, semantic labels must distinguish the material from the ability.

### Style-specific rhythm labels
"Rumba Flamenca", "Djent Groove", and "Ska Rhythm" are normally Style/Context plus Rhythm Concepts/constraints, not standalone mastery tiers.

## 14. Difficulty and level separation

No canonical Skill, Concept, Context, or Constraint owns an inherent mastery level I–V.

The old prototype's level buckets are migration evidence only.

Production semantics:

- Player Skill Level = player-specific proficiency
- Quest Difficulty/Demand = Quest-specific
- Context/Constraint complexity = inputs to Quest difficulty
- canonical taxonomy entity = level-neutral

Therefore "Sweep Picking was in level 4 in the prototype" does not make Sweep Picking permanently Level IV.

## 15. Quest composition implications

TAX-001 establishes the vocabulary QST-001 will consume.

A normal Quest should be expressible as:

- 1 Primary Skill
- 0–2 Secondary Skills
- one or more relevant Concepts
- optional Context
- 1–3 normal Constraints
- execution parameters
- completion objective

Taxonomy entities must not store Quest-specific values such as:

- current target tempo
- current duration
- current repetitions
- player's current level
- current verification mode
- current XP reward

Those belong to Quest/session/progression records.

## 16. Progression implications

Only Skills receive direct player proficiency evidence.

Concept exposure may be tracked for recommendations/coverage, but seeing or using a Concept does not automatically create a separate "Dorian Level III" unless a defined Skill such as Modal Application or Scale Mapping is being evaluated.

Contexts may contribute to evidence diversity.

Constraints may contribute to evidence difficulty/variety.

Attributes are derived from Skill development.

## 17. Codex implications

Codex may expose pages for:

- Skills
- Concepts
- Contexts such as tunings
- selected Constraints where educational explanation is useful

Codex presentation does not change canonical entity type.

A single canonical entity should be referenced by both generator and Codex rather than copied into separate content vocabularies.

## 18. Generation compatibility

TAX-001 requires the later generator to support compatibility rules rather than blind independent random selection.

Examples:

- Concept compatibility with Skill
- tuning/context compatibility
- required prerequisites
- constraint incompatibilities
- parameter bounds
- difficulty suitability

Compatibility metadata may be represented through typed relationships or later rule tables.

The taxonomy itself must remain descriptive; complex generation logic belongs to QST/DIF systems.

## 19. Legacy prototype implications

The current `challenge.js` contains useful source material but mixes semantic layers:

- `guitarmanship` mixes Technique, Fretboard, Theory, Concepts, and style-dependent abilities
- `pickingHand` and `frettingHand` are closest to Technique Skills but still contain overlaps
- `stringChallenge` mostly contains Constraints, with some embedded Skills/compound Quest ideas
- `musicianship` mixes Theory, Rhythm, Ear, and Concepts
- `scales` is primarily Concepts
- `rhythm` mixes Rhythm Skills, Concepts, Techniques, and style Context
- `playStyle` is primarily Context
- physical/mental attributes were selectable inputs but production Attributes are derived

TAX-002 must account for every legacy value using explicit dispositions such as KEEP, RENAME, MERGE, SPLIT, RECLASSIFY, DEFER, or REMOVE.

No legacy value may silently disappear.

## 20. Data integrity invariants

The implementation must enforce or test the following:

- every Skill belongs to exactly one primary Domain
- Skill slugs are globally unique among Skills
- canonical IDs are immutable
- deprecated IDs remain resolvable
- REQUIRES and SUBSKILL_OF cannot self-reference
- SUBSKILL_OF is acyclic
- a Quest role cannot change an entity's canonical type
- Attributes cannot be used as ordinary random Quest ingredients
- player proficiency cannot attach directly to Concepts, Contexts, Constraints, or Tags
- canonical taxonomy rows are system-owned under DATA-001

## 21. Deferred decisions

TAX-001 does not finalize:

- the exhaustive v1 Skill catalog
- final descriptions/Codex copy
- Skill-to-Attribute numeric weights
- every prerequisite edge
- generator compatibility scoring
- Concept payload schemas/formulas
- exact note/pitch-class data representation
- user-created taxonomy
- teacher-authored custom Skills
- visualization/layout of the Skill graph

Those belong to TAX-002 and later domain tickets.

## Acceptance evidence

- six canonical Domains defined: PASS
- Skill boundary defined: PASS
- Technique duplication resolved: PASS
- Concept boundary defined: PASS
- Context boundary defined: PASS
- Constraint model defined: PASS
- Attribute set defined: PASS
- Tag role defined: PASS
- relationship semantics defined: PASS
- stable identity/lifecycle rules defined: PASS
- level/difficulty separation defined: PASS
- progression/Codex/Quest boundaries defined: PASS
- legacy ambiguity rules defined: PASS
- implementation invariants defined: PASS

## Terminal disposition

**TAX-001 — COMPLETE**

The canonical taxonomy contract is accepted.

Next dependent ticket: **TAX-002 — Legacy Generator Normalization**.
