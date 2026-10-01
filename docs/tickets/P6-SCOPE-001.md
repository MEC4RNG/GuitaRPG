# P6-SCOPE-001 — Phase 6 Launch Hardening Scope Review

**Status:** IN PROGRESS

## Objective

Define the minimum bounded Phase 6 work required before GuitaRPG v1 may safely replace the legacy site, separating genuine launch blockers, required hardening, explicit cutover actions, post-launch work, and work not required for v1.

## Boundaries

This is a repository and launch-readiness audit only. It changes no application behavior, database schema, migration, dependency, remote environment, deployment, domain, or production state. Phase 5 remains COMPLETE / PASS, production cutover remains unauthorized, and legacy `main` remains preserved.

## Audit disposition

The repository, accepted contracts, migrations, database tests, application surfaces, CI workflows, dependency graph, public Vercel deployment, public GitHub repository metadata, and live legacy GitHub Pages site were inspected. The audit found no reason to reopen Phase 0–5 product semantics. It found bounded launch work in identity, user data control, security, UX/reliability, and production operations.

## Current production-readiness inventory

| Area | Proven baseline | Remaining evidence or capability |
| --- | --- | --- |
| Application | Phase 5 COMPLETE / PASS; desktop and Pixel 7 core loop | Release-browser matrix, production-style E2E, accessibility audit, resilient route/error behavior |
| Identity | Supabase anonymous Auth and owner-scoped RLS | Recoverable identity, same-UUID guest upgrade, recovery UX, guest-risk warning |
| Data control | Auth deletion cascades through current private graph | User-facing trusted Auth deletion and bounded JSON export |
| Database | Reproducible migrations through `20260929110000`; 16-file/598-assertion pgTAP | Incremental catalog/grant/function audit and clean production bootstrap |
| Security | All 26 exposed tables have RLS; four private tables; service-role absent from browser; safe function paths | Release secret scan, headers/CSP compatibility, vulnerability policy, branch rules, final least-privilege review |
| Reliability | Useful component-level loading/retry states exist | App/global error boundaries, sanitized provider errors, failed-auth/session recovery, release smoke automation |
| Accessibility | Semantic/touch/focus/reduced-motion smoke plus Pixel 7 | WCAG 2.2 AA audit of critical paths, axe automation, keyboard/screen-reader/zoom/contrast checks |
| Performance | Static Codex details and local production build pass | Production measurements on critical routes, slow-network/error behavior, Session responsiveness |
| Operations | Vercel deployment and Supabase staging exist | Separate production data plane, env verification, monitoring policy, backup/restore rehearsal, release/rollback runbook |
| Release | `v1-production` CI is deterministic; legacy `main`/Pages preserved | Branch protection, immutable release identity, production smoke, explicit gate and cutover approvals |

## IDENTITY / ACCOUNT LAUNCH DECISION

- **Current model:** onboarding calls `signInAnonymously()` and persists under the resulting authenticated UUID. No login, sign-up, OAuth, identity linking, recovery, or sign-out surface exists.
- **Anonymous-only launch acceptable:** **NO.** ADR-001 requires persistent accounts and cross-device state, the Master Plan includes accounts/persistence in v1, and DATA-001 defines permanent recoverable users. An anonymous-only launch would make durable practice history dependent on one browser session without a truthful recovery path.
- **Recoverable account required:** **YES.** A bounded email magic-link/OTP or one approved OAuth path is sufficient; multiple providers and a broad account center are not required.
- **Guest-to-permanent upgrade:** **REQUIRED.** Upgrade must link to the existing anonymous Auth user whenever supported so the ownership UUID and all Player state remain unchanged. Creating a second account and copying progression is out of scope.
- **Guest warning:** required before durable practice begins and persistently available from Profile until upgrade. It must state that sign-out, cleared browser storage, or loss of the browser session can make the guest account and its data unrecoverable, and that cross-device recovery requires linking a permanent identity.
- **Cross-device promise:** only a linked permanent account may be described as recoverable/cross-device.
- **Launch blocker:** `DATA-003 — Recoverable Identity & Guest Safety`.

## USER DATA CONTROL

