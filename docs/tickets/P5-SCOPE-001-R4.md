# P5-SCOPE-001-R4 — Explicit Vitest Peer & Deterministic CI Graph

**Status:** COMPLETE

## Parent and prior findings

- Parent: `P5-SCOPE-001 — Phase 5 Launch-Critical Scope Review`
- R1: exact Node/npm pin retained the Arborist `edgesOut` crash — BLOCKED / SUPERSEDED
- R2: `--legacy-peer-deps` bypassed Arborist, but the unlocked graph hit registry propagation drift — BLOCKED / SUPERSEDED
- R3: a legacy-generated shrinkwrap omitted Vitest's required Vite peer; normal peer resolution still crashed — BLOCKED / investigation-only

## Objective

Complete and lock the dependency graph with the smallest authorized test-tooling declaration, without changing application behavior, database behavior, package manager, or any unrelated package version.

## Explicit Vitest peer

Vitest `5.0.2` declares `vite` compatible with `^6.4.0 || ^7.0.0 || ^8.0.0` as a required peer. `package.json` now declares exactly one additional dev dependency: `vite: "7.3.6"`. No other dependency declaration changes.

## Deterministic graph generation

The graph was generated mechanically in disposable clean clone `D:\GuitaRPG\p5-scope-r4-clean` at starting commit `7b196db7ee07381cc51e8a3c222e330cb259e970` using Node `22.23.2`, npm `10.9.8`, and `npm install --legacy-peer-deps --no-audit --no-fund`. `npm shrinkwrap` converted the generated lock to the repository-owned `npm-shrinkwrap.json`.

The shrinkwrap contains exact root Vite `7.3.6` and Vitest `5.0.2` entries, resolved tarball URLs, integrity hashes, exact transitive versions, and root metadata. It resolves root `ignore@5.3.2` and nested `ignore@7.0.11`; both are locked with resolved URLs and integrity.

After removing disposable `node_modules`, a new empty-cache `npm ci --legacy-peer-deps --no-audit --no-fund` installed all 411 packages successfully. `vitest --version` then reported Vitest `5.0.2` on Node `22.23.2`.

## Workflow

Production scaffold CI retains Node `22.23.2` and uses `npm ci --legacy-peer-deps --no-audit --no-fund`. The committed shrinkwrap makes the graph deterministic; the legacy peer mode remains an explicit temporary workaround for the independently reproduced Arborist defect.

No `.npmrc`, override, resolution, package-manager change, broad upgrade, application feature, database change, or migration is included.

## Protected package-lock

The primary untracked `package-lock.json` was fingerprinted before R4 at 291,309 bytes with SHA-256 `5BA166872DA816F03CA5116A7EDD3AB408FDAFB637B0FA3FB3B38C3971EEF0D6`. It was not used as authority, opened for rewriting, staged, renamed, or committed. Final fingerprint verification is required before commit.

## Local clean-workspace validation

- Clean-cache deterministic `npm ci`: PASS — 411 packages
- Vitest startup: PASS — Vitest 5.0.2 / Node 22.23.2
- Format: PASS
- Lint: PASS
- Typecheck: PASS
- Full Vitest: 52 files / 380 tests PASS
- Production build: PASS

## Infrastructure debt

Phase 6 dependency/reproducibility hardening should test removal of `--legacy-peer-deps`, test unpinning Node after the resolver fix, and decide whether npm-shrinkwrap remains the long-term lock strategy or is intentionally migrated to a conventional tracked package-lock through a separately authorized reconciliation.

## CI evidence

- Production scaffold CI: [36735934714](https://github.com/MEC4RNG/GuitaRPG/actions/runs/36735934714) SUCCESS
- Runtime: Node `22.23.2`, npm `10.9.8`
- Install: `npm ci --legacy-peer-deps --no-audit --no-fund` PASS
- Format, lint, typecheck, 52-file / 380-test Vitest, and production build: PASS

## Terminal disposition

COMPLETE — the explicit Vitest peer, deterministic shrinkwrap, clean install, full local validation, and Production scaffold CI are verified. P5-SCOPE-001 may resume closure; UX-004 remains unauthorized.
