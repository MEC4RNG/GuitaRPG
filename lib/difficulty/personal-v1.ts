import { parseQuest, type Quest, type SkillReference } from "@/lib/quest/runtime";

import { levelForScore } from "./dif-v1";
import {
  ASSESSMENT_STATUSES,
  CONTEXT_NOVELTY_STATUSES,
  READINESS_STATUSES,
  type CapabilityGap,
  type ContextNoveltySnapshot,
  type PersonalDifficultyModifier,
  type PersonalDifficultyStatus,
  type PersonalDifficultyUncertainty,
  type PlayerRelativeDifficultyEvaluation,
  type PlayerRelativeDifficultyInput,
  type SkillStateSnapshot,
} from "./personal-types";
import type { AbsoluteDifficultyProfile, DifficultyDimension, DifficultyLevel } from "./types";

const LEVELS: DifficultyLevel[] = ["I", "II", "III", "IV", "V"];
const CONFIDENCE = { weak: 40, strong: 75 } as const;
const SUPPORTING_SEVERE_GAP = 20;
const TOTAL_MODIFIER_CAP = 1;

const DOMAIN_DIMENSION: Record<string, DifficultyDimension> = {
  technique: "TECHNIQUE",
  fretboard: "FRETBOARD",
  harmony_theory: "THEORY",
  rhythm: "RHYTHM",
  creativity_expression: "CREATIVE",
  ear_musicianship: "THEORY",
};

function fail(message: string): never {
  throw new Error(`Invalid DIF_PERSONAL_V1 input: ${message}`);
}

function isFiniteRange(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum
  );
}

function validateTimestamp(value: string, label: string) {
  if (!value || Number.isNaN(Date.parse(value)))
    fail(`${label} must be an ISO-compatible timestamp`);
}

function validateSkillState(state: SkillStateSnapshot): void {
  if (!state.skill_slug?.trim()) fail("Skill snapshot requires skill_slug");
  if (!(ASSESSMENT_STATUSES as readonly string[]).includes(state.assessment_status))
    fail(`${state.skill_slug} has invalid assessment_status`);
  if (!(READINESS_STATUSES as readonly string[]).includes(state.readiness_status))
    fail(`${state.skill_slug} has invalid readiness_status`);
  if (!isFiniteRange(state.confidence_score, 0, 100))
    fail(`${state.skill_slug} confidence_score must be 0-100`);
  if (!Number.isInteger(state.exposure_count) || state.exposure_count < 0)
    fail(`${state.skill_slug} exposure_count must be a non-negative integer`);
  if (!Number.isInteger(state.evidence_count) || state.evidence_count < 0)
    fail(`${state.skill_slug} evidence_count must be a non-negative integer`);
  if (state.last_practiced_at) validateTimestamp(state.last_practiced_at, "last_practiced_at");
  if (state.last_evidence_at) validateTimestamp(state.last_evidence_at, "last_evidence_at");
  for (const value of [
    state.proficiency_model_version,
    state.confidence_model_version,
    state.readiness_model_version,
  ]) {
    if (!value?.trim()) fail(`${state.skill_slug} model versions must be present`);
  }

  if (state.assessment_status === "UNRATED") {
    if (
      state.visible_level !== null ||
      state.proficiency_score !== null ||
      state.confidence_score !== 0 ||
      state.readiness_status !== "UNKNOWN" ||
      state.readiness_score !== null
    )
      fail(`${state.skill_slug} UNRATED state violates PLY-002 null semantics`);
    return;
  }

  if (
    state.visible_level === null ||
    !LEVELS.includes(state.visible_level) ||
    !isFiniteRange(state.proficiency_score, 0, 100) ||
    levelForScore(state.proficiency_score) !== state.visible_level
  )
    fail(`${state.skill_slug} rated state has inconsistent proficiency/visible Level`);
  if (state.assessment_status === "ESTABLISHED" && state.confidence_score < 60)
    fail(`${state.skill_slug} ESTABLISHED confidence must satisfy PLY-002`);
  if (state.readiness_status === "UNKNOWN" && state.readiness_score !== null)
    fail(`${state.skill_slug} UNKNOWN readiness requires null readiness_score`);
  if (state.readiness_score !== null && !isFiniteRange(state.readiness_score, 0, 100))
    fail(`${state.skill_slug} readiness_score must be null or 0-100`);
}

function validateContext(snapshot: ContextNoveltySnapshot): void {
  if (!(CONTEXT_NOVELTY_STATUSES as readonly string[]).includes(snapshot.status))
    fail("context novelty status is invalid");
  if (!Array.isArray(snapshot.context_keys) || snapshot.context_keys.some((key) => !key.trim()))
    fail("context_keys must be non-empty strings");
  if (!new Set(["EXPLICIT_SNAPSHOT", "NO_RELEVANT_CONTEXT"]).has(snapshot.source))
    fail("context novelty source is invalid");
  if (snapshot.source === "NO_RELEVANT_CONTEXT" && snapshot.context_keys.length > 0)
    fail("NO_RELEVANT_CONTEXT cannot contain context keys");
}

