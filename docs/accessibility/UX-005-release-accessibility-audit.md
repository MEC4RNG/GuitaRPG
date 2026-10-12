# UX-005 Release Accessibility Audit

**Status:** AWAITING EXTERNAL EVIDENCE

**Standard:** Applicable WCAG 2.2 Level AA criteria

**Scope:** Accepted v1 routes and core Player journeys

## Automated evidence

The dedicated UX hardening workflow blocks regressions with:

- axe-core checks tagged for WCAG 2.0 A/AA, WCAG 2.1 AA, and WCAG 2.2 AA;
- Chromium, Firefox, desktop WebKit, mobile WebKit, Pixel-class, tablet, and 320 px layout coverage;
- horizontal-overflow and minimum-target smoke assertions;
- deterministic provider-failure and offline-recovery checks;
- route and global error-boundary contracts that prohibit raw provider detail;
- bounded interaction smoke checks that flag hung entry routes without claiming laboratory performance measurement.

Automated testing is evidence, not a claim that every accessibility criterion can be machine-tested.

## Manual keyboard and screen-reader matrix

Record each result as PASS, FAIL, or BLOCKED with the browser, assistive technology, version, and observation.

| Journey | Keyboard | Focus order/visibility | Names and states | Status/error announcement | Narrator smoke |
| --- | --- | --- | --- | --- | --- |
| Home and primary navigation | AUTOMATED PASS | AUTOMATED PASS | AXE PASS | N/A | BLOCKED |
| Onboarding and guest identity | PENDING | PENDING | PENDING | PENDING | PENDING |
| Generate → Session → Result | PENDING | PENDING | PENDING | PENDING | PENDING |
| Training recommendation | PENDING | PENDING | PENDING | PENDING | PENDING |
| Character and Skills | PENDING | PENDING | PENDING | PENDING | PENDING |
| History and attempt detail | PENDING | PENDING | PENDING | PENDING | PENDING |
| Profile, recovery, export, deletion | PENDING | PENDING | PENDING | PENDING | PENDING |
| Codex search and detail | AUTOMATED PASS | AUTOMATED PASS | AXE PASS | N/A | BLOCKED |

Automated keyboard and accessibility-tree evidence is supplementary. The remaining `BLOCKED` cells require a person using Narrator or NVDA and must not be inferred from axe results.

## Recorded Narrator observation — remediation required

**Assistive technology:** Windows Narrator (version not recorded)

**Browser:** Not recorded by the manual tester

**Evidence received:** 2026-10-09

**Environment:** Public production route and PR preview; no production or staging configuration was changed

| Route or journey | Result | Actual observation |
| --- | --- | --- |
| Home / desktop sidebar | FAIL | Narrator treated the literal uppercase group strings `PLAY`, `DEVELOPMENT`, `LEARN`, and `SYSTEM` as acronym-like text instead of speaking the words naturally. |
| Home / brand | FAIL | Narrator did not speak the visible `Practice OS` subtitle naturally; the required spoken label is “Practice operating system.” |
| Production `/profile`, unauthenticated account access | FAIL | Narrator announced “Linked email,” “Email me a sign-in link,” and “Start a new guest Player,” but the email input was not visually unmistakable enough. |
| PR preview `/profile`, private Player flow | BLOCKED | The preview rendered “Profile data is unavailable. Please try again.” Authenticated Profile, Skills, Session, and deletion-confirmation evidence cannot be claimed from this deployment. |

The remediation stores navigation group labels in natural title case while retaining uppercase through CSS, gives the brand one explicit natural accessible name, and strengthens the email field boundary, spacing, width, focus treatment, and visible label. These changes still require a new real Narrator observation before they can be marked PASS.

## Isolated local manual-test environment

The remaining private-flow smoke must use the repository's local Supabase stack, not real production Player data and not the misconfigured PR preview.

Prerequisites: Docker Desktop is running; repository dependencies are installed.

