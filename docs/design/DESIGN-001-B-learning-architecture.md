# DESIGN-001-B — Learning Architecture & Neuroscience-Informed Training

Revision 0.1 | 2026-11-25 | DRAFT — PRODUCT REVIEW, NOT IMPLEMENTATION AUTHORITY
Parent: DESIGN-001-A (ca8a1c0031e0a31055e00f689915aa542b853104).
Scope: evidence-informed design target for Sound Uncharted; not a systematic review, validated guitar-learning algorithm, clinical product or architecture amendment.

## 1. Learning objective

Help players develop durable, flexible musicianship rather than maximize task completion or practice volume. Train knowledge, perception, motor execution and creative application together when useful, isolate bottlenecks when needed, and revisit skills over time. Observable performance during training is not equivalent to learning. Retention and transfer must be measured separately. Preserve the immediate one-action Quick Quest, player autonomy and optional unassessed music-making.

## 2. Research-to-design register

Evidence strengths describe the cited literature and applicability, not a formal GRADE assessment. No universal success percentage, dose, age-based limit, repetition count or myelination threshold is scientifically established for our guitar tasks.

| Principle | Evidence and limits | Proposed product behavior |
| --- | --- | --- |
| Retrieval | [1,2] Strong general memory evidence; direct guitar motor effects are not implied. | Prompt recall before reveal; distinguish cued from uncued performance; provide corrective feedback. |
| Spacing | [1,3] Strong general support; small musician keyboard study supports distributed sessions, not a universal interval. | Offer brief delayed checks; optional review queue; never reduce proficiency solely for missed review. |
| Performance vs learning | [4] Acquisition measures can diverge from delayed retention/transfer. | Separate practice-session improvement from delayed independent performance and novel context. |
| Appropriate challenge | [5] Challenge Point Framework relates task difficulty to skill; conceptual model, not a universal target success rate. | Calibrate; adjust one controllable dimension first, preserve goal and uncertainty. |
| Targeted practice | [6,7] Small pianist study associates practice strategy/accuracy with next-day retention; deliberate practice explains some, not all, performance variation. | Identify specific errors, isolate short passages, correct, then reintegrate; avoid hours-as-mastery. |
| Interleaving | [8,9] 2024 transfer meta-analysis favors random practice overall; applied effect uncertain; small music literature. | Begin with enough blocked practice to understand a task; introduce related variants when meaningful; test guitar-specific benefit. |
| Auditory-motor learning | [10] Study of 56 guitarists and 59 pianists found listening/sound-related benefits dependent on experience and musical dimension. | Listen, sing/hum optionally, anticipate, play and compare; offer audio/visual alternatives; don't conflate listening with performing. |
| Focus/feedback | [11,12] Broad motor evidence favors external focus; music-specific review finds no consistent superiority of one focus. | Prefer useful musical targets; offer targeted technique cues when needed; compare feedback-on and feedback-off performance. |
| Plasticity/consolidation | [13,14,15] Motor learning relates to functional/structural plasticity, including adaptive myelination; evidence includes animal research; sleep effects vary by task and design. | Encourage sustainable practice and revisiting after rest. No neurological scores, fixed myelin dose, sleep tracking requirement or medical claims. |
| Technology-assisted feedback | [16] Instrumental-feedback literature is heterogeneous; measures are not synonymous with musicianship. | Validate each sensor criterion; prefer actionable observations, uncertainty and independent checks over universal quality ratings. |

## 3. Repository audit and preserved authority

Read against DESIGN-001-A baseline. TAX-001 defines six domains and typed edges. Current canonical JSON contains 216 entities (72 Skills, 64 Concepts, 31 Contexts, 30 Constraints, 11 Attributes, 6 Domains, 2 Tags); 72 canonical BELONGS_TO edges, with a separately declared 141-edge Skill-to-Attribute AFFECTS graph. Neither constitutes a complete prerequisite network. Codex V2 preview contains 9 skill entries and 114 draft modules; editorial relationships have scope and review status (examples PROPOSED). Do not elevate editorial suggestions into hard dependencies. TRN-001/004 currently document 15 generator-capable Primary Skills; the remaining 57 are not incapable players, merely outside current generator coverage. Full graph/content/Quest coverage is future work.

