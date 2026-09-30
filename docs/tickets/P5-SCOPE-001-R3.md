# P5-SCOPE-001-R3 — Deterministic CI Dependency Graph Investigation

**Status:** BLOCKED / NOT COMMITTED IMPLEMENTATION

## Objective

Investigate whether a deterministic npm shrinkwrap generated under the existing `--legacy-peer-deps` workaround could close the Production scaffold CI dependency gap without changing package declarations.

## Investigation evidence

- Node `22.23.2` / npm `10.9.8` with `npm install --legacy-peer-deps` generated and cleanly reinstalled a shrinkwrap.
- Vitest `5.0.2` then failed at startup with `ERR_MODULE_NOT_FOUND` for `vite`.
- Vitest declares `vite` as a required peer, while `--legacy-peer-deps` intentionally omits peer auto-installation.
- Normal peer-complete installation under the same Node/npm environment reproduced the npm Arborist `Cannot read properties of null (reading 'edgesOut')` crash.

The constraints were therefore incompatible without explicitly declaring the required peer. All disposable shrinkwraps, caches, and workspaces were removed, the protected local package-lock retained its original fingerprint, and no repository commit resulted.

## Terminal disposition

BLOCKED / NOT COMMITTED IMPLEMENTATION — R4 owns the explicitly authorized Vitest peer declaration and deterministic graph.
