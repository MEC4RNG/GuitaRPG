# DATA-001 — Persistence, Identity & Security Contract

- Status: Accepted
- Ticket: DATA-001
- Date: 2026-09-27
- Applies to: GuitaRPG v1 production architecture

## Purpose

Define the canonical ownership, identity, persistence, authorization, deletion, export, migration, and security rules that all GuitaRPG database implementation tickets must follow.

This contract intentionally does **not** create production tables. It defines the rules those tables must satisfy.

## 1. Identity authority

Supabase Auth `auth.users.id` is the canonical user identity.

Rules:

- ownership is always keyed by UUID user ID, never by email, username, display name, or provider identity
- application tables may reference `auth.users(id)` but must not expose the Auth schema directly through the application API
- a one-to-one application profile row uses the Auth UUID as its identity or unique foreign key
- player-owned foreign keys use `on delete cascade` unless a later ticket documents a concrete reason not to
- user ownership columns are immutable from the client
- no client-provided email or profile field may be trusted as proof of ownership

## 2. User classes

### Permanent user

A permanent user is linked to a recoverable identity such as email or an approved OAuth provider.

A permanent user can sign out and later recover the same GuitaRPG account.

### Guest user

Guest mode should use **Supabase anonymous Auth**, not unauthenticated browser-only state.

This gives a guest:

- a real Auth UUID
- the `authenticated` Postgres role
- the same row-ownership model as a permanent user
- a clean future path to link/upgrade the anonymous identity to a permanent identity

Guest restrictions:

- an anonymous user has no guaranteed account recovery after signing out, clearing storage, or losing the browser session
- the UI must warn before an action that would make an unlinked anonymous account unrecoverable
- guest-to-permanent upgrade must preserve the same user identity whenever Supabase's identity-linking flow allows it
- guest status must be determined from trusted Auth/JWT state, not from a client boolean

Unauthenticated visitors may access only explicitly public/canonical content.

## 3. Data ownership classes

Every durable table or view must be classified before implementation.

### A. Canonical global data

Examples:

- Domains
- Skills
- Concepts
- Techniques
- Constraints
- Contexts
- Attributes
- relationship definitions
- public Codex/reference content
- system-defined Quest templates

Ownership:

- system-owned
- not player-owned

Default access:

- public read only where product requirements call for public reference access
- authenticated read where public access is unnecessary
- writes restricted to trusted server/admin workflows
- ordinary clients never mutate canonical rows directly

Canonical rows should use stable machine identifiers/slugs in addition to database primary keys when long-lived references are needed.

### B. Player-authored / player-controlled data

Examples:

- profile/preferences
- instrument setup
- tuning preferences
- goals
- saved Quest state
- session notes
- user-entered reflections
- user-created artifacts metadata when later supported

Ownership:

- exactly one player unless a later multi-user feature explicitly changes the model

Default access:

- owner can read
- owner may create/update/delete fields explicitly designated user-editable
- other users receive no access by default

### C. Player-derived / system-authoritative data

Examples:

- Practice XP ledger
- Character Level state
- Skill evidence
- proficiency estimates
- confidence
- readiness
- Attribute progression
- training recommendations
- verification-derived metrics

Ownership:

- associated with one player
- calculated/issued by trusted application logic

Default access:

- owner can read
- ordinary client cannot directly forge or overwrite authoritative derived values
- writes occur through trusted server/database functions or other explicitly authorized server workflows

The UI may submit raw events or permitted self-report inputs, but it may not directly write final proficiency, XP totals, Character Level, verification confidence, or recommendation outputs.

### D. Operational/system data

Examples:

- migrations
- job metadata
- internal diagnostics
- security/audit events
- rate-limit state

Ownership:

- system-owned

Default access:

- not exposed to ordinary clients
- use a non-exposed/private schema where practical

Operational telemetry must not capture raw guitar audio, private practice notes, or other unnecessary user content by default.

## 4. Schema boundaries

### Exposed application schema

User-facing application tables may live in an exposed schema such as `public` only when their grants and RLS policies are explicit and tested.

Every exposed table must have RLS enabled.

### Private/server schema

Service-only tables, privileged functions, security helpers, internal aggregation tables, or other data that does not need direct API exposure should live in a non-exposed/private schema where practical.

