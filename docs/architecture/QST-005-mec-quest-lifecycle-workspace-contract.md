# QST-005 — MEC Quest Lifecycle & Workspace Contract

- **Status:** Accepted — design contract
- **Ticket:** QST-005
- **Date:** 2026-10-17
- **Type:** Product and architecture contract; no implementation
- **Baseline:** `v1-production` at `2cad378f380efb82f05587dfd346e620c7a47f95`
- **Depends on:** QST-001–QST-004, SES-001/SES-002, EVD-001/EVD-002, HIST-001, PROG-001–PROG-006, TRN-001–TRN-004

## 1. Decision

GuitaRPG accepts the **MEC Quest model**:

> **Quest = a persistent learning and creative journey.**

> **Session = one bounded block of time spent working on that Quest.**

> **Result = evidence describing what happened in one Session.**

> **Map = understand the musical territory. Explore = experience and investigate it on the instrument. Craft = use it to make something musical.**

The existing canonical Quest remains the immutable, resolved practice definition and historical anchor. A separate Player-owned **Quest Journey** overlay records lifecycle, current stage, stage activity, and Workspace content. It uses the same Quest ID and does not create a second Quest identity.

MEC is a revisitable working model, not a rigid unlock tree. Journey completion is explicit Player intent and is not mastery, evidence, XP, or progression. Actual guitar evidence remains authoritative through Session Results and the accepted progression pipeline.

## 2. Compatibility analysis

| Existing authority | Classification | Finding and required action |
| --- | --- | --- |
| QST-001 canonical Quest | **COMPATIBLE / NO CHANGE** | The immutable resolved definition remains the musical/practice contract. A journey overlay does not add attempt or progression data to it. |
| QST-002 Quest persistence | **EXTENSION REQUIRED** | Existing `quests` remains unchanged. Future Player journey/workspace records reference its ID. Existing owner/RLS and attempted-Quest deletion guard remain authoritative. |
| QST-003 generator | **EXTENSION REQUIRED** | `generateQuickQuest` and `generateCustomQuest` remain valid. Quick stays one-action. Build Quest exposes Custom progressively and truthfully limits generator-capable Primary Skills. |
| QST-004 Quest-to-Codex references | **PRESENTATION CLARIFICATION** | Current links remain valid. Quest Journey adds non-destructive Codex Peek rather than replacing snapshot names or full Codex routes. |
| SES-001 Session runtime | **COMPATIBLE / NO CHANGE** | It already defines one attempt against one immutable Quest and allows multiple Sessions per Quest. No lifecycle-state change is needed. |
| SES-002 controls | **COMPATIBLE / NO CHANGE** | Timer, pause, reps, BPM, and references remain Session concerns. MEC stage activity does not become Session telemetry. |
| EVD-001/EVD-002 Result | **PRESENTATION CLARIFICATION** | `CLEARED` remains “all required criteria were MET in this Session Result.” It does not close the Quest Journey. No outcome rename or data migration is needed. |
| HIST-001 | **EXTENSION REQUIRED** | History remains a Session-first record of what happened. Saved/open Quest Journeys require a separate collection and entry points, not mixed History rows. |
| PROG-001–PROG-006 | **COMPATIBLE / NO CHANGE** | Only accepted Result/evidence policies affect XP, proficiency, confidence, readiness, and Attributes. Journey activity has no progression authority. |
| TRN-001/TRN-002 | **COMPATIBLE / NO CHANGE** | Candidate and scoring semantics remain about Primary Skills, not Journey state. |
| TRN-003/TRN-004 | **EXTENSION REQUIRED** | Training materialization should open/create the same Journey architecture. Later ranking may recommend continuing a Journey, but that behavior is deferred. |
| Current Generate UI | **CONTRACT REMEDIATION REQUIRED** | Generated drafts currently live only in component state and disappear on navigation. Future ordinary navigation must preserve a bounded draft. Save must persist without starting a Session. |
| Current Session UI | **PRESENTATION CLARIFICATION** | Session stays focused on execution. It may show the owning Quest/stage context and return to Journey, but Workspace editing is not moved into the timer surface by default. |

No accepted contract is silently redefined. Future implementation must treat the items marked extension/remediation as new tickets with explicit persistence, security, export, deletion, and integration evidence.

## 3. Core identities and ownership

### 3.1 Immutable Quest Definition

