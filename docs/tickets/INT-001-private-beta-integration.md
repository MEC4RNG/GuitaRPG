# INT-001 — Private beta integration candidate

Disposition: INTEGRATION_CANDIDATE / VALIDATION_PENDING. No production merge, publication, migration, or cutover is authorized by this ticket.

## Branch audit (2026-11-25)

- Production development baseline: v1-production at 47edda9721a13ee6b61fb0a0c31110bbffb36194.
- Starting integration head: MEC-R13 PR #26, dfe9809468f319370cb69243cba649f8b324b491. GitHub compare reports 339 commits ahead, zero behind production, 106 changed files. R13 Vercel reports success, not user mobile approval or full CI.
- The following existing drafts form a continuous ancestry chain already included in that head: #13 JRN-004, #14 Codex V2-A, #16 R6, #17 R7, #18 R8, #19 R9, #20 R9-R1, #21 R10, #22 R11, #23 R12, #25 R14, #26 R13. R14 user visual approval is recorded on #25.
- #24 is closed/unmerged and was an alternate R12 implementation. Do not merge it.
- #11 full mobile menu diverged: one unique commit versus the latest stack. Restore its functional scope with an accessible native modal dialog inside the existing topbar, keeping the R13 five direct shortcuts and all desktop navigation. This is a selective reconciliation, not a historical merge. Mobile visual/focus review required.
- #15 R5 diverged: 29 unique commits; its lesson template, Workbook route, and Workbook persistence surface are byte-identical to the R13 branch. The Codex entry keeps its explicit lesson actions; R12 tests extend template coverage to all 114 modules. Do not duplicate the R5 persistence implementation. R5's dynamic triad tool was missing from Triad Construction; restore it as an optional disclosure using the newer shared R10 chord engine and preserve original quick examples. Old R5 standalone engine and obsolete duplicate tests intentionally not imported.
- Existing PRs remain open and unmerged for traceability; the integration candidate is a single alternative review against v1-production. Do not merge individual ancestors or overlapping branches after adopting this candidate without reconciliation.

## Validation
- Existing scaffold CI and UX release-hardening workflows target v1-production, so the integration draft PR targets that branch to invoke them without altering triggers or production.
- Add full mobile menu test to existing responsive gate; existing Codex preview suite covers triad expansion, R14 tempo and fretboard sequence, lesson-to-Workbook, and R12 navigation.
- Required: formatting, lint, strict TypeScript, unit tests, build, local database replay and pgTAP as applicable, security/dependency scan, desktop/mobile browser/accessibility and complete Player → Quest → MEC → Workbook → Practice → Result → History/Progression flow. Verify guest/protected Player, saved Workbook recovery, draft catalog gate, existing published V1 library, and R14 listening.
- Connector edits do not constitute a clean local checkout or final-head test execution. Local repository access is DNS-blocked. Inherited R14 formatting needs verification/remediation. No pass claimed until terminal CI evidence is captured.
- User review pending for R13 and selectively reconciled menu/triad UI. Keep the production publication gate, database configuration and JRN-005 authorization unchanged. Craft refinement held until integration validation.
