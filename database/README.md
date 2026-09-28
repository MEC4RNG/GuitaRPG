# Supabase / database workflow

DATA-002 establishes the source-controlled database boundary.

## Local workflow

Requires Node.js 22+ and a Docker-compatible container runtime.

```bash
npm install
npm run supabase:start
npm run db:reset
npm run db:test
```

Supabase's project-scoped CLI configuration lives in `supabase/config.toml`.
Migrations live in `supabase/migrations/` and are applied in timestamp order.

## Remote project workflow

A remote project is **not linked by source code**. Linking creates local CLI state and
requires account credentials/project selection.

When a staging Supabase project exists:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Do not use `db reset --linked` against a production database.

## Security boundary

- browser/user-context clients use only the project URL + publishable key
- elevated secret keys remain server-only and are not wired to an admin client by DATA-002
- all exposed product tables added later must use explicit grants + RLS
- product schema changes must arrive through migrations
- TAX-003 owns canonical taxonomy seed data
- PLY-002 owns Player tables and their RLS/database tests