- **Database cascade:** current Auth-user deletion covers Profile, tuning preferences, setups, goals, Quests and child taxonomy/criteria rows, Sessions and events/controls, Results and evidence, XP/corrections, Skill/readiness/Attribute events and projections, private baselines/recompute receipts, and Training metadata stored in Quest snapshots. No current Player-owned table was found outside the cascade graph.
- **Product deletion flow:** absent and required before cutover. Deleting application rows without deleting `auth.users` is insufficient.
- **Anonymous deletion:** required because guest identities own durable private data. Use explicit destructive confirmation; re-auth is not available for a purely anonymous identity.
- **Permanent deletion:** required with recent-session/re-auth confirmation appropriate to the chosen provider.
- **Trusted boundary:** a server-only Route Handler or Server Action may use `SUPABASE_SECRET_KEY` solely for the verified caller's Auth deletion. The secret must never enter a browser bundle or caller-controlled user ID path.
- **Post-deletion behavior:** Auth identity and private graph removed, local cookies/session cleared, caches invalidated, and the browser returned to a truthful public/deleted state.
- **Export:** required for permanent accounts before cutover. A versioned machine-readable JSON download is sufficient; PDF, CSV bundles, and analytics reports are not required.
- **Export contents:** Profile, tuning/setup/preferences, goals, owned Quests with recommendation provenance, Sessions/events/controls, Results/criteria/evidence/reflections, XP/corrections, proficiency/confidence/readiness and Attribute state/events. Canonical global definitions are referenced by stable IDs/slugs rather than duplicated.
- **Export boundary:** prefer an owner-scoped RPC or user-context server stream under RLS. Service-role bypass is not required merely to export the caller's rows. Pagination/consistency and absence of other users' data must be tested.
- **Owning ticket:** `DATA-004 — Player Export & Account Deletion`.

## Security launch policy

- **RLS baseline:** all 26 public tables declare RLS; four operational/reference tables live in `private`; existing pgTAP proves ownership, unauthenticated denial, derived-state denial, and deletion cascades.
- **Incremental audit:** enumerate every exposed relation/view/function and grant; verify least privilege, immutable ownership, intended anonymous canonical reads, security-definer caller checks, and fixed safe `search_path`. Forty-two security-definer declarations use empty search paths; the taxonomy seeder uses a bounded `public, private, pg_temp` path and is service-only, which must be re-reviewed rather than silently rewritten.
- **Headers:** require `X-Content-Type-Options: nosniff`, a bounded referrer policy, explicit frame denial via CSP `frame-ancestors` and/or `X-Frame-Options`, and a Permissions Policy denying unused sensitive capabilities. Vercel currently supplies HSTS. CSP must be introduced compatibly with Next.js and Supabase; microphone/Web Audio permissions must not be pre-authorized, and future audio scope must amend policy deliberately.
- **Dependency policy:** the 2026-10-01 full and production-only `npm audit` reports contain zero vulnerabilities. Any unresolved critical or high vulnerability affecting production or the trusted build chain blocks the gate; moderate findings require documented reachability/mitigation and an owner. Low findings may be scheduled.
- **Reproducibility debt:** Node `22.23.2`, Vite `7.3.6`, shrinkwrap, and `npm ci --legacy-peer-deps --no-audit --no-fund` are acceptable launch debt because CI is deterministic. Removing legacy-peer mode, relaxing the Node pin, or replacing shrinkwrap is POST_LAUNCH unless a scan/build failure makes it necessary.
- **Secret scan:** final source, tracked history/config, and production browser-build inspection is REQUIRED_HARDENING. Public Supabase URL/publishable key are allowed; service/admin secrets are not.
- **Rate/abuse:** review Supabase Auth/platform quotas and mutation exposure. Application-specific limits become launch blockers only for a demonstrated unbounded costly/elevated path; otherwise monitoring and a documented response are sufficient for v1.
- **Branch protection:** public metadata reports `v1-production` unprotected. Before release, require successful Production scaffold and relevant database/REL-006 checks, block force-push/deletion, and preserve an administrator recovery path. Mandatory multi-person review is not required for a single-owner project.
- **Owning ticket:** `SEC-001 — Production Security & Supply-Chain Audit`.

