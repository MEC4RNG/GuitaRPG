# P5-SCOPE-001-R1 — CI Dependency Installer Compatibility

**Status:** BLOCKED / SUPERSEDED

## Parent ticket

`P5-SCOPE-001 — Phase 5 Launch-Critical Scope Review`

## Objective

Restore deterministic Production scaffold CI dependency installation with the smallest workflow-only compatibility repair, then allow the already-complete P5-SCOPE-001 scope review to finish validation and closure.

## Verified failure

Three consecutive Production scaffold CI runs (`36722263227`, `36722621634`, and `36723376476`) failed only during `npm install --no-audit --no-fund`, before project formatting, lint, typecheck, tests, or build. The failing environment used Ubuntu 24.04 runner image `20260927.320.1`, Node `22.23.3`, and npm `10.9.9`, which raised `Cannot read properties of null (reading 'edgesOut')`.

The immediately preceding successful repository CI used Ubuntu 24.04 runner image `20260920.314`, Node `22.23.2`, and npm `10.9.8`. Fresh local dependency installation succeeds, so there is no evidence of a product-code failure.

## Authorized repair

`.github/workflows/ci.yml` pins `actions/setup-node` from the floating Node 22 major to the last repository-proven patch, Node `22.23.2`. The workflow command sequence and project dependencies remain unchanged.

No `--legacy-peer-deps`, `--force`, `.npmrc`, package-manager switch, dependency change, database workflow change, or package-lock adoption is permitted or required.

## Scope boundary

This remediation changes no application behavior, dependency declaration, database object, migration, or Phase 5 scope decision. UX-004, PLY-003, CODEX-001, QST-004, REL-005, production cutover, and all other Phase 5 implementation remain unauthorized.

## R1 result

The exact Node pin was applied correctly. Production scaffold CI run [36725538471](https://github.com/MEC4RNG/GuitaRPG/actions/runs/36725538471) used Node `22.23.2` and npm `10.9.8`, but the same npm Arborist `edgesOut` crash persisted during dependency installation. No project validation command ran, and no further R1 workaround was attempted.

Local lifecycle/state tests, 52-file / 380-test Vitest, lint, strict TypeScript, and production build remained successful. No product-code defect was identified.

## Terminal disposition

BLOCKED / SUPERSEDED — the exact known-good Node/npm environment did not resolve the runner-specific Arborist failure. `P5-SCOPE-001-R2` owns the next bounded workflow-only repair.
