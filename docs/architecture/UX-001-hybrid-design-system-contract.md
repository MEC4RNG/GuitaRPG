# UX-001 — Hybrid Design-System Contract

- Status: Accepted
- Ticket: UX-001
- Date: 2026-09-27
- Depends on: FND-001, FND-002
- Applies to: GuitaRPG v1 application surfaces and core UI components

## Purpose

Define a production visual/interaction system before feature screens are implemented.

The system follows the approved principle:

> **Play like Instrument HUD. Learn like Codex. Measure like Practice Lab.**

The three treatments are related modes of one product, not separate themes.

## 1. Product visual position

GuitaRPG should feel like:

- modern music software
- a skill tree / character-development system
- a practice instrument
- a serious learning product

It should not feel like:

- novelty medieval/fantasy role-play UI
- a generic SaaS admin dashboard
- a decorative game skin placed over ordinary forms
- an interface where RPG decoration obstructs practice

RPG language organizes progression. Guitar practice remains the visual priority.

## 2. Surface modes

### Instrument HUD

Primary use:

- Home
- Generate
- Training
- Quest
- Practice Session

Character:

- dark
- instrument-like
- high-information but focused
- responsive
- restrained neon/accent use

Core palette:

- background #090C10
- surface #11161C
- raised #181F27
- border #29323C
- text #F3F5F7
- muted #87929F
- blue #3A86FF
- teal #2EC4B6
- amber #FFBE0B
- coral #E85D5D
- violet #9B5DE5

### Codex

Primary use:

- Codex
- learning/reference content
- educational campaign material

Character:

- warmer
- scholarly/editorial
- tactile without becoming faux-medieval
- readable for longer-form explanation

Core palette:

- background #11110F
- paper/surface #1C1B17
- raised #25231E
- border #37342C
- text #F1ECE1
- muted #A6A096
- gold #D6A84B
- rust #C86042
- sage #759B81
- indigo #6476A8

### Practice Lab

Primary use:

- Character
- Skills
- History
- progress analytics

Character:

- clean
- data-forward
- calm
- comparable metrics
- minimal decorative noise

It shares the Instrument HUD's cool family while using clearer analytic hierarchy.

## 3. Semantic color rules

Semantic state colors are:

- Success: teal
- Warning: amber
- Danger/Error: coral
- Information: blue
- Estimated: violet
- Unrated/unknown: muted neutral

**Color is never the only state signal.**

Every semantic state also requires one or more of:

- explicit text
- icon
- shape/pattern
- accessible name/value

Examples:

- `Estimated III`, not a violet III with no qualifier
- `UNRATED —`, not only gray text
- warning icon + label, not only amber border
- Difficulty badge always displays the Roman numeral/text

## 4. Typography

Phase 0 uses dependency-free font stacks.

Roles:

- UI: Arial / Helvetica / system sans
- Display: same family with size/weight hierarchy
- Data: system monospace
- Codex body: Georgia / Times-style serif

This avoids external font-loading dependency before product UI implementation.

Minimum body size: 16 px.

Mobile form inputs should remain at least 16 px to avoid readability/zoom problems.

Future font changes require a design-system version change rather than ad hoc screen-level imports.

## 5. Spacing

Base spacing unit: 4 px.

Approved scale:

0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px.

Screens/components should use the scale rather than arbitrary one-off spacing unless a documented graphical need exists.

## 6. Shape

Radii:

- XS 4 px
- SM 8 px
- MD 12 px
- LG 16 px
- Pill 999 px

Borders:

- standard 1 px
- emphasis 2 px

Rounded geometry should feel like modern instrument/software controls rather than playful bubble UI.

## 7. Responsive layout

Breakpoints:

- sm 640
- md 768
- lg 1024
- xl 1280

Desktop app shell uses the Sidebar beginning at `lg`.

Below `lg`, persistent navigation becomes the MobileNav.

Minimum touch target: 44 × 44 px.

Maximum primary content width: 1440 px.

## 8. Navigation contract

### Desktop Sidebar

PLAY:
- Home
- Generate
- Training

DEVELOPMENT:
- Character
- Skills
- History

LEARN:
- Codex

SYSTEM:
- Profile
- Settings

### Mobile persistent navigation

- Home
- Generate
- Skills
- Profile

Generate remains the universal primary action and may receive a visually dominant center action treatment.

Mobile navigation must not require hover.

