# DESIGN-001-F3B — Quest Discovery and Library

Base: validated F3A/R3 `9fe0b8eb27a2ec9d2e7539e9d1b892d59356b87d`, PR #38. All six formal workflows and Vercel passed; user accepted F3A visual direction and requested F3B. New draft branch only; no production merge.

## Implemented scope

- Studio Atlas discovery surface on /generate: Quick Quest one-action generator, distinct Training and Boredom Buster routes, explicit current mode. Existing draft hydration, confirmation, save and start RPCs, identity/setup and generated snapshots remain unchanged. No automatic Quest or Session creation from discovery. If a restored draft is not today's seed, daily route labels it as existing draft rather than daily output.
- Quest reveal: domain identity, actual objective, absolute demand, suggested Session length, preserved primary/secondary/required Skill roles, Codex Peek, concepts, constraints, tuning and tempo; real success criteria disclosure. Start Quest remains navigation into MEC, distinct from practice. No ability percentages or new generation model.
- /quests: domain emblems, lifecycle labels, saved working stage, actual demand, suggested Session, last worked, Session count/result. Existing owner-scoped library reader, archive/restore and practice authority retained. Search by loaded title/Skill/concept/objective/domain plus lifecycle/domain filters; results explicitly count loaded records and keep Load more available. This is not an exhaustive server-side search. Existing grouping and ordering remain. Error refresh uses safe message. No fake quests or activities.
- Preview gate resolves on request; production retains accepted layout. Reuse F1 original art/tokens. No new dependencies, schema, or data writes beyond existing user actions.
- Added unit cases for domain resolution, filtering and actual criteria. Browser test covers discovery links, reveal, narrow width/accessibility, save, filtering, archive/restore, returning to exact Quest and no implicit Sessions. Preserve full previous CI/browser suites.

## Deferred

Custom Quest builder UI, deeper filters/pagination/search at repository level, personalized demand presentation, curated campaigns, independent daily lifecycle, and more cinematic art require separate scope. F3C refines Map/Explore focused activity layout; F3D Craft toolkit; F3E responsive acceptance. Final-head validation and visual review required before advancing.
