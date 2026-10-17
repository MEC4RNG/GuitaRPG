# P6-REBASE-001 — Pre-Launch MEC Product Scope Rebaseline

**Status:** COMPLETE

**Phase:** 6 — Hardening & Launch

**Type:** Coordination / scope rebaseline; no product implementation

**Date:** 2026-10-17

## User decision and rationale

The user explicitly decided that **MEC — Map / Explore / Craft — is launch-defining and must ship before GuitaRPG’s initial public launch**. The user accepts a deliberate launch delay in exchange for making the persistent Quest Journey part of the initial public product. Shipping the current short Quest-to-Session framing first and adding MEC immediately afterward is rejected.

This decision creates one bounded exception to the Phase 6 feature freeze. It does not authorize an implementation ticket, production cutover, production/staging mutation, or public-traffic change.

## Accepted architecture authority

QST-005 — Multi-Stage Quest Lifecycle & Workspace Contract is **COMPLETE — DESIGN CONTRACT / ACCEPTED FOR PRE-LAUNCH IMPLEMENTATION**.

Its accepted model is:

- Quest remains the immutable resolved musical/practice definition.
- A separate Player-owned Journey overlay records evolving lifecycle and Workspace state using the same Quest ID.
- A Quest may have many Sessions.
- A Session is one bounded practice attempt.
- A Result is evidence from one ended Session.
- Map, Explore, and Craft are revisitable: **MAP ⇄ EXPLORE ⇄ CRAFT**.
- Journey completion is explicit Player intent, not mastery or proficiency.
- Save Quest does not create a Session.
- Saved Quests are actionable work and remain distinct from History.
- Practice Again creates a new Session without overwriting earlier attempts.
- Codex Peek, Journal, Quest-aware fretboard, progressive Build Quest, and protected-account cross-device persistence belong to the bounded program.
- Initial synchronization is refresh/refocus/navigation based; realtime is deferred.

QST-005 does not alter accepted XP, proficiency, confidence, readiness, Attribute, evidence, identity, or historical immutability authority.

## Phase 6 rebaseline

Phase numbering is preserved. **Phase 6 — Hardening & Launch remains IN_PROGRESS.** It now has four operational sub-stages:

### Phase 6A — Completed launch-hardening baseline

The following remain COMPLETE and are not reopened:

- P6-SCOPE-001
- DATA-003
- DATA-004
- SEC-001
- UX-005

All completed Phases 0–5 and P5-GATE-001 remain COMPLETE. Their accepted semantics remain authoritative unless a future bounded remediation explicitly supersedes them.

### Phase 6B — Pre-Launch MEC Product Completion Program

The prior feature freeze is suspended only for the bounded MEC sequence documented below. Deferred systems remain deferred. Each implementation ticket requires separate explicit authorization.

### Phase 6C — Resumed production hardening

After REL-007 PASS, resume the preserved OPS-001 work, reconcile its branch, apply only new committed migrations forward, refresh final-schema production evidence, and finish Auth/SMTP/recovery/log requirements.

### Phase 6D — Final release proof

REL-006, P6-GATE-001, and separately authorized CUTOVER-001 follow completed MEC integration and resumed OPS-001.

## Ordered MEC program — no implementation ticket authorized

1. `QST-006 — Quest Draft, Save & Journey Persistence`
2. `QST-007 — Saved Quest Library & Journey Read Model`
3. `UX-006 — MEC Quest Journey Experience`
4. `CODEX-002 — Contextual Codex Peek`
5. `QST-008 — Quest Journal Workspace`
6. `FRET-001 — Quest-Aware Fretboard Workspace`
7. `QST-009 — Progressive Build Quest Composer`
8. `TRN-005 — Training-to-Journey Integration`
9. `DATA-005 — Journey Export, Deletion & Device-Session Remediation`
10. `SEC-002 — MEC Incremental Security Audit`
11. `REL-007 — MEC Journey Integration Gate`
12. resume `OPS-001 — Production Environment, Recovery & Observability`
13. `REL-006 — Production Readiness Integration`
14. `P6-GATE-001 — Hardening & Launch Readiness Gate`
15. `CUTOVER-001 — Production Cutover`, separately authorized only after gate PASS

## Intended ticket boundaries

### QST-006

