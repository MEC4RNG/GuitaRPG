# TAX-002 — Legacy Generator Normalization

- Status: Accepted
- Ticket: TAX-002
- Date: 2026-09-27
- Source: `challenge.js` on legacy `main`
- Contract authority: TAX-001

## Purpose

Account for every legacy generator value and map it into the canonical TAX-001 model without silently discarding content or preserving prototype category/difficulty mistakes.

## Coverage

- Source occurrences: **216**
- Unique legacy labels: **207**
- Duplicate labels across old categories: **9**
- Unmapped unique labels: **0**
- Unmapped source occurrences: **0**

Disposition totals:

| Disposition | Count |
|---|---:|
| KEEP | 64 |
| RENAME | 65 |
| MERGE | 14 |
| SPLIT | 33 |
| RECLASSIFY | 22 |
| DEFER | 6 |
| REMOVE | 3 |

The complete row-level mapping is machine-readable at:

`domain/taxonomy/legacy-normalization.json`

## Duplicate labels normalized to shared semantics

- Chord Inversions
- Chord Substitutions
- Downstrokes
- Upstrokes
- Alternate Picking
- Artificial Harmonics
- Double Stops
- Polyrhythms
- Metric Modulation

Duplicate appearance in the prototype does not create duplicate canonical entities.

## Legacy level rule

Prototype levels 1–5 are preserved only as provenance in the normalization manifest.

They do **not** define:

- inherent Skill level
- player proficiency
- Quest difficulty
- Concept complexity

Those semantics belong to Player/Progression and Quest/Difficulty contracts.

## Major category migrations

### Keys
The 12 old key labels become values of a tonal-center/key Context. Enharmonic labels are presentation/spelling information rather than separate player Skills.

### Physical / Mental Attributes
Selectable attributes are removed from generation.

Production Character Attributes are derived. Strength and Flexibility merge into the approved Physical Attribute model; Rhythm moves to Musical Attributes; Emotion becomes Expression; Aural becomes Ear.

### Guitarmanship
This prototype bucket is dismantled. Entries are explicitly reclassified into Technique/Fretboard/Harmony Skills, Concepts, Contexts, or Tags.

### Picking and fretting
Physical execution abilities become Technique Skills. Difficulty adjectives such as Basic/Advanced do not create separate Skills.

### String Challenge
Most entries become Constraints. Compound labels are split into reusable Skill/Concept/Constraint components or deferred as Quest-template patterns.

### Musicianship
The bucket is split across Harmony & Theory, Rhythm, Ear & Musicianship, Creativity/Expression Skills and musical Concepts.

### Scales & Modes
Scale/mode names become Concepts. `Major (Ionian)` and `Natural Minor (Aeolian)` are split so tonal-scale and modal semantics are not permanently conflated.

### Rhythm
Technique labels such as Alternate Picking merge back into Technique Skills. Rhythmic devices become Concepts and/or Rhythm Skills. Style-specific labels become Context where appropriate.

### Play Style
These values become Style or Playing-Role Contexts, never proficiency tiers.

## Explicitly deferred labels

- Chord on One String, Melody on Another
- Extended Modes
- Hybrid Rhythms
- Hybrid Scales & Chords
- One String Rhythm + Another Lead
- Single String Chord Voicings

Deferred means the legacy idea is retained in the audit but is too underspecified or too Quest-specific to become a canonical taxonomy entity yet.

## Explicitly removed labels

- Adaptability
- Blended Freeform
- Focus

Removal means the label is intentionally not part of the v1 canonical taxonomy; it is not a silent omission.

## Representative normalizations

- Alternate Picking → one Technique Skill, even though it appeared under Picking Hand and Rhythm.
- Chord Inversions → Chord Inversion Navigation Skill + Chord Inversion Concept.
- Double Stops → execution Skill + Concept + optional texture Constraint.
- Polyrhythms → Polyrhythm Concept + Polyrhythm Performance Skill.
- Metric Modulation → Concept + performance Skill; "Mastery" merges into player proficiency rather than taxonomy.
- DADGAD remains a future Tuning Context even though it was not a legacy dropdown item.
- String Skipping remains a Technique Skill while Non-Adjacent Strings Only is a Constraint.
- Rumba Flamenca and Flamenco Rumba normalize to the same Style Context.
- Advanced Hybrid Picking merges into Hybrid Picking; "advanced" belongs to Quest demand.
- Modal Interchange Basics / Modal Interchange / Modal Interchange Advanced normalize to one Concept.

## Migration guarantees

1. Every unique legacy label has exactly one manifest entry.
2. Every source occurrence is represented in that entry's provenance.
3. No prototype level is promoted into canonical difficulty.
4. Duplicate source labels share canonical targets.
5. DEFER and REMOVE decisions are explicit.
6. Compound legacy labels may map to multiple canonical targets.
7. Production code should consume canonical targets, not legacy category names.

## Automated audit

`tests/legacy-normalization.test.ts` reparses the legacy arrays from `challenge.js` and verifies that the manifest covers the same unique values and source occurrences.

If the legacy source or manifest changes without corresponding normalization, the test fails.

## Terminal disposition

**TAX-002 — COMPLETE**

All legacy generator content is accounted for. The prototype remains preserved; no runtime generator behavior is changed by this ticket.

Next dependency authorized: **PLY-001 — Player & Development State Contract**.
