# DESIGN-001-C — Experience Architecture & UX Redesign

Revision 0.1 | 2026-11-25 | DRAFT FOR PRODUCT REVIEW
Parent: DESIGN-001-B (ea2e94c261a7842e200eb0992917137a06cf435a)
Status: information architecture and low-fidelity design; not an accepted contract or authorization to modify the application.

## 1. Experience goal

Sound Uncharted should feel like one musical environment. A player can enter through improving a skill, investigating a musical idea, or making music, and move between those activities without rebuilding context. Navigation answers where am I, what am I working on, and what can I do next. Architecture vocabulary (module keys, association types, revision IDs) belongs behind the experience.

Preserve QST-005, JRN-000, DIF-001, PLY-001, EVD/PROG/TRN contracts and DESIGN-001-A/B. One-action Quick Quest remains available; MEC is revisitable, not an enforced sequence; opening a lesson, editing a page or changing mode never starts a Session or creates proficiency. Private Workbooks are independent of Quests.

## 2. Information architecture (proposed)

Desktop: persistent collapsible application rail, stable top context header and main canvas. Narrow/mobile: Home, Quests, Skill Map, Codex, Workbooks as five visible bottom destinations; Training, History, Profile, Quick Quest accessible via global menu, Home and context. Quick Quest is a prominent one-action command, not a competing permanent destination. Profile/settings always reachable. Search can evolve into cross-library discovery; do not imply it works across private and official collections until scoped, owner-safe search exists.

| Destination | Main purpose | Existing routes / proposed mapping |
| --- | --- | --- |
| Home | Resume, suggested next action, recent material, review prompt | / |
| Quests | Discover, build, saved/in-progress/completed journeys | /quests, /generate, /quest/[questId] |
| Training | Explain and select targeted practice | /training |
| Skill Map | Browse relationships and player evidence | /skills; /character becomes accessible within development, not deleted |
| Codex | Browse and search official musical knowledge and tools | /codex; gated V2 is draft |
| Workbooks | Browse and work on private material | /workbooks; future score editor opens from an existing score block |
| History | Session-first evidence and reflections | /history |
| Profile | Account, preferences, accessibility, privacy/data controls | /profile |

No path changes in C; test the labels/order, and preserve deep links, direct routes, browser history and old navigation access during future migration. Practice/Result are task surfaces not permanent destinations. Onboarding: one immediate entry, optional calibration with skip/unknown status, concise recovery/guest disclosure, return to intended action. Do not require full instrument assessment before playing.

## 3. Common layout system

Desktop: application rail (~200–240px expanded; compact icon rail), content header (breadcrumb/current context, persistent primary action), main canvas (fluid min-width 0), at most one optional contextual inspector (~320–380px when room). On compact laptops collapse inspector or rail before squeezing notation; do not force three panes when content cannot fit. Breakpoints and widths are hypotheses. Top-level page title, action and content hierarchy consistent. One global nav, not competing internal app headers. Canvas supports focus mode; global access remains recoverable.

Mobile: five destinations, safe-area-aware; one main canvas at a time. Contextual inspector becomes full-height sheet/route-like view with clear Back, explicit close, predictable focus restoration, keyboard access and no nested modals. Page list becomes a drill-down selector; retain scroll, focus and unsaved state where feasible. No whole-page horizontal overflow; musical notation may scroll internally with accessible labels. Avoid hover-only affordances.

Status language: saved/pending/conflict/offline/error, estimated/established/unknown, draft/approved, and archived/read-only distinct from progress. Color supplements text/icons; never color alone. Reduce motion and support touch/keyboard/screen reader. Stage choices remain available; no implied unlock gating.

## 4. Home and Quest discovery