function dimensionDemand(profile: AbsoluteDifficultyProfile, domain: string) {
  const dimension = DOMAIN_DIMENSION[domain] ?? "CONSTRAINT";
  const evaluation = profile.dimensions[dimension];
  return {
    dimension,
    score: evaluation.applicable ? evaluation.score : profile.overall.score,
  };
}

function primaryDemand(profile: AbsoluteDifficultyProfile, primary: SkillReference) {
  const mapped = dimensionDemand(profile, primary.domain);
  return {
    dimension: mapped.dimension,
    score: Math.round(mapped.score * 0.65 + profile.overall.score * 0.35),
  };
}

export function personalLevelForGap(gap: number): DifficultyLevel {
  if (gap <= -50) return "I";
  if (gap <= -20) return "II";
  if (gap <= 15) return "III";
  if (gap <= 35) return "IV";
  return "V";
}

function liftLevel(level: DifficultyLevel, delta: 0 | 1): DifficultyLevel {
  return LEVELS[Math.min(LEVELS.length - 1, LEVELS.indexOf(level) + delta)];
}

function modifier(kind: PersonalDifficultyModifier["kind"], reason: string) {
  return { kind, personal_band_delta: 1, changes_proficiency: false, reason } as const;
}

function snapshotGap(
  skill: SkillReference,
  state: SkillStateSnapshot | undefined,
  profile: AbsoluteDifficultyProfile,
): CapabilityGap {
  const demand = dimensionDemand(profile, skill.domain);
  return {
    skill_slug: skill.slug,
    role: skill.role,
    demand_dimension: demand.dimension,
    demand_score: demand.score,
    proficiency_score: state?.proficiency_score ?? null,
    gap:
      state?.proficiency_score === null || state?.proficiency_score === undefined
        ? null
        : demand.score - state.proficiency_score,
  };
}

function statusAndUncertainty(
  primary: SkillStateSnapshot,
  supporting: Array<SkillStateSnapshot | undefined>,
  context: ContextNoveltySnapshot,
): { status: PersonalDifficultyStatus; uncertainty: PersonalDifficultyUncertainty } {
  if (primary.assessment_status === "UNRATED") return { status: "UNKNOWN", uncertainty: "HIGH" };

  const supportingUnrated = supporting.some(
    (state) => !state || state.assessment_status === "UNRATED",
  );
  const supportingEstimated = supporting.some((state) => state?.assessment_status === "ESTIMATED");
  if (
    primary.assessment_status === "ESTIMATED" ||
    supportingUnrated ||
    supportingEstimated ||
    context.status === "HIGH" ||
    context.status === "UNKNOWN"
  ) {
    const high =
      primary.confidence_score < CONFIDENCE.weak ||
      supportingUnrated ||
      supporting.some((state) => state && state.confidence_score < CONFIDENCE.weak);
    return { status: "PROVISIONAL", uncertainty: high ? "HIGH" : "MODERATE" };
  }

  const strongCoverage =
    primary.confidence_score >= CONFIDENCE.strong &&
    primary.readiness_status !== "UNKNOWN" &&
    supporting.every((state) => state && state.confidence_score >= 60) &&
    context.status === "LOW";
  return { status: "RESOLVED", uncertainty: strongCoverage ? "LOW" : "MODERATE" };
}

