# EVD-001 — Completion & Evidence Contract

- Status: Accepted
- Ticket: EVD-001
- Date: 2026-09-27
- Depends on: QST-001, DIF-001, PLY-001
- Applies to: GuitaRPG v1 Quest results, criterion evidence, and verification semantics

## Purpose

Define what it means for a Player to abandon, attempt, partially complete, or clear a Quest, and define how evidence is recorded without conflating:

- outcome
- verification mode
- evidence confidence
- Player reflection
- Skill proficiency
- XP/rewards
- mastery

The core rule is:

> Completion describes what happened. Verification describes how the claim is supported.

Neither one substitutes for the other.

## 1. Result record

A Quest Result is a durable record of one Player's outcome for one Quest attempt.

A Result must be able to reference:

- result ID
- player ID
- Quest ID
- session/attempt ID where available
- Quest schema/version
- difficulty model/version used for the attempt where available
- outcome
- criterion results
- evidence records
- verification summary
- timestamps
- evidence model/version

The Quest itself remains immutable.

A second attempt creates a second Result.

## 2. Canonical outcome states

Exactly four canonical v1 outcomes exist:

- ABANDONED
- ATTEMPTED
- PARTIAL
- CLEARED

These states are ordered by completion status, not by human worth, effort, or skill.

### ABANDONED

The attempt ended before satisfying the Quest's meaningful-attempt rule.

Examples:

- the Player opened the Quest and quit almost immediately
- the Player stopped before the minimum meaningful-practice threshold
- no useful attempt evidence was recorded

Rules:

- ABANDONED is not a failure label
- minimal interaction may still be retained for history
- it normally contributes little or no proficiency evidence
- exact XP treatment is deferred to PROG-001

### ATTEMPTED

The Player performed meaningful Quest activity but did not satisfy enough of the Objective to count as PARTIAL or CLEARED.

Examples:

- practiced for the required minimum attempt time but did not meet any required completion criterion
- completed a real attempt with insufficient success toward the Objective
- generated useful exposure despite missing the target

Rules:

- ATTEMPTED is legitimate practice
- it may increase exposure
- it may produce negative/limiting evidence about current capacity
- it is not equivalent to "nothing happened"

### PARTIAL

The Player made meaningful progress toward the Objective but did not satisfy the full clear rule.

Typical basis:

- at least one required criterion is MET while another required criterion is NOT_MET or UNKNOWN
- a structured progress threshold is reached when the Quest defines one
- the Player completes a meaningful subset of a multi-part Objective

Rules:

- PARTIAL is stronger completion evidence than ATTEMPTED
- PARTIAL does not mean the Quest was cleared
- PARTIAL can occur under any verification mode

### CLEARED

The Result records that all criteria required by the Quest's clear rule are satisfied.

Rules:

- all required Objective criteria must resolve to MET
- SELF-reported criterion satisfaction can support a valid CLEARED result
- CLEARED does not imply mastery
- CLEARED does not automatically promote Skill Level
- CLEARED does not require microphone/direct-audio/app verification
- evidence confidence may vary independently

## 3. Criterion-result states

Each required Objective criterion resolves to one of:

- MET
- NOT_MET
- UNKNOWN
- NOT_EVALUATED

### MET

Available evidence or valid self-attestation supports satisfaction of the criterion.

### NOT_MET

Available evidence supports that the criterion was not satisfied.

### UNKNOWN

The Result has meaningful activity, but available evidence cannot determine whether the criterion was satisfied.

### NOT_EVALUATED

The criterion was intentionally not evaluated for this Result.

This may occur for an abandoned attempt or unsupported optional instrumentation.

For a Result to be CLEARED, every required criterion must be MET.

## 4. Outcome derivation

Outcome should be deterministic from the attempt state plus criterion results wherever possible.

### Required rules

1. If the meaningful-attempt rule is not satisfied → ABANDONED.
2. If the meaningful-attempt rule is satisfied and all required clear criteria are MET → CLEARED.
3. If the meaningful-attempt rule is satisfied, not all required criteria are MET, and meaningful partial progress is established → PARTIAL.
4. Otherwise, after meaningful attempt → ATTEMPTED.

### Partial-progress rule

For v1, partial progress may be established when:

