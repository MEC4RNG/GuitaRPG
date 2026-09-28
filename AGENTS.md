# GuitaRPG repository operating instructions

Read these before implementation work:

1. `docs/MASTER-BUILD-PLAN.md`
2. `docs/project-state.json`
3. the active ticket in `docs/tickets/`
4. every ADR/contract referenced by that ticket

## Execution rule

Work on one authorized ticket or remediation at a time.

Do not begin the next ticket merely because the current ticket becomes complete.

## Before writes

- confirm the current branch
- inspect `git status`
- inspect current HEAD / recent relevant commits
- do not discard unrelated local user changes
- resolve repository state from files, not from assumptions based on an older chat

## Completion rule

A ticket is COMPLETE only when its acceptance evidence exists and required validation is terminal success.

Never invent external migration/deployment/test evidence.

## Security

Never place passwords, access tokens, database credentials, Supabase secret keys, or other secrets in source files, tickets, commits, or chat output.

Browser/user-context Supabase code may use only values explicitly designed for public exposure.

## Current project state

The machine-readable coordination state is `docs/project-state.json`.

If it conflicts with the active ticket or actual repository state, stop and report the contradiction before semantic implementation.