Generated-draft survival through ordinary navigation; Save Quest without Session; Start Quest; Player-owned Journey lifecycle/stage persistence and RLS; saved/active/concluded/archived state; lazy backward-compatible Journey overlay. No rich Workspace tools.

### QST-007

Saved Quest collection/read model; recent and full library; Practice Again; repeated Sessions against one immutable Quest; archive/unarchive; Journey summaries; strict separation from History.

### UX-006

Generate-to-Journey flow; Map/Explore/Craft shell; Start Quest versus Start Practice; multiple Session summaries; responsive desktop/mobile central Quest experience; accessibility and visual polish. CODEX-002 retains Codex Peek ownership.

### CODEX-002

Non-destructive contextual Codex Peek; desktop inspector/drawer; mobile sheet/full-screen overlay; Quest-context rationale; full-Codex link; preservation of generated/Journey state.

### QST-008

Private persisted Journey Journal with optional Discovery, Sound, Technique, Idea, and freeform notes; no automatic evidence or progression authority; protected-account cross-device behavior.

### FRET-001

Quest-aware interactive fretboard with Quest tuning, system anchors, Player markers, roots, note/interval labels, saved positions/shapes, and desktop/mobile usability. No tab editor, audio analysis, fingering detection, or DAW behavior.

### QST-009

Progressive Quick/Build split over the existing Custom generator; truthful Primary capability; up to two Secondary Skills and Required Techniques; Concepts, Context, Constraints; compatibility filtering; basic/advanced controls.

### TRN-005

Training-generated Quests enter the shared Journey architecture. No parallel Training-only model. The ticket must decide truthfully whether continuing an existing Journey is in scope or remains deferred.

### DATA-005

Extend DATA-004 export and deletion to all new Journey/Workspace records; verify RLS and cross-device account implications; evaluate/implement ordinary “Sign out this device” and expose “Sign out everywhere” only when justified. DATA-003 identity ownership remains unchanged.

### SEC-002

Inventory incremental MEC relations, functions, grants, RLS, and SECURITY DEFINER boundaries; update the security inventory and pgTAP release-security assertions; rerun secret, dependency, and header regressions while preserving SEC-001 policy.

### REL-007

Gate Quick/Build → Journey, save without Session, reopening, MEC stage state, multiple Sessions, Practice Again, Journal, fretboard, Codex Peek, Training, export/deletion, cross-device refresh, desktop/mobile, accessibility, security, legacy compatibility, DORIAN_CROSSROADS, and Phase 2–5 regressions. REL-007 PASS is required before OPS-001 resumes.

## Minimum pre-launch MEC boundary

By REL-007, the program requires draft survival, Save Quest, Start Quest, library, persistent Journey lifecycle, MEC shell, repeated Sessions, Practice Again, Codex Peek, basic Journal, functional Quest-aware fretboard, Build Quest over the existing engine, Training integration, export/deletion, device-aware sign-out, and integrated desktop/mobile/accessibility/security evidence.

It does not authorize realtime collaboration, notation/tab, audio recording or raw-audio storage, backing tracks, DAW/timeline, fingering recognition, creative-quality scoring, Campaigns, Daily, social, teacher/student, or analytics expansion.

## Invariants

- **Quest:** immutable resolved practice/musical definition; attempted requirements are never rewritten.
- **Journey:** evolving owner-scoped overlay using the same Quest ID.
- **Session:** one practice attempt; many may reference one Quest.
- **Result:** evidence from one Session; `CLEARED` does not conclude the Journey or imply mastery.
- **Progression:** opening stages, writing notes, placing markers, or concluding a Journey grants no XP, proficiency, confidence, readiness, or Attributes.
- **Saved Quests:** actionable work the Player may continue.
- **History:** Sessions, Results, and evidence that actually happened.
- **Backward compatibility:** legacy overlays are created lazily; existing Quest snapshots, Sessions, Results, and DORIAN_CROSSROADS are unchanged.

## OPS-001 pause and preservation

OPS-001 is **IN PROGRESS / PAUSED FOR PRE-LAUNCH MEC PRODUCT COMPLETION**. It is not complete, discarded, or superseded. Its local `ops-001-production-operations` branch and known commits remain untouched:

- `89e51ebb51b1793e3dffa319596493024a19ec50`
- `b1c7a232ccb4fb1bcdc618fb4293096b107c8895`
- `ffe7224720219d1ac2ae4d7c0c5fa772f0dc5bba`
- `35c1742ec72aa29bfa9e29eae4916a807272456e`

