# JRN-000 — QST-005 Compatibility Matrix

**Status:** ACCEPTED NARROW SUPERSESSION

| QST-005 decision | Treatment | JRN-000 reconciliation |
| --- | --- | --- |
| Immutable canonical Quest identity and snapshot | Retained | Workbook links never edit or replace a Quest. |
| Player-owned Journey overlay | Retained | Journey remains lifecycle/stage state; it does not own documents. |
| Many Sessions/Results per Quest | Retained | Optional Session links are contextual only. |
| Map/Explore/Craft revisitable navigation | Retained | Shared editor entry points create no gates or lifecycle transitions. |
| Map instructional purpose/system anchors | Retained/amended | Optional notes may link to Map; Map is not compulsory workbook work. |
| Explore observations | Amended | Stored as optionally linked Player-owned pages, not Quest-owned journal rows. |
| Craft artifact | Superseded | Composition-oriented workbook pages and musical blocks replace the single JSON artifact proposal. |
| Quest Workspace owns Journal/Fretboard/References | Superseded in part | Journal becomes standalone Workbook. References remain Codex. FRET-001 retains fretboard behavior and must share the block boundary. |
| Journal ongoing Quest-level writing | Superseded | Pages may be Quest-associated but outlive and operate independently of Quests. |
| Journal prompts | Retained as optional templates | Discovery/Sound/Technique/Idea/Freeform may seed pages without changing schema or evidence. |
| Result Reflection distinct from Journal | Retained | No automatic copy in either direction. |
| One `quest_workspace` row | Superseded for editable documents | Not introduced. Journey-specific non-document state may still justify a bounded table later. |
| `quest_journal_entries` | Superseded before implementation | Replace with `player_workbooks`, pages, revisions, and optional association tables. No migration required. |
| Craft artifact JSON inside `quest_workspace` | Superseded before implementation | Structured page blocks provide the editable source. |
| Basic Journal is core next implementation | Amended | JRN sequence replaces QST-008; launch-critical subset requires explicit scope acceptance. |
| Tablature/notation deferred | Superseded by explicit user direction | Editable tablature/chord diagrams enter the proposed JRN sequence; notation remains deferred unless separately accepted. |
| Simple Quest-aware fretboard next slice | Retained with boundary | FRET-001 owns visualization/markers and interoperates with Workbook blocks. |
| Codex Peek/reference resolution | Retained | Personal pages appear separately and do not alter official content. |
| Refresh-based cross-device behavior | Retained/expanded | Applies to standalone pages with optimistic concurrency. Realtime remains deferred. |
| Export/deletion/backup | Retained/expanded | DATA-005 must include all workbook content and links; account deletion cascades. |
| Progression boundary | Retained | Edits, tags, links, and viewing have zero progression authority. |
| Session time semantics | Retained/clarified | Editing/viewing does not create separately authoritative practice time. |
| Guest identity | Retained | Same anonymous Auth/RLS model and recovery warning. |
| QST-008 responsibility | Superseded before implementation | Replaced by JRN-001–JRN-005; QST-008 must not create a competing Quest-owned journal. |
| FRET-001 responsibility | Clarified | Remains future Quest-aware fretboard ticket; no second document store. |

## Narrow superseding decision

Only the ownership and persistence of editable Journal/Craft content are superseded. Quest identity,
Journey lifecycle, MEC navigation, Session/Result authority, progression, Codex resolution, and
Quest-specific fretboard requirements remain authoritative.

QST-005 proposed its Journal tables but no such migration was implemented. Therefore this decision
requires no backfill, destructive migration, or historical evidence rewrite.