## Accessibility and browser policy

- **Target:** WCAG 2.2 AA for applicable critical-flow criteria; this is a bounded product audit, not third-party certification.
- **Automated:** axe-based Playwright coverage on Home, onboarding/identity, Generate, Training, Profile/data controls, Codex index/detail, Character, Skills, History/detail, Session, and Result. Automated results supplement rather than replace manual review.
- **Manual:** keyboard-only completion, visible focus/order, headings/landmarks, labelled fields and errors, status announcements, contrast/non-color meaning, 200% zoom/reflow, reduced motion, long Codex readability, and screen-reader smoke for progression/status and destructive confirmations.
- **Desktop browsers:** current Chromium, Firefox, and WebKit. Core persistence flows and metronome graceful behavior must pass; unsupported Web Audio must not break Session completion.
- **Mobile/viewports:** small phone (about 320 CSS px), Pixel-class Android, modern iPhone-size WebKit viewport, tablet, and desktop. Critical flows require no horizontal overflow or obstructed 44px targets.
- **Remediation rule:** only defects that block or materially misrepresent core functionality are gate blockers; cosmetic polish may defer.
- **Owning ticket:** `UX-005 — Accessibility, Browser & Failure-State Hardening`.

## Performance and error-state audit

- No `app/error.tsx`, `app/global-error.tsx`, or custom `app/not-found.tsx` exists. The framework 404 is functionally acceptable; a branded 404 is launch-supporting, not a blocker. Route/global error boundaries with recovery are REQUIRED_HARDENING.
- Profile, Training, Generate, Character, Skills, History, Session, and Result already contain useful local loading/error/retry behavior. Some paths surface underlying RPC/provider messages; launch work must replace sensitive/internal details with stable user-safe messages while retaining private diagnostics.
- Missing public environment fails explicitly in data-dependent browser code; production deployment must fail verification when required env is absent or mismatched.
- Auth refresh/expiry, lost guest session, Supabase outage, Quest-save/Session-start split failure, Profile/Result save failure, and reconnect/retry behavior require deterministic E2E coverage. Infinite loading is a blocker.
- Measure Home, Generate, Training, Codex index/detail, Profile, and Session in the production-style deployment. Use Core Web Vitals' established “good” thresholds as diagnostic targets, not arbitrary release scores; a severe regression or unusable slow-network path blocks. Session timer/metronome/control responsiveness and safe retry behavior take priority over a perfect marketing-page score.
- Offline/PWA support is NOT_REQUIRED for v1.

## Observability and privacy

- No dedicated observability SDK is present. Vercel deployment/function logs plus Supabase platform logs are sufficient for initial v1 if production access, retention, alert ownership, and a deployment-health check are verified.
- Add privacy-safe structured error context for route/RPC class, release SHA, and correlation identifier where available. Never log public/private keys, auth tokens, raw audio, practice notes, goals' free text, Result reflections, complete export payloads, or unnecessary stable Player identifiers.
- A paid provider such as Sentry and user analytics are POST_LAUNCH unless platform logs prove inadequate. Analytics must not be enabled by default as part of hardening.
- A dedicated public health endpoint is NOT_REQUIRED. A scripted public-page plus authenticated smoke is more representative.

## Backup, recovery, and rollback

- Migration replay already proves schema/reference-data rebuild. Production must bootstrap from committed migrations and seed/reference data, then run the database contract suite before public traffic.
- Provider backup status, retention, and restore ability are currently unverified. Before the gate, the selected production Supabase plan must have an observed backup policy and one isolated restore/rebuild rehearsal. Numeric enterprise RTO/RPO is not invented; v1 documents the actual provider capability and owner response.
- PITR is recommended but not automatically required; it becomes a blocker if selected data volume/business tolerance cannot accept the observed scheduled-backup window. Enabling a paid plan is user-controlled.
- Applied migrations remain immutable. Bad schema changes use a forward repair; severe data corruption uses an explicitly approved restore. Deployment rollback never rewrites migration history.
- Application rollback, traffic/domain rollback, and database recovery are separate runbook operations. The legacy static app cannot safely present or mutate new-production Player data, so traffic rollback after real writes requires maintenance/read-only communication or continued availability of the last known-good production build—not a blind frontend switch to legacy Pages.
- **Owning ticket:** `OPS-001 — Production Environment, Recovery & Observability`.

