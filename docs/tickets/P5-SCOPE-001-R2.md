# P5-SCOPE-001-R2 — CI Arborist Peer-Resolution Workaround

**Status:** BLOCKED / SUPERSEDED

## Parent and prior remediation

- Parent: `P5-SCOPE-001 — Phase 5 Launch-Critical Scope Review`
- Prior remediation: `P5-SCOPE-001-R1 — CI Dependency Installer Compatibility` — BLOCKED / SUPERSEDED

## Objective

Restore Production scaffold CI by bypassing the broken npm peer auto-resolution path while preserving current dependency declarations, the exact Node pin, application and database semantics, and protected local files.

## Verified R1 failure

R1 correctly pinned Node `22.23.2`, which supplied npm `10.9.8`, matching the immediately preceding successful repository environment. Authenticated evidence for Production scaffold CI run `36725538471` nevertheless showed the same npm Arborist null dereference, `Cannot read properties of null (reading 'edgesOut')`, during `npm install --no-audit --no-fund`. No GuitaRPG validation step ran.

The upstream defect occurs during Arborist peer-set construction. The explicitly authorized `--legacy-peer-deps` flag avoids that peer auto-install path without changing declared project dependencies.

## Workflow-only repair

`.github/workflows/ci.yml` retains Node `22.23.2` and changes only the install command to:

`npm install --legacy-peer-deps --no-audit --no-fund`

All normal formatting, lint, typecheck, unit-test, and production-build steps remain unchanged and must pass after installation.

No dependency, `package.json`, package-lock, `.npmrc`, package manager, database workflow, application behavior, or database behavior changes are included.

## Infrastructure debt

Remove `--legacy-peer-deps` after the upstream npm Arborist resolver fix is proven in CI. Phase 6 dependency/reproducibility hardening owns reconsideration; removal is not a Phase 5 launch blocker.

## Scope boundary

UX-004, PLY-003, CODEX-001, QST-004, REL-005, all other Phase 5 implementation, and production cutover remain unauthorized.

## R2 result

The `--legacy-peer-deps` workaround successfully bypassed the Arborist crash and advanced dependency resolution. Production scaffold CI then failed while fetching newly resolved `ignore@7.0.11` before that tarball had propagated through the runner's registry path. The package subsequently became available, confirming a floating-resolution failure rather than an application defect.

Because the repository still lacked a committed dependency graph, R2 remained nondeterministic. R4 owns the explicit required Vitest peer and canonical shrinkwrap.

## Terminal disposition

BLOCKED / SUPERSEDED — the Arborist workaround succeeded, but the unlocked dependency graph remained susceptible to registry and transitive-resolution drift. R4 owns the deterministic repair.
