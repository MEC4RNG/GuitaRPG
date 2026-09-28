# TAX-003-R1 Codex Handoff — Selective Staging Migration

**Project:** GuitaRPG  
**Phase:** 1 — Product Foundation  
**Active remediation:** TAX-003-R1 — Canonical Tuning Context Remediation  
**Blocked parent work:** PLY-002 — Player Profile & Development Persistence  
**Supabase staging project ref:** `vwvuaasgczsmeskhjrsb`

## Objective

Apply and verify TAX-003-R1 on staging **without applying PLY-002 yet**.

Then mark TAX-003-R1 complete, resume PLY-002 as the already-authorized active ticket,
and stop. Do not apply the PLY-002 migration in this handoff.

## Read first

1. `AGENTS.md`
2. `docs/MASTER-BUILD-PLAN.md`
3. `docs/project-state.json`
4. `docs/tickets/TAX-003-R1.md`
5. `docs/tickets/PLY-002.md`

## Evidence already complete

Application/repository CI:

- run `36434960088` — PASS

Fresh database:

- run `36433592618` — PASS
- migration replay through PLY-002 — PASS
- pgTAP assertions — 42/42 PASS

## Migration ordering

Already on staging:

- `20260928000000_data_002_persistence_foundation.sql`
- `20260928010000_tax_003_canonical_taxonomy.sql`

Repository pending files:

- `20260928015000_tax_003_r1_tuning_contexts.sql` ← APPLY NOW
- `20260928020000_ply_002_player_persistence.sql` ← DO NOT APPLY YET

Supabase `db push` applies pending migrations present in `supabase/migrations` in
migration order. There is no target-version flag for `db push` in the current CLI.

## Local-state safety

Before any changes:

- inspect branch and `git status`
- fetch/pull `origin/v1-production` safely
- preserve the pre-existing untracked `package-lock.json` and `supabase/.temp/`
- do not discard unrelated user work

The temporary movement described below is operational only. It must not be committed.

## Selective staging procedure

1. Confirm the CLI is linked to project `vwvuaasgczsmeskhjrsb`.

2. Run:
   `npx supabase migration list`

   Confirm remote history currently includes DATA-002 and TAX-003, but not TAX-003-R1
   or PLY-002.

3. Run:
   `npx supabase db push --dry-run`

   Because both later migrations are in the repo, it is acceptable—and expected—for
   this initial preview to list both TAX-003-R1 and PLY-002. **Do not push yet.**

4. Temporarily move exactly this file out of `supabase/migrations`:

   `20260928020000_ply_002_player_persistence.sql`

   Put it in a safe temporary path outside the migrations directory. Preserve its
   bytes exactly. Use a try/finally-style workflow so it is restored even if the push
   fails.

5. With PLY-002 temporarily absent, run:

   `npx supabase db push --dry-run`

   Require that the only pending migration is:

   `20260928015000_tax_003_r1_tuning_contexts.sql`

6. If and only if that preview is correct, run:

   `npx supabase db push`

7. Run:

   `npx supabase migration list`

   With PLY still temporarily absent, local/remote history should agree through
   `20260928015000`.

8. Run:

   `npx supabase db push --dry-run`

   With PLY still absent, staging should report up to date.

9. Restore
   `20260928020000_ply_002_player_persistence.sql`
   to its exact original path and verify it is unchanged.

10. Run `git status` and verify the temporary move left no tracked-file diff.

11. Run:

    `npx supabase migration list`

    Expected state after restoration:

    - DATA-002: local + remote
    - TAX-003: local + remote
    - TAX-003-R1: local + remote
    - PLY-002: local only / remote pending

12. Run:

    `npx supabase db push --dry-run`

    Expected final result: **only**
    `20260928020000_ply_002_player_persistence.sql`
    remains pending.

## On failure

If R1 fails:

- do not use `migration repair` to conceal a failed schema application
- do not apply PLY-002
- restore the PLY migration file
- diagnose/repair only TAX-003-R1
- preserve non-sensitive error evidence

## Completion updates

If all checks pass:

- mark `docs/tickets/TAX-003-R1.md` COMPLETE with non-sensitive evidence
- update `docs/project-state.json` so:
  - TAX-003-R1 is terminal COMPLETE
  - PLY-002 resumes as the active, already-authorized ticket
  - PLY-002 is blocked only on its own staging migration
  - ONB-001 remains unauthorized
- update `docs/MASTER-BUILD-PLAN.md` consistently if needed
- commit and push those coordination changes to `v1-production`
- stop

Do **not** run `supabase db push` after restoring the PLY migration.

## Secrets

Do not record passwords, access tokens, publishable/secret key values, or credentialed
connection strings in files, commits, or chat output.