- at least one required criterion is MET while full clear is not achieved, or
- the Quest explicitly defines a structured partial threshold later

A single UNKNOWN criterion does not automatically make a Result PARTIAL.

## 5. Verification modes

Canonical v1 modes:

- SELF
- SESSION
- AUDIO_ASSISTED
- DIRECT_AUDIO
- APP_VERIFIED

Verification modes describe evidence source/method.

They are not outcome states.

### SELF

Player attestation.

Examples:

- "I completed eight clean reps"
- "I stayed within the fret-range restriction"
- "I created three clearly different interpretations"

SELF is valid evidence.

Rules:

- may support CLEARED
- must be identified as player-attested
- cannot be silently relabeled as system-verified
- may carry lower confidence for some criteria than instrumented evidence
- is often the only semantically appropriate evidence for qualitative/creative criteria

### SESSION

Evidence from session instrumentation that does not analyze musical audio/content.

Examples:

- timer duration
- metronome setting
- recorded repetition button presses
- app workflow completion
- session start/stop telemetry

Rules:

- SESSION can strongly verify participation/time/configuration
- SESSION does not prove musical correctness merely because the app was open
- a 10-minute timer cannot prove that notes were correct or picking was clean

### AUDIO_ASSISTED

Evidence inferred from microphone audio.

Potential supported measurements:

- pitch
- onset timing
- tempo consistency
- note activity
- limited monophonic expected-note/rhythm matching

Rules:

- microphone remains optional
- unsupported/ambiguous audio must produce UNKNOWN rather than fabricated certainty
- AUDIO_ASSISTED does not verify physical technique, fingering, posture, pick direction, emotional intent, or other visually/physically hidden behavior
- raw audio is not retained by default under DATA-001

### DIRECT_AUDIO

Evidence inferred from direct guitar/interface audio input.

Rules:

- may offer cleaner signal than microphone input
- is still limited to what audio can actually reveal
- does not prove physical technique/posture/fingering merely because signal quality is high
- is optional and never required for the core Quest loop

### APP_VERIFIED

Deterministic or structured verification produced directly by app interaction.

Examples:

- flash-card answer correctness
- interval-identification response
- theory construction answer
- exact input validation
- deterministic rhythm-grid entry grading

Rules:

- strongest only for criteria the app can directly and validly grade
- does not imply that unrelated performance criteria were verified
- browser/user input must not be allowed to forge APP_VERIFIED source authority

## 6. No global verification hierarchy

There is no universal rule:

> APP_VERIFIED > DIRECT_AUDIO > AUDIO_ASSISTED > SESSION > SELF

for every criterion.

Verification strength is **criterion-specific**.

Examples:

- SESSION may be high-confidence evidence for practice duration.
- APP_VERIFIED may be high-confidence evidence for a flash-card answer.
- AUDIO_ASSISTED may be high-confidence evidence for pitch but irrelevant to finger placement.
- SELF may be the most appropriate evidence for expressive interpretation or whether a physical technique instruction was followed when no camera/physical sensor exists.

Therefore every criterion evidence record carries its own confidence.

## 7. Evidence confidence

Criterion evidence uses:

- LOW
- MODERATE
- HIGH

Confidence represents how strongly the evidence source supports the specific claim.

It does not represent:

- outcome quality
- Player self-confidence
- Skill proficiency
- Quest difficulty

### Examples

- SELF claim of clean alternate picking: valid, often LOW or MODERATE
- SESSION timer for 600 seconds: HIGH for duration
- APP_VERIFIED correct theory response: HIGH for answer correctness
- microphone detection with ambiguous polyphony: LOW or UNKNOWN criterion state
- direct audio accurate pitch detection: potentially HIGH for pitch only

Exact numeric evidence weighting is deferred to PROG-001.

## 8. Evidence record

Each evidence item must be able to store:

- evidence ID
- result ID
- criterion identifier/metric
- verification mode
- criterion state
- observed/asserted value where applicable
- unit
- evidence confidence
- source authority
- captured/recorded timestamp
- detector/evaluator version where applicable
- optional rationale/notes
- raw-artifact reference only if a future explicitly authorized feature stores one

Source authority values:

- PLAYER
- SESSION_SYSTEM
- AUDIO_ANALYZER
- DIRECT_AUDIO_ANALYZER
- APP_GRADER

