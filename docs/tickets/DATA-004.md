# DATA-004 — Player Export & Account Deletion

**Status:** COMPLETE

## Objective

Provide a versioned, owner-isolated JSON export for recoverable Players and complete hard deletion for guest and recoverable Players. Deletion derives its target only from the verified caller, requires explicit confirmation and same-origin POST protection, and removes the Auth identity so the existing FK cascade removes the full private Player graph.

## Boundaries

The export is `GUITARPG_PLAYER_EXPORT_V1`, generated on demand and never retained. Canonical taxonomy/Codex content and private recomputation records are excluded. Export uses the caller session and no elevated key. Deletion alone uses the server-only `SUPABASE_SECRET_KEY`; hosted secret configuration remains an OPS-001 prerequisite. SEC-001 and production cutover remain unauthorized.

## Export contract

- Version: `GUITARPG_PLAYER_EXPORT_V1`
- Route: `GET /api/account/export`
- RPC: `public.export_player_data_v1()` with no arguments
- Owner source: `auth.uid()` plus verified server `auth.getUser()` identity metadata
- Required account type: recoverable; guests receive `ACCOUNT_PROTECTION_REQUIRED`
- Response: `application/json`, attachment `guitarrpg-player-data-YYYY-MM-DD.json`, `Cache-Control: private, no-store`
- Consistency: one read-only database statement; no export timestamp, audit, or storage write
- Admin authority: not used by export

The snapshot contains Profile, tuning preferences, setups, active and inactive goals, Quests and all Quest composition children, Sessions and lifecycle/control events, Results/criteria/evidence/reflection, Character and current Skill/Attribute state, XP awards/corrections, and Skill/readiness/Attribute progression events. Arrays have stable ordinal/sequence/time/ID ordering. Canonical taxonomy/Codex bodies, normalization data, `private.skill_progression_baselines`, and `private.progression_recompute_runs` are intentionally excluded. Two-Player database/API fixtures prove owner isolation and marker absence.

## Deletion trust boundary

- Route: `POST /api/account/delete`
- Body: exactly `{ "confirmation": "DELETE" }`
- Target: verified caller UUID only; caller UUID/email inputs are rejected
- CSRF: strict Origin host and protocol validation
- Guest: verified anonymous session plus explicit confirmation
- Recoverable: verified session plus `last_sign_in_at` within 10 minutes; stale sessions receive `REAUTH_REQUIRED`
- Operation: server-only `SUPABASE_SECRET_KEY` admin client calls `auth.admin.deleteUser(verifiedUser.id, false)`
- Failure: no session cookie is cleared before successful Auth deletion
- Success: Supabase Auth cookies are expired, UI returns Home, and protected Profile state disappears

All 17 direct public/private Player ownership foreign keys cascade from `auth.users`; dependent Quest, Session, Result/evidence, and progression edges also cascade. Tests cover Profile/preferences/goals, Quest graph, Session graph, Result/evidence, XP/progression, private baseline/recompute state, second-Player survival, and canonical taxonomy survival. Already-issued JWTs may remain cryptographically valid until expiry, but their deleted owner row and private graph are absent; SEC-001 retains final review of that residual window.

## Storage and secret boundary

The repository has no Player-owned Supabase Storage feature. Any future Storage feature must delete owned objects before Auth deletion. No export file is retained. `SUPABASE_SECRET_KEY` appears only in `lib/supabase/admin.ts`, which imports `server-only`; the dedicated workflow proves the identifier is absent from `.next/static`. The ephemeral local elevated key is masked and passed only through job environment. Hosted secret configuration remains an OPS-001 prerequisite and is not claimed here.

## UI and accessibility

Profile exposes a labelled Player-data section for complete and incomplete onboarding states. Recoverable accounts can download machine-readable JSON, sign out, or delete; guests can protect progress or delete the current guest Player and cannot sign out/export. Deletion provides an irreversible-data explanation, labelled exact-confirmation input, disabled destructive action until exact match, cancel path, announced errors, keyboard controls, visible text beyond danger color, and 44px actions. Desktop and Pixel 7 browser suites pass without horizontal overflow.

## Database and staging

- Migration: `20260929120000_data_004_player_export.sql`
- Staging project: `vwvuaasgczsmeskhjrsb`
- Initial dry-run: exactly one DATA-004 migration pending
- Apply: DATA-004 only; history synchronized through `20260929120000`
- Database CI fresh local replay/pgTAP: 17 files / 618 assertions PASS
- Final linked dry-run: current, no pending migrations
- Staging full-path synthetic protected-account integration: PASS; payload not retained
- Real staging Players deleted: none
- Staging anonymous provider is disabled, so guest hard deletion is proven in fresh local CI rather than by changing hosted Auth configuration

## Application and integration evidence

- Local format (changed files), lint, strict TypeScript, production build: PASS
- Full Vitest: 68 files / 438 tests PASS
- Staging synthetic integration: export isolation, spoof/origin rejection, hard deletion, second-user and canonical preservation PASS
- Production scaffold CI: [37137128005](https://github.com/MEC4RNG/GuitaRPG/actions/runs/37137128005) SUCCESS
- Database contract CI: [37137127967](https://github.com/MEC4RNG/GuitaRPG/actions/runs/37137127967) SUCCESS
- Player data-control integration CI: [37137128012](https://github.com/MEC4RNG/GuitaRPG/actions/runs/37137128012) SUCCESS
- DATA-003 recoverable identity CI: [37137128018](https://github.com/MEC4RNG/GuitaRPG/actions/runs/37137128018) SUCCESS
- Desktop and Pixel 7 export/deletion and recovery regressions: PASS in integration CI

Implementation commit: `22805a481b5693fabcf09c2b6c05a3ba38cd5308`.

## Terminal disposition

DATA-004 is COMPLETE. Phase 6 remains IN_PROGRESS. SEC-001 and production cutover remain unauthorized. Execution stops at `AWAITING_EXPLICIT_SEC_001_AUTHORIZATION`.
