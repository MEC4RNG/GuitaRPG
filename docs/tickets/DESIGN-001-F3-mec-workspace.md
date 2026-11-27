# DESIGN-001-F3A — Unified MEC workspace, activity continuity

Disposition: initial F3 implementation, draft; technical and visual gates pending. Parent: validated F2-R2 `5f9aad8956eaa5e8d4364dfc33f2f6341296de6d` (PR #35). User authorized beginning F3.

## Implemented

- Keep existing resolved Quest, durable lifecycle/stage RPCs, Session controls, requirements, history, and shared Codex Peek. Preserve existing Map ingredient selector and level-specific lesson rows. Map exposes actual success criteria in preview.
- On Map lesson selection, use the exact canonical Skill and draft module ID from the existing gated server catalog. Transition to Explore only; no Workbook or Session is created. Display actual lesson explanation, outcomes, exercises, self-checks, suggested time and optional existing interactive Skill reference. Draft remains clearly labeled, no automatic scoring.
- Explicit Save lesson to Workbook creates an editable document from existing trusted lesson builder, not a second document format. Retain stable creation receipt/document per lesson in the current workspace for retry. Link accepted page using existing Explore module RPC; open embedded editor. Same-mount repeated action reopens the saved page, not another copy. On reload links remain durable, but selected lesson and retry receipt are local workspace state. Existing standalone lesson workflow remains unchanged.
- Continue in Craft explicitly attaches the currently selected accepted Explore page to CRAFT/APPLIES_TO and switches stage using the accepted RPC. Existing embedded Craft editor loads the same page ID and revision. No duplicate document or fabricated creation provenance. Existing independent new-composition option remains.
- Stable memoized embedded contexts and pending-edit callbacks prevent internal stage or page swaps while dirty/conflicted, and guard local Journey navigation. Existing browser unload warning remains; application-wide SPA navigation protection is not fully covered here and is an F4/F7 follow-up. Do not claim global unsaved-change guarantees.
- Studio Atlas styling on the nonproduction Quest workspace, retaining current responsive canvas, shared header, three stages, and existing musical editor geometry. No new schema, dependency, audio verification, score engine or production cutover. Remove nested main landmark.

## Validation
Existing six formal workflows plus deterministic Map lesson → Explore → explicit save → edit → same-page Craft → reload regression in Codex browser suite. Check no implicit Sessions, actual content, page identity and responsive overflow. Validate all current browser/accessibility, Workbook and identity/security gates before user visual review.

## Remaining F3 work
This is the first vertical slice, not a completed F3. Refine Quest discovery/library and selected activity navigation, optional existing/new Workbook selection and recovery across reload, inspector/canvas behavior on narrower devices, and visual spacing after review. Preserve existing independent Codex and Workbook gates. F4 consolidates document identity, editing/display, pending navigation and the remaining Workbook/Codex presentation. No production merge authorization.