Existing contracts (retain):
- PLY-001: UNRATED/ESTIMATED/ESTABLISHED, I–V player-specific proficiency; system confidence != self-confidence. Unknown != zero. Recency/readiness != historical capability.
- DIF-001/002/003: separate absolute demand (7 dimensions: technique, fretboard, theory, rhythm, creative, tempo, constraint) from personal challenge I–V (Very Comfortable, Comfortable, Target, Stretch, Overreach) and evaluation status.
- EVD-001/PROG-001: Session/Result evidence authority; four outcomes ABANDONED, ATTEMPTED, PARTIAL, CLEARED. XP rewards effort, not proficiency. Self-report valid; timer does not verify musical correctness. JRN-000/QST-005: opening, editing and associating documents or completing a Journey does not create proficiency evidence.
- PROG-003 PROF_V1/CONF_V1: Primary Skill receives informative evidence; Secondary/Required Technique exposure-only in current implementation. Establishment requires >=3 informative Results across >=2 Sessions, confidence >=60 and no recent contradiction. Bounded update ±8, repeated easy clear attenuation, established band crossings require corroboration. These are versioned engineering heuristics, not scientifically validated thresholds.
- PROG-004 READY_V1: elapsed recency <=7 days HIGH factor 1.0, >7 to <=30 MODERATE .8, >30 LOW .6, UNRATED UNKNOWN. This is a recency proxy, not observed memory decay or physiological preparedness.
- TRN_SCORE_V1: deterministic relative-priority heuristic: intent need 30, proficiency need 20, evidence need 15, goal alignment 20, rotation need 15 max points. TRN_ADAPT_V1 selects a concrete variant using preferred challenge band, gap, uncertainty; UNRATED falls back to BASE with unknown personal difficulty. No new weighting authorized here.

Design gap: current models observe bounded Results, not independent retention schedules, application-specific outcomes or sensor-derived metrics across all 72 Skills. Retain current math as baseline. Add any new metric/scheduling logic only through versioned contracts, explicit validation and migration review.

## 4. Musical learning graph

Canonical identity: Domain -> Skill; Concepts are musical material, Contexts are conditions, Constraints bound task demands. Player proficiency attaches only to Skill. Multiple applications (aural, theory, fretboard, rhythm, improvisation, composition) are instructional facets, not duplicate canonical Skills or independently rated states by default. Each Skill can be trained at many demand levels. Codex lesson level (foundational/intermediate/advanced) is a content difficulty label, not equivalent to proficiency I–V or a gating condition.

Relationship presentation:
- BELONGS_TO: primary domain cluster.
- SUBSKILL_OF: structural decomposition, acyclic; not automatically a teaching order.
- REQUIRES: direction dependent -> prerequisite; use sparingly with explicit rationale and relevant application/conditions, no automatic unlock until contract and evidence support it.
- SUPPORTS: source -> beneficiary; useful foundation, alternative path possible.
- RELATED_TO: informational, symmetric.
- AFFECTS: Skill -> Attribute; do not render as prerequisite or award.
- Codex RECOMMENDED_FOUNDATION, RELATED, DEVELOPS_TOWARD: scoped editorial relationships, preview/proposed unless approved; separate layer from authoritative taxonomy. Canonical edge approval requires musical SME review, stable IDs, rationale, examples/counterexamples, review/version history and cycle checks. No inferred ability propagation along edges.

Example from draft Scale-Degree Recognition entry: Note Location recommended for fretboard/foundational; Interval Recognition recommended for aural/intermediate; Scale Mapping related; Scale Application develops-toward for advanced improvisation. Major Scale (Concept) and Tonal Center (Context) are supporting knowledge, not rated skills. The prototype visual may show Note Location and Interval Recognition feeding Scale-Degree Recognition, then Scale Application; label as recommended relationships, not proven dependency or gate. Another route teaches degree recognition by ear before fretboard fluency. Triad Construction can support Voice Leading; exact scope remains editorial.

Map UI:
- Default 2D overview of six domains with semantic zoom from domain -> skill neighborhood -> skill detail; no 72-node hairball on mobile. Search, filters, accessible list/tree alternative, stable labels and clear relationship legend.
- Separate visual channels for domain identity, player proficiency, confidence status, recency/readiness and suggested next activity. Unrated node remains neutral and available; missing evidence is not red failure. Show where you are, what it supports, why it matters, and a contextual Try exercise / Train skill action if supported.
- A future 3D/spatial graph is an alternative presentation of the same graph, not its data authority; optional AR/VR, spatial overlays and richer analytics parked under SPATIAL / advanced feedback R&D. Require validated utility, accessibility, latency, privacy and safety; no implementation dependency or headset requirement.