Returning player: dominant Resume current Journey card (where left off, current focus, next action, last accepted context). If multiple journeys, show recent/resumable choices, not an arbitrary sole active quest. Secondary recommended practice with brief rationale and available time, Quick Quest always visible, recent Workbook pages, and compact development insight. Review queue is future and optional, not streak pressure. Empty/new player: Quick Quest and guided calibration/starting point, no fabricated data. Session currently active: Resume Session outranks new practice; explicit abandon/end before a conflicting Session as accepted contracts dictate.

Quest discovery: saved journeys separated from recommendations/generation. Quick Quest preserves immediacy; Build exposes allowed choices progressively (goal, musical material, context, challenge). Show objective, actual criteria, estimated duration, absolute demand vs personal challenge and uncertainty, why recommended. Accept/start journey distinct from starting a timed practice Session; preserve draft on navigation. Save or discard deliberately. Archived journey opens read-only; archived edits/attachments not offered unless restored through existing lifecycle.

## 5. Unified MEC workspace

Design thesis: same Journey header, same mode control, same workspace canvas; Map/Explore/Craft changes the working content, not the identity of the Quest. Desktop inspector is a single optional slot (reference OR saved material OR detail); mobile it replaces foreground view temporarily. Do not stack a second Codex drawer to recreate How to Explore. Keep Open full Codex as an explicit deep link (optional new tab), not mandatory flow.

Persistent Quest header: breadcrumb Quests > Melodic Navigation; title and concise objective; lifecycle, personal challenge/status, target demand and suggested time only if known; Map / Explore / Craft; deliberate Practice action. Compact on mobile. No false percentage completion across revisitable modes.

### Map — Understand and choose

Main hierarchy: objective/success criteria, relevant actual constraints, selected ingredient (primary, supporting, required etc), concise explanation, then How to Explore. Learning list organized by application with difficulty filter (Foundational/Intermediate/Advanced; editorial lesson level, not player proficiency). Show title, purpose, optional tool and availability; no lesson creation here. Single clear per-row action: Explore activity. Navigating opens Explore with activity identity, relevant skill and context; no new page, Session or Result. Interactive reference belongs inline when useful; deep detail in inspector. Related skill connections can open Skill Map neighborhood without changing Quest. Map stays the discovery location; remove duplicated How to Explore surfaces.

### Explore — Try and capture

Main canvas: focused selected activity, why/goal, instructions and relevant interactive tool (not mandatory if none). Show a compact activity picker to switch among Quest ingredients and lessons; retain per-activity position if feasible. Expose Try/Check answer only for genuine scored activity; preview examples are labeled. Include useful self-check, then optional Save to Workbook. The main exercise is usable without a Workbook. Existing saved material appears in a compact My material rail/inspector, not several competing editors. The existing linked pages may still be opened directly. Selecting a linked page moves focus to the same shared editor in the canvas (or opens standalone by explicit action); preserve activity and return context. Don't auto-create a page simply by opening Explore.

Save flow: explicit sheet/dialog showing current activity and proposed destination: Existing Workbook with searchable list, or New Workbook with title, optional page title. Preview what will be copied (lesson/exercise template, personal notes or supported tool snapshot). No silent conversion/overwrite; unsupported tool export is labeled deferred. When already linked, Open saved page and an explicit Save another copy where appropriate. If saving existing page association, label Link existing page, not copy. Only accepted persistence+association shows linked success; partial failure reports saved page but link failed and offers idempotent retry, not duplicate creation. Show actual destination and Open here / Continue exploring. No automatic stage shift or Result. Do not require a separate trip to Codex or Workbooks.

### Craft — Apply and develop

Main canvas defaults to selected existing musical material or a clear choice to start new work. Use same document/page IDs and versioned editor; no Quest-owned copy and no forced new composition. Reopen the chosen page with an explicit selection. Show page title and current entry context, compact page nav, Edit / Display (future Practice), focused text/tab/chord workspace. Inspector holds relevant references OR material selection. The future Score Studio is opened only when editing a score block, not a mandatory editor for simple notes. Supported future capture from tools uses versioned blocks, no renderer authority. Practice can start from Quest header or focused eligible context without changing the original Quest criteria. Creating music is not automatically graded.

