# ADR-001 — GuitaRPG Production Architecture

- Status: Accepted
- Ticket: FND-001
- Date: 2026-09-27
- Repository: MEC4RNG/GuitaRPG
- Production branch: `v1-production`
- Legacy branch: `main`

## Context

The existing GuitaRPG implementation is a static GitHub Pages prototype consisting of `index.html`, `challenge.js`, and `README.md`. It has no production framework, database, authentication, API layer, or persistent progression model.

The production system must support:

- persistent player accounts and cross-device state
- canonical musical taxonomy and quest schemas
- generated quests and saved practice sessions
- evidence-based progression
- adaptive training recommendations
- responsive/mobile-first practice UX
- future microphone/direct-input analysis
- secure player-owned data
- preview/staging deployments before cutover

The architecture should solve those requirements without making v1 depend on custom infrastructure or advanced audio-analysis services.

## Decision

### Frontend / full-stack framework

Use **Next.js App Router with React and TypeScript in strict mode**.

Use Server Components by default for read-heavy and server-rendered surfaces. Use Client Components only where browser state or browser APIs are required, including the practice session, metronome, microphone, audio analysis, and highly interactive generator controls.

Do not introduce a separate SPA frontend plus standalone backend service for v1.

### Hosting and deployment

Use **Vercel** for the production application.

- `main` remains the legacy GitHub Pages application until an explicit release/cutover ticket.
- `v1-production` is the production-development branch created from the current `main` state.
- Vercel preview deployments are used for non-production branches / pull requests.
- The initial Vercel environment is staging/preview only.
- GitHub Pages is not disabled during Phase 0.
- Production cutover must be a later gated release action.

### Database

Use **PostgreSQL via Supabase**.

Postgres is the canonical store for durable application data, including player profiles, quests, sessions, session results, progression evidence, proficiency state, and taxonomy/content entities.

Database changes are migration-driven and source-controlled. No production table is treated as manually configured state.

### Authentication and authorization

Use **Supabase Auth**.

Use database-enforced **Postgres Row Level Security (RLS)** for player-owned data.

Security principles:

- player-owned rows are isolated by authenticated user identity
- service-role credentials are never shipped to the browser
- RLS is required for exposed player-owned tables
- application checks may improve UX but do not replace database authorization
- canonical/global reference data receives explicit read/write policy rather than implicit public exposure

The specific login providers and guest-account conversion UX are deferred to onboarding/auth implementation tickets.

### Server/data access boundary

Prefer server-side data access for authenticated/private application reads and mutations when practical.

Use:

- Server Components for appropriate reads
- server-side application/domain functions for protected mutations
- Route Handlers only when an HTTP endpoint is the appropriate interface
- direct Supabase client access only where RLS and the interaction model make that safe and useful

Do not create a public general-purpose API in v1 unless a later requirement needs one.

Supabase integration is wrapped behind local application modules so authentication/session package changes do not propagate throughout the codebase.

### Styling and design system

Use **Tailwind CSS plus CSS custom-property design tokens** for the production UI.

The visual language remains the approved hybrid:

- Instrument HUD for Play / Quest surfaces
- Codex treatment for learning/reference surfaces
- Practice Lab treatment for progress/history analytics

Core product UI components are owned by GuitaRPG. Do not make the design system dependent on a third-party component library's visual language. Headless/accessibility primitives may be adopted later when useful.

### Runtime validation

Use **Zod** (or an equivalent schema validator only if explicitly superseded by a later ADR) at untrusted/runtime boundaries.

TypeScript types alone are not considered runtime validation for persisted or externally supplied data.

Canonical domain schemas should be shareable between generators, persistence, tests, and UI where practical.

### Client state

Do not introduce a global client-state library by default.

Use:

- URL/search state for shareable navigation/filter state
- server-rendered/persisted state for durable application data
- local React state/reducers for isolated interactions

Introduce a dedicated client state library only when a concrete cross-screen/client-state requirement justifies it.

### Testing

Use a layered strategy:

- unit tests for domain rules and pure progression/generation logic
- integration tests for persistence/security/domain workflows
- database/RLS tests for authorization invariants
- Playwright for browser/E2E and responsive critical-path testing

The exact unit-test runner is selected during FND-002, with Vitest preferred unless framework/tooling constraints provide a stronger reason otherwise.

### Audio architecture boundary

Audio is **client-first and optional**.