## 5. Learning unit and adaptive loop

Separate a learning activity (versioned instructional design with explicit targets) from a Quest (immutable generated/resolved challenge), Session (one attempt), Result (accepted evidence), Workbook (private musical material). A learning activity may suggest a Quest or support a Session, but reading/clicking/importing never grants proficiency.

Proposed activity metadata: canonical primary skill ID; supporting skill IDs; application/learning objective; concept/context/constraint IDs; lesson revision; goal, instructions, example and common errors; stimulus/expected response, target criterion, tolerance and units; permitted adaptations; assistance level; evidence mode and source; transfer-variant family and retention-check suitability; accessible alternatives and editorial review. Distinguish example generation from verified evidence. Extend only after review; do not introduce a second progression store.

Typical loop (flexible):
1. Orient: explain goal and why; optional quick recall/baseline without hints.
2. Demonstrate: short model or listen/visualize, if needed.
3. Isolate: reduce load to one meaningful bottleneck; repeated attempts with specific correction.
4. Integrate: combine it with the larger phrase or musical context.
5. Vary: change key/string set/rhythm/context while preserving the target, when appropriate.
6. Reflect: one brief self-assessment; record only actual measurements.
7. Revisit: later unaided check of same task (retention) or comparable novel task (transfer); no forced review or streak penalties.

Do not require all seven steps for each Quest. Player can enter any MEC mode, skip supports, select unassessed exploration, use alternate accessibility modality, or Quick Quest immediately.

## 6. Adaptive policy proposal (prototype, NOT active algorithm)

Use accepted priority and challenge resolver for existing candidates. Future policy proposes separate decision axes: intent (calibrate/develop/review/transfer/maintain/free exploration), instructional facet, challenge adjustment, feedback/scaffolding and review scheduling. Show recommendation rationale and alternatives, including why unknown. Goal alignment and player time/preferences constrain selection; don't rank skills solely by low level.

| Observation | Suggested action | Guardrail |
| --- | --- | --- |
| No reliable evidence | Offer calibration at manageable demand | No fabricated rating or prerequisite block |
| Repeated correct but slow with hints | Remove/reduce hint or simplify then retest | Change one variable; preserve accuracy |
| Stable independent performance on target | Offer stretch in one demand dimension or a comparable new variant | No universal 80/85/90% rule; task-specific criterion |
| Repeated error/poor control | Reduce tempo/range/complexity, isolate problematic part, model correct response | Do not simply repeat mistakes or increase repetitions |
| Good practice, poor delayed check | Recommend focused refresh and earlier follow-up | Do not equate temporary difficulty with lost mastery |
| Good retention, poor transfer | Vary context and practice applying principle | Distinguish familiar material from generalized skill |
| Self-reported fatigue/discomfort | Rest, stop or switch to comfortable/mental study | Pain => stop rather than push; no diagnosis |
| Evidence conflicting/poor sensor quality | Ask for another representative observation or self-report | UNKNOWN; don't penalize based on invalid signal |

Examples of independently adjustable task variables: notes/frets/strings, chord voices, rhythm subdivision, response window, tempo, passage length, unfamiliar context, simultaneous constraints and hint availability. A target change that changes immutable Quest criteria creates a new canonical variant, not a silent edit. Practice controls may change allowed settings; preserve original criteria and actual settings in evidence.

## 7. Retention and transfer: proposed review policy

Maintain opt-in review opportunities, not mandatory daily work. A scheduling record is a recommendation, not a Result or rating. A delayed check should use the same or equivalent criterion, no answer-revealing cue, no immediately preceding rehearsal, and elapsed time plus intervening practice documented where known. Transfer changes material/context with comparable demand; record novelty/assistance separately and do not overclaim generalization.

Prototype example: first revisit in 1–2 days, then about 4–7 days after an independent success, then 2–3 weeks; adapt to observed performance, time preference, missed sessions and task type. These intervals are illustrative engineering defaults to test, not scientific prescriptions or guarantees. Poor/assisted attempt -> practice/support and earlier revisit; invalid/unknown -> no schedule penalty; player can defer/skip. Distinguish review due from READY_V1 recency classification. Do not create or revise proficiency via scheduler; accepted Result pipeline remains sole authority until explicitly amended.

A future schedule should record policy version, source Result/activity revision, last independent check, planned/due date, actual completion, assistance/context, postponement and reason. No physiological inference or unnecessary health data.