## PRODUCTION ENVIRONMENT TOPOLOGY

| Layer | Intended source of truth |
| --- | --- |
| Local | Local Supabase containers and local Next.js; disposable test identities |
| Preview/staging | Vercel Preview/staging deployment from development commits; Supabase project `vwvuaasgczsmeskhjrsb`; migration/pgTAP and test data only |
| Production application | Vercel Production pinned to the authorized `v1-production` release commit/tag with Production-only environment variables |
| Production database | A distinct Supabase production project, cleanly bootstrapped from committed migrations/seed and verified before public traffic |
| Legacy | `origin/main` and `https://mec4rng.github.io/GuitaRPG/` remain intact as the static fallback/reference until CUTOVER-001 |

The configured public URL `https://guitarpg.vercel.app` responds with the Phase 5 application, but its onboarding bundle currently contains the known staging project reference. Therefore it is not accepted as a production data topology. No repository-linked Vercel metadata proves Preview/Production branch or environment separation, and no distinct production Supabase project is evidenced.

Use `v1-production` as the release authority; merging into legacy `main` is not required. Preview variables must point only to staging. Production variables must point only to the new production project. Production must start empty except canonical seed/reference data and a designated smoke account that is deleted or explicitly retained for operations. Staging data is never promoted.

No custom-domain CNAME is present on legacy `main`; the repository homepage points to the Vercel URL while GitHub Pages remains live. CUTOVER-001 must name the canonical public URL and update traffic/project metadata only with explicit user approval. DNS work is required only if the user chooses a custom domain.

## User-controlled external actions

The following require the user or a separately explicit approval; none is performed by this ticket:

1. Create/select and fund the distinct production Supabase project and any backup/PITR plan.
2. Confirm production region, backup retention, billing/resource limits, and Auth email/OAuth provider configuration.
3. Configure Vercel project Production branch and Preview/Production environment separation.
4. Add/rotate Vercel Production public Supabase variables and the server-only secret needed for deletion; inspect access scope.
5. Configure Supabase production URLs/redirect allowlists, email templates/provider, and abuse controls.
6. Enable GitHub rules/protection for `v1-production` and select required checks.
7. Approve production bootstrap, smoke-account creation/cleanup, and any destructive restore rehearsal target.
8. Choose the canonical launch URL and approve any Vercel domain/DNS or repository-homepage changes.
9. Approve any GitHub Pages change; the legacy branch/site stays preserved by default.
10. Approve the exact release tag/commit, P6 gate disposition, and later CUTOVER-001 traffic switch.

## Phase 6 scope matrix