Preserved operational progress:

- production Supabase `guitarpg-production`, ref `ndjwdqdawslrzmblspfn`, `us-west-2`, Free, distinct from staging
- staging ref `vwvuaasgczsmeskhjrsb`
- production schema bootstrapped through `20260929130000_sec_001_security_hardening.sql`
- canonical seed and 18-file / 629-assertion pgTAP result verified with zero Player-owned bootstrap rows
- Security Advisor reviewed with expected SEC-001 warnings only
- verified private Google Drive application-data backup `guitarpg-production_2026-10-14T145638Z_data.sql`, 177,292 bytes, SHA-256 `1096EF032D86E5EC4753B11110A20C108663F866B79AE23D043425C54A3C812C`
- isolated application-data restore and 18-file / 629-assertion pgTAP rehearsal passed; managed Auth/Storage excluded
- Preview/Production environment-scope separation and staged deployment topology established without public cutover
- public `guitarpg.vercel.app` traffic unchanged

Unresolved OPS work remains production Auth final configuration, custom SMTP/domain, real passwordless delivery/recovery proof, managed Auth recovery, provider-log evidence, and final release deployment evidence.

## Evidence refresh matrix

| Area | Preserved authority/progress | Required refresh after MEC |
| --- | --- | --- |
| DATA-004 | Pre-MEC export/deletion contract and evidence remain COMPLETE | DATA-005 adds all Journey/Workspace records and reruns completeness/deletion proof |
| SEC-001 | Security policy and pre-MEC audit remain COMPLETE | SEC-002 inventories and tests incremental relations/RPCs/grants/RLS; SEC-001 is not reopened |
| UX-005 | Baseline accessibility/browser/failure-state evidence remains COMPLETE | Owning tickets and REL-007 test every new MEC surface; no claim that UX-005 covered them |
| OPS design | Production identity, topology choices, runbooks, rollback/observability concepts, backup destination, and environment separation remain useful | Release-specific deployment, logs, browser bundle, smoke, exact SHA, and final operational evidence are rerun |
| Production DB | Project, region/plan, separation, bootstrap history, and rehearsal experience remain useful | Dry-run/apply only new migrations, updated pgTAP/security, canonical/application verification, and final head evidence |
| Backup | Existing artifact is historical pre-MEC operational-rehearsal evidence | New post-MEC release-candidate backup and final-schema isolated restore rehearsal |
| Vercel | Environment-scope separation and topology remain durable | Fresh staged Production deployment and environment/browser/smoke proof from the final release candidate |

The pre-MEC migration head, pgTAP result, zero-row counts, logical backup, restore rehearsal, staged deployment, browser proof, smoke, exact SHA, and release logs must not be reused as final launch-gate evidence.

## Production consequence when OPS resumes

After REL-007 PASS, OPS-001 must verify the production ref, dry-run only new committed migrations, apply them forward-only, run updated pgTAP/security, verify final canonical/application state, create a new post-MEC backup, rehearse restore against the final schema, and stage a fresh final-candidate Vercel deployment. Public traffic and production cutover remain unchanged until separately authorized.

## Coordination updates

- Master Plan records the bounded feature-freeze exception and Phase 6A/B/C/D structure.
- `docs/project-state.json` keeps Phase 6 IN_PROGRESS, records this ticket as the last terminal ticket, and points to unauthorized QST-006.
- QST-005 documents are imported into protected repository history as accepted pre-launch architecture authority.
- No product implementation, schema, migration, infrastructure, Auth, Vercel, GitHub ruleset, OPS branch, legacy `main`, or GitHub Pages behavior changes in this ticket.

## Validation and protected delivery

Required local validation is formatting, `git diff --check`, and applicable coordination/state tests. Completion additionally requires a PR into protected `v1-production`, terminal `validate` and `security` checks, protected merge, verification of the resulting `v1-production` HEAD, and confirmation that the ruleset remains active.

## Terminal disposition

**COMPLETE** only after protected delivery is verified. Until then, implementation work is complete locally but terminal closure remains pending CI/merge evidence.

Next planned ticket: `QST-006 — Quest Draft, Save & Journey Persistence`.

QST-006 is **not authorized**.
