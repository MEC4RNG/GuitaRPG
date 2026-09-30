import { activeEntity, GENERATOR_TEMPLATES } from "@/lib/quest/generator/catalog";
import {
  QUEST_GENERATOR_RULE_VERSION,
  QUEST_GENERATOR_VERSION,
  type GeneratorTemplate,
} from "@/lib/quest/generator/types";

export const TRAINING_CANDIDATE_MODEL_VERSION = "TRN_CAND_V1" as const;
export const TRAINING_CANDIDATE_ORDERING = "STABLE_NOT_RANKED" as const;

export type TrainingIntent = "CALIBRATION" | "REFRESH" | "DEVELOPMENT" | "MAINTENANCE";
export type CandidateReason =
  | "PRIMARY_UNRATED"
  | "PRIMARY_ESTIMATED"
  | "PRIMARY_ESTABLISHED"
  | "READINESS_LOW"
  | "READINESS_MODERATE"
  | "READINESS_HIGH"
  | "READINESS_UNKNOWN"
  | "CONFIDENCE_BELOW_ESTABLISHMENT_THRESHOLD"
  | "GOAL_SKILL_MATCH"
  | "GOAL_DOMAIN_MATCH";

export type CandidateSkillState = {
  skill_id: string;
  assessment_status: "UNRATED" | "ESTIMATED" | "ESTABLISHED";
  visible_level: "I" | "II" | "III" | "IV" | "V" | null;
  proficiency_score: number | null;
  confidence_score: number;
  readiness_status: "UNKNOWN" | "LOW" | "MODERATE" | "HIGH";
  readiness_score: number | null;
  exposure_count: number;
  evidence_count: number;
  last_practiced_at: string | null;
  last_evidence_at: string | null;
  proficiency_model_version: string;
  confidence_model_version: string;
  readiness_model_version: string;
};

export type CandidateTaxonomyEntity = {
  id: string;
  kind: "SKILL" | "DOMAIN" | "CONTEXT" | string;
  slug: string;
  name: string;
  lifecycle: "ACTIVE" | string;
};

export type CandidateGoal = {
  id: string;
  domain_id: string | null;
  skill_id: string | null;
  objective: string | null;
  priority: number;
  is_active: boolean;
};

export type CandidatePlayerContext = {
  challenge_preference: "RELAXED" | "BALANCED" | "CHALLENGE" | "PUSH_ME";
  typical_session_minutes: number | null;
  default_tuning: { id: string; slug: string; name: string } | null;
};

export type GeneratorCapability = {
  template_id: string;
  primary_skill_slug: string;
  domain_slug: string;
  supported_quest_types: readonly string[];
  template_purpose: string;
  available_concepts: readonly string[];
  permitted_secondary_skills: readonly string[];
  permitted_required_techniques: readonly string[];
  allowed_constraints: readonly string[];
};

export type RecommendationCandidateV1 = {
  candidate_key: string;
  intent: TrainingIntent;
  reasons: CandidateReason[];
  skill: CandidateSkillState & {
    slug: string;
    name: string;
    domain_id: string;
    domain_slug: string;
    domain_name: string;
  };
  capability: GeneratorCapability;
  goal_matches: Array<{ goal_id: string; match: "SKILL" | "DOMAIN"; raw_priority: number }>;
};

export type RecommendationCandidateSetV1 = {
  model_version: typeof TRAINING_CANDIDATE_MODEL_VERSION;
  evaluated_at: string;
  ordering_semantics: typeof TRAINING_CANDIDATE_ORDERING;
  generator_version: typeof QUEST_GENERATOR_VERSION;
  generator_rule_version: typeof QUEST_GENERATOR_RULE_VERSION;
  player_context: CandidatePlayerContext & {
    active_structured_goal_count: number;
    unparsed_objective_goal_count: number;
  };
  candidates: RecommendationCandidateV1[];
  diagnostics: {
    active_canonical_skill_count: number;
    generator_primary_capable_skill_count: number;
    generated_candidate_count: number;
    unsupported_active_skill_count: number;
    missing_player_skill_state: string[];
    unsupported_goal_skill: Array<{ goal_id: string; skill_id: string }>;
    unparsed_objective_goal: Array<{ goal_id: string; objective: string }>;
  };
};

