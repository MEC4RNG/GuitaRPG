# DATA-001 — Persistence, Identity & Security Contract

**Status:** COMPLETE  
**Date:** 2026-09-27  
**Authority:** Phase 0 — Architecture & Contracts

## Objective

Define how GuitaRPG identifies users, classifies/owns durable data, protects player records, handles guest users, manages schema changes, and proves database authorization before production tables are introduced.

## Result

Accepted contract:

- Supabase Auth UUID is the canonical user identity
- email/display fields are never ownership authorities
- guest mode uses Supabase anonymous Auth rather than local-only persistence
- every durable table is classified as canonical, player-controlled, player-derived/system-authoritative, or operational
- exposed tables require explicit grants plus RLS
- player-derived progression cannot be directly forged by the browser
- service-role credentials remain server-only
- user deletion must cascade/remove private and derived player data
- schemas remain exportable by design
- raw practice audio is not stored by default
- all schema changes are migration-driven and source controlled
- RLS/security behavior requires automated database tests

## Canonical contract

`docs/architecture/DATA-001-persistence-identity-security-contract.md`

## Not implemented by this ticket

- no Supabase project/database was created
- no authentication UI was added
- no production table was created
- no RLS policy was deployed
- no service-role credential was introduced

These are deliberate non-goals. DATA-001 establishes the authority those later implementation tickets must follow.

## Acceptance

- identity model: PASS
- guest model: PASS
- ownership model: PASS
- RLS/grant model: PASS
- privileged server boundary: PASS
- deletion/export rules: PASS
- migration rules: PASS
- test requirements: PASS
- audio privacy boundary: PASS
- secret handling: PASS

## Terminal disposition

**COMPLETE**

Next semantic dependency authorized: **TAX-001 — Canonical Musical Taxonomy Contract**.

Player/schema implementation remains dependent on the relevant domain contracts.
