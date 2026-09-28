# PLY-002 Codex Handoff — Staging Migration Acceptance

**Project:** GuitaRPG  
**Phase:** 1 — Product Foundation  
**Active ticket:** PLY-002 — Player Profile & Development Persistence  
**Current disposition:** BLOCKED only on staging migration evidence  
**Supabase staging project ref:** `vwvuaasgczsmeskhjrsb`

## Objective

Apply and verify the already-authorized PLY-002 migration on staging, record
non-sensitive completion evidence, update coordination state, and stop.

Do not begin ONB-001.

## Read first

1. `AGENTS.md`
2. `docs/MASTER-BUILD-PLAN.md`
3. `docs/project-state.json`
4. `docs/tickets/PLY-002.md`
5. `docs/tickets/TAX-003-R1.md`

## Evidence already complete

Repository validation:

- Production scaffold CI: `36434960088` — PASS

Fresh-database validation:

- Database contract workflow: `36433592618` — PASS
- clean migration replay through PLY-002 — PASS
- pgTAP Player/RLS/lifecycle assertions: **42/42 PASS**

TAX-003-R1 staging remediation:

- terminal COMPLETE
- `20260928015000_tax_003_r1_tuning_contexts.sql` applied and verified
- final preview after remediation showed only PLY-002 pending

## Expected pending migration

Apply only:

`20260928020000_ply_002_player_persistence.sql`

Already applied on staging:

- `20260928000000_data_002_persistence_foundation.sql`
- `20260928010000_tax_003_canonical_taxonomy.sql`
- `20260928015000_tax_003_r1_tuning_contexts.sql`

## Local-state safety

Before any database action:

- inspect branch and `git status`
- fetch/pull `origin/v1-production` safely
- preserve existing untracked `package-lock.json` and `supabase/.temp/`
- do not discard unrelated user work
- confirm the Supabase CLI is still linked to `vwvuaasgczsmeskhjrsb`

## Required staging sequence

1. Run:
   `npx supabase migration list`

2. Confirm local/remote history agrees through:
   - `20260928000000`
   - `20260928010000`
   - `20260928015000`

   and that `20260928020000` is local-only.

3. Run:
   `npx supabase db push --dry-run`

4. Require that the only pending migration is:
   `20260928020000_ply_002_player_persistence.sql`

5. If and only if the preview is correct, run:
   `npx supabase db push`

6. Run:
   `npx supabase migration list`

7. Require local/remote history to agree through `20260928020000`.

8. Run:
   `npx supabase db push --dry-run`

9. Require staging to report up to date.

10. Inspect `git status` and confirm no unintended tracked changes were introduced.

## On failure

If PLY-002 fails:

- do not use migration-history repair to conceal a failed schema application
- do not begin ONB-001
- diagnose and repair only PLY-002
- preserve non-sensitive failure evidence
- leave the ticket non-terminal

## Completion updates

If all staging checks pass:

- mark `docs/tickets/PLY-002.md` COMPLETE
- record non-sensitive migration evidence
- update `docs/project-state.json` so:
  - PLY-002 is the last terminal ticket
  - no ticket is active
  - ONB-001 is the next planned ticket
  - ONB-001 remains unauthorized pending explicit user approval
- update `docs/phase1-product-foundation.md`
- update `docs/MASTER-BUILD-PLAN.md` consistently
- update coordination tests if the terminal state requires it
- run whatever repository validation is feasible
- commit and push the completion/coordination changes to `v1-production`
- stop

## Secrets

Do not record passwords, access tokens, publishable/secret key values, or credentialed
connection strings in files, commits, or chat output.

## Terminal condition

PLY-002 is COMPLETE only when:

- repository CI is green
- fresh-database pgTAP is green
- the expected PLY-002 migration is applied to staging
- local/remote migration history agrees through `20260928020000`
- final dry-run reports staging is up to date
- project coordination files agree with the terminal state

Then stop. ONB-001 remains unauthorized until the user explicitly proceeds.