const DOMAIN_ORDER = [
  "technique",
  "fretboard",
  "harmony_theory",
  "rhythm",
  "ear_musicianship",
  "creativity_expression",
] as const;

export function generatorPrimaryCapabilities(
  templates: readonly GeneratorTemplate[] = GENERATOR_TEMPLATES,
): GeneratorCapability[] {
  const seen = new Set<string>();
  const capabilities: GeneratorCapability[] = [];
  for (const template of templates) {
    for (const primarySkill of template.primarySkills) {
      if (seen.has(primarySkill)) continue;
      seen.add(primarySkill);
      capabilities.push({
        template_id: template.id,
        primary_skill_slug: primarySkill,
        domain_slug: template.domain,
        supported_quest_types: [...template.questTypes],
        template_purpose: template.purpose,
        available_concepts: [...template.concepts],
        permitted_secondary_skills: [...template.secondarySkills],
        permitted_required_techniques: [...template.requiredTechniques],
        allowed_constraints: [...template.allowedConstraints],
      });
    }
  }
  return capabilities.sort(
    (left, right) =>
      DOMAIN_ORDER.indexOf(left.domain_slug as (typeof DOMAIN_ORDER)[number]) -
        DOMAIN_ORDER.indexOf(right.domain_slug as (typeof DOMAIN_ORDER)[number]) ||
      left.primary_skill_slug.localeCompare(right.primary_skill_slug),
  );
}

export function validateCurrentGeneratorCapabilities(): string[] {
  const errors: string[] = [];
  const occurrences = new Map<string, number>();
  for (const template of GENERATOR_TEMPLATES) {
    for (const slug of template.primarySkills)
      occurrences.set(slug, (occurrences.get(slug) ?? 0) + 1);
  }
  for (const capability of generatorPrimaryCapabilities()) {
    const skill = activeEntity(capability.primary_skill_slug, "SKILL");
    const domain = activeEntity(capability.domain_slug, "DOMAIN");
    if (!skill) errors.push(`${capability.primary_skill_slug}: not an ACTIVE canonical SKILL`);
    if (!domain) errors.push(`${capability.domain_slug}: not an ACTIVE canonical DOMAIN`);
    if (occurrences.get(capability.primary_skill_slug) !== 1)
      errors.push(`${capability.primary_skill_slug}: expected exactly one generator template`);
  }
  return errors;
}

function classify(state: CandidateSkillState): {
  intent: TrainingIntent;
  reasons: CandidateReason[];
} {
  const reasons: CandidateReason[] = [];
  reasons.push(
    state.assessment_status === "UNRATED"
      ? "PRIMARY_UNRATED"
      : state.assessment_status === "ESTIMATED"
        ? "PRIMARY_ESTIMATED"
        : "PRIMARY_ESTABLISHED",
  );
  reasons.push(`READINESS_${state.readiness_status}` as CandidateReason);
  if (state.confidence_score < 60) reasons.push("CONFIDENCE_BELOW_ESTABLISHMENT_THRESHOLD");
  if (state.assessment_status === "UNRATED") return { intent: "CALIBRATION", reasons };
  if (state.readiness_status === "LOW") return { intent: "REFRESH", reasons };
  if (state.assessment_status === "ESTIMATED") return { intent: "DEVELOPMENT", reasons };
  return { intent: "MAINTENANCE", reasons };
}

