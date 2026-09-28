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

## Current disposition

**VALIDATING — CODE/CI EVIDENCE PENDING**

After CI passes, the ticket will be either:

- COMPLETE if remote project evidence is available, or
- BLOCKED only on the external Supabase project/link if code acceptance is otherwise green.
