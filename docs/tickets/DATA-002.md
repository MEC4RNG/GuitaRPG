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

## External acceptance status

Supabase staging project created.

- project ref: `vwvuaasgczsmeskhjrsb`
- Vercel Production `NEXT_PUBLIC_SUPABASE_URL`: configured
- Vercel Production `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: configured
- Vercel deployment after configuration: user-confirmed redeployed

Remaining external evidence:

1. link the local CLI to `vwvuaasgczsmeskhjrsb`
2. preview the pending migration with `supabase db push --dry-run`
3. apply the DATA-002 migration with `supabase db push`
4. verify remote migration history / database health

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

**BLOCKED — REMOTE SUPABASE LINK / MIGRATION EVIDENCE REQUIRED**

The implementation is code-complete and the staging project + Vercel public runtime
configuration now exist. DATA-002 remains non-terminal only until the local CLI is
linked and the source-controlled migration is applied successfully.

Do not proceed to TAX-003 as terminal Phase 1 work until this external acceptance
evidence is captured.
