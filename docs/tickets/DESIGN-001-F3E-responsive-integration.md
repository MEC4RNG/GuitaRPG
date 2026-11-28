# DESIGN-001-F3E — Responsive integration and MEC acceptance

Base: F3D `3a8853d2559e10eaeddfd5a9b6d33cf802232780`, PR #44. All six workflows and Vercel passed; user approved visual review and authorized F3E.

## Scope
- Available-width layout: the Quest workspace and inspector stack when the canvas is narrow, even when a desktop navigation rail is present. Wide workspace retains a bounded sticky inspector. No blanket page overflow masking; embedded notation retains its own existing scroll regions.
- Reflow of composition controls, module reorder actions, page strip, lesson selection and nested editor. Touch targets and readable text remain explicit.
- Keyboard-operable learning-level tabs (left/right, Home/End, selected tab in normal tab order). Independent MEC stage buttons remain revisitable. Workspace/inspector jump links provide direct access on narrow layouts without duplicating editors or references.
- Extend the full F3 browser flow to exercise 1440, 1024, 820, 740 landscape, 390 and 320 widths in Map, Explore and Craft Edit/Display; check keyboard operation and narrow accessibility. Existing strict root overflow assertion is retained with better element diagnostics. Prior acceptance checks are not removed.

## Acceptance gates
- Formatter, lint, TypeScript, unit tests, build, database, security, identity, Player control and UX workflows pass on the exact candidate head.
- Preview deploys and user reviews desktop and phone layout, keyboard navigation, and the original same-page workflow.
- Preserve F3A-D ancestry, preview-only gate and canonical data authority. No schema, dependency or production changes.

## Boundaries
This is a responsive integration candidate, not final proof of all-device usability or manual screen-reader certification. Global unsaved-navigation and cross-reload capture recovery remain future scope. Composer Studio, advanced notation and independent Workbook/Codex redesign remain outside F3E. F4 begins only after acceptance.
