# CODEX-V2-A — Shared Content Authority, Entry Renderer & Dictionary (isolated pilot)

**Status:** AUTHORIZED — IMPLEMENTATION IN PROGRESS (2026-11-20)
**User authorization:** "lets proceed to the next milestone then", following acceptance of the unified Codex V2 v5 pilot and recommendation to implement CODEX-V2-A.
**Scope:** A narrow, non-production reviewable integrated content/rendering layer, separate from JRN-004's still-draft Quest/Workbook PR #13.
**Branch:** `codex-v2-a-content-renderer`, branched from JRN-004 draft head `e9b462e02a72d62c9fe0fe85ffdc0f5c2b576a55`; **stacked** draft review target `jrn-004-mec-workbook-integration`. Do not merge this Codex work while JRN-004 is awaiting explicit acceptance; do not start JRN-005 or alter `v1-production`/`main`/production.
**Authority:** `AGENTS.md`, `docs/MASTER-BUILD-PLAN.md`, `docs/project-state.json`, `docs/tickets/CODEX-001.md`, `docs/tickets/CODEX-002.md`, JRN-000 Workbook architecture, QST-005 Journey contract, canonical taxonomy and `CODEX_CONTENT_V1`.

## Goal and constraints

Implement a versioned, source-controlled **public educational content** contract alongside the existing 197-entry Codex V1. Preserve canonical identities (kind, slug, UUID), legacy routes, search, and Codex Peek. Make a reusable entry renderer and vocabulary interactions available in an **isolated nonproduction Preview route** for the three V2 pilot Skills (Scale-Degree Recognition, Triad Construction, Subdivision Control), with clear draft labels. No unreviewed material is published as an official lesson.

### Accepted implementation decisions

- `domain/codex/v2/published.json` is the authoritative V2 published corpus. Start with **zero** V2 published entries/terms until music-editor approval; absence must **fall back to the existing V1 Codex** without a fake gap in coverage.
- `domain/codex/v2/preview.json` contains bounded excerpts from the three pilot designs **only for non-production demo**; draft copy, proposed relationships, and exercises carry no recommendation/mastery authority.
- A pure parser validates schema version, canonical taxonomy identity, uniqueness, bounded fields, module/application/level consistency, editorial state, glossary cross-references, and published-only gating. Unknown and duplicate values fail closed.
- Shared React entry UI: one section navigation system, level and application filters, plain-language explanations, expandable instructional modules, links to current canonical Codex entries where known, and accessible short-definition pop-ups with explicit full Dictionary/Codex navigation. Display one entry at a time with an intentional way back to Library.
- A single nonproduction-only prototype route offers browse/search of the three reviewed-as-design pilots; it is disabled on Vercel public production.
- A future approved entry can render in an existing `/codex/[kind]/[slug]` route, while entries without a published V2 document continue rendering V1 exactly as before.
- Code neither creates Sessions nor writes Workbooks, Quests, evidence, proficiency, XP or Player data. No Supabase migration or production environment change.
- `CODEX-V2-B` (Quest Map consumer), `CODEX-V2-C` (full library indexing), `CODEX-V2-D` (editorial/media expansion), and `JRN-005` personal-page discovery are separate tickets.

## Acceptance and gate

1. Validator rejects orphan taxonomy UUID/slug/kind, duplicate entry/module/term IDs, bad stages/application refs, malformed or overlong text, and unapproved published content.
2. Published dataset is currently empty; 197 legacy V1 entries and routes remain available. Draft V2 entries are **never** shown by the public V1 content resolver.
3. Nonproduction review route demonstrates search, three Skills, level/application filtering, modular instruction, keyboard/mobile accessible glossary with focus recovery, and clean fallback for missing glossary/Codex reference.
4. Deterministic tests for published/draft gating and identity. Browser smoke for responsive, keyboard, no horizontal overflow and overlay behavior.
5. Format, lint, strict TypeScript, tests, production build and required CI evidence. No claims of visual acceptance from automated checks.
6. Remain draft/unmerged until JRN-004 is accepted/merged, rebase onto protected `v1-production`, and separately obtain Codex preview acceptance and final-head required CI.

## CODEX-V2-A-R1 — Restore Interactive Content and Entry-Focused Layout

**User authorization:** "Let's proceed with CODEX-V2-A-R1, or do I need to switch over to chatgpt codex?" (2026-11-20).
**Disposition:** IMPLEMENTED ON DRAFT BRANCH; AWAITING FINAL-HEAD CI AND USER DESKTOP/MOBILE VISUAL REVIEW. Do not merge PR #14.

### Review findings

