# DESIGN-001-D1 — Visual Language & Art Direction

Revision 0.1 — draft for review; no implementation authorization.
Parent: DESIGN-001-C-R1 (496313b5af282d1f77b07b99b57d27c591519757).
Purpose: establish a coherent graphical identity for the full future product before designing every surface. Retain accepted UX_V1_1, accessibility, QST-005, JRN-000, evidence and release contracts until an explicit design-system amendment.

## 1. Creative thesis

**Studio × Explorer × Journal.** A professional musical workspace that makes progress feel like discovering new territory. Sound Uncharted should feel made for musicians, not like a generic administrative dashboard or a medieval game.

The Studio supplies functional precision; the Explorer supplies a sense of direction and discovery; the Journal supplies calm reading and making surfaces. The three are variations of one design language. Brand accents, spacing, icon geometry, typography, interaction, accessible states and navigation remain coherent across modes.

Design vocabulary: ink, brushed brass, guitar craftsmanship, contour lines, engraved/etched geometric detail, quiet warm paper, musical notation. Use cartography and subtle atmospheric depth selectively on discovery surfaces. Never overlay textures on important music or instructional copy. Avoid large numbers of equally weighted cards, glass-heavy UI, distressed typography, fantasy ornament, excessive neon, faux neurological imagery as evidence, and decorative elements that obscure actions.

## 2. Three art directions to compare

Use the same 1440x900 desktop signed-in dashboard content and hierarchy in each design study: Sound Uncharted, compact global navigation, primary Melodic Navigation / Scale-Degree Recognition journey, Continue in Explore, Quick Quest, one training recommendation, local skill-network preview, recent Melodic Study workbook, Composer Studio entry. Fictional data; no fake scientific score or implied shipping feature. Compare also one paper/tab sample, color swatches and typography. Labels are provisional. Keep the actual musician's intent and next action clear.

- A — Studio Atlas (recommended first). Ink/slate, muted brass, teal, fine cartographic geometry. Premium instrument studio with a sense of exploration. Dominant hero with purpose-built guitar/art-map image at one side, legible dark copy area, quieter document surfaces. A connected atlas rather than a game menu.
- B — Signal Path. More contemporary precision, charcoal/graphite, copper and blue-teal details, waveform and signal-flow geometry, instrument-console inspired spacing, refined compact UI. Strongest for Studio/Practice and analytic work. Risk: too much like production software or generic SaaS.
- C — Field Notes. Dark olive/ink, warm paper, restrained bronze/sage, editorial typography and notebook/catalog surfaces, etched route illustrations. Strongest for Codex and Workbook. Risk: dark/light transitions or too much editorial ornament in performance tools.

Recommendation: A as core; borrow B's precision for Practice and Composer Studio, C's warmth for Codex and Workbook Display. User review of art studies determines selection, not the document alone.

## 3. Proposed candidate token set — Studio Atlas

Tokens are semantic rather than tied to one screen, and not yet replacements for UX_V1_1. Start with these exact sRGB values; revise after rendered contrast/accessibility review.

| Token | Value | Use |
| --- | --- | --- |
| canvas | #101518 | app backdrop |
| panel | #171E23 | main working surface |
| raised | #202A30 | interactive surfaces |
| border-subtle | #3B4B54 | decorative dividers only |
| border-control | #6D818B | meaningful control boundary/focus candidate |
| text | #F2EEE6 | primary text |
| muted | #A8B4BA | secondary text |
| brand / primary action | #D6AF70 | selected route, explicit primary action; dark label |
| accent / discovery | #78BFB0 | connective accents, links with underline/other cues |
| paper | #F6F2E9 | reading/display/score surface |
| paper-text | #1B2729 | musical and reading content |
| paper-muted | #53615E | secondary paper text |
| paper-accent | #785725 | readable dark bronze |
| paper-rule | #CEC8BD | decorative rule |
| information | #8FB6E4 | information |
| success | #78BFB0 | accepted success with text/icon, never alone |
| warning | #D6AF70 | warning with explicit icon/label |
| danger | #E59A8F | error/conflict with text/icon |
| estimated | #B7A5E0 | explicitly qualified estimate |
| unknown | #A8B4BA | neutral unknown/unrated |

Calculated WCAG contrast (flat colors): text/canvas 15.88:1; muted/panel 7.94:1; brand/canvas and dark text on brand 8.95:1; discovery/raised 6.88:1; paper text/paper 13.73:1; paper muted/paper 5.80:1; control border/panel 4.14:1. Subtle divider/panel 1.86:1 is decorative ONLY, not a control/state boundary. Paper accent and all other combinations to verify. Normal text >=4.5:1, large >=3:1, non-text functional contrast >=3:1; actual rendered components, states, images, focus, gradients and mobile need separate testing. Do not claim WCAG conformance from swatch checks.

Domain identity candidates (dark canvas): Technique #D6AF70, Fretboard #78BFB0, Harmony & Theory #9CAFE1, Rhythm #E59A8F, Ear & Musicianship #B7A5E0, Creativity & Expression #C9CF88. These are categorical signals, not rating/status colors. Pair with distinctive icons, names and shape/labels. Skill graph separates domain, proficiency, estimated/unknown, edge type and current focus. Use tested darker alternatives on paper, not direct reuse. No color-only graph semantics or arbitrary prerequisites.

