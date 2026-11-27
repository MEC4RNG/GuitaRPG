# DESIGN-001-F1 — Studio Atlas foundation / proposed UX_V1_2 amendment

Disposition: draft, preview-only implementation, awaiting visual and technical approval.
Base: F0 validated db69bf900bafd813d4222407f7d8a8558adfd4d4 (PR #31).
Design references: DESIGN-001-D1, D1-R1 selected Studio Atlas image, D2, E-R1 and F implementation strategy on design-001-d-visual-identity.

## Scope and authority

The user authorized starting F1. This candidate introduces a separate design-system gallery at /prototype/studio-atlas, with a server-side nonproduction gate (Vercel production always denied, local development and explicit CI opt-in permitted). No changes to existing UX_V1_1 tokens, nav destinations, page layouts, database, dependencies, identity, evidence, production configuration or release. UX_V1_2_CANDIDATE is a proposed visual amendment, not a silently accepted production contract. Public static vector assets contain no private or draft curriculum content. Future F2 maps approved visual tokens to the actual shared application shell and real dashboard; no fake future features or stats will be shipped.

## Implemented candidate

- Semantic tokens and domain colors: domain/ux/studio-atlas-candidate.json and app/studio-atlas-tokens.css. Scoped CSS; original color roles, 44px targets, system fonts, visible focus, reduced motion. Dark ink and brass, teal discovery, warm paper reading. Six canonical domain names/slugs; no proficiency meaning from color.
- Reusable AtlasBrand / Compass, AtlasDomainIcon, AtlasButton, AtlasPanel, AtlasStatus, AtlasCover. Native dialog demonstration with keyboard dismissal and return focus; reading surface dark/paper toggle. CSS grid reflow at narrow widths. Existing app shell wraps the gallery until F2.
- Gallery presents palette, typography, six identities, sample Quest and status states, three cover variants, paper/dark reading samples. Illustrative content only; no persistence or music scoring.
- Original vector decorative assets (artwork candidates, not final photography): public/studio-atlas/atlas-horizon.svg (1200x540 scalable landscape, background crop right); atlas-contours.svg (400x400 pattern for surfaces and covers); guitar-study.svg (560x440 stylized instrument artwork, not accurate instructional diagram). Compass/domain marks and cover compositions are original inline vectors/CSS in studio-atlas-primitives.tsx. Created for this project, no third-party source, fonts, embedded text or external media. All decorative and hidden from assistive technology where their meaning is redundant; review rights/brand marks and final asset acceptance before production. No claim of final logo or complete photographic asset set. Do not use generated mockup screens as implementation assets.
- Unit tests for flat-color contrast, token parity, canonical domain labels/slugs, gate denial and safe/bounded static SVG. Browser gallery regression in existing accessibility suite across 1440/820/390/320 widths, dialog keyboard and dark reading mode, reduced motion. Full final-head CI and visual review pending.

## Deferred
Full shared shell, navigation and dashboard integration (F2); full theme application across existing app, cinematic photographic/illustrative quest asset set and final logo, icon refinement and broader reusable components to iterate from approved gallery. F3+ MEC and Workbook/Codex layouts. No new score engine, audio, retention model, gamification economy or spatial features.

## Acceptance
Pass formatting/lint/strict TypeScript/unit/build, formal UX/accessibility/browser, database/identity/security/data checks. Verify desktop/mobile preview, visual hierarchy and asset direction with user; preserve original candidate baseline and prior branches. Approve the explicit UX_V1_2 amendment only after visual acceptance and validate migration in F2. No production merge/cutover.