The existing `quests.id` remains the durable Quest identity. Its validated `resolved_snapshot` remains authoritative for what was generated or composed:

- identity, schema version, origin, and Quest Type
- Primary Skill, Secondary Skills, and Required Techniques
- Concepts, Context, Constraints, and Execution parameters
- machine-readable Objective and Completion Contract
- verification and immutable DIF_V1 snapshot

The Objective remains option **C**: the immutable musical/practice contract. MEC stage prompts are separate guidance and may contextualize the Objective but never rewrite or replace it.

### 3.2 Player Quest Journey State

One owner-scoped Journey exists at most once per Player-owned Quest. It records the Player’s evolving relationship with that immutable definition:

- lifecycle: saved, active, concluded, archived, or abandoned
- current/recent working stage
- stage activity summaries
- explicit conclusion/reopen/archive events or timestamps
- Workspace presence and update metadata

All ownership derives from `auth.uid()`. No email, display name, client-supplied owner, or UI restriction is an ownership boundary.

### 3.3 Session and Result

A Session answers, “What did I do during this practice block?” It retains authoritative start/end, pauses, active time, reps, BPM configuration, and control events. Each new Practice Again action creates a distinct Session referencing the same immutable Quest.

A Result answers, “What happened in that Session?” It remains exactly one immutable EVD_V1 Result per ended Session, with criterion evidence and optional Session reflection. A Result does not mutate the Quest snapshot or automatically conclude the Journey.

## 4. MEC stages

### 4.1 Map

Map helps the Player understand enough territory to begin. It may present canonical system anchors, note/interval/chord information, one example position or shape, Quest constraints, roots, labels, and contextual Codex references. It may invite the Player to discover additional positions rather than reveal every answer.

System-provided anchors are immutable or versioned reference content. Player discoveries are separately owned Workspace content. Updating canonical reference content must never erase or silently rewrite Player markers captured for a historical Quest.

### 4.2 Explore

Explore is instrument investigation. It may offer optional prompts for tempo, rhythm, position, inversion, articulation, comparative listening, technique, or other Quest-relevant experiments. Prompts are guidance by default, not compulsory coursework.

Explore may contain zero, one, or many Practice Sessions. Session summaries show evidence that happened; stage counters such as “3 Sessions / 42 active minutes” describe engagement only.

### 4.3 Craft

Craft applies discoveries musically. Its default invitation is:

> Create something using what you discovered.

Optional deliverable presets are Riff, Progression, Melody, Solo, Groove, Chord part, Étude/study, and Freeform. Freeform is always available. A preset shapes prompts and metadata but does not impose a universal bar count, BPM, or verification requirement.

### 4.4 Gating and revisiting

Default navigation is **MAP ⇄ EXPLORE ⇄ CRAFT**. All stages are available once a Journey is opened. The Player may move freely and may return from Craft to Explore or Map.

No current Quest family requires strict stage ordering. A future safety-, assessment-, or externally governed family may propose prerequisites, but only through a separate accepted contract with a truthful reason, an accessible override/error model where appropriate, and tests. Ordinary technique, theory, rhythm, ear, fretboard, and creative Quests must not use hidden locks.

Stage progress is descriptive Journey state, not completion of the immutable Objective and not proficiency evidence.

## 5. Time semantics

`execution.estimated_minutes` is accepted as the **suggested Session/work-block duration**. It is not the expected total time to finish or master the Quest.

The UI may separately show:

- Suggested Session: 10 minutes
- Quest age: 4 days
- Explore: 3 Sessions / 42 active minutes

A Session may use the suggestion, a Player-selected duration, or an open-ended mode. Open-ended changes no SES_V1 semantics: start/pause/resume/end and server-derived active time remain authoritative. The Profile’s typical Session duration may seed the suggested control when no stronger Quest-specific requirement exists, but it does not rewrite the Quest snapshot or difficulty.

Time supports pacing, consistency, evidence, engagement, and History. Time never implies mastery.

## 6. Quest lifecycle

The Journey lifecycle is separate from Session and Result outcomes:

- **Draft:** generated/composed but not durably saved. It has a client-side Quest identity and complete resolved snapshot, but no server record yet.
- **Saved:** durable Quest and Journey exist; no Session is required.
- **Active/open:** Player has explicitly started or resumed the Journey. It may have no Sessions yet.
- **Concluded/completed:** Player explicitly says the current Journey has reached a useful stopping point. This is not mastery and does not alter Results or progression.
- **Archived:** removed from normal active/recent views while retained for reference and historical integrity. It may be restored.
- **Abandoned:** Player explicitly stops pursuing it without claiming completion. This Journey state is not an EVD `ABANDONED` Session Result.

“Complete Quest” should be presented as **Conclude Quest** where ambiguity is likely. A completed Craft artifact or `CLEARED` Result may prompt “Ready to conclude this Quest?” but may never conclude it automatically. Automatic Journey completion is rejected for the first implementation.

Concluded and abandoned Journeys may be reopened. Reopening does not rewrite prior Sessions, Results, or conclusion history.

## 7. Saved Quests and drafts

### 7.1 Save Quest

Save Quest persists the immutable Quest and creates its owner-scoped Journey without creating a Session. The two writes must be atomic or idempotently recoverable under one trusted operation. Start Quest does the same persistence if needed and opens the Journey. Start Practice persists if needed, opens/uses the Journey, then starts a new Session.

### 7.2 Unsaved draft survival

Generated drafts must survive ordinary route navigation, back/forward behavior, and Codex Peek. The first implementation should use versioned `sessionStorage` keyed by Player/browser session plus a compact draft index. This is bounded, avoids putting the full Quest in URLs, survives same-tab navigation/reload, and does not promise cross-device durability before Save.

Rules:

- validate a restored draft with the current Quest parser
- bind it to the current local/auth identity context and generator version
- expire it after a bounded interval (recommended 24 hours) or explicit discard
- never store secrets or server-authoritative progression
- clear or replace it only through explicit discard, successful durable save, or generation of another draft after confirmation

Codex Peek is an overlay and never destroys the draft. A full Codex navigation may retain the draft and offer “Return to draft.”

### 7.3 Library

Saved Quests/Journeys form a dedicated collection. Home and Generate may show the three most recently worked-on entries, but there is no hard limit of three. The full collection sorts by `last_worked_at` descending, then creation time and stable ID.

Default sections are Active, Saved/not started, Concluded, and Archived. Search/filter may be later. Archive is reversible. Deletion is allowed only for an unattempted Quest with no Sessions, consistent with the existing database guard. Attempted Quests may be archived or abandoned, not deleted by ordinary clients. Account deletion remains the trusted exception.

Concluded Quests remain reusable through Practice Again and may be cloned/remixed.

## 8. Practice Again and revisions

Practice Again creates a fresh SES_V1 Session referencing the same Quest ID. It never reopens, overwrites, or replaces an earlier Session or Result.

Editing rules:

- **Unattempted saved Quest:** a future trusted operation may replace it only if no Session exists and historical references do not exist. The safer default UI is still “Save as new version.”
- **Attempted Quest:** any material change to Skill roles, Concepts, Context, Constraints, Objective, verification, execution requirements, or difficulty-producing inputs creates a new Quest identity.
- **Clone/remix:** always creates a new Quest identity and retains an optional `source_quest_id`/lineage reference. The new resolved snapshot is independently immutable.
- **Nonsemantic Journey edits:** title aliases for personal organization, Journal, stage selection, archive state, and Workspace markers do not revise the Quest definition.

Revision lineage is informative, not identity substitution. Sessions always reference the exact Quest version practiced.

## 9. Objective and Result compatibility

The existing machine-readable Objective remains the immutable practice contract; stage prompts live in the Journey/Workspace layer.

`CLEARED` remains fully compatible when read precisely:

> In this ended Session, all required Objective criteria were MET under EVD_V1.

It does **not** mean:

- the multi-session Journey is concluded
- the Player mastered the Skill
- all MEC stages are finished
- no further Session is useful

No EVD remediation or outcome rename is required. Future UI work must label Result status as “Session result: Cleared” where Journey context could make “Quest cleared” ambiguous. Existing historical Results remain unchanged.

EVD `ABANDONED` and Journey `abandoned` are also distinct. The former means one Session did not meet meaningful-attempt requirements; the latter is explicit intent to stop an ongoing Journey.

## 10. Quick Quest and Build Quest

### 10.1 Generate responsibility

Generate chooses or builds a Quest. It does not host the durable Journey, active Session, or History detail.

### 10.2 Quick Quest

