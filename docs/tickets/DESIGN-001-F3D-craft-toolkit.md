# DESIGN-001-F3D — Craft workspace and contextual toolkit

Base: F3C `ca1a86b51268633cf7d68927ce2f6042d77d4dd1`, PR #42. All six workflows and Vercel passed; user completed visual review and authorized F3D.

## Scope
- Craft offers explicit reuse of existing Explore-linked pages without copying; current page context distinguishes actual Explore/Craft associations, not invented origin.
- New composition form lets the Player choose title and new/existing active Workbook. Reuse existing owner-scoped creation/save/link RPCs; stable creation receipt within current workspace for retry. No new score/document model.
- Edit and Display operate on the same accepted page and existing renderer, with pending-save protection. Back to Explore preserves the activity selection. Archived Craft preview is reading-only.
- Contextual toolkit includes Quest objective, ingredients, constraints, optional creative ideas, and links to available interactive Codex references. The toolkit ingredient selector is independent of the Explore activity. No new audio or score engine. Shared Codex Peek remains.
- Craft subset reordering preserves unrelated Workbook positions. No new dependency or migration. Standalone Composer Studio remains future scope.

## Validation
Extend F3C browser regression to cover direct reuse, Edit/Display, explicit composition creation and return to Explore. Add pure material and ordering cases. Preserve previous persistence and accessibility gates. Technical and visual acceptance pending.

## Limits
Capture retry receipt is in-memory; cross-reload recovery and global navigation protection remain F4/F7 work. No claim of cross-device uniqueness or comprehensive composer functionality. Final responsive integration is F3E. No production merge or deployment authorization.
