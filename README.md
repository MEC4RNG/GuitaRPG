# GuitaRPG

GuitaRPG is evolving from the original random guitar challenge prototype into a production guitar-practice RPG.

## Branches

- `main` — legacy static GitHub Pages implementation; remains untouched until an explicit production cutover.
- `v1-production` — production application development.

## Production scaffold

The production application uses:

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Vercel deployment target
- Supabase/PostgreSQL/Auth in later Phase 0 tickets

### Requirements

Node.js 22 or newer. CI currently validates with Node.js 22.

### Local setup

```bash
npm install
npm run dev
```

### Validation

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Or run the combined command:

```bash
npm run check
```

End-to-end test infrastructure is configured separately:

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

## Project authority

- Master Build Plan: `docs/MASTER-BUILD-PLAN.md`
- Current machine-readable execution state: `docs/project-state.json`
- Codex/repository operating instructions: `AGENTS.md`
- Production architecture: `docs/architecture/ADR-001-production-architecture.md`