Quick preserves the sacred behavior: one button produces a useful, inspectable Quest. Optional lightweight filters may remain, but they cannot turn Quick into a mandatory setup form. From preview, the Player may Save Quest, Start Quest, Start Practice, regenerate, or discard.

### 10.3 Build Quest

Build progressively exposes the existing Custom generator:

**Basic controls:** Primary Skill, compatible Quest Type, suggested Session duration, tuning, and an optional musical focus.

**Advanced controls:** up to two Secondary Skills, up to two Required Techniques, Concepts, tonal center, style, Constraints, strings, fret range, BPM, meter, and other family-supported parameters.

The UI filters each later choice from the selected generator family. Invalid combinations remain visible only when an explanation is useful; otherwise they are excluded. Unsupported canonical Primary Skills should appear in search/browse as disabled with “Not yet supported for Quest generation,” never silently substituted. The current truthful Primary-capable inventory is 15 of 72 active Skills.

Validation is inline, names the incompatible selection, and preserves the Player’s other valid choices. Advanced controls remain collapsed by default. The generated preview is always the canonical resolved Quest, not an informal form draft.

### 10.4 Skill roles in MEC

- **Primary Skill:** the main developmental target and generator anchor.
- **Secondary Skill:** a supporting developmental lens that may influence stage prompts where musically meaningful.
- **Required Technique:** a capability needed to execute the Quest, not necessarily the target being developed.

Map may foreground Secondary fretboard or theory context; Explore may suggest experiments involving it; Craft may propose an application. Required Techniques appear as preparation/execution needs. No role must generate a contrived checklist item, and neither supporting role gains proficiency evidence merely from being displayed or mentioned.

## 11. Codex Peek and References

Codex Peek is a non-destructive contextual inspector for Skill, Concept, Constraint, and Context references.

- Desktop: right-side drawer/inspector that leaves Journey context visible.
- Mobile: accessible bottom sheet or full-screen overlay with a clear close/back action.

It contains a concise definition, why the term matters in this Quest, relevant Map material, and a link to full Codex. Snapshot names remain historical presentation authority; active Codex content is optional current reference. Missing entries fall back to plain text as QST-004 requires.

Only one accessible name is exposed per trigger. Focus moves into the inspector, is trapped only while modal on mobile, returns to the invoking control on close, and supports Escape where applicable. No hover is required.

## 12. Quest Workspace

The Workspace belongs to the Player’s Journey and is keyed by the durable Quest ID. The bounded first version has Journal, Fretboard, and References. It is not a DAW, notation editor, tablature editor, recording studio, or arrangement timeline.

### 12.1 Journal

Journal is ongoing Quest-level writing across Sessions. Optional prompts are:

- Discovery — What did you notice?
- Sound — What did it feel or sound like?
- Technique — What felt easy or awkward?
- Idea — What do you want to try next?
- Freeform

Entries are Player-authored, private, timestamped, editable with durable revision timestamps, and optionally associated with a stage or Session for context. They never become proficiency evidence automatically. The system must not infer mastery, sentiment, health, or psychological state from them. Future AI/reflection use requires separate consent and authority.

**Result Reflection** remains immutable evidence/context for one Session Result. **Quest Journal** remains evolving Journey content. Copying text between them must be explicit, never automatic.

### 12.2 Fretboard

The first bounded fretboard supports Quest tuning, visible strings/frets, system anchors, Player markers, note names, interval labels, roots, optional marker groups/colors, and saved positions/shapes. It does not require audio, fingering detection, tab, or notation.

System anchors store/reference their content version and are rendered distinctly from Player discoveries. Player markers are owner-scoped records or structured state with stable IDs. Canonical changes may update current guidance but never overwrite the historical anchor snapshot or Player content.

### 12.3 References

References provides the Quest’s verified Codex terms and any bounded system anchor material. It reuses QST-004 resolution and opens Codex Peek without changing the Quest.

### 12.4 Creative artifact

The minimum Craft artifact contract is optional and includes deliverable type, title, text notes, selected Player fretboard position IDs, stage status (`DRAFT` or `FINAL`), and timestamps. “Final” means the Player considers the artifact ready for this Journey; it is not mastery or verified performance.

Tablature, notation, audio recording, cloud media, and arrangement timelines are deferred.

## 13. Persistence model for future implementation

No migration is created by QST-005. The recommended minimum future schema is deliberately small:

### 13.1 `player_quest_journeys`

