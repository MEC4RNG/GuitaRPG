# DATA-002 — Supabase Runtime & Migration Foundation

**Status:** COMPLETE  
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

Supabase staging project acceptance is complete.

- project ref: `vwvuaasgczsmeskhjrsb`
- Vercel Production `NEXT_PUBLIC_SUPABASE_URL`: configured
- Vercel Production `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: configured
- Vercel deployment after configuration: user-confirmed redeployed
- Supabase CLI linked to `vwvuaasgczsmeskhjrsb`: PASS
- remote migration dry-run showed only `20260928000000_data_002_persistence_foundation.sql`: PASS
- DATA-002 migration applied successfully: PASS
- local/remote migration history both report version `20260928000000`: PASS
- final remote dry-run reports the database is up to date: PASS

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

## Local execution note

Codex completed the remote migration workflow from a local environment running Node
`20.18.0`. Project-targeted tests could not be rerun there because this repository
requires Node 22+. No dependency vulnerabilities were reported by `npm install`.

Pre-existing untracked `package-lock.json` and `supabase/.temp/` were preserved.

This does not weaken acceptance: the implementation itself had already passed the
repository CI suite on Node 22, and the completion step changed remote migration state
plus documentation rather than application code.

## Terminal disposition

**DATA-002 — COMPLETE**

Code/CI acceptance and staging migration acceptance are both satisfied.

Next Phase 1 implementation ticket: **TAX-003 — Canonical Taxonomy Seed Implementation**.

TAX-003 still requires explicit user authorization before execution begins.
