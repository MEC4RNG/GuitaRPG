# DESIGN-001-F — Implementation Strategy & Migration Plan

Revision 0.1 | 2026-11-27 | DESIGN DIRECTION APPROVED WITH DASHBOARD AMENDMENT; engineering plan for review.
References: DESIGN-001-A/B/C/C-R1, D1/D1-R1/D2, D3–D8 concept studies, DESIGN-001-E. Existing accepted architecture and release gates remain authoritative until explicitly amended.

## 1. Design disposition and final dashboard adjustment
User approved moving beyond E with one change: remove the Skill Map graph from Home. Replace it with a compact development summary adjacent to Today's training. Keep the full Skill Map separately accessible. Example: Scale-Degree Recognition, Estimated II — Developing, 8/10 independent prompts (fictional), practice XP toward next Character Level (illustrative only), delayed recall not yet tested, and a link to training/development. In production use actual accepted records only; unknown/no evidence is explicitly labeled. XP measures engagement, never proficiency. No fabricated overall mastery or domain percentages. Avoid showing metrics the present system cannot support.

Revised local artifact: sound-uncharted-design-001-e-r1.html (conversation attachment, not deployed or in GitHub). Targeted Chromium checks at 1440x900 and 390x844 verified the revised Home, development link and separate Skill Map route, no page errors or whole-page overflow. Prior prototype limitations remain. User approval is directional, not proof of production readiness, exact assets or every future feature.

## 2. Strategy
Incremental replacement of presentation and interaction layers over existing functionality. Do not rebuild the database, rewrite evidence logic, replace stable routes indiscriminately, install alphaTab, or implement all mockup features as launch prerequisites. Build real semantic components with responsive CSS and original text-free artwork assets; no flattened screenshots as UI. Separate view-model assembly from mutations. Preserve legacy main and protected v1-production; maintain a single reviewed integration candidate once baseline is repaired. Each slice has bounded scope, desktop/mobile visual review and technical gates.

## 3. Baseline reconciliation — F0 (first execution ticket)
Live GitHub checks at drafting:
- PR #27 integration-private-beta-baseline head 97c6917d1b96538db92ecf7e240514306c5e2fc7 draft/open/unmerged. Production scaffold and UX release hardening failed; database, identity, data control and security succeeded.
- PR #29 jrn-ux-001-workbook-redesign head 56b67a861bea507a243f321128b331c8bb56ca8e draft/open/unmerged. UX, database, identity, data control and security succeeded; Production scaffold CI failed formatting, skipping lint/typecheck/unit/build. #29 descends from #27's head, not an independent parallel feature to merge blindly. Earlier all-green integration commit 40fcf16ed4a17364921c6a8d6eedaeeffd208140.
- Contextual second Peek experiment remains held separately; do not integrate it. DESIGN-001 docs branch is documentation only. The HTML prototype is not runtime code or migration source.

F0: inspect actual latest production/PR heads and ancestry, working state and checks; branch from reconciled candidate, repair formatting with installed repository formatter, run lint, strict typecheck, unit tests/build and all required browser/security/database/identity/data gates. Investigate actual failures rather than weaken tests. Verify existing Workbook save, display, associations and safe navigation. Reconcile superseded branches with documented scope and no independent overlapping merges. Preserve all original refs until acceptance. Establish immutable passing SHA and functioning nonproduction preview. Stop on unexplained failure. No production merge/cutover. Update project-state only via agreed coordination/authority process, not by this draft.

## 4. Implementation slices (proposed identifiers, each individually scoped)

| Slice | Delivery | Dependency / acceptance |
| --- | --- | --- |
| F0 | Baseline repair and integrated preview | Required green checks, exact SHA, preserved history |
| F1 | Studio Atlas design-system foundation | F0; propose/accept UX_V1_2 amendment to UX_V1_1; semantic tokens, typography, icons, buttons, panels, context headers, dialog/sheet, focus/reflow, production-safe original art catalog; component and contrast checks |
| F2 | Shared shell, navigation and Home | F1; real guest/protected/new/returning/loading/active-session state; prominent resume or Quick Quest; today's training plus development summary; recent owner-scoped pages; no fake future actions |
| F3 | Quest discovery and unified MEC workspace | F2; preserve resolved Quest, draft survival, existing lifecycle and Session controls; Map activity chooser -> selected Explore activity -> explicit Save to Workbook -> existing page in Craft; one inspector, mobile Back; preserve user content and existing RPC authority |
| F4 | Workbook + Codex integration and identity | F3 with F1 components; consolidate standalone and embedded editor, no duplicate document store; saved/pending/conflict behavior, compact context/associations, meaningful names/covers if supported; existing rich text/tab/chord controls; draft lesson gating, truthful source metadata; no new tagging/provenance claims without approved contract |
| F5 | Skill development and Training | F2; real canonical graph data and labeled reviewed edges, list alternative, unknown/estimated status, existing deterministic recommendations and rationale; unsupported generator paths honest; no invented retention/transfer or numerical aggregates |
| F6 | Practice, reflection, history and analytics presentation | F3/F5; reuse Session/Result/evidence pipeline, retain actual timing/settings and self-report distinction; controls usable without audio; no fabricated pitch/technique measurement |
| F7 | Responsive and supporting integration | F2–F6; onboarding/calibration optional, guest recovery, supported search, quick capture only on accepted mutations, empty/loading/error/archived states, keyboard, touch, safe areas, focus and recovery; tablet; data/security coverage |
| F8 | Private beta readiness and release integration | all approved launch-critical slices + existing phase gates; explicit cutover authorization separately |

