# DATA-004 — Player Export & Account Deletion

**Status:** IN PROGRESS

## Objective

Provide a versioned, owner-isolated JSON export for recoverable Players and complete hard deletion for guest and recoverable Players. Deletion derives its target only from the verified caller, requires explicit confirmation and same-origin POST protection, and removes the Auth identity so the existing FK cascade removes the full private Player graph.

## Boundaries

The export is `GUITARPG_PLAYER_EXPORT_V1`, generated on demand and never retained. Canonical taxonomy/Codex content and private recomputation records are excluded. Export uses the caller session and no elevated key. Deletion alone uses the server-only `SUPABASE_SECRET_KEY`; hosted secret configuration remains an OPS-001 prerequisite. SEC-001 and production cutover remain unauthorized.

Validation evidence, the exact graph, staging disposition, CI, and terminal disposition will be recorded at closure.
