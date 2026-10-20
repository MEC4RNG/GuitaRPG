# JRN-000 — Revised Workbook Development Plan

**Status:** PROPOSED / EACH TICKET REQUIRES EXPLICIT AUTHORIZATION

## Dependency graph

```text
JRN-001 editor prototype
        ↓ acceptance gate
JRN-002 persistence foundation
        ↓
JRN-003 musical blocks ──────┐
        ↓                    │
JRN-004 MEC integration      │
        ↓                    │
JRN-005 Codex integration ←──┘
        ↓
DATA-005 + SEC-002 + REL-007 release validation
```

FRET-001 may proceed after JRN-002 if it accepts the shared structured-block boundary. Coordination
between JRN-003 and FRET-001 is required before either persists overlapping fretboard content.

## Proposed tickets

### JRN-001 — Interactive Workbook Editor Prototype

Build an in-memory, non-production prototype comparing Tiptap/ProseMirror against the fallback
criteria. Prove rich text, tab and chord custom blocks, JSON round-trip, accessibility, mobile,
undo/redo, and licensing/bundle fit. No migration or durable Player data.

**Gate:** accepted editor adapter and `GUITARPG_WORKBOOK_DOCUMENT_V1` fixtures.

### JRN-002 — Workbook Persistence Foundation

Add owner-derived workbooks/pages/revisions, ordering, quick notes, autosave, conflict refusal,
archive, cross-device refresh, RLS/grants, and trusted mutations. No MEC or Codex entry points.

**Gate:** fresh replay, owner/non-owner/guest tests, conflict/retry recovery, export/deletion design
receipt, desktop/mobile standalone workflow.

### JRN-003 — Editable Guitar Tablature & Chord Diagrams

Productionize structured tab and chord blocks with keyboard/touch editing, accessible summaries,
tuning snapshots, validation, serialization/version migration, and responsive SVG rendering.

**Gate:** property/fixture round trips, malformed-input denial, assistive-technology proof, 320px and
browser matrix.

### JRN-004 — MEC Workbook Integration

Add optional Journey/Quest/Session associations and shared-editor entry points for Map notes,
Explore observations, and Craft compositions. Prove freely revisitable stages and no Session,
Result, or progression side effects.

**Gate:** Journey state preservation, Quest deletion unlink behavior, repeated Sessions unchanged,
progression non-inflation.

### JRN-005 — Codex Personal Content Integration

Add owner-scoped `Your notes` discovery by canonical taxonomy identity while maintaining a hard
visual/security boundary from official Codex content. Add private tags without taxonomy promotion.

**Gate:** public/private isolation, missing historical reference behavior, owner-only queries, Codex
content immutability.

### DATA-005 / SEC-002 / REL-007 — Release integration

Extend Player export/account deletion, storage policy if media is later authorized, security audit,
and the MEC integration gate. Validate backup/restore, cross-device conflict recovery, browser and
accessibility matrices, and absence of progression inflation.

## Launch classification

The existing Phase 6B plan called for a basic Journal. This ADR does not silently make the complete
rich Workbook suite launch-critical.

| Capability | Proposed classification |
| --- | --- |
| Accessible editor prototype | Decision gate, not shippable scope |
| Standalone workbook/page CRUD, rich text, autosave/conflict recovery | Candidate launch-critical replacement for basic Journal; requires explicit scope acceptance |
| One editable tab block and chord block | User-approved product direction; launch timing requires explicit acceptance after prototype |
| Explore/Craft shared-editor entry points | Candidate launch-critical MEC integration |
| Codex personal-page discovery | Valuable but may be deferred if release risk is material |
| Images/media uploads | Deferred |
| Realtime collaboration/sharing/publication | Deferred |
| AI analysis/generation inside private documents | Deferred |
| Advanced rhythm grid/fretboard block suite | Deferred or owned by later explicit tickets |

No ticket above is authorized by JRN-000. Public release scope and the Phase 6B feature-freeze
exception change only through explicit user authorization.