Sequence prioritizes the original usability pain (MEC/Workbook) before expanded Skill Map functionality. F2 can begin with existing data adapters; no dependency on a fully reviewed prerequisite graph or score model. Slices may be split where required by scope or review. D3–D8 future concepts are design targets, not required launch scope. Do not mark entire roadmap implemented from graphical similarity.

## 5. Surface-to-code ownership map (inspect exact files in F0/F1)
Existing components/app-shell.tsx, lib/navigation.ts, app/globals.css: shared rail/header/mobile and tokens. Home route app/page.tsx and actual existing player/training/quest/history readers: owner-safe dashboard projection; no automatic creation on mount. Quest route app/quest/[questId]/page.tsx, components/quest-journey-surface.tsx and components/codex-peek.tsx: persistent context, activity chooser, focused Explore, single inspector. app/workbooks/page.tsx, components/workbook-persistence-surface.tsx, workbook-editor-prototype.tsx, workbook-display.tsx, workbook-associations.tsx: shared page ownership, revision recovery, contextual links. Existing lib/workbook repositories/templates/context continue as mutation authority. Codex routes and gated V2 preview: preserve content/publication gates. Existing /training, /skills, /character, /history, /session and Result flows: compose accepted projections, no new independent progression store. Exact imports, data contracts and routes to be confirmed at candidate head, not assumed from design docs.

## 6. Component/asset requirements
Use same Shell, rail, contextual inspector, buttons, status chips, musical panel and dialog/sheet across surfaces. Use semantic tokens from D1 as candidates, check actual foreground/background/focus contrasts, readable 16px body, 44px targets, keyboard and reduced motion, zoom/reflow. Create isolated original hero, landscape/topography, compass logo, six domain emblems and optional notebook cover illustrations; record rights, source/revision, intended usage, crop/alt and file budget. Production art must not contain fake diagrams, text, trademarks or embedded mockup controls. Render accurate notation from real structured data. Preserve default performance and safe asset loading. New fonts/dependencies subject to evaluation.

## 7. Future capability backlog (not private-beta blockers unless expressly accepted)
Learning graph review and generation coverage (72 canonical skills, 15 documented Primary-capable targets, 114 draft modules at design baseline); scored interactive exercises, delayed recall/transfer and optional scheduling; richer validated analytics and audio-assisted pitch/onset feedback. Composer Studio, versioned score ownership, isolated alphaTab spike MUS-001, notation/import/export/multitrack and transparent Creator Export, with actual playback/export verification and media rights. Workbook covers/tags/search/provenance/advanced musical blocks, independent tool library, full offline sync, creator/teacher collaboration. Achievements, avatar/guitar cosmetic customization and marketplace after educational/commercial research; no paid proficiency boosts. Optional 3D Skill Map, spatial computing AR/VR and advanced feedback R&D. None authorize migrations or implementation here.

## 8. Verification and rollout
For each slice: inspect exact baseline and affected contracts; create draft branch/PR, implementation plus targeted regression/negative states; full relevant CI (format/lint/typecheck/unit/build, browser/accessibility, database/security/identity/data); preview desktop/mobile and task-based user review; document acceptance and limitations. Existing RLS, revision conflicts, context ownership, idempotency, draft content, guest protection and immutable Results are non-negotiable. Verify direct navigation and browser Back, no whole-page overflow, actual keyboard and focus recovery, active-session priority, read-only archives, unsupported/unknown data and missing assets. Check asset weight/performance against baseline; set measured budgets before release. No learner-efficacy claims based on UX testing.

Reconcile original Phase 6B sequence and remaining JRN-005/FRET-001/QST-009/TRN-005/DATA-005/SEC-002/REL-007 with new scope; do not silently supersede or mark complete. After REL-007 PASS resume OPS-001 (refresh release-specific backup/restore, security, deploy, smoke, logs, SHA evidence), REL-006 and P6-GATE-001. CUTOVER-001 remains separately authorized only after gates pass. Preserve legacy fallback and do not merge or publish without explicit authorization.

## 9. Next actionable checklist
- [x] Record E directional acceptance and Home graph removal.
- [x] Produce revised standalone E-R1 and targeted responsive verification.
- [x] Draft implementation slice/dependency/validation plan.
- [ ] F0 — recover and validate integrated baseline, publish only nonproduction preview.
- [ ] F1 — accepted design-system amendment, token/component/asset catalog and visual review.
- [ ] F2 — implement actual shared shell and real-data dashboard.
- [ ] F3/F4 — test Map -> Explore -> save -> Craft -> Practice and shared Workbook/Codex flows.
- [ ] F5/F6 — learning and practice presentation using existing authority.
- [ ] F7/F8 — support/responsive, privacy and release readiness.

No application changes, PR merges, migration, production deployment or new dependencies were made in this planning step. Directional acceptance of E is not authorization to bypass implementation or release gates. 
