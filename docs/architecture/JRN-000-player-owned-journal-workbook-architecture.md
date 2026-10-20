# JRN-000 — Player-Owned Journal & Workbook Architecture

- **Status:** ACCEPTED
- **Date:** 2026-10-20
- **Type:** Architecture decision; documentation only
- **Supersedes:** QST-005 sections 12.1, 12.4, 13.2, 13.3, and the Journal portions of
  sections 15, 16, 22–24
- **Preserves:** QST-001, QST-005 Quest/Journey/Session/Result semantics, QST-006/QST-007,
  CODEX-001/CODEX-002, DATA-001, and DATA-004

## Context

QST-005 placed a bounded Journal and optional Craft artifact inside a Quest-owned Workspace. The
accepted product direction is broader: a Player can create durable musical workbooks before,
during, or after any Quest; each workbook can contain multiple editable pages and structured
musical blocks. Quest, Session, MEC stage, and Codex relationships are useful context, but none is
the ownership root.

Keeping both a standalone Journal and a separate Quest Journal would duplicate editors, conflict
rules, tags, export/deletion paths, and musical block formats. It would also make Player-authored
content depend unnecessarily on deletion of an associated Quest.

## Decision

The canonical ownership chain is:

```text
Supabase Auth Player
└─ Workbook
   └─ ordered Page
      └─ versioned structured document
         └─ rich-text and musical content blocks
```

Workbooks and pages are Player-owned private content. Associations to Quests, Sessions, MEC stages,
and canonical taxonomy/Codex entities are optional edges. They do not own the workbook, grant
access, change Journey state, or create evidence.

The shared Workbook editor is the only editable Journal/Craft document system. Standalone Journal,
Explore observations, and Craft composition use the same page/document primitives with different
entry context and optional templates. Map remains instructional and may link or attach notes without
requiring workbook activity.

## Invariants

1. A workbook can exist with no Quest, Session, stage, or Codex association.
2. Ownership is derived only from `auth.uid()` and cannot be reassigned by an ordinary client.
3. Removing a Quest association does not delete the workbook or page.
4. Account deletion hard-deletes all private workbook content and future owned media.
5. Page content is validated versioned JSON, not authoritative unstructured HTML or rendered images.
6. Workbook editing does not start/end a Session, change active time, create a Result, or award XP,
   proficiency, confidence, readiness, Attributes, or recommendation weight.
7. Canonical taxonomy IDs retain official identity. Player tags remain private labels and never
   become canonical entities.
8. Official Codex content remains system-owned. Personal page discovery is a separate owner-scoped
   query and never mutates the Codex record.
9. A stale save cannot silently overwrite a newer accepted revision.
10. Realtime collaboration, sharing, publication, and AI interpretation are not implied.

## Alternatives considered

### Quest-owned Journal rows

Rejected as the general model. It cannot represent standalone notes naturally, couples lifetime to
Quest deletion, and duplicates editor/security/export logic. A Quest association table provides the
same contextual discovery without ownership coupling.

### One workbook per Quest plus a separate standalone Journal

Rejected. Two document systems would diverge in serialization, autosave, conflict handling,
accessibility, and musical-block support.

### Store rich HTML as the source of truth

Rejected. HTML is difficult to validate safely, weak for structured tablature/chord data, and
couples persistence to one renderer. Sanitized HTML may be an export or rendering product only.

### Store tablature/chords as images

Rejected for editable authority. Images may be derived previews or optional media, but cannot carry
the required tuning, string, fret, ordering, accessibility, and future rhythm semantics.

### Realtime/CRDT-first persistence

Deferred. The first release requires single-Player cross-device refresh with optimistic
concurrency, not live multi-editor collaboration. A future CRDT layer must preserve the accepted
JSON export and revision contract.

## Consequences

- QST-008's proposed Quest Journal responsibility is superseded before implementation by the JRN
  workstream. It does not require data migration because no Quest Journal table shipped.
- FRET-001 remains responsible for Quest-aware fretboard visualization/markers. It must reuse or
  interoperate with the accepted `fretboard` block schema rather than create a competing document
  store.
- Explore and Craft gain contextual entry points to the shared editor in a later authorized ticket.
- DATA-005 must extend export/deletion/security coverage to Workbooks and associations.
- The Phase 6B feature-freeze exception is not enlarged merely by this design. Each implementation
  ticket remains separately authorized and its launch-critical status must be accepted explicitly.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Rich editor complexity delays release | Prototype first; gate persistence on accessible editing and stable serialization. |
| Musical blocks become renderer-specific | Persist a GuitaRPG-owned versioned block schema and write adapters around the editor. |
| Autosave loses work | Local pending buffer, visible save state, retry, immutable revisions, optimistic concurrency. |
| JSON grows without bounds | Per-document and per-block limits; media stored by reference only after a separate policy. |
| Cross-device overwrite | Revision token required on writes; conflict returns current server revision and preserves the local draft. |
| Taxonomy drift | Store canonical entity UUID/slug plus display snapshot; resolve current Codex separately. |
| Private notes leak into public reference | Separate owner-scoped association queries; no back-write to canonical tables. |

## Compatibility

The detailed QST-005 disposition is in
`docs/architecture/JRN-000-qst-005-compatibility-matrix.md`. No existing Quest, Journey, Session,
Result, progression, or Codex data is rewritten.

## Terminal decision

The Player-owned Workbook architecture is accepted. Implementation is not authorized by this ADR.
The next proposed ticket is JRN-001, pending explicit authorization.
