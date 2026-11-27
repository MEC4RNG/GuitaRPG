# Sound Uncharted — Codex-to-Workbook & Configurable Triad Reference Proposal

**Status:** DESIGN PROPOSAL ONLY — not authorized for persistence implementation or production publication.
**Input:** User review of CODEX-V2-A-R3 (2026-11-21).
**Build context:** CODEX-V2-A draft PR #14 stacked on pending JRN-004 draft PR #13.

## Decision 1 — How to Explore disclosure parity

How to Explore exercises should use the **same native `details/summary` disclosure contract** as Lessons, including a chevron that rotates on expansion, visible activity/application labels when collapsed, keyboard/assistive-technology support and independent per-card state. This is a bounded CODEX-V2-A display fix; do not create Workbooks or write Player data in the draft renderer.

## Decision 2 — One reusable source-to-Page template, not 42 hand-authored Workbooks

The 42 pilot lessons already contain a canonical Skill identity, application, level, module ID, editorial status, outcomes, explanation and exercises with setup, steps, self-check and suggested minutes. Use that **structured content** to build a deterministic `GUITARPG_WORKBOOK_DOCUMENT_V1` Page starting document on demand. Avoid individual hardcoded "lesson workbooks" and avoid automatically creating an entire Workbook per lesson.

**Preferred UI:** A visible `Practice in Workbook` action inside an expanded Lesson or How to Explore card. It offers `Add to existing Workbook` (preferred default for an existing Player Workbook) and `Create a new Workbook`. If the relevant Page was previously imported, offer `Open existing` and `Create another` explicitly. A Workbook can contain many Pages and a single Page can include the selected lesson's exercises. No duplicate creation just by opening a lesson.

**Template Page contents:** descriptive title; source Skill and canonical Codex link; application and instructional level; learning objectives; original lesson/activity instructions; a self-check and clearly editable response area; optional supported tablature/chord blocks only when their meaning is verified. The Player's edits belong to the Player; subsequent changes to official instructional copy **must not overwrite** the accepted Page revision.

**Stable provenance:** Record immutable source identity (`Codex kind + UUID/slug`, `module_id`, optional `exercise_id`, `content_version/revision`, human-readable source title), separately from the Player's versioned document. A future owner-scoped source association or schema extension needs its own authorized ticket; do not misrepresent the existing JRN-004 Quest context edges as permanent lesson provenance. A draft preview cannot create official/published lesson evidence.

**Quest linking:** A Page created from Codex starts unassociated unless the user explicitly chooses an owned Quest. If opened within a Quest, the same Page generation can begin with a validated optional Quest/stage context. After a successful write, attach via the existing owner-checked JRN-004 relationship operation where applicable. An attach failure leaves the private Page intact and displays a recoverable "Created, but not linked" state. The Player can use `Attach existing Workbook/Page` from Map/Explore/Craft; the correct Page reopens in the **same** editor, with the usual autosave and conflict safeguards.

**Privacy and progression:** Auth ownership/RLS and pending-save navigation rules are unchanged. Neither opening the Page nor linking to a Quest starts a Session, claims evidence, awards XP, changes proficiency or creates a Result. Validate user-provided context; never trust a client owner ID or arbitrary redirect. Deleting a Quest removes associations, not Player Workbooks.

**Deployment gates:** Do not make draft-only Codex instructional content visible in production to support this action. A non-writing UI prototype could demonstrate the proposed template in CODEX-V2-A, but authoritative creation, deduplication, provenance, context links and owner security belong to a separate explicitly authorized integration ticket after JRN-004 and appropriate Codex content review.

## Decision 3 — Parameterized triad diagrams, not a separate widget per chord

Replace three individually hardcoded triad buttons (C major / C minor / F major first inversion) with a **reusable, verified triad-voicing resolver**, whose UI can eventually expose:

1. **Root:** chromatic note, including correct spelling where needed (e.g., C♯ vs D♭).
2. **Quality:** Major or Minor initially. Diminished, Augmented, and other structures are separate educational extensions.
3. **String group:** adjacent groups 1–3, 2–4, 3–5, 4–6 (guitar numbering high E=1 to low E=6).
4. **Voicing / inversion (optional):** available candidates on the chosen group, labeled Root, First or Second inversion from the **lowest sounding chord tone**, with fret location and exact played pitch labels.

Use standard tuning `E2 A2 D3 G3 B3 E4` initially. Enumerate playable fret/pitch candidates for the three chosen strings; require **one root, one third and one fifth**, with the correct major/minor semitone distances and spelled note names. Filter or rank for modest fret span, reasonable guitar ergonomics and requested inversion. Where no verified candidate exists under the current search bounds, show an honest unavailable message rather than fabricating fingering. Changing the root/quality/group must reset stale unavailable voicing selections safely.

**Validation:** unit tests for all available selections (actual MIDI pitches vs note names, chord membership, three distinct tones, inversion labels, fret bounds, correct string numbering and non-overlapping diagrams), focused manual guitar-fingering checks, and Chromium/mobile WebKit/320px keyboard/touch/overflow checks. Do **not** imply that a displayed voicing supplies physical finger placement: dots initially represent pressed notes/frets, not which fingers to use. Preserve any truly useful existing reference interactions and explicit audio fallback.

**Implementation sequence:** first replace the existing C/Cm/F hardcoded choices with resolver-driven results that reproduce their exact verified standard-tuning output; next introduce the Root/Quality/String-group controls in the nonproduction preview; then provide alternative voicings and extension to additional chords/tunings only after verification. A reusable music-theory/voicing core can power the Codex, Workbook chord diagrams and future Quest views without copying each shape by hand.

## Release / acceptance boundary

This proposal changes **no** ownership, Supabase migrations, Quest lifecycle, Session/Result/XP/proficiency, or published V2 content. The three-Skill Codex pilot remains `DRAFT_REVIEW`; the published V2 corpus stays empty. JRN-004 PR #13 and CODEX-V2-A PR #14 remain draft/open/unmerged. The full Codex-to-Workbook feature and generalized triad resolver are candidates for their own explicit scoped implementation decisions, code review, CI and human acceptance.
