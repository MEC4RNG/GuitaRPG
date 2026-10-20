# JRN-000 — Workbook Data Model Specification

**Status:** ACCEPTED DESIGN / NO MIGRATION AUTHORIZED

## Entity model

```text
auth.users
├─ player_workbooks
│  ├─ player_workbook_pages
│  │  └─ player_workbook_page_revisions
│  ├─ player_workbook_quest_links ── quests
│  ├─ player_workbook_session_links ── practice_sessions
│  └─ player_workbook_taxonomy_links ── taxonomy_entities
├─ player_workbook_tags
└─ player_workbook_tag_links ── player_workbooks / player_workbook_pages
```

Quest and Session links are optional context. They are not ownership edges.

## Proposed tables

### `player_workbooks`

| Column | Contract |
| --- | --- |
| `id uuid PK` | Generated durable identity. |
| `player_id uuid NOT NULL FK auth.users ON DELETE CASCADE` | Immutable owner; derived from caller. |
| `schema_version smallint` | Workbook envelope version, initially `1`. |
| `title text` | Required, trimmed, bounded length. |
| `description text` | Optional private metadata, bounded length. |
| `kind text` | Initially `WORKBOOK` or `QUICK_NOTES`; organizational only. |
| `archived_at timestamptz` | Nullable reversible archive state. |
| `created_at`, `updated_at timestamptz` | Server-authored timestamps. |
| `revision bigint` | Monotonic optimistic-concurrency token for workbook metadata/order mutations. |

Indexes: `(player_id, archived_at, updated_at desc, id)` and a case-folded owner/title search index
only if a later implementation proves it necessary.

### `player_workbook_pages`

| Column | Contract |
| --- | --- |
| `id uuid PK` | Stable page identity. |
| `workbook_id uuid FK player_workbooks ON DELETE CASCADE` | Parent aggregate. |
| `player_id uuid FK auth.users ON DELETE CASCADE` | Redundant immutable owner for explicit RLS and cascade audit. |
| `title text` | Required, bounded; may default to `Untitled page`. |
| `position_key text` or `position bigint` | Deterministic order; mutation occurs through trusted reorder operation. |
| `document_schema_version smallint` | GuitaRPG document version, initially `1`. |
| `document jsonb` | Validated structured content. |
| `revision bigint` | Incremented for every accepted content/title save. |
| `created_at`, `updated_at timestamptz` | Server-authored. |

The initial implementation should use integer positions and transactionally renumber the bounded
page list. Fractional/rank keys are optional if reorder contention or scale justifies them.

### `player_workbook_page_revisions`

Immutable accepted snapshots used for recovery and audit, not a progression ledger.

| Column | Contract |
| --- | --- |
| `id uuid PK` | Revision identity. |
| `page_id uuid FK ... ON DELETE CASCADE` | Revised page. |
| `player_id uuid FK auth.users ON DELETE CASCADE` | Immutable owner. |
| `revision bigint` | Unique per page. |
| `document_schema_version smallint` | Parser version. |
| `document jsonb` | Accepted snapshot. |
| `title_snapshot text` | Title at save time. |
| `created_at timestamptz` | Server timestamp. |

Retention must be bounded by an explicitly tested policy (for example, recent autosave checkpoints
plus named revisions). Silent deletion of the only recoverable prior revision is forbidden.

### Optional association tables

- `player_workbook_quest_links(workbook_id, quest_id, player_id, relationship, stage, created_at)`
- `player_workbook_session_links(workbook_id, page_id nullable, session_id, player_id, created_at)`
- `player_workbook_taxonomy_links(workbook_id, page_id nullable, taxonomy_entity_id, player_id,
  relationship, display_name_snapshot, created_at)`

Relationships use bounded enums such as `REFERENCE`, `CREATED_DURING`, or `APPLIES_TO`; MEC stage
is nullable and limited to `MAP`, `EXPLORE`, `CRAFT`. Private owner-validation triggers/functions
must prove that the associated Quest/Session belongs to the same caller. Deleting a Quest or Session
cascades only its link row. It never deletes a workbook/page.

### Player-created tags

- `player_workbook_tags(id, player_id, normalized_name, display_name, created_at, updated_at)`
- `player_workbook_tag_links(tag_id, workbook_id, page_id nullable, player_id, created_at)`

`(player_id, normalized_name)` is unique. A tag link targets a workbook or one of its pages, never
neither. Player tags have no FK to `taxonomy_entities`, do not participate in generator or
progression semantics, and cannot impersonate canonical identity.

## Trusted operations

Browser clients receive owner-scoped reads. Mutations use narrow SECURITY DEFINER RPCs (or an
equivalent server boundary) that derive `player_id = auth.uid()`, use an empty search path, validate
payload size/schema and relationship ownership, and return the new revision token.

Required operations:

- create/archive/restore/rename workbook
- create/duplicate/delete/reorder page
- save page with `expected_revision`
- restore a selected retained revision as a new revision
- attach/detach owned Quest or Session context
- attach/detach valid canonical taxonomy identity
- create/rename/delete private tag and mutate tag links

There is no caller-supplied owner parameter. Direct owner reassignment is denied. Service role is
not the normal editing path.

## Optimistic concurrency and autosave

1. The client loads page revision `N`.
2. Autosave sends validated document plus `expected_revision = N` and a stable request ID.
3. The server locks the page, accepts only when current revision is `N`, writes revision `N+1` and
   its recovery snapshot atomically, then returns `N+1`.
4. A stale request returns a typed conflict with the current revision and does not mutate data.
5. The client preserves its unsaved local payload, labels the conflict, and offers reload, copy, or
   explicit reconciliation. It never silently chooses last-write-wins.

Autosave is debounced after edits, flushes on deliberate navigation/visibility changes where
possible, exposes `Saving`, `Saved`, `Offline/pending`, and `Conflict` states, and retains a bounded
local pending buffer until server acknowledgement. Retrying the same request ID is idempotent.

## Validation and limits

- Root must match `GUITARPG_WORKBOOK_DOCUMENT_V1`.
- Every block has a stable UUID, known type, supported block version, and valid bounded payload.
- Unknown future blocks are preserved read-only when safely representable, not discarded.
- Text, block count, nested depth, tablature event count, and total serialized bytes have explicit
  limits before implementation.
- URLs and future media references use an allowlisted typed structure; executable HTML/scripts are
  rejected.
- Database validation enforces envelope basics; the trusted mutation layer runs the complete parser.

## RLS and security matrix

All exposed tables enable RLS, revoke defaults, and grant only required operations. Owner SELECT
requires `player_id = auth.uid()`. Mutations are through owner-derived trusted operations. Tests must
cover owner success, non-owner/unauthenticated denial, forged association IDs, owner reassignment,
stale revision refusal, invalid document refusal, direct authoritative progression mutation absence,
guest parity, and account deletion.

## Cross-device behavior

Protected Players see accepted revisions after refresh/refocus. Realtime subscriptions are not
required. A device with a pending local edit compares revision tokens before save. Anonymous guest
Players use the same tables/RLS but retain the existing unrecoverable-session warning.

## Export and deletion

DATA-005 must add workbook metadata, current pages, retained revisions (or a documented recovery
subset), tags, and Quest/Session/taxonomy associations to a versioned Player export. Canonical
entities are referenced by stable identity plus snapshot name, not copied wholesale.

Auth deletion cascades all rows. Quest deletion removes link rows only. Future media requires an
owned object manifest, signed access, export representation, and object deletion before launch.

No migration is created by JRN-000.
