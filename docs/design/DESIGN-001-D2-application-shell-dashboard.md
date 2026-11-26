# DESIGN-001-D2 — Application Shell & Personalized Home

Revision 0.1 | 2026-11-26 | DRAFT — design review, not release authority.
References: DESIGN-001-A/B/C, C-R1, D1, D1-R1, and FUTURE-gamification-player-identity. Primary art reference: user-selected Studio Atlas dashboard image (Sound Uncharted_ Musical Journey Dashboard-1.png). This document describes design concepts, not deployed functionality.

## 1. Dashboard intent

Home is a musician's starting point, not an administrative profile. Make the most useful next action immediately apparent, whether that is continuing a Quest, resuming an active Session, starting a quick practice challenge or returning to a composition. Preserve independent learning and creation paths. Profile remains reachable through the avatar/account menu; it owns identity and settings, not the dashboard.

## 2. Returning Player — primary desktop concept

Use the selected art direction: ink/deep teal, restrained gold, guitar photography, fine contour lines, recognizable illustrated notebook covers, editorial headings and clearer sans-serif utility text. Keep the compass wordmark and side rail. Layout should closely follow the selected reference, with less glow and border competition.

At 1440 x 900 design reference (illustrative dimensions):
- Navigation rail ~216–240 px; collapsible ~64–72 px; Home, Quests, Training, Skill Map, Codex, Workbooks, Composer Studio; History and Profile accessible at the foot/account menu. One active route indication with icon, label and accent.
- Header: “Your musical journey”; compact search and account access. Search scope is explicitly supported content only in implementation; unified search and notifications are future capabilities, not implied by mockup.
- Primary hero, roughly 240–260 px: Active Quest, Melodic Navigation, Scale-Degree Recognition, current stage Explore and “Continue in Explore.” A single primary brass action; guitar image cropped to right with text-safe dark overlay. Quick Quest is available immediately, preferably as the adjacent secondary action; do not duplicate it in a separate card unless testing supports the distinction.
- Middle row: today's training (“Hear the tonal home,” rationale and time/challenge if supported); a local Skill Map neighborhood with explicitly qualified development state/relationship labels; a compact development/next-review summary only if supported. For the current visual study, two cards rather than a repeated Quick Quest card.
- Lower row: Recent Workbooks with covers, names, concise context/page count and an open library link; Composer Studio with last project or Start composing, independent of Quest. Artwork reinforces recognition. No decorative/generated tab or graph treated as musical/evidence authority.
- Illustrative example content is not player data. The final dashboard should load actual accepted owner-scoped records and distinguish empty, pending, unavailable and error states.

## 3. Home state matrix

| State | Dominant action | Supporting content |
| --- | --- | --- |
| Signed out, no recognized Player | Start playing | Public landing: short value proposition, examples of learning/creation, sign in; no private data or fake dashboard |
| New Player, no history | Quick Quest | Optional calibration and guided entry, explore Codex or start a Workbook/Studio project |
| Guest with recognized valid Player identity | Resume / Quick Quest according to activity | Nonblocking “Protect your progress” with real recovery explanation; never expose protected personal data from another identity |
| Returning Player, open Journey | Continue in saved stage | Current focus, training rationale, recent work, Skill Map preview |
| Returning Player, no open Journey | Quick Quest or clearly identified recommendation | Saved/recent material, open Studio project, history |
| Active resumable Session | Resume Session | actual Quest/stage, last accepted timing state, no conflicting new session action; end/abandon path per contract |
| Loading/unavailable | Retry / safe entry | Skeleton or explicit state; do not display demo metrics or pretend no history |
| Pending unsaved editor work | Return to work / resolve save | Avoid remount/navigation data loss, distinguish server acceptance |

Do not automatically create a Player, Quest, Session or page simply from dashboard rendering. Signed-out status differs from a valid anonymous Player. Active Session priority follows accepted lifecycle/recovery contracts. No automatic skill gain from visiting Home, reading or creating work.

## 4. Navigation and adaptive layouts

One global shell throughout major surfaces, with a collapsible rail on desktop and focused modes where appropriate. Use logo/wordmark that remains recognizable at small sizes; final logo not approved yet. Preserve direct route access and browser Back. Desktop Home shows immediate task priority before secondary cards. Laptop widths reduce card columns before shrinking legible type. Mobile: compact header/account, single-column hero, Quick Quest beside/below resume, then training, skills, recent Workbooks and Studio. Five proposed persistent destinations: Home, Quests, Skill Map, Codex, Workbooks; Training and Composer Studio always reachable from menu and relevant Home cards. Test whether Studio should displace another bottom shortcut or remain under More for composition-focused users. Minimum touch area 44px, keyboard/focus, reduced motion, text reflow and no page-level horizontal overflow. Avoid hover-only navigation and duplicate sidebars.

## 5. Public landing

More cinematic than working dashboard but clearly same brand. Hero: “Discover your musical potential” and concise proposition linking structured learning, practice and creation. Start playing and Sign in actions. Show a truthful overview of Quest / Skill Map / Workbook, and clearly label future Composer Studio capabilities where not shipped. No invented testimonials, efficacy claims, prices, or feature-complete promises. Existing launch gating remains in force. Public route/identity resolver must be designed separately; no auth/routing changes here.

## 6. Components and assets to carry into D3–D6

Reusable shell, active navigation row, context header, primary and secondary actions, Quest hero, recommendation summary, graph preview, cover tile, recent project tile, empty/guest/session states. Shared tokens from D1; accessible text and control borders; art is optional/decorative when information is elsewhere. Hero, terrain and notebook art should be generated as separate text-free assets for eventual implementation; do not use a flattened UI image as the app. Asset license/provenance, image crop, responsive variants and accessibility review required. Future guitar-avatar skins and achievements can fit the account/development areas without creating another dominant dashboard panel; remain deferred.

## 7. Design review

Compare returning desktop with mobile and alternate identity/session states. Ask: can a player identify the current stage and resume immediately? Is Quick Quest obvious? Can a composer enter Studio independently? Are recommendations explainable and distinguished from proficiency? Can a new/guest Player understand their options without fictional progress? Are the same actions discoverable on narrow screens? The preferred reference has strong atmosphere; reduce ornament if it interferes with these tasks. No definitive UI approval, no production assets, code, data, auth, progression or deployment changes. Next D3 Skill Map & Development after review. E remains the interactive high-fidelity prototype; F migration plan.