| Capability / risk | Current state / evidence | Remaining gap | Authority | Classification | Ticket / owner | User-only action | Dependencies | Explicit non-goals |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Recoverable identity | Anonymous UUID/RLS works | Same-UUID link, login/recovery, truthful status | ADR-001, DATA-001 | CUTOVER_BLOCKER | DATA-003 / DATA | Provider choice/config | None | Multi-provider account center |
| Guest data-loss warning | No visible warning | Pre-practice/Profile warning and lost-session truth | DATA-001 | CUTOVER_BLOCKER | DATA-003 / DATA+UX | Copy approval if desired | Identity policy | Marketing redesign |
| JSON export | Exportable relational schema; no flow | Owner-complete versioned download | DATA-001 | CUTOVER_BLOCKER | DATA-004 / DATA | None beyond env | DATA-003 | PDF/CSV analytics |
| Account deletion | Complete cascade tests; no product flow | Trusted Auth delete, confirmation, cleanup | DATA-001 | CUTOVER_BLOCKER | DATA-004 / DATA | Server secret/config | DATA-003 | Retained private content |
| Incremental RLS/grant audit | 26 public RLS tables; strong pgTAP | Full relation/function/grant inventory and new tests | DATA-001 | REQUIRED_HARDENING | SEC-001 / DATA | None | DATA-004 schema | Rewriting proven policies |
| Security headers/CSP | Only Vercel HSTS observed | Compatible headers and verification | ADR-001 | REQUIRED_HARDENING | SEC-001 / FND | None | Production topology | Future audio implementation |
| Dependency/secret policy | Deterministic CI; audit 0; browser scan passed | CI audit threshold, final bundle/history scan | DATA-001 | REQUIRED_HARDENING | SEC-001 / FND | Alert access if enabled | None | Resolver churn without risk |
| Branch protection | `v1-production` unprotected | Required checks; no force-push/deletion | Release safety | CUTOVER_BLOCKER | SEC-001 / REL | Configure GitHub rules | CI jobs named | Mandatory multi-review |
| Error boundaries/messages | Local recovery exists; no route/global boundary | Boundaries, sanitization, auth/connectivity recovery | Truthful launch | REQUIRED_HARDENING | UX-005 / UX+FND | None | DATA-003/004 flows | Aesthetic 404 requirement |
| Accessibility | Phase 5 smoke passes | WCAG 2.2 AA critical-flow audit/remediation | UX-001 | REQUIRED_HARDENING | UX-005 / UX | None | New account/data UI | Certification |
| Browser/mobile | Chromium/Pixel passes | Firefox, WebKit, iPhone/small/tablet; audio grace | ADR-001 | REQUIRED_HARDENING | UX-005 / REL | None | Error hardening | Every device/version |
| Performance | Build/static routes pass | Production-style measurements and severe-regression fixes | Launch usability | REQUIRED_HARDENING | UX-005 / UX+REL | None | Prod-style env | Arbitrary score chasing |
| Observability/privacy | Platform logs available; no SDK | Verify access/retention, sanitized structured errors, health smoke | DATA-001 | REQUIRED_HARDENING | OPS-001 / OPS | Provider/dashboard config | Production project | User analytics/Sentry by default |
| Backups/restore | Migration rebuild passes | Observed backup policy and isolated restore rehearsal | DATA-001 | CUTOVER_BLOCKER | OPS-001 / OPS | Plan/billing and restore approval | Production project | Invented enterprise SLA |
| Production Supabase | Only staging evidenced | Separate clean project, migrations/seed/tests/env | ADR-001, DATA-001 | CUTOVER_BLOCKER | OPS-001 / OPS+DATA | Create/configure project | SEC-001 | Promoting staging data |
| Vercel Production | Public deployment uses staging backend | Exact branch/SHA, production env, pre-public smoke | ADR-001 | CUTOVER_BLOCKER | OPS-001 / OPS | Configure/verify Vercel | Production Supabase | Changing traffic now |
| Rate/anonymous accumulation | Platform controls; no app quota/retention policy | Document limits, monitoring, cleanup trigger | Operational risk | POST_LAUNCH | OPS backlog | Provider settings if needed | Observability | Premature cleanup job |
| Privacy notice/data controls | No dedicated notice evidenced | Concise data/guest/deletion/export disclosure | DATA-001 | REQUIRED_HARDENING | DATA-003/004 | Legal wording review optional | Final flows | Full legal program/ToS |
| Release integration | Phase suites pass | Production-style E2E/a11y/security/smoke/recovery proof | Master Plan | REQUIRED_HARDENING | REL-006 / REL | Production smoke approval | All hardening | New features |
| Cutover and rollback | Legacy preserved; no runbook | Exact release, traffic and three-layer rollback procedure | ADR-001 | CUTOVER_ACTION | CUTOVER-001 / REL+OPS | Explicit cutover approval | P6 gate PASS | Automatic launch |

## Post-launch and not-required decisions

POST_LAUNCH: dependency-workaround simplification; optional PITR upgrade if scheduled backups meet accepted tolerance; automated stale-anonymous-account cleanup after observed volume; branded 404 polish; paid observability/analytics only if justified; release automation refinements.

NOT_REQUIRED for v1: offline/PWA; a public health endpoint; multiple auth providers; PDF/CSV export; third-party accessibility certification; Sentry; user analytics; microphone/audio; visualizers; deeper analytics; saved creative artifacts; Daily; Campaign; broader generator coverage; free-text interpretation; generalized Context familiarity; duration adaptation; merge/replacement of legacy `main`.