One row per Quest (`quest_id` unique), with trusted `player_id`, lifecycle status, current stage, opened/concluded/archived/abandoned timestamps, and `last_worked_at`. This table provides library/read-model fields without mutating `quests`.

### 13.2 `quest_workspace`

One row per Journey for bounded structured state: schema version, system-anchor snapshot/version, fretboard layout and Player markers, and optional Craft artifact summary. JSONB is appropriate for versioned spatial marker/layout data that is loaded as one aggregate and has few relational query requirements.

### 13.3 `quest_journal_entries`

Separate rows are recommended because entries have independent identity, timestamps, stage/session association, editing, export, ordering, and eventual pagination. Keeping all prose in one JSON blob would increase overwrite conflicts and complicate cross-device refresh.

Creative artifacts should initially live as a bounded versioned JSON object in `quest_workspace`. Promote them to `quest_creative_artifacts` only when multiple artifacts, independent sharing/export, media, or querying is actually required. A separate `quest_fretboard_state` table is likewise unnecessary until collaborative/realtime or independently addressable shapes justify it.

### 13.4 Security and mutation

- every row carries or derives the owner from the referenced Player Quest
- RLS checks `auth.uid()` authoritatively
- create/update RPCs derive Player ID server-side and validate ownership
- ordinary clients cannot attach Workspace data to another Player’s Quest
- lifecycle transitions are explicit and idempotent
- attempted Quest deletion restrictions remain; account deletion cascades
- no Workspace mutation can write Result, XP, proficiency, confidence, readiness, or Attributes

### 13.5 Export, deletion, backup, privacy

DATA-004 export must add Journey state, Journal, Player markers, and Craft artifacts with schema/version metadata. Account deletion must cascade all such rows. Logical backups must include them; runbooks must identify Journal and creative text as private Player content. No future media object may be added without corresponding Storage deletion/export policy.

## 14. Cross-device and identity expectations

Protected/recoverable accounts receive the same saved Quest and Workspace on multiple devices after save and on refresh/refocus/navigation. The first implementation does not require realtime subscriptions, live cursors, or conflict-free collaborative editing.

Use optimistic concurrency (`updated_at` or a revision token) for mutable Workspace aggregates. A stale write must produce a recoverable conflict rather than silently erase newer content. Journal entries are independently addressable, reducing conflicts.

Guest Players retain the existing anonymous-Auth owner model but remain browser-session dependent. Copy must say, “Protect your Player to access this Quest on another device,” without promising recovery or sync for an unprotected guest.

Future DATA/Auth remediation should evaluate separate actions for **Sign out this device** and **Sign out everywhere**. Current default Supabase `signOut()` behavior is not changed by this contract.

## 15. Information architecture

```text
Home
├─ Continue recent Quest
├─ Recent Saved Quests (up to 3)
└─ Generate / Training

Generate
├─ Quick Quest
└─ Build Quest
   └─ Preview → Save Quest | Start Quest | Start Practice

Saved Quests
├─ Active
├─ Saved / not started
├─ Concluded
└─ Archived
   └─ Quest Journey
      ├─ Map
      ├─ Explore
      ├─ Craft
      ├─ Workspace: Journal | Fretboard | References
      ├─ Recent Session summaries
      └─ Start Practice / Practice Again

Session → Result
├─ Return to Quest Journey
└─ View in History

History
└─ Session attempts → Result/evidence detail
```

**Start Quest** persists if needed and opens/activates the Journey. **Start Practice** persists if needed and creates a new Session. This terminology is accepted because it resolves the current conceptual conflation.

## 16. Desktop and mobile contracts

### Desktop

The Quest Journey uses a Quest header/status, Map/Explore/Craft navigation, main stage canvas, recent Session summary, Practice CTA, and a docked/collapsible Workspace. Codex Peek opens in a right inspector. Workspace state must remain usable at common laptop widths and must not hide core stage content behind hover.

### Mobile

The same capabilities use stage tabs, a single primary content column, a sticky but non-obstructive Practice CTA, and Workspace/Codex Peek sheets or full-screen overlays. Journal and fretboard are not desktop-only. Controls retain 44px targets, visible focus, semantic names, reflow at 320px, and no horizontal page overflow. The fretboard may scroll inside its own labelled region when its musical grid cannot meaningfully reflow.

## 17. User flows

### Quick Quest

