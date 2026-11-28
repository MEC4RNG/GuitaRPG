# INT-001-R1 — Integrated user review revisions

## Accepted baseline

INT-001 head `40fcf16ed4a17364921c6a8d6eedaeeffd208140` passed all six formal GitHub Actions workflows and Vercel deployment. User accepted the dynamic triad explorer's functionality, then requested the layout and navigation revisions below. The earlier pass does not certify this new head.

## Scope

- Triad Construction retains the compact What it is / standard-tuning C major, C minor, F major inversion split desktop row. The shared full chord explorer becomes its own full-width panel below both. Mobile stacks naturally; the Arpeggio Sequencer and Map reference disclosure are unchanged.
- Map combines the selected ingredient role, clickable skill name and definition into one header. Removes the redundant What it is and Within this Quest headings and repeated generic objective; actual constraint/criterion/context information and the separate Quest requirements list remain. How to explore follows immediately.
- Map and Explore skill links retain Codex Peek; its full-entry action opens an authorized V2 Skill preview in a new tab when one exists. Unsupported skills and non-preview/public environments keep the canonical V1 fallback.
- Both Codex lesson and How to Explore Workbook actions open a new tab. When opened from a matching Quest ingredient, the route carries the Quest context; only an explicit creation or Link current page action assigns the page using the existing authenticated Explore-module RPC. Unrelated/standalone Codex learning stays private without automatic Quest assignment. Reopening existing pages does not silently attach them. Return/focus refreshes read-only owner-scoped links and page metadata.
- Pointer affordances for Codex links and the Explore page chooser. No migration, XP, progress, Quest lifecycle, or production publication changes.
- Full Workbook workspace design deferred to a dedicated review: reduce competing library/context/toolbar elements, establish Workbook → Page → editor hierarchy, preserve autosave/revision and musical-block authority. Craft layout unchanged.

## Validation

Added/updated source, navigation context and browser regression tests, including deterministic Scale-Degree Recognition Quest → Peek → V2 → Workbook popup → explicit create/link → Explore count and reload; standalone lesson popup persistence; separate triad layout; Map pointer. Final-head formatting/lint/typecheck/Vitest/build and full browser gates must be run. User review pending; keep PR #27 draft/unmerged and production unchanged.
