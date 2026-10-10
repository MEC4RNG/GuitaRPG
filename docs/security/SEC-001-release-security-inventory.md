# SEC-001 release-security inventory

This inventory describes the source-controlled v1 release surface at migration
`20260929130000`. Catalog assertions live in
`supabase/tests/database/release_security_audit.test.sql`; they fail on an
unexpected relation, RPC, grant, search path, or default privilege.

## Relations

There are 26 `public` tables and no public views or materialized views.

| Group | Tables | Access contract |
| --- | --- | --- |
| Canonical taxonomy | `taxonomy_entities`, `taxonomy_relationships` | RLS enabled; intentional read access for `anon` and `authenticated`; writes are not browser-authorized. |
| Player profile | `player_profiles`, `player_setups`, `player_tuning_preferences`, `player_goals` | RLS enabled; owner select; supported writes pass through owner-derived application/RPC contracts. Ownership columns are trigger-protected. |
| Quest | `quests`, `quest_skill_roles`, `quest_concepts`, `quest_contexts`, `quest_constraints`, `quest_objective_criteria` | RLS enabled; owner select. Quest creation is the allowlisted `persist_generated_quest` RPC. |
| Session/result | `practice_sessions`, `practice_session_events`, `practice_session_control_events`, `quest_results`, `quest_result_criteria`, `quest_result_evidence` | RLS enabled; owner select. Mutations use the allowlisted session/result RPCs. |
| Derived progression | `practice_xp_ledger`, `practice_xp_correction_ledger`, `player_character_states`, `player_skill_states`, `skill_progression_events`, `skill_readiness_events`, `player_attribute_states`, `attribute_progression_events` | RLS enabled; owner select; no `anon`/`authenticated` insert, update, or delete grant. |

The four `private` tables are `taxonomy_legacy_mappings`,
`taxonomy_legacy_mapping_targets`, `skill_progression_baselines`, and
`progression_recompute_runs`. They are not PostgREST-exposed and have no browser
grants.

All player-owned policies derive ownership from `auth.uid()`; UI visibility is
not an authorization boundary. The release audit verifies all public tables have
RLS and that ordinary roles cannot mutate derived progression tables.

## Functions and grants

The browser-visible `public` schema contains exactly 13 RPC signatures:

| RPCs | Classification and grantees |
| --- | --- |
| `complete_player_onboarding`, `persist_generated_quest` | SECURITY DEFINER, authenticated and service role; caller ownership is derived from `auth.uid()`. |
| `start_practice_session`, `pause_practice_session`, `resume_practice_session`, `end_practice_session` | SECURITY DEFINER, authenticated and service role; session owner checks precede mutation. |
| `practice_session_active_seconds` | SECURITY INVOKER, authenticated and service role; RLS remains authoritative. |
| `adjust_practice_session_reps`, `set_practice_session_metronome_bpm` | SECURITY DEFINER, authenticated and service role; private helper validates the session owner. |
| `finalize_quest_result` | SECURITY DEFINER, authenticated and service role; result ownership is derived through the owned session/quest. |
| `refresh_player_readiness` | SECURITY DEFINER, authenticated and service role; operates only on `auth.uid()`. |
| `save_player_profile_v1` | SECURITY DEFINER, authenticated and service role; accepts no player authority and preserves onboarding/progression boundaries. |
| `export_player_data_v1` | SECURITY DEFINER, authenticated only; accepts no player ID and constrains every player section to `auth.uid()`. |

The `private` schema contains 36 catalog signatures:
`active_taxonomy_entity_id`, `admin_recompute_player_progression_v1`,
`append_practice_control_event`, `apply_practice_xp_correction_v1`,
`apply_result_skill_progression_v1`, `award_result_xp_v1`,
`award_xp_after_result_finalization`, `bootstrap_new_player`, `char_v1_level`,
`ensure_player_state`, `evd_compare_scalar`, `evd_validate_self_inputs`,
`player_enforce_immutable_owner`, `player_touch_updated_at`,
`player_validate_taxonomy_refs`, `prevent_attempted_quest_delete`,
`prof_v1_challenge`, `prof_v1_level`, `prof_v1_raw_delta`,
`progression_integrity_report_v1`, `progression_model_bundle_v1`,
`progression_semantic_snapshot_v1`, `project_skills_after_result_finalization`,
`quest_validate_composition`, `quest_validate_taxonomy_refs`,
`rebuild_player_attributes_v1`, `rebuild_player_character_state`,
`rebuild_player_progression_v1`, `rebuild_player_skill_states_v1`,
`refresh_player_readiness_v1`, `seed_taxonomy_tuning_contexts_v1`,
`seed_taxonomy_v1`, `taxonomy_touch_updated_at`,
`taxonomy_validate_entity_update`, `taxonomy_validate_relationship`, and
`transition_practice_session`.

