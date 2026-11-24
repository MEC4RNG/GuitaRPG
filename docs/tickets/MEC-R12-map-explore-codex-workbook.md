# MEC-R12 — Map/Explore navigation, Codex lesson workbooks and removable music blocks

**Status:** DRAFT UX REMEDIATION. Explicit user direction dated 2026-11-24. **Craft is deliberately left alone** pending their further design decisions.
**Branch:** `ux-mec-r12-map-explore-codex-links` stacked on the R11 draft Codex PR #22. No production merge or release authorized.

## Approved changes

### Map
- Replace a generic "How to explore" paragraph with **Beginner (Foundational), Intermediate, Advanced** tab controls.
- In *authorized nonproduction Codex preview environments only*, display the actual authored module titles and application names for the selected canonical Quest Skill at that level. Each **Explore this lesson** action opens the matching Quest ingredient in the **Explore stage**, optionally noting the selected learning focus. It must NOT automatically create a Workbook or Page.
- The main **Open [ingredient] in Explore** action opens Explore without writing Player content; an explicitly separate **Create Workbook and open Explore** action retains the existing deliberate Workbook seeding and owner-checked Quest links. Do not remove existing linked Pages.
- Retain the verified current V1 Codex reference for all Quest topics, including non-Skill concepts/constraints. When appropriate, allow expansion of the matching existing Codex V2 interactive reference in Map **only after server-side preview gate**. Production Quest HTML must not include unpublished V2 lessons or references.
- Selecting different header topics resets the displayed Map learning level to Beginner.

### Explore
- Remove the *Target tempo* summary box. The underlying Quest metric/constraints are not deleted; no progression evidence is changed.
- Keep modular module disclosure and saved ordering. Place **↑ Earlier / ↓ Later** controls in a visible group immediately adjacent to each module heading, rather than at the opposite end of workbook page actions.
- Add pointer/hover/focus affordances to clickable module headings and page links, and give **New Page** and **Link an existing Workbook page → Choose a page…** distinct, spacious controls. Successfully linking a Page also opens it in Explore.
- Keep every existing owner-scoped page and module_key relationship. Do not introduce duplicate links or automatically create Pages when navigating.

### Workbook editing and Codex entry points
- Rename chord **Delete chord** to **Remove diagram** and provide an explicit two-step confirmation with cancel. Give whole tablature block removal a clearly visible **Remove tablature** control distinct from **Remove position**, also requiring confirmation and offering cancel. Preserve existing undo/redo, autosave, and individual note editing.
- Restore the separately developed CODEX-V2-A-R5 draft lesson-to-Workbook pilot on top of the current nine-Skill catalog. **Practice in Workbook** is visible in expanded Lessons and How to Explore activities. The server Workbooks route resolves the selected module only from the **trusted gated 114-lesson draft catalog**. Only a deliberate choice creates a Player-owned Page; user can add it to an existing Workbook, start a new Workbook, or open a previously imported Page via a best-effort editable source marker.
- This code ports a subset of draft R5 PR #15. Future integration of the older parallel R5 branch must avoid double-applying the same files or conflicting with the newer R10/R11 chord renderers.
- **No changes to Craft layout, Quest Toolkit, Creative Guidance or Craft’s embedded Workbook workflow.** The imported optional lessonSource prop is null in Craft and is only rendered in the standalone Workbooks route.

## Verification & release gates

- Final-head Prettier, ESLint, TS, Vitest, Next production build, database/security/identity/Player-data and browser UX (desktop Chromium, mobile Chromium/WebKit and compact landscape).
- Map: browse level tabs, open a lesson in Explore without creating content, expand the corresponding ingredient, link an existing Page, retain module order and Codex references.
- Preview versus production: verify only the authorized preview may read V2 draft data; production Quest stage cannot import it. Malformed `?codex_module` must 404.
- Workbook: explicit create/new/add existing from a Codex lesson, refresh/open same Page with no automatic XP/session; two-step whole-tab/diagram deletion while preserving other document blocks and autosave.
- No production V2 publication: `domain/codex/v2/published.json` remains zero entries and zero terms. 197 V1 canonical entries and all 114 draft lessons are unchanged.
- **Craft changes are held** until a separate user design decision and ticket. Remain draft/open/unmerged pending human desktop/mobile review.
