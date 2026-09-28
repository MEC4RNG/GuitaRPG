# DATA-002 — Supabase Runtime & Migration Foundation

**Status:** VALIDATING  
**Phase:** 1 — Product Foundation  
**Date:** 2026-09-27  
**Depends on:** P0-GATE-001, DATA-001, FND-002

## Objective

Turn the accepted DATA-001 persistence/security contract into runtime and migration infrastructure without prematurely creating product tables.

## Implemented

- pinned Supabase SSR, JS SDK, and CLI dependencies
- Node.js engine floor raised to 22+
- strict public Supabase environment parsing
- browser SSR client factory
- server SSR client factory using Next cookies
- Next.js 16 root Proxy session refresh
- verified-claims auth refresh via `getClaims()`
- graceful pass-through while both public Supabase env values are absent
- partial environment configuration fails closed
- source-controlled `supabase/config.toml`
- pg-delta enabled for current migration workflow
- anonymous Auth enabled locally per DATA-001 guest model
- baseline migration establishing private-schema and least-privilege defaults
- no product tables
- no elevated/admin client
- empty seed boundary reserved for TAX-003
- runtime/security contract tests
- local/remote database workflow documentation

## Current security boundary

Browser/user-context clients receive only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

`SUPABASE_SECRET_KEY` is documented as server-only but is not consumed by application code in this ticket.

## External acceptance still required

DATA-002 cannot prove a remote migration/deployment until a Supabase staging project exists and is linked.

Required external evidence:

1. create/select a staging Supabase project
2. set the matching project URL and publishable key in Vercel for `v1-production`
3. link the local CLI/project reference
4. apply the DATA-002 migration
5. confirm the remote database is healthy and the application preview still builds/runs

## Validation evidence

GitHub Actions run: `36370201177`

Validated implementation head: `905a4fbc3d78a63d85b2710398d0371f7be73250`

- dependency installation: PASS
- format check: PASS
- lint: PASS
- strict TypeScript typecheck: PASS
- all unit/contract/regression tests: PASS
- Next.js production build with Supabase env absent: PASS
- public env parser / partial-config failure tests: PASS
- migration/security foundation tests: PASS

## Current disposition

**BLOCKED — EXTERNAL SUPABASE STAGING PROJECT / REMOTE MIGRATION EVIDENCE REQUIRED**

The implementation is code-complete. DATA-002 remains non-terminal until the staging
Supabase project is created/linked, the public runtime variables are configured in
Vercel, and the source-controlled migration is applied successfully.

Do not proceed to TAX-003 as terminal Phase 1 work until this external acceptance
evidence is captured.