User review did not accept V2-A's visual/content parity. The integrated renderer lost the original pilot's musical references and educational depth, displaying 9 modules, 9 applications, 6 proposed relationships, and 7 glossary examples in place of 28 / 14 / 24 / 178 respectively. The Library banner repeated on individual Skill pages, making entry hierarchy clunky; Overview and other section panels used inconsistent composition.

### R1 implementation

- Restored design-pilot **28 instructional modules** (10 Scale-Degree Recognition, 6 Triad Construction, 12 Subdivision Control), **14 applications**, **24 proposed relationships** and **178 draft vocabulary definitions** directly from the retained V5 unified pilot manifest. Exercise objectives, setup, self-check, suggested minutes, learning goals, relationship rationale/scope and application summaries are preserved.
- Added strict bounded parsing for additional instructional fields and a typed, allowlisted reference-block contract. Published content remains empty; preview material is **DRAFT_REVIEW**, not a published or mastery-evidence authority.
- Restored a playable 4/4 rhythm reference with BPM control (40–180), quarter/eighth/triplet/sixteenth grids, beat indication, explicit Play/Stop and an AudioContext scheduler initiated by user gesture. No audio runs by default and no Session/progression is written.
- Restored verified standard-tuning triad placements on strings 3/2/1: C major (5/5/3 = C4/E4/G4), C minor (5/4/3 = C4/E♭4/G4), F-major first inversion (2/1/1 = A3/C4/F4). Diagram is derived from stable typed note/fret data; wrong alternate-tuning mappings are not implied.
- Restored interactive C-major scale-degree selection (1–7), audio note preview, related Major Scale and Tonal Center references. Added related chord inversion/voicing and subdivision/triplet references beneath their corresponding tools.
- Introduced a dedicated **How to Explore** section and restored full application descriptions, learning-level scope and proposed connection reasoning.
- Reorganized UI to show a compact Library banner on Library only, compact Dictionary header in Dictionary, and a Skill-first hero within entries; the overview pairs instructional content with the musical reference. Section panels share widths/spacing, use a bounded desktop minimum height and natural mobile height.

### Musical verification assumptions

The triad display uses concert-pitch standard guitar tuning. On the G3/B3/E4 strings, fret positions [5,5,3] yield C4/E4/G4 (C major), [5,4,3] yield C4/E♭4/G4 (C minor), and [2,1,1] yield A3/C4/F4 (F major first inversion). No default tuning adjustment is inferred.

The subdivision reference uses four **quarter-note** beats per 4/4 bar. Grid density is 4, 8, 12 or 16 events for 1, 2, 3 or 4 evenly spaced subdivisions per beat; BPM remains the quarter-note reference. Audio uses explicit user gesture and is not a persisted Session.

### R1 review and validation requirements

1. Verify media **functionality**, not only component presence: C/Cm/F first-inversion note and fret labels; quarter/eighth/triplet/sixteenth grid counts 4/8/12/16; Play/Stop/BPM; C-major 7-degree selector and audio fallback.
2. Test original content coverage 28/14/24/178 and ensure each exercise remains private, unsaved, and ungraded; learn levels ≠ Player proficiency.
3. Confirm proposed relationships have rationales/scopes, never becoming official prerequisites without editorial approval.
4. Confirm consistent desktop tab frames and a compact mobile entry, no horizontal overflow, readable diagram, and keyboard/focus recovery for glossary.
5. Protect canonical 197 V1 entries, all existing Workbooks, auth, sessions, and data identifiers; V2 published corpus stays empty.
6. Require a final-head protected-branch CI receipt and **user interactive visual approval**; PR #14 remains DRAFT/OPEN/UNMERGED until parent JRN-004 is accepted and stacked branch is ready for protected integration.

No Supabase migration, Vercel production traffic change, public Codex publication, or JRN-005 implementation is authorized by R1.

### R1 follow-up — application availability and desktop sizing (2026-11-20)

User interactive review requested clearer progress coverage: a Skill's educational levels are not a promise that every Application has a lesson at each level. Editorial expansion may aim for Foundational, Intermediate, and Advanced material for each Application, but **never fabricate modules or mark a Player proficient** to fill an empty cell.

