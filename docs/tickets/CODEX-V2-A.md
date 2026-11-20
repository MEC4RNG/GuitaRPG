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

### R1 review and validation requirements

1. Verify media **functionality**, not only component presence: C/Cm/F first-inversion note and fret labels; quarter/eighth/triplet/sixteenth grid counts 4/8/12/16; Play/Stop/BPM; C-major 7-degree selector and audio fallback.
2. Test original content coverage 28/14/24/178 and ensure each exercise remains private, unsaved, and ungraded; learn levels ≠ Player proficiency.
3. Confirm proposed relationships have rationales/scopes, never becoming official prerequisites without editorial approval.
4. Confirm consistent desktop tab frames and a compact mobile entry, no horizontal overflow, readable diagram, and keyboard/focus recovery for glossary.
5. Protect canonical 197 V1 entries, all existing Workbooks, auth, sessions, and data identifiers; V2 published corpus stays empty.
6. Require a final-head protected-branch CI receipt and **user interactive visual approval**; PR #14 remains DRAFT/OPEN/UNMERGED until parent JRN-004 is accepted and stacked branch is ready for protected integration.

No Supabase migration, Vercel production traffic change, public Codex publication, or JRN-005 implementation is authorized by R1.