## 8. Measurement and analytics

Prioritize meaningful measurements over composite scores. Show numerator/denominator, units, actual difficulty, modality, sample size, date, missingness and support conditions. Compare like with like; avoid comparing accuracy across materially different demands without qualification.

| Signal | Feasible source | Interpretation / limit |
| --- | --- | --- |
| Time, tempo setting, repetitions reported | Current Session instrumentation | Participation/settings, not correct guitar playing |
| Criterion status and reflection | Current self-report and Result | Valid qualitative evidence; distinguish self-report from instrument sensing |
| Correct answers and response latency | Future scored interactive note/interval/degree/chord tasks | Observable in-app retrieval; not acoustic or motor proficiency |
| Onsets, pitch deviation, matched note events | Future optional calibrated mic/direct-audio for supported monophonic tasks | Noise, latency, octave mistakes, bends, polyphony and tuning cause uncertainty; no pick direction/fingering detection |
| Consistent clean tempo | Player-reported or validated task-specific repeated performance | Accuracy/control at actual tempo, not maximum speed alone |
| Retention | Future delayed independent criterion check | State elapsed interval and intervening practice; avoid invented forgetting curves |
| Transfer | Future comparable unfamiliar key/string-set/phrase task | Specific tested context only; not all musical settings |
| Tone, expression, creative quality | Player reflection or teacher rubric (future) | Do not automatically judge artistic value from acoustic metrics |
| Physical technique | Future optional camera/sensor/AR with separate consent and validation | Occlusion, tracking and instrument geometry limitations; audio alone cannot determine technique |

Feedback timing: offer immediate simple correctness when useful; summarize patterns after a small block, invite player to notice sound/feel before revealing details, and provide an independent check without overlays. Music-specific attentional cues should be tested; avoid a universal instruction rule. Keep player confidence separate from model confidence. Use honest wording: “7 of 10 responses correct, no hints” not “70% mastery.”

Potential future analytics: accuracy vs time/tempo, first-attempt recall, independent vs supported results, variability, error categories, retention checks, context coverage and evidence timeline. No brain efficiency, myelin progress, neurological score, global talent rating, speculative skill gains or forced comparisons. No raw audio retention by default; optional recording has separate ownership, consent, export/deletion and retention policy. Never treat mic refusal as poorer ability.

## 9. Example across MEC and training

Fictional player scenario from DESIGN-001-A: Melodic Navigation, Primary Skill Scale-Degree Recognition, C major/standard tuning. Exact exercises/criteria below are prototype, not production generator claims.

Map: explain tonic and degrees; show note location and interval recognition as recommended foundations, not hard locks. Choose existing draft lesson sdr.aural.f1 “Hear the tonal home.” The lesson may be opened independently; selecting does not automatically create a Workbook.

Explore: listen to a tonic reference and short phrase; identify degree 1/3/5 without visible answers, reveal after response. Then locate the sound on the guitar; compare selected labels to actual pitch by ear or future optional sensing. Prototype results: 8/10 degree prompts correct, two errors involving 3 vs 5, no hints. Suggest distinguishing these two sounds before expanding the set. Save a useful exercise or phrase to chosen Workbook only after an explicit action and accepted link.

Craft: use degrees 1/3/5 to create a two-bar motif and an answer, preserve personal expression; optional self-check asks whether intended destinations were heard. Do not score creative quality or grant XP for saving the composition.

Practice: choose a task-specific criterion and bounded Session; track actual repetitions/settings separately from evidence. Reflection: what was hard? Were targets heard before playing? Record supported/independent context. Later check same degree set unaided, then a different tonic (G major) with comparable task. Passing C major alone does not prove all keys.

Design example UI: “Current focus: hear degrees 3 and 5. Why: two independent prompt errors. Next: compare the sounds, then retry without hints.” Show “Retest suggested tomorrow” only if scheduler is implemented or explicitly fictional in prototype. A graph edge never auto-increases another Skill.

## 10. Validation program and implementation slices