Changes on the same stacked draft PR:
- Lessons and How to Explore retain the complete application list in the native selector. For the selected *instructional* level, options without any actual matching module are visibly labelled "no lesson at this level" and disabled, rather than silently filtering them away.
- Level changes recover from a stale application choice by selecting All applications; available options remain selectable.
- The level selector is a manual **instructional-content filter** only. It does not read or write Player proficiency, and missing level/application combinations remain editorial backlog rather than inferred completion.
- The Applications view shows learning levels with **existing modules**, not declared editorial applicability where the actual module coverage is incomplete. The application and its explanation remain discoverable even when a lesson is unavailable.
- Collapsible lesson summaries have a visible, rotating disclosure arrow and retain native keyboard/assistive technology `details/summary` behavior.
- Entry and all section frames use the Overview's combined content width on desktop (full width up to the same 68rem max), while remaining fluid on mobile. Stable scrollbar gutters prevent horizontal shifts when section content changes document height; do not use a fixed minimum that overflows smaller viewports.
- New focused browser assertions cover Scale-Degree Recognition / Theory & function / Advanced as a disabled option, clearing an invalid selection when switching learning levels, lesson disclosure open/close, discovery of disabled applications in Applications, and section width parity at desktop size.
- Browser tests resolve the exact **Lessons** tab label to avoid matching the separate **Explore lessons** call-to-action on Overview; the initial strict-selector failure did not reflect a feature failure.
- A separate Playwright compatibility issue was found: `<option disabled>` is rendered correctly, but `toBeDisabled()` on an `option` returned a false negative. The browser contract now checks the HTML `disabled` attribute and verifies the active selection clears to All when needed.

Preview and existing 197 official Codex entries remain unchanged by publication. Await final-head CI and user visual acceptance; PR #14 remains draft.

## CODEX-V2-A-R2 — Curriculum Coverage: First Editorial Expansion (2026-11-21)

**User direction:** continue development in the most valuable direction after accepting the new desktop content width. This is a bounded continuation of the existing CODEX-V2-A review branch; do not begin CODEX-V2-B or JRN-005.

### Rationale and scope

The shared renderer, navigation, musical references and mobile behavior are established. The largest remaining content gap is the 14 missing combinations of three instructional levels (Foundational, Intermediate, Advanced) across the three pilot Skills and 14 named musical applications. R2 adds **nine original lessons** that address common entry points and advanced musical reasoning while retaining the user's requested grayed-out behavior for genuine gaps. This is an editorial draft, not a claim of pedagogical verification or published instruction.

| Skill | Previously authored | New R2 drafts | Total draft modules | Application/level coverage |
| --- | ---: | ---: | ---: | ---: |
| Scale-Degree Recognition | 10 | 4 | 14 | 14 / 15 |
| Triad Construction | 6 | 3 | 9 | 9 / 12 |
| Subdivision Control | 12 | 2 | 14 | 14 / 15 |
| **Total** | **28** | **9** | **37** | **37 / 42** |

**New Scale-Degree Recognition drafts:** Advanced Theory & function (distinguishing D7→G tonicization from an established modulation; F♯ as chromatic raised fourth relative to C and leading tone toward G), Advanced Fretboard (reinterpret the same pitches against different tonics), Foundational Composition (two short degree-based phrases), Intermediate Composition (degree-preserving transposition between C and G major).

**New Triad Construction drafts:** Foundational Listening (hear the changing third in C major/minor), Intermediate Harmony & construction (diatonic triads on all seven major-scale degrees, including B diminished), Foundational Arrangement & voice leading (shared notes C and E between C major and A minor).

**New Subdivision Control drafts:** Advanced Listening (recover a 4/4 quarter-note beat beneath displaced accents; explicitly do not claim custom accent generation by the demo player), Foundational Composition (4 quarter-note attacks versus 8 eighth-note attacks at an unchanged tempo).

Each new lesson has three or more explicit outcomes and a self-contained exercise with setup, four or more steps, self-check, suggested minutes, no automatic progress, and `DRAFT_REVIEW` editorial status. New module IDs are distinct; original modules are preserved. Application `level_ids` represent actual authored coverage rather than optimistic curriculum intent.

### Remaining review-only curricular gaps

The following five combinations remain visible and disabled in Lessons until authentic material is written:
- Scale-Degree Recognition — **Improvisation / Foundational**
- Triad Construction — **Harmony & construction / Advanced**
- Triad Construction — **Listening & chord quality / Advanced**
- Triad Construction — **Arrangement & voice leading / Intermediate**
- Subdivision Control — **Composing rhythm / Intermediate**

They are **not** inferred, automatically created, or treated as prerequisites or proficiency signals. Existing `hasLessonAtLevel` UI behavior and correct disabled option labels remain active.

### Music-editor review gate before any promotion

Review harmonic meaning of **secondary dominants/tonicization** and spelling of altered scale degrees; check major-scale diatonic triad construction and diminished quality; ensure standard-tuning pitch and interval examples are accurate; verify beginner listening exercises avoid fixed emotional stereotypes; and distinguish rhythm density, accent and underlying beat. Confirm applicability to guitar while allowing neutral notation/piano equivalents where appropriate.

Tests must verify 37 authored modules, 37/42 coverage, the nine new DRAFT_REVIEW module IDs, accurate available and unavailable application-level options, no XP/progression writes, and that 197 canonical V1 entries stay published with V2 published material still empty. Terminal CI, desktop/mobile user review and parent PR #13 acceptance remain outstanding merge gates.