export function resolvePlayerRelativeDifficulty(
  input: PlayerRelativeDifficultyInput,
): PlayerRelativeDifficultyEvaluation {
  const quest: Quest = parseQuest(input.quest);
  if (input.absolute_profile.model_version !== "DIF_V1") fail("absolute profile must use DIF_V1");
  validateTimestamp(input.evaluated_at, "evaluated_at");
  if (!input.player_state_version?.trim()) fail("player_state_version is required");
  validateContext(input.context_novelty);

  const states = new Map<string, SkillStateSnapshot>();
  for (const state of input.skill_states) {
    validateSkillState(state);
    if (states.has(state.skill_slug)) fail(`duplicate Skill snapshot: ${state.skill_slug}`);
    states.set(state.skill_slug, structuredClone(state));
  }

  const primaryRef = quest.execution.primary_skill;
  const primary = states.get(primaryRef.slug);
  if (!primary) fail(`Primary Skill snapshot is missing: ${primaryRef.slug}`);
  const supportingRefs = [
    ...quest.execution.secondary_skills,
    ...quest.execution.required_techniques,
  ];
  const supportingStates = supportingRefs.map((skill) => states.get(skill.slug));
  const primaryCoordinate = primaryDemand(input.absolute_profile, primaryRef);
  const primaryGap =
    primary.proficiency_score === null ? null : primaryCoordinate.score - primary.proficiency_score;
  const capabilityGaps = [
    {
      skill_slug: primaryRef.slug,
      role: primaryRef.role,
      demand_dimension: primaryCoordinate.dimension,
      demand_score: primaryCoordinate.score,
      proficiency_score: primary.proficiency_score,
      gap: primaryGap,
    },
    ...supportingRefs.map((skill, index) =>
      snapshotGap(skill, supportingStates[index], input.absolute_profile),
    ),
  ];

  if (primary.assessment_status === "UNRATED") {
    return {
      model_version: "DIF_V1",
      resolver_version: "DIF_PERSONAL_V1",
      evaluated_at: input.evaluated_at,
      quest: { id: quest.identity.id, slug: quest.identity.slug, schema_version: 1 },
      absolute_demand: {
        model_version: "DIF_V1",
        source: input.absolute_profile.source,
        overall_score: input.absolute_profile.overall.score,
        overall_level: input.absolute_profile.overall.level,
      },
      player_state_version: input.player_state_version,
      status: "UNKNOWN",
      personal_level: null,
      uncertainty: "HIGH",
      baseline_level: null,
      primary_gap: null,
      capability_gaps: capabilityGaps,
      modifiers: [],
      applied_modifier_band_delta: 0,
      rationale: ["primary_skill_unrated"],
      skill_state_snapshot: input.skill_states.map((state) => structuredClone(state)),
      context_novelty_snapshot: structuredClone(input.context_novelty),
    };
  }

  const baseline = personalLevelForGap(primaryGap!);
  const modifiers: PersonalDifficultyModifier[] = [];
  const rationale: string[] = [];
  if (primary.assessment_status === "ESTIMATED") rationale.push("estimated_primary_skill");
  if (primary.readiness_status === "LOW") {
    modifiers.push(modifier("READINESS", "low_readiness_increases_current_challenge"));
    rationale.push("low_readiness_increases_current_challenge");
  } else if (primary.readiness_status === "UNKNOWN") {
    rationale.push("readiness_unknown_increases_uncertainty");
  }
  if (input.context_novelty.status === "HIGH") {
    modifiers.push(modifier("CONTEXT_NOVELTY", "unfamiliar_context_increases_current_challenge"));
    rationale.push("unfamiliar_context_increases_current_challenge");
  } else if (input.context_novelty.status === "UNKNOWN") {
    rationale.push("context_exposure_unknown");
  }

  const severeSupport = capabilityGaps.slice(1).some((gap, index) => {
    const state = supportingStates[index];
    return (
      (!state && supportingRefs[index].role === "REQUIRED_TECHNIQUE") ||
      state?.assessment_status === "UNRATED" ||
      (gap.gap ?? 0) >= SUPPORTING_SEVERE_GAP
    );
  });
  if (severeSupport) {
    modifiers.push(
      modifier("SUPPORTING_SKILL_BOTTLENECK", "supporting_skill_uncertainty_and_bottleneck"),
    );
    rationale.push("supporting_skill_uncertainty_and_bottleneck");
  } else if (supportingStates.some((state) => state?.assessment_status === "ESTIMATED" || !state)) {
    rationale.push("partial_secondary_coverage");
  }

  if (rationale.length === 0) {
    rationale.push(
      primaryGap! <= -20
        ? "quest_below_demonstrated_capacity"
        : "demand_matches_effective_capacity",
    );
  }
  const appliedDelta = Math.min(TOTAL_MODIFIER_CAP, modifiers.length) as 0 | 1;
  const resolved = statusAndUncertainty(primary, supportingStates, input.context_novelty);

  return {
    model_version: "DIF_V1",
    resolver_version: "DIF_PERSONAL_V1",
    evaluated_at: input.evaluated_at,
    quest: { id: quest.identity.id, slug: quest.identity.slug, schema_version: 1 },
    absolute_demand: {
      model_version: "DIF_V1",
      source: input.absolute_profile.source,
      overall_score: input.absolute_profile.overall.score,
      overall_level: input.absolute_profile.overall.level,
    },
    player_state_version: input.player_state_version,
    status: resolved.status,
    personal_level: liftLevel(baseline, appliedDelta),
    uncertainty: resolved.uncertainty,
    baseline_level: baseline,
    primary_gap: primaryGap,
    capability_gaps: capabilityGaps,
    modifiers,
    applied_modifier_band_delta: appliedDelta,
    rationale,
    skill_state_snapshot: input.skill_states.map((state) => structuredClone(state)),
    context_novelty_snapshot: structuredClone(input.context_novelty),
  };
}
