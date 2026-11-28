# DESIGN-001-F4B — Codex navigation and reading experience

Base: F4A-R1 96ea52a4e06641581f1be432c54332dc83ef9bd1 (PR #48). All six workflows passed; user accepted visual review.

## Scope

- Make the draft instructional library discoverable from the canonical Codex without exposing drafts on production.
- Use canonical taxonomy domains for Skill filtering and card labels. Combine domain, level and text filters with a clear action and result count; retain filters when returning to the library.
- Add direct dictionary navigation from Skill entries while preserving existing browser history and contextual lesson links.
- Apply Studio Atlas styling to preview navigation, Skill cards and reading surfaces without changing musical reference geometry, tool semantics or published entries.
- Add end-to-end regression for discovery, domain search, dictionary Back navigation, filter reset, narrow overflow and accessibility.

## Gates and exclusions

Full exact-head CI, Vercel and user visual review. No curriculum edits, new dependencies, persistence or schema changes, publication or production merge. F4C owns interactive presentation; F4D owns deeper contextual navigation and Workbook integration.