```text
Generate → Quick Quest → inspect resolved Quest
→ Start Quest → Journey (Map / Explore / Craft)
→ Start Practice → Session → Result → Journey or History
```

### Build Quest

```text
Generate → Build Quest → choose Primary Skill
→ progressively configure compatible controls → preview
→ Save Quest or Start Quest → Journey
```

### Save without practice

```text
Generate → inspect → Save Quest
→ Saved Quests / recent list → open later → Start Quest or Start Practice
```

### Repeat practice

```text
Quest Journey → Practice Again → new Session
→ new Result → same Journey, prior attempts unchanged
```

### Desktop and phone

```text
Protected Player saves Journey on desktop
→ persistence succeeds → phone refreshes/open Saved Quests
→ same Quest and Workspace load → Session may start on phone
→ desktop refreshes/refocuses → new Session summary appears
```

## 18. Worked examples

### 18.1 A Minor Triad Pathways

- **Primary Skill:** Triad Construction
- **Secondary Skill:** Fretboard Mapping
- **Required Technique:** Voice Leading
- **Concepts:** Minor Triad, inversion, chord tone
- **Map:** System provides A–C–E and one root-position shape. Player labels intervals, finds two inversions on a bounded string set, and saves discovered shapes.
- **Explore:** Optional prompts compare inversions, connect nearest voices, vary register, and hear root position versus inversions. The Player completes three Sessions across four days, each with separate Result evidence.
- **Craft:** “Create something using what you discovered,” optionally a Chord part or Progression. The Player saves a short progression note and selected shapes.
- **Workspace:** Journal records which top voices sounded smooth; fretboard distinguishes the system example from Player discoveries; References opens Minor Triad and Voice Leading Peek.
- **Conclusion:** A CLEARED Session may prompt conclusion, but the Player explicitly concludes after the Craft draft. No mastery is claimed; Practice Again remains available.

### 18.2 Alternate-Picking String-Crossing Lab

- **Primary Skill:** Alternate Picking
- **Secondary Skill:** Synchronization
- **Required Technique:** String Crossing
- **Concepts:** subdivision, accent, economy of motion
- **Map:** Shows picking-direction notation and one two-string cell, plus the Quest’s string/BPM constraints. It does not infer actual pick direction.
- **Explore:** Prompts compare accent placements, slow/fast tempos, and inside/outside crossings over multiple Sessions. Reps and BPM remain Session telemetry, not proof of cleanliness.
- **Craft:** Player creates a Freeform étude or riff using the cell in a musical phrase.
- **Workspace:** Journal captures tension observations; fretboard stores the Player’s note pattern; References explains subdivision and Alternate Picking.
- **Conclusion:** Explicit after a useful étude exists or the Player decides the investigation is complete. Results continue to govern evidence.

### 18.3 Syncopation by Ear Groove Study

- **Primary Skill:** Rhythmic Dictation
- **Secondary Skill:** Syncopation Control
- **Required Technique:** Muting Control
- **Concepts:** syncopation, eighth-note subdivision, groove
- **Map:** Displays the pulse grid and one example accent pattern without revealing all listening prompts.
- **Explore:** Player listens, claps, then plays contrasting accent placements; optional prompts compare straight and displaced attacks. Multiple Sessions may use different tempos.
- **Craft:** Player creates a Groove or Freeform rhythmic part using one discovered displacement.
- **Workspace:** Journal records what cue made the rhythm recognizable; References opens Syncopation; a minimal fretboard view may mark muted/percussive string zones but is not artificially required.
- **Conclusion:** Player-controlled. A correct app-verified identification Result is evidence for that Session, not automatic Journey completion.

### 18.4 DORIAN_CROSSROADS regression

The historical fixture remains `QFIX-TECH-001` / `dorian_crossroads` with Hybrid Picking primary, Scale Mapping and Syncopation Control secondary, E Dorian, strings 2–5, frets 5–12, 90 BPM, 10 suggested Session minutes, and DIF_V1 Level III. Its immutable snapshot is not rewritten.

A Journey overlay may be created lazily when opened. Map explains E Dorian and offers one anchor position; Explore suggests mapping and syncopated Hybrid Picking experiments; Craft invites a phrase or solo using connected positions. Existing Sessions and Results remain attached to the original Quest ID and appear as Journey Session summaries. The canonical clear fixture remains “Session result: Cleared,” not “Journey mastered.”

