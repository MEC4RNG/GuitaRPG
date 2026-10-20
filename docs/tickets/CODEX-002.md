# CODEX-002 — Contextual Codex Peek

**Status:** IN PROGRESS

## Objective

Add a reusable, accessible, presentation-only Codex inspector to Quest-facing surfaces so Players
can inspect verified taxonomy references without leaving or mutating Generate, Journey, Training, or
Session state.

## Authority and boundaries

CODEX-001 remains the content authority, QST-004 remains the Quest-reference resolver, and QST-005
defines the non-destructive Peek experience. This ticket adds no taxonomy, Codex content, database,
RPC, Quest lifecycle, Session, Result, progression, Auth, production, or public-traffic change.

## Implementation decisions

- One app-shell provider owns transient Peek presentation state while every underlying surface stays
  mounted.
- Valid QST-004 references become semantic buttons; unresolved historical references remain plain
  snapshot text.
- Desktop uses a nonmodal right inspector. Narrow viewports use a modal bottom sheet with inert
  background, scroll locking, focus containment, Escape close, and focus restoration.
- Full entries open in a new tab with `noopener noreferrer` so current application context remains
  available.
- Quest relevance is bounded role copy; definitions and relationships come only from the existing
  Codex catalog.

## Current disposition

Implementation and validation are in progress. A staging-backed Preview and explicit user visual
approval are required before protected merge.