export function buildRecommendationCandidateSetV1(input: {
  evaluated_at: string;
  entities: readonly CandidateTaxonomyEntity[];
  skill_states: readonly CandidateSkillState[];
  goals: readonly CandidateGoal[];
  player_context: CandidatePlayerContext;
  capabilities?: readonly GeneratorCapability[];
}): RecommendationCandidateSetV1 {
  if (Number.isNaN(Date.parse(input.evaluated_at)))
    throw new Error("TRN_CAND_V1 evaluated_at is invalid");
  const skills = input.entities.filter(
    (item) => item.kind === "SKILL" && item.lifecycle === "ACTIVE",
  );
  const skillBySlug = new Map(skills.map((item) => [item.slug, item]));
  const states = new Map(input.skill_states.map((item) => [item.skill_id, item]));
  const goals = input.goals.filter((goal) => goal.is_active);
  const capabilities = [...(input.capabilities ?? generatorPrimaryCapabilities())];
  const capableIds = new Set(
    capabilities
      .map((capability) => skillBySlug.get(capability.primary_skill_slug)?.id)
      .filter(Boolean),
  );
  const unsupportedGoals = goals
    .filter((goal) => goal.skill_id && !capableIds.has(goal.skill_id))
    .map((goal) => ({ goal_id: goal.id, skill_id: goal.skill_id! }));
  const unparsedGoals = goals
    .filter((goal) => goal.objective && !goal.skill_id && !goal.domain_id)
    .map((goal) => ({ goal_id: goal.id, objective: goal.objective! }));
  const missing: string[] = [];
  const candidates: RecommendationCandidateV1[] = [];

  for (const capability of capabilities) {
    const skill = skillBySlug.get(capability.primary_skill_slug);
    const domain = input.entities.find(
      (item) =>
        item.kind === "DOMAIN" &&
        item.slug === capability.domain_slug &&
        item.lifecycle === "ACTIVE",
    );
    if (!skill || !domain) continue;
    const state = states.get(skill.id);
    if (!state) {
      missing.push(skill.slug);
      continue;
    }
    const classification = classify(state);
    const matches: RecommendationCandidateV1["goal_matches"] = [];
    for (const goal of goals) {
      if (goal.skill_id === skill.id)
        matches.push({ goal_id: goal.id, match: "SKILL", raw_priority: goal.priority });
      else if (goal.domain_id === domain.id)
        matches.push({ goal_id: goal.id, match: "DOMAIN", raw_priority: goal.priority });
    }
    const reasons = [...classification.reasons];
    if (matches.some((match) => match.match === "SKILL")) reasons.push("GOAL_SKILL_MATCH");
    if (matches.some((match) => match.match === "DOMAIN")) reasons.push("GOAL_DOMAIN_MATCH");
    candidates.push({
      candidate_key: `${TRAINING_CANDIDATE_MODEL_VERSION}:${skill.slug}`,
      intent: classification.intent,
      reasons,
      skill: {
        ...state,
        slug: skill.slug,
        name: skill.name,
        domain_id: domain.id,
        domain_slug: domain.slug,
        domain_name: domain.name,
      },
      capability,
      goal_matches: matches,
    });
  }

  return {
    model_version: TRAINING_CANDIDATE_MODEL_VERSION,
    evaluated_at: input.evaluated_at,
    ordering_semantics: TRAINING_CANDIDATE_ORDERING,
    generator_version: QUEST_GENERATOR_VERSION,
    generator_rule_version: QUEST_GENERATOR_RULE_VERSION,
    player_context: {
      ...input.player_context,
      active_structured_goal_count: goals.filter((goal) => goal.skill_id || goal.domain_id).length,
      unparsed_objective_goal_count: unparsedGoals.length,
    },
    candidates,
    diagnostics: {
      active_canonical_skill_count: skills.length,
      generator_primary_capable_skill_count: capabilities.length,
      generated_candidate_count: candidates.length,
      unsupported_active_skill_count: skills.length - capabilities.length,
      missing_player_skill_state: missing,
      unsupported_goal_skill: unsupportedGoals,
      unparsed_objective_goal: unparsedGoals,
    },
  };
}
