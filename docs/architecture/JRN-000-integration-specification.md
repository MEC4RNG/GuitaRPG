# JRN-000 — Workbook Integration Specification

**Status:** ACCEPTED DESIGN / IMPLEMENTATION NOT AUTHORIZED

## Standalone Journal

Journal is a first-class destination containing Workbooks, recent pages, archived workbooks, and a
one-action **Quick note**. Quick note opens or creates the Player's `QUICK_NOTES` workbook and adds a
dated page; it does not require a Quest or Session. The Player can later move/duplicate the page into
another workbook without changing its ownership.

## MEC integration

### Map

Map remains instructional. It may show personal pages linked to the Quest/taxonomy and offer
**Add a note**, but opening or editing content is optional and never a stage prerequisite.

### Explore

Explore may create or link pages with `stage = EXPLORE` for observations, experiments, comparisons,
and instrument discoveries. The entry point opens the shared editor with optional prompt/template
content. The page remains usable from standalone Journal after unlinking the Quest.

### Craft

Craft may create or link composition-oriented pages with `stage = CRAFT`. Initial templates may
emphasize editable tablature and chord diagrams. `DRAFT`/`FINAL` is Player organization metadata,
not evidence, mastery, or Journey completion.

Map/Explore/Craft stay freely revisitable. Editor open/save/close does not call the Journey stage or
lifecycle mutation operations. At most, an explicit association operation can update a Journey's
`last_worked_at` if a later ticket accepts that behavior; it is not assumed here.

## Quest relationships

A workbook can link to zero or many owned Quests, and a Quest can discover zero or many owned
workbooks. Page-level discovery is derived through the workbook link plus optional page metadata or
a future page-specific link; the implementation must avoid duplicate sources of truth.

Quest deletion removes the association. The workbook survives. Attempted Quest deletion rules stay
unchanged. Cloning/remixing a Quest does not copy private workbook content unless the Player chooses
an explicit duplicate/link action.

## Session relationships

An optional Session link answers only, “This page was relevant to this practice block.” It does not:

- start, pause, resume, or end the Session
- add to server-authoritative active time
- copy page text into Result reflection
- create evidence or a Result
- award progression

If the editor is opened during an active Session, time spent there is not separately asserted as
practice time. Any future inclusion requires an accepted Session timing contract. A Result may link
back to associated pages for navigation, but Result immutability is preserved.

## Codex and taxonomy

Official reference and personal content are visibly distinct:

- **Codex:** canonical system-owned definition/relationships from CODEX-001.
- **Your notes:** owner-scoped pages associated with that canonical taxonomy entity.

Codex detail/Peek may query a separate owner-only personal-content read model after authentication.
The official Codex entity is never updated with Player content. Unauthenticated users see no private
association query. Historical links retain taxonomy UUID/slug and display snapshot; missing/currently
inactive entities remain labelled historical references.

Player tags are displayed separately from Skills, Concepts, Techniques, Tunings, and Contexts.
Matching tag text never promotes a tag into taxonomy.

## State preservation

Opening an editor from Journey or Codex preserves the originating route, current MEC stage/tab,
Generate draft, Codex Peek state where practical, and active Session. Closing returns to a safe
internal destination. Return paths use the existing internal-only redirect rules and cannot be
external/protocol-relative URLs.

## Failure and offline behavior

- Load failure offers retry and preserves the surrounding Journey/Codex surface.
- Save failure retains the unsaved local document and shows a truthful retry state.
- Conflict never silently overwrites; it offers reload/copy/reconcile choices.
- Navigating with unacknowledged changes triggers a clear save/leave decision when background flush
  cannot be confirmed.
- Guest copy continues to warn that account protection is required for recoverable cross-device
  access.

## Export, deletion, and privacy

Future export includes workbook metadata, pages/documents, tags, and association identities in a
versioned section. Account deletion removes all private content. Quest/Session deletion removes only
links. Private text is excluded from telemetry and operational logs. Future AI analysis, sharing,
publication, or teacher access requires separate consent/security authority.

## Navigation scope

The final Journal navigation location is a UX decision for an implementation ticket. The prototype
must not displace the accepted mobile four-item core navigation without explicit UX authority.