Only trusted app/server logic may issue non-PLAYER source authority.

## 9. Criterion-level mixed evidence

One Result may use multiple verification modes.

Example for DORIAN CROSSROADS:

- practice_duration → SESSION / HIGH
- target_tempo → SESSION / HIGH
- constraint_compliance → SELF / MODERATE

The Result can still be CLEARED if all required criteria are MET.

Therefore a Result stores:

- criterion-level evidence
- a set of verification modes used
- optional overall evidence-confidence summary

It must not collapse mixed evidence into a misleading single "verified/unverified" boolean.

## 10. Result-level evidence confidence

A Result may expose an overall summary:

- LOW
- MODERATE
- HIGH
- MIXED

This is presentation/progression metadata.

Rules:

- MIXED is appropriate when important criteria have materially different evidence confidence
- overall confidence does not change the recorded outcome
- CLEARED + LOW is valid
- ATTEMPTED + HIGH is valid
- PARTIAL + HIGH is valid
- ABANDONED + HIGH participation evidence is valid

PROG-001 determines how Result evidence confidence influences proficiency confidence.

## 11. Outcome and verification independence

The following are all valid:

- CLEARED + SELF
- CLEARED + APP_VERIFIED
- PARTIAL + AUDIO_ASSISTED
- ATTEMPTED + APP_VERIFIED
- ABANDONED + SESSION

A higher-confidence verification mode can prove that the Player did **not** clear the Quest.

A lower-confidence mode can validly record that the Player reports a clear.

## 12. Self-report integrity

The app must not shame or visually invalidate SELF evidence.

Recommended UI language:

- Self-reported
- Session recorded
- Audio assisted
- Direct audio assisted
- App verified

Avoid labels such as:

- fake
- unverified failure
- illegitimate
- low-quality player

The distinction exists to calibrate evidence confidence, not to rank the Player's legitimacy.

## 13. Unsupported verification

If a verification system cannot validly evaluate a criterion:

- criterion state must remain UNKNOWN or use another valid evidence source
- the system must not infer success from nearby measurements
- the system may ask for SELF attestation

Example:

Microphone audio may verify 90 BPM timing but cannot verify "use hybrid picking."

The hybrid-picking compliance criterion may therefore use SELF evidence while tempo uses AUDIO_ASSISTED.

## 14. Evidence and Skill roles

A Quest may train:

- Primary Skill
- Secondary Skills
- Required Techniques

A Result does not automatically grant equal evidence to all referenced Skills.

EVD-001 records the attempt/evidence facts.

PROG-001 determines:

- which Skills receive evidence
- evidence weight by Skill role
- outcome/difficulty/verification contribution
- confidence changes
- promotion/demotion behavior

Required Technique participation is not automatically equivalent to Primary Skill assessment.

## 15. Evidence and difficulty

The Result should retain/reference the Quest's historical absolute difficulty profile and any player-relative difficulty snapshot used for the attempt.

Rules:

- outcome does not rewrite Quest difficulty
- evidence may later inform future calibration
- a Cleared Level IV personal Stretch Quest may be more informative than a Cleared Level I Very Comfortable Quest, but weighting belongs to PROG-001
- difficulty and verification remain independent inputs

## 16. Evidence and exposure

Meaningful ATTEMPTED, PARTIAL, and CLEARED Results may all contribute to Skill exposure.

ABANDONED Results may contribute little/no exposure depending on actual meaningful activity.

Exposure is not proficiency.

Exact exposure accounting belongs to PROG-001.

## 17. Evidence and XP

EVD-001 never assigns XP.

Results provide inputs such as:

- actual meaningful practice
- outcome
- criterion performance
- evidence confidence
- difficulty snapshot

PROG-001 determines XP.

A legitimate ATTEMPTED or PARTIAL result may still earn practice XP.

## 18. Evidence and mastery

No single Result has a MASTERY outcome.

Canonical outcome states stop at CLEARED.

Mastery belongs to Player Skill proficiency under PLY/PROG and requires accumulated evidence.

A Quest Result must never store:

- MASTERED
- FAILED_MASTERY
- SKILL_LEVEL_UP as the outcome

Progression events are separate derived records.

## 19. Reflection

Player reflection may be attached to a Result/session, for example:

- TOO_EASY
- GOOD_CHALLENGE
- TOO_HARD
- notes

Reflection is player-authored input.

It may later influence readiness/recommendations/progression calibration, but it cannot directly overwrite:

- criterion evidence
- outcome
- proficiency
- system confidence

Exact reflection schema belongs to SES/PROG implementation.

## 20. Corrections

Because SELF evidence is valid, Players may need to correct accidental self-report mistakes.

Corrections should preserve auditability.

A corrected Result should retain:

- original value/outcome where practical
- correction timestamp
- correction source
- current effective value

Instrumented evidence issued by trusted analyzers/graders must not be silently converted into PLAYER evidence.

Exact correction UX/audit implementation is deferred.

## 21. Security boundary

Under DATA-001:

Players may submit:

- SELF evidence
- reflection
- notes
- permitted manual metrics

Players may not directly forge:

- SESSION_SYSTEM source authority
- AUDIO_ANALYZER source authority
- DIRECT_AUDIO_ANALYZER source authority
- APP_GRADER source authority
- detector versions
- trusted system timestamps

System-authoritative evidence claims must be produced by trusted application logic.

## 22. Audio/privacy boundary

EVD-001 inherits DATA-001:

- raw microphone/direct-input audio is not retained by default
- persisted evidence should prefer derived measurements
- future raw-audio retention requires an explicit product/privacy/storage contract
- evidence records may store analyzer version and derived metrics without storing the raw recording

## 23. DORIAN CROSSROADS examples

### Self-reported clear

- practice_duration: MET via SESSION / HIGH
- target_tempo: MET via SESSION / HIGH
- constraint_compliance: MET via SELF / MODERATE
- outcome: CLEARED
- overall evidence confidence: MIXED

Valid.

### Audio-assisted partial

- practice_duration: MET via SESSION / HIGH
- target_tempo: MET via AUDIO_ASSISTED / HIGH
- constraint_compliance: UNKNOWN
- outcome: PARTIAL only if another required criterion is established as MET and the result satisfies partial-progress rules; otherwise ATTEMPTED
- overall confidence: MIXED

### High-confidence non-clear

- practice_duration: MET via SESSION / HIGH
- target_tempo: NOT_MET via AUDIO_ASSISTED / HIGH
- constraint_compliance: MET via SELF / MODERATE
- outcome: PARTIAL
- overall confidence: MIXED

High-confidence evidence does not force a positive outcome.

## 24. Required implementation invariants

Future implementation/tests must prove:

- only four outcome states exist
- CLEARED requires every required criterion = MET
- SELF evidence can support CLEARED
- verification mode never directly determines outcome
- APP_VERIFIED can coexist with ATTEMPTED
- SESSION does not imply musical correctness
- unsupported audio criteria resolve UNKNOWN rather than guessed
- evidence confidence is criterion-specific
- non-PLAYER source authority cannot be forged by ordinary client writes
- one Result may contain mixed verification modes
- no MASTERY outcome exists
- Result does not embed proficiency or XP mutations
- Result references rather than rewrites Quest/difficulty history

## 25. Deferred decisions

EVD-001 does not finalize:

- numeric evidence weighting
- Skill-role evidence multipliers
- proficiency update formulas
- XP formulas
- readiness update formulas
- exact audio detector thresholds
- correction UI
- detailed session telemetry schema
- artifact/video/camera evidence
- teacher verification
- social proof/review

Those belong to PROG, SES, AUD, and later tickets.

## Acceptance evidence

- four outcomes defined: PASS
- criterion-result states defined: PASS
- deterministic outcome rules defined: PASS
- five verification modes defined: PASS
- criterion-specific verification principle defined: PASS
- evidence confidence defined: PASS
- mixed-mode Result support defined: PASS
- SELF clear explicitly valid: PASS
- outcome/verification independence defined: PASS
- evidence/proficiency/XP/mastery boundaries defined: PASS
- security/source-authority boundary defined: PASS
- audio privacy boundary preserved: PASS
- DORIAN CROSSROADS evidence examples defined: PASS
- machine-readable fixtures created: PASS

## Terminal disposition

**EVD-001 — COMPLETE**

The Completion & Evidence contract is accepted.

Next dependent ticket: **PROG-001 — Progression Contract**.
