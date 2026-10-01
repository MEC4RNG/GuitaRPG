# DATA-003 — Recoverable Identity & Guest Safety

**Status:** COMPLETE

## Objective

Add the minimum passwordless recoverable identity layer required for v1 while preserving frictionless anonymous-first onboarding, the existing Auth UUID, all Player-owned data, and the current RLS ownership model.

## Boundaries

This ticket owns anonymous-to-email linking, returning passwordless email sign-in, safe SSR confirmation, guest-recovery warnings, truthful Profile account states, local Auth templates/configuration, and deterministic identity evidence. It does not own account deletion/export, OAuth, passwords, broad account management, production environment configuration, or cutover.

## Identity contract

- **Method:** passwordless email; passwords and OAuth remain out of scope.
- **Upgrade:** the signed-in guest calls `updateUser({ email })`; signup, admin creation, Player copying, and service-role operations are forbidden.
- **Invariant:** the Auth UUID before confirmation, after upgrade, and after returning login must be identical. Profile, tuning, goals, Quests, Sessions, Results, XP, Skill state, and Attributes therefore remain under the same owner.
- **Return:** `signInWithOtp` always uses `shouldCreateUser: false`. The public response is deliberately identical for known and unknown emails.
- **Authority:** account state comes from the verified Supabase Auth user (`is_anonymous`, verified email), never an application guest flag.

## Guest safety and Profile states

The onboarding completion screen warns that a guest Player is tied to the browser session before offering either **Protect your progress** or **Continue as guest**. Profile repeats the warning and protection action for guests and never exposes guest Sign Out. A recoverable account shows the verified linked email and normal Sign Out. An unauthenticated Profile offers returning passwordless sign-in and a separate new-guest onboarding path without auto-creating a guest.

Email remains exclusively in Supabase Auth and is not duplicated into Player tables.

## Confirmation, templates, and redirects

`/auth/confirm` exchanges allowlisted `magiclink`, `email`, and `email_change` token hashes using the existing SSR server client and cookie model. `next` accepts only single-slash internal paths; external URLs and protocol-relative paths fall back to `/profile`. Tokens, links, sessions, cookies, and email addresses are not logged.

Source-controlled local templates are:

- `supabase/templates/magic-link.html`
- `supabase/templates/email-change.html`

Both route token hashes through `/auth/confirm`. Local Auth keeps anonymous sign-in enabled, enables verified email confirmation and manual linking, and references these templates from `supabase/config.toml`.

## Hosted Auth requirements

OPS-001/REL-006 must configure and observe the hosted environment before cutover:

- anonymous sign-ins and the email provider enabled;
- manual linking enabled;
- the deployed Site URL and exact `/auth/confirm` redirect URLs allowlisted;
- magic-link and email-change templates using token-hash links through the deployed confirmation route;
- a production SMTP/email provider with delivery and sender-domain validation.

DATA-003 does not mutate staging Auth configuration and does not claim hosted delivery is validated. Production SMTP remains an OPS-001 external prerequisite.

## Security and database boundaries

The existing UUID-based RLS model is unchanged. No migration, account table, trusted RPC, RLS relaxation, service key, admin API, or application-level email storage is introduced. Sign Out never deletes data; export/deletion remain DATA-004 scope. Conflicting guest-link requests return a stable safe message and leave the current guest session and progress untouched.

## Validation evidence

The public-client local integration creates an anonymous user and durable onboarding state, consumes the local email sink, verifies same-UUID upgrade, signs out, restores the same UUID and Profile through no-create passwordless login, and verifies an unknown email produces no session. The browser scenario covers the onboarding warning, explicit guest continuation, guest Profile warning/no Sign Out, upgrade, unchanged Profile, permanent Sign Out, and recovery on desktop and Pixel 7.

## Validation and evidence

- DATA-003 unit/config/surface tests: 4 files / 16 tests PASS.
- Contract regression: 8 files / 68 tests PASS.
- Phase 5 integration: 9 files / 26 tests PASS.
- Phase 4 integration: 6 files / 74 tests PASS.
- Phase 3 integration: 5 files / 26 tests PASS.
- Phase 2 integration: 3 files / 14 tests PASS.
- Full Vitest: 66 files / 427 tests PASS.
- Changed-file format, lint, strict TypeScript, and production build: PASS.
- Real local-Supabase Auth integration in CI: PASS, including verified upgraded session, same UUID, durable Profile state, sign-out/recovery, and unknown-email no-create behavior.
- Playwright against the fresh local stack: desktop and Pixel 7 PASS; 20 tests total in the identity workflow.
- Database contract CI: PASS; fresh replay and the existing 16-file / 598-assertion pgTAP baseline remain green.
- No migration was added; database head remains `20260929110000_ply_003_profile_editing.sql`.
- Staging data and Auth configuration were not mutated. Hosted delivery remains unvalidated until OPS-001.

Implementation CI:

- Production scaffold: https://github.com/MEC4RNG/GuitaRPG/actions/runs/36909745661
- Recoverable identity integration: https://github.com/MEC4RNG/GuitaRPG/actions/runs/36909745451
- Database contract: https://github.com/MEC4RNG/GuitaRPG/actions/runs/36875603372

## Terminal disposition

COMPLETE. Anonymous-first onboarding, same-UUID email upgrade, safe relative SSR confirmation,
verified account status, permanent sign-out, no-create passwordless recovery, guest warnings, and
desktop/Pixel 7 usability are proven. DATA-004 remains unauthorized, production cutover remains
unauthorized, and legacy `main` remains preserved.