## 19. Legacy and History strategy

Pre-MEC persisted Quests receive no bulk rewrite. On first library/detail access, a Journey overlay may be created lazily and transactionally for the owner. Existing Quests with Sessions default to an Explore-centric initial view because their known history is practice activity; unattempted Quests default to Map. This is a presentation default, not inferred stage completion.

History remains newest-first Sessions and Results. Saved Quests/Journeys are actionable work and belong in their own collection. Journey detail may link to relevant History entries; History may link back to the Journey. Neither duplicates the other’s source of truth.

## 20. Training integration

Training continues to select a Primary Skill, materialize a canonical Quest, and explain recommendation/adaptation provenance. It then saves/opens the same Quest Journey model; there is no Training-only Workspace.

The first integration recommends **new Quests only**, matching current TRN semantics. Recommending continuation of an existing active Journey requires a later model that compares new-Quest need against Journey relevance, staleness, prior Results, and Player intent without distorting TRN_SCORE_V1. That behavior is deferred and must not be approximated by silently substituting an active Quest.

## 21. Progression boundary

The following have no XP or Skill-state authority:

- opening or switching a MEC stage
- adding markers or Journal entries
- saving or activating a Quest
- starting/finalizing a Craft artifact
- concluding, archiving, abandoning, or reopening a Journey

XP remains governed by meaningful practice and Result policy. Proficiency, confidence, readiness, and Attributes remain derived from accepted Result evidence. Secondary Skills and Required Techniques retain their accepted evidence roles; Journey prompts cannot inflate them. Any later engagement reward requires explicit PROG authority and is deferred.

## 22. Scope classification

| Capability | Classification |
| --- | --- |
| Draft survives ordinary navigation | **CORE NEXT IMPLEMENTATION** |
| Save Quest without Session | **CORE NEXT IMPLEMENTATION** |
| Journey lifecycle/read model and Saved Quests collection | **CORE NEXT IMPLEMENTATION** |
| Quest Journey route with revisitable MEC shell | **CORE NEXT IMPLEMENTATION** |
| Practice Again and Session summaries | **CORE NEXT IMPLEMENTATION** |
| Basic Journal | **CORE NEXT IMPLEMENTATION** |
| Codex Peek | **CORE NEXT IMPLEMENTATION** |
| Simple Quest-aware fretboard markers | **CORE NEXT IMPLEMENTATION**, after shared persistence foundation |
| Refresh-based protected-account cross-device behavior | **CORE NEXT IMPLEMENTATION** |
| Progressive Build Quest UI over existing Custom generator | **LATER IMPLEMENTATION** |
| Training opens same Journey | **LATER IMPLEMENTATION** |
| Training recommends continuing a Journey | **v1.5** |
| Multiple independent creative artifacts | **v1.5** |
| Rich fretboard shapes/groups and comparisons | **v1.5** |
| Realtime cross-device sync | **DEFERRED** |
| Tablature/notation editor | **DEFERRED** |
| Audio recording/cloud media/DAW timeline | **DEFERRED** |
| Automatic stage unlocks or automatic Journey completion | **NOT REQUIRED** |
| Journal-derived mastery/sentiment/progression | **NOT REQUIRED** |

## 23. Minimum coherent implementation slice

The smallest coherent slice is narrower than building every proposed tool at once:

1. Preserve one generated draft in versioned session storage.
2. Add atomic/idempotent Save Quest and Start Quest behavior without starting a Session.
3. Add owner-scoped Journey lifecycle plus a Saved Quests read model/library.
4. Add a Quest Journey route with flexible Map/Explore/Craft shell and clear Objective/role presentation.
5. Surface multiple Sessions per Quest with Practice Again and “Session result” language.
6. Add contextual Codex Peek by reusing QST-004 resolution.
7. Add basic independently persisted Journal entries.
8. Extend DATA-004 export/deletion and integration tests for the new records.

The simple fretboard is the next adjacent slice, not a prerequisite for proving durable multi-session Journeys. Deferring it from the first database/UI slice reduces simultaneous schema, visualization, mobile, and conflict-handling risk while preserving a meaningful product improvement.

## 24. Proposed future tickets — not authorized

1. **QST-006 — Quest Draft, Save & Journey Persistence**

   Owner: QST/DATA. Adds draft contract implementation, Journey lifecycle, trusted save/open transitions, RLS, and lazy legacy overlay.