Prioritize design and prototype, not production changes now.
- B1 learning graph audit: inventory all canonical and draft scoped edges, SME review, reconcile semantics and identify content gaps by actual generator/lesson coverage. No arbitrary unlock tree.
- B2 evidence design: scored retrieval tool pilots, criterion-specific rubrics, test fixtures for valid/invalid/assisted/unknown evidence, calibrate latency and context, review accessibility.
- B3 review policy pilot: simple opt-in scheduling, delayed tests and transfer activities; compare baseline vs proposed policy with matched time and difficulty.
- B4 adaptive policy experiments: blocked then varied vs alternative schedules, feedback timing, goal alignment, compare delayed independent learning rather than engagement alone. Include different experience levels and age groups if recruited with appropriate consent. Do not infer ability from age.
- B5 optional acoustic feedback: monophonic task benchmarks against annotated recordings/teacher reference, measure pitch/onset accuracy, false positives, uncertain/rejected cases, devices/noise/latency. Do not ship unreliable automated grading.
- B6 longer-term advanced analytics and spatial computing R&D; validate incremental utility over ordinary 2D workflows.

Private beta: show existing trustworthy measures and explanation; test whether participants understand unknown/estimated status, why a Quest is recommended, how to capture/revisit material. Future learning experiments use matched comparison groups or within-subject counterbalanced tasks, equal practice dose, predefined primary delayed outcome (e.g., 7-day independent correct response rate under identical criterion), separate transfer measure, record prior experience/assistance/intervening practice, missing data and attrition, uncertainty intervals and adverse/frustration reports. Self-selection, sensor reliability and novelty are confounds. No invented sample-size power or universal success threshold: baseline variance and meaningful effect determine design. Report null results; version and rollback policies. No educational efficacy claims before validation.

DESIGN-001-C should turn this into usable surfaces: Home resume/review, Training recommendation rationale, Skill Map, MEC, practice feedback, reflection, Workbook context and progress detail. Label all synthetic metrics and future controls in prototype. Preserve optional Quick Quest, user autonomy, stable IDs, immutable history and current CI/release gates. No app/database changes, production merge, or alphaTab/AR integration in this draft.

## 11. Research references

[1] Dunlosky et al. (2013), Improving Students' Learning With Effective Learning Techniques. https://doi.org/10.1177/1529100612453266
[2] Roediger & Karpicke (2006), Test-Enhanced Learning. https://doi.org/10.1111/j.1467-9280.2006.01693.x
[3] Simmons (2012), Distributed Practice and Procedural Memory Consolidation in Musicians' Skill Learning. https://doi.org/10.1177/0022429411424798
[4] Soderstrom & Bjork (2015), Learning Versus Performance. https://doi.org/10.1177/1745691615569000
[5] Guadagnoli & Lee (2004), Challenge point framework. https://pubmed.ncbi.nlm.nih.gov/15130871/
[6] Duke, Simmons & Cash (2009), It's Not How Much; It's How. https://doi.org/10.1177/0022429408328851
[7] Macnamara et al. (2014), Deliberate practice and performance meta-analysis. https://pubmed.ncbi.nlm.nih.gov/24986855/
[8] Contextual interference on transfer in motor learning (2024 systematic review/meta-analysis). https://pubmed.ncbi.nlm.nih.gov/39205981/
[9] Optimizing Music Learning: Blocked and Interleaved Practice Schedules (2016). https://pmc.ncbi.nlm.nih.gov/articles/PMC4989027/
[10] The role of auditory feedback in the motor learning of music in experienced and novice performers (2022). https://pmc.ncbi.nlm.nih.gov/articles/PMC9671877/
[11] Chua et al. (2021), Superiority of external attentional focus for motor performance and learning. https://pubmed.ncbi.nlm.nih.gov/34843301/
[12] Focus of attention in musical learning and music performance (2024 systematic review). https://pmc.ncbi.nlm.nih.gov/articles/PMC11033434/
[13] Dayan & Cohen (2011), Neuroplasticity subserving motor skill learning. https://pubmed.ncbi.nlm.nih.gov/22078504/
[14] Motor Learning and Physical Exercise in Adaptive Myelination and Remyelination (2022). https://pubmed.ncbi.nlm.nih.gov/35635130/
[15] Sleep-dependent motor memory consolidation in healthy adults (2020 meta-analysis), and contrasting review (2015). https://pubmed.ncbi.nlm.nih.gov/32730847/ ; https://pubmed.ncbi.nlm.nih.gov/25822130/
[16] Technology-mediated feedback in instrumental music practice, performance, and learning (2026 systematic review). https://pmc.ncbi.nlm.nih.gov/articles/PMC13710021/

Decision requested: approve/refine learning philosophy and evidence boundaries before DESIGN-001-C. The proposed learning graph, scheduling defaults, metrics and experiments are design hypotheses, not accepted algorithm changes.
