# DESIGN-001-F4A — Standalone Workbook library and workspace

Base: accepted F3E-R1 122a118d3c73265ddbab9c49a05dfe42cf1e5270 (PR #46). All six workflows passed; user accepted visual review and authorized F4.

## Scope

- Adopt Studio Atlas chrome and notebook styling in the standalone Workbook preview, retaining the existing library, page navigator, Edit/Display and Focus page.
- Search accepted active page titles and open the exact owner-scoped page through the existing navigation guard. Show parent Workbook, page count and current selection. Archived pages remain outside direct search results.
- Refine wrapping and touch targets; keep mobile toolbar in normal document flow. Retain notation scroll regions.
- Add browser regression for exact saved-page search and mobile Edit/Display. Existing acceptance and persistence tests remain unchanged.

## Gates and exclusions

Full exact-head CI, Vercel and user visual review. No production merge, schema, dependencies or progression changes. No changes to embedded MEC workspaces or Codex content. F4B (Codex reading and navigation) follows acceptance; advanced notation, Composer Studio and global unsaved-navigation remain outside this slice.