A later implementation ticket may refine schema names, but it may not weaken this exposure principle without a new ADR/contract amendment.

## 5. RLS and grant invariants

RLS is mandatory for every exposed application table.

For every exposed table:

1. enable RLS
2. revoke broad/default privileges
3. grant only the operations actually required by each role
4. define policies by operation
5. test allowed and denied paths

Do not rely on RLS policy presence alone; PostgreSQL grants and RLS policies work together.

### Policy rules

- policies name their intended role explicitly
- prefer separate policies for SELECT, INSERT, UPDATE, and DELETE rather than opaque `FOR ALL` policies
- player-owned policies compare the authenticated user identity to the immutable ownership column
- INSERT policies enforce ownership using `WITH CHECK`
- UPDATE policies protect both the existing row and resulting row, preventing ownership reassignment
- unauthenticated access is denied unless intentionally granted for public canonical data
- no policy may use user-editable metadata as an authorization authority
- JWT fields used for authorization must be trusted Auth-issued claims, not mutable profile metadata

### Views

A view over protected data must not accidentally bypass its underlying RLS contract.

Any exposed view must either:

- honor caller RLS/security semantics, or
- be placed behind an explicitly trusted server boundary

Views are security-reviewed like tables.

## 6. Access matrix

| Data class | anon role | authenticated owner | authenticated non-owner | trusted server/service |
|---|---|---|---|---|
| public canonical reference | SELECT if explicitly public | SELECT | SELECT | controlled write |
| authenticated-only canonical | none | SELECT | SELECT | controlled write |
| user-editable private data | none | permitted CRUD by field/table contract | none | permitted |
| derived authoritative player data | none | SELECT | none | write/read |
| operational/private data | none | none | none | permitted |

"authenticated owner" includes an anonymous Supabase Auth user because anonymous Auth users operate under the authenticated database role; guest-specific restrictions must therefore be implemented with trusted anonymous-user claims where needed.

## 7. Service-role boundary

The Supabase service-role credential bypasses RLS and is therefore privileged.

Rules:

- never expose it in browser code
- never store it in a `NEXT_PUBLIC_*` variable
- never commit it to Git
- use it only in trusted server/runtime contexts that actually require it
- prefer ordinary user-context/RLS access when privileged bypass is unnecessary
- service-role use must not become the default shortcut for normal application operations

## 8. Data integrity conventions

### IDs

- durable entity primary keys use UUIDs unless a later contract documents a stronger reason for another type
- canonical musical entities also receive stable unique slugs
- user ownership always references Auth UUIDs

### Time

- durable event timestamps use timezone-aware UTC-compatible PostgreSQL `timestamptz`
- store the authoritative instant; local timezone is presentation context
- tables representing mutable records include `created_at` and `updated_at` where meaningful

### Deletion fields

Soft deletion is not the default.

Use `deleted_at` only when product behavior genuinely requires restoration/history semantics.

Account deletion is a separate operation and must result in hard deletion/anonymization of user-owned application data according to this contract and any later legal-retention requirements.

### Derived totals

Do not make mutable aggregate totals the only source of truth when a ledger/evidence history is needed for auditability.

For progression systems, preserve sufficient source evidence to recompute or validate derived state.

## 9. Account deletion

Deleting a GuitaRPG account must remove the Auth identity and cascade through player-owned application data wherever practical.

Account deletion requirements:

- private player data must not remain queryable under an orphaned user ID
- derived progression state must be deleted with the player
- private notes and saved sessions must be deleted
- future stored creative/audio artifacts must have explicit deletion handling before that feature ships
- canonical/global musical content is not part of a user's deletion
- security/operational records may only be retained if a later documented retention requirement permits it and should avoid retaining unnecessary user content

The implementation ticket must test deletion behavior rather than assuming foreign-key cascades are complete.

## 10. Data export

A permanent user must eventually be able to request/export their durable GuitaRPG application data.

The v1 export contract should include, where present:

- profile and settings
- instrument/tuning preferences
- goals
- saved/generated Quest records associated with the player
- session history and outcomes
- user reflections/notes
- XP/evidence/proficiency/readiness state
- Attribute/progression state
- recommendation/history records that are meaningfully user-specific