## 9. Motion

Motion exists to clarify interaction/state, not to create game spectacle.

Durations:

- fast 120 ms
- standard 180 ms
- deliberate 260 ms

The system must honor reduced-motion preference.

Under reduced motion:

- nonessential transform animation is suppressed
- nonessential parallax is suppressed
- state changes remain understandable

## 10. Accessibility

Product requirements:

- normal text contrast target >= 4.5:1
- large/display text contrast target >= 3:1
- keyboard focus is always visible
- icon-only actions require accessible names
- progress visualizations expose text or accessible numeric state
- semantic state never relies on color alone
- minimum mobile touch target is 44 px
- reduced motion is supported

These are product minimums, not permission to ignore platform/native semantics.

## 11. Core component contracts

The design system owns these initial components:

- AppShell
- Sidebar
- MobileNav
- Panel
- QuestCard
- SkillBadge
- DifficultyBadge
- ProgressBar
- AttributeDisplay
- StatusChip
- MetricCard
- ActionButton

### AppShell

Provides the responsive frame and surface-mode context.

### Sidebar / MobileNav

Provide primary navigation with explicit active and focus-visible states.

### Panel

General grouped-content container with default and raised treatments.

### QuestCard

Shows a resolved Quest in a scannable structure. It must prioritize musical/practice information over decorative RPG copy.

### SkillBadge

Shows canonical Skill identity and Quest role.

### DifficultyBadge

Always displays explicit I–V / Unknown / Provisional information. Color alone is insufficient.

### ProgressBar

Must expose the progress value textually or through accessible value semantics.

### AttributeDisplay

Must distinguish UNASSESSED, ESTIMATED, and ESTABLISHED without rendering missing evidence as 0%.

### StatusChip

Combines semantic color with label/icon/shape.

### MetricCard

Displays label, value, context, and delta/unknown state without relying only on red/green.

### ActionButton

Supports primary/secondary/destructive usage with default, hover, focus-visible, pressed, and disabled states.

## 12. Surface consistency

Components should share:

- spacing scale
- typography roles
- radii
- interaction states
- accessibility semantics

Surface mode may change:

- palette
- texture
- density emphasis
- typography role for long-form Codex reading

It must not change component meaning.

A DifficultyBadge means the same thing in Instrument HUD and Practice Lab.

## 13. Interaction invariants

- hover is supplemental, never required for information
- core mobile flow requires no hover
- disabled state requires a non-color cue
- irreversible destructive actions require explicit labeling and/or confirmation
- state transitions remain understandable with reduced motion
- touch targets remain usable on phone screens

## 14. Token implementation

The production app uses:

- Tailwind CSS for composition/utilities
- CSS custom properties for owned design tokens

Canonical CSS token file:

`app/design-tokens.css`

The original FND-002 variables remain compatibility aliases:

- `--color-bg`
- `--color-surface`
- `--color-border`
- `--color-text`
- `--color-muted`
- `--color-accent`

They point to Instrument HUD tokens rather than forming a second token system.

## 15. Machine-readable authority

`domain/ux/design-system-contract.json` is the machine-readable Phase 0 authority for:

- palettes
- typography roles
- spacing
- radii/borders
- breakpoints/layout
- motion
- accessibility invariants
- navigation
- core component inventory

The CSS token file is the implementation seed.

## 16. Scope boundary

UX-001 does not build:

- final Home screen
- generator UI
- Quest Session UI
- Character screen
- Skills screen
- Codex content layout
- analytics dashboards

Those implementation tickets consume this contract.

## Acceptance evidence

- Instrument HUD contract defined: PASS
- Codex contract defined: PASS
- Practice Lab contract defined: PASS
- palette/tokens defined: PASS
- typography roles defined: PASS
- spacing/shape defined: PASS
- responsive breakpoints/navigation defined: PASS
- motion/reduced-motion defined: PASS
- accessibility requirements defined: PASS
- required component inventory defined: PASS
- color-not-sole-state invariant defined: PASS
- CSS custom-property implementation seed created: PASS
- legacy scaffold CSS aliases preserved: PASS
- machine-readable contract created: PASS
- executable contract tests created: PASS

## Terminal disposition

**UX-001 — COMPLETE**

All individual Phase 0 contract tickets are now complete.

Next authorized ticket: **P0-GATE-001 — Phase 0 Integration Gate**.