Future audio functionality may use:

- `navigator.mediaDevices.getUserMedia()`
- Web Audio API
- AudioWorklet for low-latency/custom processing
- microphone input
- USB/direct audio interfaces exposed as browser media inputs

Requirements:

- audio features must degrade gracefully when permission/device support is unavailable
- microphone access is never required for the core quest/practice/progression loop
- no raw performance audio is uploaded or retained by default
- any later upload/storage behavior requires explicit product/privacy design
- sophisticated polyphonic grading is out of scope for v1

### PWA / mobile position

GuitaRPG remains **web-first and mobile-equal**.

Responsive phone use is mandatory for v1. PWA installability/service-worker/offline caching is architecturally permitted but is not a Phase-0 or FND-002 blocker unless later promoted by a dedicated ticket.

Native iOS/Android applications are not part of v1.

### Repository strategy

Use the existing repository rather than creating a new repository.

Current state is preserved as follows:

- `main`: legacy static GitHub Pages reference and live implementation until cutover
- `v1-production`: production application development line
- existing static files remain authoritative legacy references during migration
- application replacement of `main` occurs only under a later release gate

The repository remains a single application repository. Do not introduce a monorepo/package workspace until there is a concrete second deployable/package boundary.

## Rejected alternatives

### Continue the static GitHub Pages architecture

Rejected because durable authenticated progression, secure player-owned state, server-side domain workflows, and future adaptive training would require progressively re-creating a backend around a static prototype.

### Vite/React SPA + separate backend

Viable, but rejected for v1 because it adds an independently deployed backend/API boundary without a current product requirement for that separation. Next.js provides server and client execution boundaries in one application while preserving client-only browser-audio support.

### Firebase as primary persistence/auth platform

Viable, but not selected. GuitaRPG's model is strongly relational: skills, prerequisites, concepts, constraints, quest relationships, evidence histories, and derived progression. PostgreSQL provides a better canonical model for these relationships and allows database-level RLS through Supabase.

### Custom Express/Fastify backend

Rejected for v1 because it increases infrastructure, deployment, authentication, observability, and API surface area before there is a requirement that justifies the operational cost.

### Browser localStorage as canonical persistence

Rejected. It cannot provide reliable cross-device progression, account recovery, authoritative history, or robust data ownership.

### Native mobile first

Rejected. Modern browser media APIs are sufficient to begin microphone/audio work while keeping access friction low and preserving one codebase.

### Mandatory audio hardware or microphone verification

Rejected. Verification is metadata attached to quest outcomes; it is not a prerequisite for core participation.

## Consequences

### Positive

- one full-stack TypeScript application
- strong relational data model
- built-in path to authentication/RLS
- safe preview deployment workflow
- browser-audio compatibility without special hardware
- preserves the current working prototype during migration
- supports later adaptive training and richer analytics without an early microservice architecture

### Costs / risks

- Next.js introduces server/client-boundary complexity
- Supabase SSR integration details may change over time; integration must remain encapsulated
- RLS policies require deliberate design and testing
- Vercel/Supabase create managed-service dependencies
- browser audio still requires device/browser compatibility testing
- production migration from GitHub Pages requires an explicit release/cutover plan

## Deferred decisions

The following are not decided by this ADR:

- exact Supabase schema/table design
- authentication provider UX and guest conversion
- precise Quest/progression algorithms
- PWA offline strategy
- audio transcription model
- custom domain strategy
- paid tiers
- teacher/student or social capabilities

## References

- Next.js documentation: https://nextjs.org/docs
- Supabase Next.js quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel preview deployments: https://vercel.com/docs/deployments/environments
- MDN getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- MDN AudioWorklet: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet

## Acceptance evidence

- Production stack selected: PASS
- Repository strategy selected: PASS
- Legacy app preservation strategy defined: PASS
- Deployment strategy defined: PASS
- Frontend/server execution boundary defined: PASS
- Persistence architecture defined: PASS
- Authentication/authorization architecture defined: PASS
- Security principles defined: PASS
- Audio architecture boundary defined: PASS
- Mobile/PWA position defined: PASS
- Testing strategy defined: PASS
- Rejected alternatives recorded: PASS

## Terminal disposition

**FND-001 — COMPLETE**

The architecture is accepted for Phase 0. Dependent ticket `FND-002 — Production Application Scaffold` is authorized to open.