From the repository root, run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ux/start-narrator-smoke.ps1
```

The helper checks Docker, starts local Supabase, resets only the local database for a deterministic journey, reads the local public and server-only values without printing keys, and starts the app at `http://127.0.0.1:3000`. Use `-SkipReset` only to resume an interrupted local observation.

Manual tester journey:

1. Open `/onboarding`, complete onboarding, and enter the app.
2. Check Home/sidebar speech and keyboard focus order.
3. Open `/profile`; check the unauthenticated/guest account field and authenticated Profile controls available to the local identity.
4. Open `/skills`, expand one Skill, and distinguish its name, assessment, proficiency, confidence, and readiness.
5. Generate and start one Quest; check the Session title, Active Time, Reps, state, Pause/Resume, End Session, metronome controls, reference links, and focus order.
6. Open Profile's deletion confirmation only. Check the irreversible warning, exact confirmation label, Delete action, Cancel action, and status/error announcement. Do not submit deletion.

Record the Narrator or NVDA version, browser/version, date, each route/journey, PASS/FAIL, and the concise actual announcement or behavior below. Until every required item has observed evidence, UX-005 remains `AWAITING_EXTERNAL_EVIDENCE`.

| Journey | AT and browser | Date | Result | Actual observation |
| --- | --- | --- | --- | --- |
| Home / sidebar remediation | PENDING | PENDING | PENDING | Verify “Practice operating system,” Play, Development, Learn, and System are spoken naturally. |
| Profile / account access | PENDING | PENDING | PENDING | Verify the email input is visually obvious and announced as “Linked email,” edit/input. |
| Skills expanded state | PENDING | PENDING | PENDING | Verify Skill name, assessment, proficiency, confidence, and readiness are distinguishable. |
| Active Session | PENDING | PENDING | PENDING | Verify Quest/session data, controls, links, and focus order are meaningful. |
| Deletion confirmation | PENDING | PENDING | PENDING | Open only; verify irreversible context, exact field, Delete, Cancel, and status/error speech. |

## Recorded Narrator observation — local isolated harness

**Assistive technology:** Windows Narrator (version not recorded)

**Browser:** Not recorded by the manual tester

**Evidence received:** 2026-10-12

**Environment:** Repository local isolated harness; no production or staging configuration was changed

| Journey | Result | Actual observation |
| --- | --- | --- |
| Profile / account access | PASS | Profile controls, account/recovery semantics, and field announcements were understandable. |
| Skills expanded state | PASS | Skill information was understandable with Narrator. |
| Active Session | PASS | Session controls and state were understandable with Narrator. |
| Home / brand | PASS | Narrator spoke “Practice operating system” naturally rather than spelling “OS.” |
| Home / sidebar group headings | PENDING | Tab navigation does not visit semantic headings. A real Narrator Scan Mode `H` / `Shift+H` check is still required for Play, Development, Learn, and System; this is not currently recorded as a defect. |
| Deletion confirmation | FAIL — REMEDIATED, RECHECK PENDING | Opening the disclosure produced no audible warning because focus remained on the trigger, and the DELETE input was visually difficult to identify. Deletion was not submitted. The remediation now moves focus to a labelled/described region heading, restores trigger focus on Cancel, and gives the confirmation field a high-contrast 44 px treatment. A real Narrator recheck is still required. |

## Failure-state expectations

- Provider, database, auth, and internal exception details are never rendered to the Player.
- A recoverable read failure exposes a clearly named retry action.
- Mutating actions retain truthful success/failure separation and never claim a write succeeded after failure.
- Offline loss is browser-truthful; returning online permits a fresh navigation.
- Root and route failures expose Retry and Home actions without leaking private Player data.

## Terminal evidence

The ticket cannot be marked COMPLETE until the automated workflow passes and the Narrator/manual matrix has real-device evidence. If the required assistive-technology environment is unavailable, the correct disposition is `AWAITING_EXTERNAL_EVIDENCE`, not a synthetic pass.
