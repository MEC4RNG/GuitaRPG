# TAX-003 Codex Handoff — Staging Migration Acceptance

**Project:** GuitaRPG  
**Phase:** 1 — Product Foundation  
**Active ticket:** TAX-003 — Canonical Taxonomy Seed Implementation  
**Current disposition:** BLOCKED only on staging migration evidence  
**Supabase staging project ref:** `vwvuaasgczsmeskhjrsb`

## Objective

Finish the external staging acceptance for TAX-003. Do not begin PLY-002.

## Authority to read first

1. `AGENTS.md`
2. `docs/MASTER-BUILD-PLAN.md`
3. `docs/project-state.json`
4. `docs/tickets/TAX-003.md`
5. `docs/architecture/TAX-001-canonical-musical-taxonomy-contract.md`
6. `docs/architecture/TAX-002-legacy-generator-normalization.md`
7. `docs/architecture/DATA-001-persistence-identity-security-contract.md`

## Repository evidence already complete

Validated implementation head:

`b889bb2f83a7b7685e26f7d12803af73cce8d25b`

GitHub Actions:

`36428310431` — SUCCESS

The remote GitHub branch may advance with coordination-document commits after that
validation commit. Inspect `origin/v1-production` rather than assuming the SHA above is
the current branch head.

## Expected migration

`supabase/migrations/20260928010000_tax_003_canonical_taxonomy.sql`

The migration transaction seeds and asserts:

- 196 canonical entities
- 6 Domains
- 72 Skills
- 64 Concepts
- 28 Contexts
- 13 Constraint Definitions
- 11 Attributes
- 2 Tags
- 72 Skill → Domain BELONGS_TO relationships
- 207 legacy mapping rows
- 238 legacy mapping targets
- exactly one Domain membership per Skill

A successful push therefore includes database-native count validation.

## Local-state warning

The previous local Codex session reported pre-existing/untracked:

- `package-lock.json`
- `supabase/.temp/`
- local DATA-002 documentation edits that were not pushed at that time

The remote repository has since finalized DATA-002 and TAX-003 coordination state.

Inspect `git status` before syncing. Do not blindly discard, reset, overwrite, or commit
unrelated local work. Reconcile semantically duplicated local documentation safely.

The local machine previously reported Node `20.18.0`; repository CI validates on Node
22. TAX-003 code/tests are already green in GitHub CI, so do not make a Node upgrade a
prerequisite for the remote migration unless the CLI actually requires it.

## Required staging sequence

After safely reaching the current `v1-production` code:

1. Confirm the Supabase CLI remains linked to `vwvuaasgczsmeskhjrsb`.
2. Run:
   `npx supabase db push --dry-run`
3. Stop if anything other than
   `20260928010000_tax_003_canonical_taxonomy.sql`
   is unexpectedly pending.
4. If the dry-run is clean, run:
   `npx supabase db push`
5. Run:
   `npx supabase migration list`
6. Confirm local/remote history includes:
   - `20260928000000`
   - `20260928010000`
7. Run a final:
   `npx supabase db push --dry-run`
8. Confirm the remote database is up to date.

If the migration fails, diagnose and repair only TAX-003. Do not bypass its transaction
assertions and do not start PLY-002.

## Completion evidence to preserve

Update `docs/tickets/TAX-003.md` with non-sensitive evidence only:

- dry-run result
- migration push result
- migration-history result
- final up-to-date dry-run result
- any relevant non-secret diagnostic

Do not record:

- database password
- access token
- publishable/secret key values
- connection strings containing credentials

## Terminal condition

TAX-003 may be marked COMPLETE only when:

- repository code/CI remains green
- the expected TAX-003 migration is applied to staging
- remote migration history agrees with local
- final dry-run reports the remote database is up to date
- ticket/project coordination state is updated consistently

Then stop and hand control back to Chat/user. PLY-002 remains unauthorized until the
user explicitly proceeds.
