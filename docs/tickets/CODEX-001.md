# CODEX-001 — Minimum Taxonomy-Backed Codex

**Status:** COMPLETE

## Objective

Replace the Codex placeholder with an unauthenticated, source-controlled reference for every active Skill, Concept, Context, and Constraint in the canonical taxonomy.

## Authority and boundaries

`domain/taxonomy/canonical-taxonomy.json` remains the sole authority for identity, lifecycle, names, kinds, metadata, and relationships. `CODEX_CONTENT_V1` adds definitions and discovery terms only; it creates neither a second taxonomy nor a database content model. QST-004 and Player progression remain outside this ticket.

## Required evidence

- Exact 197-entry coverage: 72 Skills, 64 Concepts, 31 Contexts, and 30 Constraints.
- Conservative distinction between curated aliases and unambiguous, non-parameterized legacy search terms.
- Static browse, search, kind filters, and type-scoped detail routes.
- Canonical Domain/context metadata and relationship rendering.
- Desktop, Pixel 7, accessibility, regression, build, and CI validation.

## Content and runtime

`domain/codex/codex-content-v1.json` defines `CODEX_CONTENT_V1` explanatory content for exactly 197 active eligible entities: 72 Skills, 64 Concepts, 31 Contexts, and 30 Constraints. The pure `CODEX_CATALOG_V1` runtime joins that content to canonical identity, lifecycle, metadata, and relationships without Supabase or a second taxonomy.

Definitions are bounded, non-placeholder, and unique. Curated aliases remain separate from conservatively derived historical discovery terms; split mappings and parameterized legacy Context values are excluded. The canonical taxonomy and legacy-normalization artifacts are unchanged.

## Browse, search, and detail UX

`/codex` provides unauthenticated name/slug/definition/alias/search-term discovery and filters for all four eligible kinds. Stable type-scoped URLs statically generate all 197 details, reject kind/slug mismatches with not-found behavior, and display canonical Skill Domains, Context metadata, tuning facts, and existing relationships. The DADGAD, Dorian, Alternate Picking, and Target Tempo fixtures retain their canonical classifications.

## Validation and terminal disposition

- Codex/taxonomy targeted: 5 files / 20 tests passed.
- Phase 4: 6 files / 74 tests passed.
- Phase 3: 5 files / 26 tests passed.
- Phase 2: 3 files / 14 tests passed.
- Full Vitest: 58 files / 396 tests passed.
- Formatting, lint, strict TypeScript, and production build passed; 197 Codex detail pages were statically generated.
- Focused Codex Playwright passed on Desktop Chrome and Pixel 7 with no horizontal overflow and public access.
- A repeated full local browser run encountered the existing anonymous-auth setup waiting state; clean implementation CI passed. CODEX-001 does not change Auth/onboarding.
- No database migration, Supabase content dependency, taxonomy mutation, dependency change, or CI-workflow change was introduced.
- Production scaffold implementation CI: 36758360525 — SUCCESS.

Terminal disposition: COMPLETE. QST-004 remains unauthorized.