System-wide canonical musical definitions do not need to be duplicated in the export; stable IDs/slugs may reference them.

The first database implementation need not ship a user-facing export UI, but it must avoid a schema that makes export impractical.

## 11. Audio/privacy boundary

Persistence inherits ADR-001's audio rule:

- raw practice audio is not uploaded or retained by default
- microphone analysis should be local/client-side when practical
- derived measurements may be persisted only when required by a Quest/session result
- any later raw-audio upload/storage feature requires explicit product, consent, retention, and deletion design before implementation

No database ticket may silently introduce raw microphone recording storage.

## 12. Migration contract

All production schema changes are source-controlled migrations.

Target convention:

`supabase/migrations/<timestamp>_<description>.sql`

Rules:

- do not make untracked production schema changes directly in Supabase Dashboard/Table Editor/SQL Editor
- develop/test schema changes locally or in an appropriate development environment
- migrations must be reproducible from a clean database
- migrations are reviewed with the code that depends on them
- destructive migrations require explicit migration/rollback consideration
- schema history is never rewritten after deployment merely to make files look cleaner
- seed/reference data strategy is defined separately from player-owned production data

## 13. Database security tests

Future implementation tickets must create automated RLS/database tests.

Minimum required cases for each player-owned resource:

- owner can perform each explicitly allowed operation
- non-owner cannot SELECT
- non-owner cannot UPDATE
- non-owner cannot DELETE
- user cannot INSERT a row owned by another user
- user cannot UPDATE ownership to another user
- unauthenticated request is denied unless intentionally public
- service/server path succeeds only where explicitly intended
- RLS is actually enabled

Additional required cases:

- anonymous Auth user receives the intended guest access
- permanent user receives equivalent owner isolation
- derived-authoritative tables reject direct client mutation
- account deletion removes/cascades player-owned rows

## 14. Environment/secrets contract

Public/browser-safe values may use `NEXT_PUBLIC_*` only when designed for browser exposure.

Secrets must remain server-only.

At minimum:

- Supabase project URL: browser-safe
- Supabase publishable/anon key: browser-safe within the RLS model
- service-role key: server-only secret

Environment files containing credentials are not committed.

Production/staging/development credentials remain separate where environments exist.

## 15. Trust-boundary principle

The database must remain secure even if a user:

- edits browser JavaScript
- manually calls Supabase APIs
- changes request bodies
- fabricates another user's UUID
- skips UI validation
- tries to write their own XP/proficiency
- operates as an anonymous guest

UI restrictions are usability controls, not security boundaries.

## 16. Deferred decisions

DATA-001 does not decide:

- exact table names/columns beyond contract-level requirements
- authentication providers
- passwordless vs password UX
- final Supabase project/environment topology
- exact data-export file format
- legal retention periods
- teacher/student sharing
- public profiles
- social/community permissions
- media/object-storage schema

Those require later tickets or contract amendments.

## 17. Implementation consequences

The first schema implementation must support the security model before feature convenience.

In particular:

- `PLY-001` may define player-development fields but cannot grant the client direct authority over derived progression
- `QST-001` must distinguish canonical Quest semantics from player-owned Quest instances
- `PROG-001` must preserve evidence sufficient to justify/recompute derived progression
- guest support should reuse the player ownership model rather than create a second local-only persistence architecture

## 18. References

- Supabase User Management: https://supabase.com/docs/guides/auth/managing-user-data
- Supabase Users / anonymous users: https://supabase.com/docs/guides/auth/users
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Database Migrations: https://supabase.com/docs/guides/deployment/database-migrations

## Acceptance evidence

- canonical identity authority defined: PASS
- permanent vs guest identity defined: PASS
- ownership classes defined: PASS
- RLS/grant invariants defined: PASS
- client/server authority boundary defined: PASS
- service-role boundary defined: PASS
- deletion contract defined: PASS
- export contract defined: PASS
- migration contract defined: PASS
- database security test requirements defined: PASS
- audio persistence/privacy boundary defined: PASS
- secrets/environment boundary defined: PASS

## Terminal disposition

**DATA-001 — COMPLETE**

The persistence, identity, and security contract is accepted. It authorizes dependent player/taxonomy/schema design work, but it does not authorize production table creation without the relevant domain contract.