### Context vs origin

Differentiate current route (Opened from Quest > Explore > Scale-Degree Recognition), durable page creation source if actually recorded (Created from Codex lesson), and optional links (Linked to 3 Quests / 2 Quest Skills). Current context header is prominent, with explicit Back to activity/Quest when known. Do not claim first origin from an editable content marker, count arbitrary related skills as linked, or conflate active context and historical provenance. The origin/source marker is convenience only today; authoritative durable provenance requires separately reviewed design/data contract. On standalone page without verified origin show Workbook / Page, plus existing associations; no invented origin. Many links collapse into one expandable count. Preserve links as independent edges; unlink does not delete page.

## 6. Codex, Skill Map and Training

Codex standalone: browse domains/search, selected entry with compact overview and reference tools, applications, lessons/How to Explore and connections. Consolidate repeated instructional affordances in C/D prototype; retain underlying approved content and level filter. Official reference stays read-only; player may explicitly Save to Workbook without Quest or Add to Quest context when a valid target exists. Contextual Peek: definitions, relevance, one useful reference/related link and Open full entry. In Quest Map, How to Explore remains the source of lesson choices; Peek supports understanding, not another separate lesson picker. From standalone Codex offer Try activity here, optional Train this skill if generator-supported, Save to Workbook with explicit choice. Draft educational content remains gated/unpublished.

Skill Map: 2D six-domain atlas -> selected domain -> local skill neighborhood -> detail. Semantic zoom/search/filter, accessible list alternative, clear edge types; provisional editorial edges labeled. Skill detail includes description, evidence status, confidence, recency/readiness, recommended foundations (not universal prerequisites), related applications, training entry if supported, Codex link and relevant private pages if available. No fake ratings, unsupported train action or automatically propagated mastery. A future spatial/3D presentation uses the same identities and relationships, not a second graph.

Training: goal/intent, time and challenge preference, recommended skills with rationale grounded in current deterministic ranking. Player can choose alternatives, see actual personal difficulty and uncertainty, then generate concrete Quest and enter Map. Show why a skill is unavailable for generator or why calibration is suggested. Future review/retention/transfer recommendations are separate, labeled not implemented today. Don't imply sensor feedback or predicted success.

## 7. Standalone Workbook and future score workspace

Desktop: library + page navigator (collapsible, responsive) + dominant document canvas; inspector only when useful, not fourth persistent pane. Mobile: library -> Workbook page list -> page; Back restores location. Page editing and management actions separate. Search titles/pages; active/recent/archive clearly distinguished. Show title and save status prominently. Edit with clear insert controls; Display renders same accepted structured document without editing controls. Pending/failed save blocks leaving/remounting until explicit safe recovery; preserve unsaved data and conflict path. In focus mode hide navigation without sacrificing Back or Edit/Display. Practice (future) offers reading/playback/loop/tempo/large page navigation; no automatic evidence. Score Studio full-screen from advanced Musical Score block (future); do not commit to alphaTab before evaluation. Export/restore/history remain behind tools. Private by default, no accidental publishing/sharing.

## 8. Practice and reflection

Focused Session surface: Quest context/criterion, elapsed time and controls, metronome and relevant musical material. Start/pause/resume/end explicit. Preserve state if referencing Codex/Workbook; changes to immutable objective/criteria require a new variant, not silent edits. Current instrumentation measures time/settings/reps only; self-reported criterion evidence remains valid. Optional future scored prompts/audio/advanced feedback show modality, sample and uncertainty. No mandatory audio capture, no physical-technique inference from audio. Start on a different device follows accepted session recovery rules. On exit with pending evidence, guard navigation/recovery; no fabricated success.