## 4. Typography, iconography, geometry

- UI: humanist/neutral modern sans, strong legibility at 16px; provisional system stack. Optional later font evaluation (e.g. Inter or Source Sans 3); no font assets installed. Headings deliberate, not all uppercase. Editorial accent serif for long-form Codex and select brand headings (Georgia fallback; test optional Source Serif 4). No display serif in dense controls.
- Musical numeric labels and timer: tabular figures, readable monospace where useful. Notation uses proper score renderer/fonts when validated; images are not authoritative music. Left/right orientation and tuning always explicit.
- Proposed scale: display 32–40px, page title 26–32px, heading 20–24px, body 16px, supporting 14px, concise metadata 12–13px only where legible; mobile text settings and reflow.
- Preserve 4px spacing scale, 8/12/16px corner radii, 44px touch targets. Group by section and spacing rather than card-within-card. Hairline art dividers are not actionable borders. Outline icon system with consistent 20/24px grid and stroke; distinct domain icon silhouettes. Tooltip/accessible name for icon-only controls.
- One dominant action per task; warm brass button with dark label. Secondary outline or quiet text with accessible hit area. Selected states have label/shape/underline. Focus ring distinct and visible on all surfaces.
- Motion: 120/180/260ms candidates from existing contract. Skill-map exploration can pan/zoom without constant animation. Reduce-motion mode; no motion-dependent instructions. Playback cursor functional, separate from decorative animation.

## 5. Art and asset system

Create original art in a coherent visual family; establish final art ownership/license/provenance and accessibility metadata before deployment. Do not use external references as final assets. No generated note diagrams as accurate lesson authority.

| Asset family | Purpose | Production considerations |
| --- | --- | --- |
| Brand mark / wordmark | Recognizable app identity | explore abstract compass + strings/wave; original vector later, monochrome small-size tests, no final logo approval yet |
| Quest scenes | Discovery and orientation | photographic/illustrated guitar details and thematic maps; landscape crops, safe text-free zones, no burned-in labels |
| Domain emblems | Six recognizable musical areas | geometric line art: pick/string, fretboard, chord relationships, pulse/grid, ear/wave, expressive phrase; paired with real labels |
| Skill atlas | Connected knowledge visualization | use real graph data and accessible list; subtle topographic backdrop only |
| Workbook covers | Personal recognition | reusable themed cover set, user-editable title/type outside art, compact thumbnail/list fallback |
| Page previews | Identify document content | derive actual blocks with bounded thumbnails and accessible labels, no invented fingering/score preview |
| Composer & Practice | Functional precision | clean notation canvas, actual transport and feedback; minimal illustration |
| Empty/onboarding | Friendly orientation | sparse instrument/atlas motif, actionable explanatory text |

Keep generated source art separate from UI text and dynamic data. Responsive crops, lazy loading, appropriate modern image formats, performance budgets after prototype measurements. Ensure dark/light canvas visual hierarchy, reduced visual noise and optional image-free equivalents. Asset catalog should record ID, theme/domain, aspect, crop, alt/decorative status, provenance, revision, intended usage and owner/licensing status.

## 6. Surface treatments

Home/dashboard: dark Studio Atlas shell, hero resume with one visually prominent action; context, targeted recommendation, recent work and skill snapshot beneath. Public landing can be more cinematic; signed-in UI must be task-first. Avoid walls of metrics.

Quests/MEC: same header, Map/Explore/Craft mode control, same inspector footprint. Map gets a restrained map motif and skill links; Explore keeps tools clear; Craft prioritizes real page/notation canvas. Color is not the mode's only identifier.

Codex: warm ink/paper reading treatment, related knowledge and real interactive tools, not a separate application theme. Workbook: visual cover grid or compact list, real content previews; title, page, saved state and context first; Display has uncluttered paper or accessible dark option. Composer Studio: console/transport with score as dominant canvas. Creator Export: configurable preview with true alpha grid and output controls only when implemented. Practice: large high-contrast targets and musical material, optional quiet feedback. Skill Map and Training: atlas-like graph for discovery and careful analytic states, evidence and uncertainty explicit.

## 7. Review and follow-up

Evaluate all concepts using identical content and tasks: find resume action, Quick Quest, current focus, skill relationship, recent page and Studio entry. Review mobile legibility, contrast, layout density, music readability, non-color status, and whether the art feels like one product. Then choose direction or combine selectively.

D2 establishes high-fidelity application shell and dashboard, including signed-out/new/returning/active Session/guest and desktop/mobile states. D3 Skill Map & Training; D4 MEC & Codex; D5 Workbooks, Composer Studio and Creator Export; D6 Practice, reflection, feedback and mobile. E builds isolated navigable prototype; F plans migration and accepted design-system amendments. Future feature mockups must be marked concept-only; do not portray simulated metrics as actual evidence.

Scope: documentation and concept art only. No app code, production assets, dependency, authentication, database, progression, or deployment changes. No current UI acceptance, score/video technology decision or AR/VR implementation. Existing draft branches preserved.