## CUTOVER PREREQUISITES

CUTOVER-001 may not be authorized until all of the following are observed:

1. DATA-003 and DATA-004 terminal with recoverable identity, guest warning, JSON export, and complete account deletion.
2. SEC-001 terminal with incremental RLS/grant/function audit, required headers, zero unresolved blocking vulnerabilities, final no-secret proof, and protected release branch.
3. UX-005 terminal with critical-flow WCAG 2.2 AA evidence, browser/mobile matrix, error-state recovery, and acceptable production-style performance.
4. OPS-001 terminal with distinct production Supabase/Vercel environments, backup evidence, isolated restore rehearsal, privacy-safe logs, bootstrap and rollback runbooks.
5. REL-006 terminal against the exact production-style release candidate, including public and designated-account smoke without uncontrolled real-user mutation.
6. P6-GATE-001 COMPLETE / PASS and exact immutable release commit/tag recorded.
7. Production migrations/seed and env values verified; production data contains only intended canonical/smoke records before traffic.
8. Canonical URL, legacy Pages disposition, traffic steps, rollback triggers, owners, and post-cutover verification explicitly approved.

## Ordered Phase 6 ticket sequence

1. `DATA-003 — Recoverable Identity & Guest Safety`
2. `DATA-004 — Player Export & Account Deletion`
3. `SEC-001 — Production Security & Supply-Chain Audit`
4. `UX-005 — Accessibility, Browser & Failure-State Hardening`
5. `OPS-001 — Production Environment, Recovery & Observability`
6. `REL-006 — Production Readiness Integration`
7. `P6-GATE-001 — Hardening & Launch Readiness Gate`
8. `CUTOVER-001 — Production Cutover` — separately authorized only after gate PASS

This is a practical v1 feature freeze. New product features defer unless necessary to correct a documented launch blocker.

## Phase 6 exit criterion

GuitaRPG is demonstrably secure, recoverable, accessible, production-configured, privacy-safe, operationally observable, and rollback-ready; recoverable identity and bounded Player deletion/export controls are available; the exact release passes production-style desktop/mobile/browser, database, security, accessibility, performance, backup/restore, and deployment smoke evidence; and a separately authorized cutover can proceed without compromising Player data or the preserved legacy fallback.

## REL-006 scope

REL-006 proves the exact release candidate in a production-style environment: full critical-path Chromium/Firefox/WebKit and mobile E2E; guest upgrade/recovery; export isolation/completeness; anonymous/permanent deletion; incremental database security; accessibility automation plus manual-audit record; error/retry behavior; release vulnerability and browser-secret scans; clean production bootstrap; backup/restore evidence; privacy-safe logging; and designated smoke-account creation/cleanup. It adds integration evidence and harnesses, not product semantics.

## P6-GATE-001 scope

The gate asks whether every blocker is terminal; the actual production environment and exact release are verified; identity/data controls, security, accessibility, reliability, monitoring, backups, recovery and rollback are sufficient; no private data/secret exposure remains; user-only prerequisites are complete; and CUTOVER-001 can safely be offered for separate authorization. PASS does not launch.

## CUTOVER-001 scope

CUTOVER-001 confirms the exact release commit/tag, reruns final production smoke, executes only the user-approved canonical URL/traffic/project-metadata change, preserves the legacy fallback status, watches privacy-safe health signals, verifies post-cutover critical paths, and either declares launch success or invokes the appropriate application/traffic/database rollback procedure. It must account for Player writes after launch and may not treat rollback as a frontend-only switch.

## Validation and terminal disposition

- Actual repository/application/database/deployment-related state: inspected.
- Full and production-only dependency audit: 0 vulnerabilities observed on 2026-10-01.
- No application, dependency, database, migration, remote environment, deployment, domain, or cutover change made.
- Migration added: NO; head remains `20260929110000`.
- Formatting, coordination/lifecycle tests, lint, strict TypeScript, production build, and Production scaffold CI are required before closure.

Terminal disposition is pending required validation and CI. DATA-003 remains unauthorized.