2. **QST-007 — Saved Quest Library & Journey Read Model**

   Owner: QST/HIST. Adds collection, recent entries, archive/reopen, Session summaries, and Practice Again without mixing History.
3. **UX-006 — MEC Quest Journey Experience**

   Owner: UX/QST. Adds desktop/mobile Map/Explore/Craft shell, terminology, lifecycle actions, and suggested/open-ended Session entry.
4. **CODEX-002 — Contextual Codex Peek**

   Owner: CODEX/UX. Adds accessible non-destructive inspector/sheet using QST-004 resolution.
5. **QST-008 — Quest Journal Workspace**

   Owner: QST/DATA. Adds optional structured/freeform Journal with cross-device conflict behavior.
6. **FRET-001 — Quest-Aware Fretboard Workspace**

   Owner: QST/UX/TAX. Adds bounded system anchors and Player markers without audio or tab.
7. **QST-009 — Progressive Build Quest Composer**

   Owner: QST/UX. Exposes Custom generation with capability filtering and advanced disclosure.
8. **TRN-005 — Training-to-Journey Integration**

   Owner: TRN/QST. Opens materialized Training Quests in the shared Journey model; continuing-Journey recommendation remains separate.
9. **DATA-005 — Journey Export, Deletion & Device Sign-Out Remediation**

   Owner: DATA. Extends DATA-004 and evaluates this-device versus all-devices sign-out.
10. **REL-007 — MEC Journey Integration Gate**

    Owner: REL. Covers legacy overlays, owner isolation, draft/save/start, repeated Sessions, Result wording, mobile/desktop, export/deletion, and progression non-inflation.

Ticket numbering is a proposal only. None is authorized by QST-005.

## 25. Release-plan consequence

QST-005 does not alter Phase 6, `docs/project-state.json`, or the existing launch sequence. It records three choices for user review:

1. **Resume product development before returning to Phase 6 — recommended if MEC is required for the first public promise.**

   Advantage: the launch reflects the durable Quest vision. Cost: reopens the feature freeze, requires new DATA/UX/security/integration work, and delays release evidence.
2. **Establish a v1.1/v1.5 product phase after the current launch.**

   Advantage: protects the nearly completed launch path and introduces MEC behind a post-launch migration plan. Cost: initial public UX retains the shorter Quest/Session framing and later requires careful legacy overlays.
3. **Explicitly reopen a selected v1 scope.**

   Advantage: a bounded subset such as Save Quest + Journey + Practice Again could land before launch. Cost: split MEC delivery risks temporary conceptual seams and still invalidates parts of the current Phase 6 evidence.

The contract recommends option 1 only if the user decides the persistent Journey is launch-defining; otherwise option 2 is the lower release-risk path. The user must choose. QST-005 does not choose or authorize sequencing.

## 26. Acceptance decisions

- Immutable Quest plus Player-owned Journey overlay: **ACCEPTED**
- Same Quest ID as Journey anchor: **ACCEPTED**
- Many Sessions and Results per Quest: **ACCEPTED / ALREADY SUPPORTED**
- MEC default as flexible/revisitable: **ACCEPTED**
- Strict stage gates: **REJECTED FOR CURRENT FAMILIES**
- `estimated_minutes` as suggested Session duration: **ACCEPTED**
- Explicit Journey conclusion, never mastery: **ACCEPTED**
- Automatic conclusion: **REJECTED FOR FIRST IMPLEMENTATION**
- `CLEARED` retained as Session Result: **ACCEPTED WITH PRESENTATION CLARIFICATION**
- Save without Session and Start Quest/Start Practice distinction: **ACCEPTED**
- Dedicated Saved Quests collection distinct from History: **ACCEPTED**
- Progressive Quick/Build model: **ACCEPTED**
- Codex Peek, Journal, bounded fretboard, and minimal Craft artifact boundaries: **ACCEPTED**
- Refresh-based cross-device persistence for protected accounts: **ACCEPTED**
- Realtime, media, notation, DAW, and automatic evidence inference: **DEFERRED/NOT REQUIRED**

## Terminal disposition

**QST-005 — COMPLETE — DESIGN CONTRACT**

No application code, route, CSS, migration, RPC, database type, generator behavior, Auth setting, production infrastructure, project-state file, or Phase 6 sequencing was changed.
