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

## Failure-state expectations

- Provider, database, auth, and internal exception details are never rendered to the Player.
- A recoverable read failure exposes a clearly named retry action.
- Mutating actions retain truthful success/failure separation and never claim a write succeeded after failure.
- Offline loss is browser-truthful; returning online permits a fresh navigation.
- Root and route failures expose Retry and Home actions without leaking private Player data.

## Terminal evidence

The ticket cannot be marked COMPLETE until the automated workflow passes and the Narrator/manual matrix has real-device evidence. If the required assistive-technology environment is unavailable, the correct disposition is `AWAITING_EXTERNAL_EVIDENCE`, not a synthetic pass.
