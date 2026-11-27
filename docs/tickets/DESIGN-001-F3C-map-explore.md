# DESIGN-001-F3C — Map and Explore refinement

Base: F3B `c9bee280e5a3faf3b2469c0c3c318a12772e8bbe`, PR #40. Six CI workflows and Vercel passed; user approved visual review and authorized F3C. Work remains on a draft preview branch.

## Scope
- Map shows lesson counts for the selected ingredient's three levels and actual learning outcomes in lesson rows. Existing accessible labels, Quest snapshot, contextual Codex references and interactive tools remain intact.
- Explore has a focused ingredient, level and activity picker, free exploration when no lesson is available, and an explicit Back to Map action. No new Quest or Session is created by choosing an activity. Same-tab selection restoration is keyed by owner and Quest and revalidated against current snapshot and gated lesson catalog.
- Save a lesson into a new or selected active Workbook using the existing owner-scoped RPC, preserving retry receipt and destination while a capture is incomplete. Existing linked lesson pages can reopen rather than create duplicates, using a current owner-scoped Explore link and either same-mount receipt or the editable lesson reference marker. The marker is not verified historical provenance, and does not enforce uniqueness across tabs or devices.
- The embedded editor is placed directly after the selected activity in preview, with Return to activity and existing Continue in Craft. Navigation and capture stay blocked while edits are pending. Existing modular ingredient order, assigned page controls, and contextual Codex remain. Workbook choices include owner title and omit archived Workbooks.
- No new database migrations, dependencies, generation, evidence or progression authority. Production retains its existing layout. F3D will refine Craft and contextual toolkit; F3E handles final responsive integration.

## Validation
New pure navigation/link tests; extend the existing F3A browser regression without dropping same-page Craft, pending-save or reflow assertions. Exercise same-tab selection restoration, reopening a linked lesson after reload, selecting a second lesson and saving it to an existing Workbook, accessibility and mobile overflow. Final-head checks and visual review required.