Reflection: result criteria first, brief subjective observations/difficulty, optional future feedback. Save Result via accepted exactly-once pipeline; then show outcome, what evidence changed, what did not, and next useful options (repeat, return to Journey, train related skill, view record). Completing a Session does not finish Journey; finishing a Journey does not prove mastery. No coerced streak or positive outcome. Future retention suggestions clearly distinct from recency readiness.

## 9. Reference journey and annotated low-fidelity wireframes

Use fictional intermediate guitarist, Melodic Navigation / Scale-Degree Recognition / C major / standard tuning. The actual draft lesson sdr.aural.f1 is “Hear the tonal home.” Other illustrative measurements/content are fictional, not generator/runtime claims.

| Screen | Header/action | Main canvas | Optional inspector / mobile sheet |
| --- | --- | --- | --- |
| Home | Quick Quest; Resume | Continue Melodic Navigation, today's suggested focus, recent pages | compact development snapshot |
| Quest discovery | Choose challenge | Quick/Build, recommendation rationale, criteria, accept | difficulty explanation |
| Map | same Quest header; Practice | objective -> skill ingredient -> How to Explore -> Hear the tonal home | Codex reference |
| Explore | same Quest header; Practice | focused lesson, listen/recall reference, self-check, Save to Workbook | saved pages / activity details |
| Save sheet | Save / Cancel | existing/new Workbook, title, copy preview | no second modal |
| Explore saved | same Quest header | accepted destination, Open here or Continue exploring | linked page |
| Craft | same Quest header | Melodic Study / Hear the tonal home, edit/display, develop motif | relevant reference |
| Practice | end/pause | criterion, timer, musical material, metronome | optional reference |
| Reflection | Save Result | actual criterion and notes, then evidence-aware next step | optional record details |
| Skill Map | Train/Explore | domain/local neighborhood, status and evidence | skill detail |
| Workbooks | Edit/Display | independent document and source/links | page/library selector |
| Codex | Try activity | standalone entry and learning choices | related material |

Core flow: Home -> Map -> choose activity -> Explore -> Save dialog -> accepted linked page -> Craft (explicit choice) -> Practice -> Reflection -> Result -> return to Journey/Skill Map. The same page is discoverable independently in Workbooks. No forced detour. Alternate flows: Quick Quest straight to Session after required setup; Codex without Quest; direct composition; old linked page reused; unknown skill; invalid/archived link; offline/pending/conflict; guest; mobile. Each has clear return and no implicit writes.

## 10. Prototype, UX tests and migration

C deliverables: proposed nav, screen/interaction contracts, reference journey, low-fidelity concept. D: coordinated visual system and high-fidelity desktop/mobile screen designs; E: isolated navigable prototype with fictional data, functional mock transitions and labeled future controls. F: explicit mapping to existing routes/components, migration order, regression and accessibility/security gates, preserve old branches. No UI implementation in current branch.

Test with unfamiliar users, including guitar beginners and experienced players, keyboard and mobile users. Tasks: generate one useful Quest; find/understand a foundation; Map -> selected activity; save to selected Workbook; identify origin/current context; open same page from Craft and standalone; read without controls; start/pause/finish practice; understand evidence/next recommendation. Compare current and new flow for completed tasks, clicks/context switches, time, errors/accidental creation, navigation recovery, saved state comprehension and confidence interpretation. Set quantitative thresholds only after baseline observations. Include rejection/error states and non-assessed creative path. No efficacy claims from usability outcomes.

Proposed decisions requiring product review: global rail and mobile destinations (Training direct vs Skill Map/Quests access), single inspector rather than drawer stack, Map as learning chooser and Explore as activity workspace, contextual editor versus explicit standalone, placement of Practice action, compact origin/links and whether/when to add trusted provenance. Confirm against full prototype rather than commit prematurely.

No changes to application code, database, existing branches, project state, or release. JRN-UX-001 PR #29 remains separate and had formatting validation outstanding at last recorded check. Contextual Peek experiment remains parked. D/E can use full future vision but must mark deferred functionality. No new production readiness claim.