These are trigger helpers, pure calculation helpers, or service-only
recomputation/seeding operations. Public RPCs reach the necessary private
helpers using schema-qualified calls. SECURITY DEFINER is retained only where a
bounded owner-derived mutation, immutable ledger projection, trigger, or
service-only administrative operation must cross ordinary table grants. Function
owner is the migration owner (`postgres` in Supabase replay). All SECURITY
DEFINER functions use an empty search path and schema-qualified objects except
`private.seed_taxonomy_v1`, whose audited, service-only bootstrap implementation
uses `public, private, pg_temp`. No SECURITY DEFINER function is executable by
PUBLIC or `anon`.

Migration `20260929130000_sec_001_security_hardening.sql` revokes EXECUTE on
all public/private functions from PUBLIC, `anon`, and `authenticated`, then
regrants only the 13 RPCs above. It also revokes future function EXECUTE from
PUBLIC through schema-specific default privileges.

## Server and browser surface

Server routes are `GET /auth/confirm`, `GET /auth/identity`,
`GET /api/account/export`, and `POST /api/account/delete`. No route emits
wildcard CORS. Export uses the caller session and the owner-derived export RPC;
it remains private/no-store. Deletion derives its target only from the verified
server user, requires same-origin and exact destructive confirmation, enforces
recent authentication for recoverable identities, and keeps guest deletion.
Deletion uses the admin client only after those checks. Deleting Auth plus the
cascading private graph means a still-cryptographically-valid old JWT cannot
recover deleted player data or silently recreate a player through normal client
operations.

Environment variables are limited to browser-safe
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, plus the
server-only `SUPABASE_SECRET_KEY`. The admin module imports `server-only`; static
tests forbid Client Component imports, secret-env reads, or deletion dependency
graph entry. The only tracked environment file is `.env.example`, containing
names/placeholders rather than credentials.

## Response policy

All application paths receive CSP, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and
a Permissions Policy denying camera, microphone, geolocation, payment, USB,
serial, Bluetooth, and browsing topics. CSP blocks frames and objects, restricts
forms/defaults to self, and restricts Supabase connections to HTTPS/WSS
`*.supabase.co`. It contains no `unsafe-eval` and no third-party script origin.
`unsafe-inline` remains narrowly in `script-src` and `style-src` because current
static Next hydration/styles require it; nonce/hash hardening is deferred rather
than forcing 197 Codex pages into dynamic rendering. Web Audio/metronome does not
require microphone permission. HSTS verification remains OPS-001-owned.

## Supply chain

Workflows are `ci.yml`, `database-tests.yml`, `recoverable-identity.yml`,
`player-data-control.yml`, and `security-audit.yml`. Each declares
`permissions: contents: read`; none uses `pull_request_target` or a writable
token. External actions are immutable-pinned:

- `actions/checkout` v4: `11d5960a326750d5838078e36cf38b85af677262`
- `actions/setup-node` v4: `49933ea5288caeca8642d1e84afbd3f7d6820020`
- `supabase/setup-cli` v1.7.3: `1dedf2c611547ede7232d26866dd3c56ab903bbb`

Next was upgraded from 16.3.6 to 16.4.0 to remove production High advisories.
Production audit has zero vulnerabilities. The remaining full-audit High finding
is the single dev-only `braces` advisory chain through Next's ESLint tooling;
latest available `braces`/`micromatch`/`fast-glob` versions remain affected and
repository-controlled lint glob patterns do not expose attacker-controlled
patterns. `scripts/security/dependency-audit.mjs` encodes that exact, narrow
exception and fails any other High/Critical result.

The project-owned scanner checks tracked source, reachable Git history, and
browser output without printing candidate values. It recognizes Supabase secret
keys/service-role JWTs, GitHub tokens, private-key material, AWS keys, Google API
keys, and Slack tokens. No privileged candidate was found.

## Release controls

The `Release security audit` workflow exposes the always-running `security`
check. The repository ruleset must target only `refs/heads/v1-production`, block
deletion/force-push, require the PR path, and require `validate` and `security`
with zero external approvals. Database contract remains ticket evidence rather
than an unconditional check because it is path-filtered. Before P6-GATE-001,
protection must also require the future REL-006 release-readiness status.

GitHub ruleset ID/readback and protected closure-PR evidence are recorded in the
SEC-001 ticket after the initial implementation checks pass.
