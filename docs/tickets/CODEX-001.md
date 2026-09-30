# CODEX-001 — Minimum Taxonomy-Backed Codex

**Status:** IN PROGRESS

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

## Terminal disposition

Pending implementation and validation.
