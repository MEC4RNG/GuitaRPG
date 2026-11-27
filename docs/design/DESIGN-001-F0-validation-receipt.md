# DESIGN-001-F0 — Integrated baseline validation receipt

Disposition: **TECHNICAL GATE PASS — F1 may use the validated candidate.**
Validated head: `db69bf900bafd813d4222407f7d8a8558adfd4d4` (draft PR #31, design-f0-baseline-reconciliation).
Base: v1-production at 47edda9721a13ee6b61fb0a0c31110bbffb36194.

PR #29 contains PR #27 in full; the F0 candidate descends from #29. Verified seven formatter blobs against isolated diagnostic output; repaired stale Map summary test. F0-R1 addressed deferred editor refocusing after musical insertion, onboarding failed/empty tuning data handling, and responsive navigation synchronization. R2 held an injected onboarding failure until explicit recovery. Existing strict tab-focus assertions retained.

All six formal workflows completed successfully on the same head:
- Production scaffold CI: 46042007613 — format, lint, strict TypeScript, 629 unit tests / 100 files, build PASS.
- Database contract tests: 46042007446 — PASS.
- Release security audit: 46042007543 — PASS.
- Recoverable identity integration: 46042007766 — PASS.
- Player data control integration: 46042007478 — PASS.
- UX release hardening: 46042007612 — PASS; Codex preview, responsive/UX, injected onboarding recovery, contextual Peek, Workbook prototype and persistent Workbook regressions all completed. Mobile WebKit tab keyboard focus test passed in this run. Existing configured skips remain; no claim of exhaustive device coverage.

Vercel nonproduction deployment status SUCCESS: https://guitarpg-git-design-f0-baseline-3fc72a-pauls-projects-c365bf51.vercel.app

No production merge or cutover, schema migration, or new dependency. #27/#29 remain preserved historical drafts; #30 closed unmerged. Do not merge overlapping candidates independently. F1 should branch from the exact validated SHA and begin with the proposed UX_V1_2 design-system amendment/Studio Atlas foundation; preserve existing semantic contracts and review gates. This receipt is on the design documentation branch, not a change to the validated application head. The pass verifies CI, not public release readiness or proof that intermittent browser failures can never recur.
