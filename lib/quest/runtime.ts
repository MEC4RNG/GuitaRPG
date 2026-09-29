export const QUEST_TYPES = [
  "TECHNIQUE",
  "PERFORMANCE",
  "EXPLORATION",
  "CREATIVE",
  "KNOWLEDGE",
] as const;
export const GENERATION_MODES = [
  "QUICK",
  "CUSTOM",
  "TRAINING",
  "DAILY",
  "CALIBRATION",
  "CAMPAIGN",
] as const;
export const PURPOSE_REASONS = [
  "DEVELOP_SKILL",
  "REFRESH_SKILL",
  "EXPLORE",
  "APPLY_CONCEPT",
  "CREATE",
  "ASSESS",
] as const;
export const VERIFICATION_MODES = [
  "SELF",
  "SESSION",
  "AUDIO_ASSISTED",
  "DIRECT_AUDIO",
  "APP_VERIFIED",
] as const;
export type QuestType = (typeof QUEST_TYPES)[number];

type JsonObject = Record<string, unknown>;
export type Quest = JsonObject & {
  identity: {
    id: string;
    slug: string;
    title: string;
    schema_version: 1;
    type: (typeof QUEST_TYPES)[number];
    origin: string;
  };
  purpose: {
    reason: (typeof PURPOSE_REASONS)[number];
    primary_domain: string;
    generation_mode: (typeof GENERATION_MODES)[number];
  };
  execution: {
    primary_skill: SkillReference;
    secondary_skills: SkillReference[];
    required_techniques: SkillReference[];
    estimated_minutes: number;
  };
  concepts: TaxonomyReference[];
  constraints: Array<TaxonomyReference & { parameters: JsonObject }>;
  objective: { kind: string; summary: string; clear_rule: "ALL_CRITERIA"; criteria: Criterion[] };
  completion_contract: { attempt_rule: string; mastery_claimed: false; [key: string]: unknown };
  verification_profile: {
    allowed_modes: (typeof VERIFICATION_MODES)[number][];
    recommended_mode: (typeof VERIFICATION_MODES)[number];
    verification_required_for_clear: false;
  };
  difficulty_profile: {
    declared_overall_demand: "I" | "II" | "III" | "IV" | "V";
    computation_status: string;
    model_version?: string;
    source?: string;
    dimensions?: Record<string, unknown>;
    overall?: { score: number; level: "I" | "II" | "III" | "IV" | "V"; [key: string]: unknown };
  };
  rewards: { policy: string; fixed_xp: null; progression_effects_embedded: false };
  metadata: JsonObject;
};
export type SkillReference = TaxonomyReference & {
  domain: string;
  role: "PRIMARY_SKILL" | "SECONDARY_SKILL" | "REQUIRED_TECHNIQUE";
};
export type TaxonomyReference = { slug: string; name: string };
export type Criterion = {
  metric: string;
  operator: "EQ" | "GTE" | "LTE";
  value: string | number | boolean;
  unit: string;
};

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const isOneOf = <T extends readonly string[]>(value: unknown, options: T): value is T[number] =>
  typeof value === "string" && (options as readonly string[]).includes(value);
const fail = (message: string): never => {
  throw new Error(`Invalid Quest: ${message}`);
};
const objectAt = (input: JsonObject, key: string): JsonObject =>
  isObject(input[key]) ? input[key] : fail(`${key} must be an object`);
const arrayAt = (input: JsonObject, key: string): unknown[] =>
  Array.isArray(input[key]) ? input[key] : fail(`${key} must be an array`);

function reference(value: unknown, label: string): TaxonomyReference {
  if (!isObject(value) || !hasText(value.slug) || !hasText(value.name))
    fail(`${label} must have slug and name`);
  return value as TaxonomyReference;
}

function skill(value: unknown, role: SkillReference["role"], label: string): SkillReference {
  const candidate = reference(value, label) as SkillReference;
  if (!hasText(candidate.domain) || candidate.role !== role) fail(`${label} must be a ${role}`);
  return candidate;
}

function rejectAttemptData(value: JsonObject): void {
  for (const key of ["outcome", "result", "reflection", "xp", "progression"]) {
    if (key in value) fail(`${key} belongs to a later Result/Evidence/Progression record`);
  }
}

export function parseQuest(input: unknown): Quest {
  if (!isObject(input)) fail("Quest must be an object");
  const quest = input as JsonObject;
  rejectAttemptData(quest);
  const identity = objectAt(quest, "identity");
  if (
    !hasText(identity.id) ||
    !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(String(identity.slug)) ||
    !hasText(identity.title) ||
    identity.schema_version !== 1 ||
    !isOneOf(identity.type, QUEST_TYPES) ||
    !hasText(identity.origin)
  )
    fail("identity is not schema-v1 canonical");
  const purpose = objectAt(quest, "purpose");
  if (
    !hasText(purpose.primary_domain) ||
    !isOneOf(purpose.reason, PURPOSE_REASONS) ||
    !isOneOf(purpose.generation_mode, GENERATION_MODES)
  )
    fail("purpose is invalid");
  const execution = objectAt(quest, "execution");
  const primary = skill(execution.primary_skill, "PRIMARY_SKILL", "execution.primary_skill");
  if (primary.domain !== purpose.primary_domain)
    fail("primary Skill Domain must match purpose.primary_domain");
  const secondary = arrayAt(execution, "secondary_skills").map((value, index) =>
    skill(value, "SECONDARY_SKILL", `secondary Skill ${index}`),
  );
  const required = arrayAt(execution, "required_techniques").map((value, index) =>
    skill(value, "REQUIRED_TECHNIQUE", `required Technique ${index}`),
  );
  if (
    secondary.length > 2 ||
    required.length > 2 ||
    !Number.isFinite(execution.estimated_minutes) ||
    Number(execution.estimated_minutes) <= 0
  )
    fail("execution role limits or estimated_minutes are invalid");
  const skillSlugs = [primary, ...secondary, ...required].map((item) => item.slug);
  if (new Set(skillSlugs).size !== skillSlugs.length) fail("a Skill may have only one Quest role");
  const concepts = arrayAt(quest, "concepts").map((value, index) =>
    reference(value, `concept ${index}`),
  );
  if (concepts.length < 1) fail("at least one Concept is required");
  const constraints = arrayAt(quest, "constraints").map((value, index) => {
    const item = reference(value, `constraint ${index}`) as TaxonomyReference & {
      parameters?: unknown;
    };
    if (!isObject(item.parameters)) fail(`constraint ${index} parameters must be an object`);
    return item as TaxonomyReference & { parameters: JsonObject };
  });
  if (constraints.length < 1 || constraints.length > 3)
    fail("Quest requires one to three Constraints");
  const objective = objectAt(quest, "objective");
  if (
    !hasText(objective.kind) ||
    !hasText(objective.summary) ||
    objective.clear_rule !== "ALL_CRITERIA"
  )
    fail("objective is invalid");
  const criteria = arrayAt(objective, "criteria").map((value, index) => {
    if (
      !isObject(value) ||
      !hasText(value.metric) ||
      !isOneOf(value.operator, ["EQ", "GTE", "LTE"] as const) ||
      !hasText(value.unit) ||
      !["string", "number", "boolean"].includes(typeof value.value)
    )
      fail(`criterion ${index} is invalid`);
    return value as Criterion;
  });
  if (criteria.length < 1) fail("at least one Objective criterion is required");
  const completion = objectAt(quest, "completion_contract");
  if (!hasText(completion.attempt_rule) || completion.mastery_claimed !== false)
    fail("completion contract must reject mastery claims");
  const verification = objectAt(quest, "verification_profile");
  const allowedModes = arrayAt(verification, "allowed_modes");
  if (
    allowedModes.length < 1 ||
    !allowedModes.every((mode) => isOneOf(mode, VERIFICATION_MODES)) ||
    !isOneOf(verification.recommended_mode, VERIFICATION_MODES) ||
    !allowedModes.includes(verification.recommended_mode) ||
    verification.verification_required_for_clear !== false
  )
    fail("verification profile is invalid");
  const difficulty = objectAt(quest, "difficulty_profile");
  if (
    !isOneOf(difficulty.declared_overall_demand, ["I", "II", "III", "IV", "V"] as const) ||
    !hasText(difficulty.computation_status)
  )
    fail("difficulty profile is invalid");
  const rewards = objectAt(quest, "rewards");
  if (
    !hasText(rewards.policy) ||
    rewards.fixed_xp !== null ||
    rewards.progression_effects_embedded !== false
  )
    fail("rewards may not embed XP or progression");
  if (!isObject(quest.metadata)) fail("metadata must be an object");
  return quest as Quest;
}

export type QuestPersistenceInput = Pick<
  Quest,
  | "identity"
  | "purpose"
  | "execution"
  | "completion_contract"
  | "verification_profile"
  | "difficulty_profile"
  | "rewards"
  | "metadata"
> & { resolved_snapshot: Quest };

export function toQuestPersistenceInput(input: unknown): QuestPersistenceInput {
  const quest = parseQuest(input);
  return {
    identity: quest.identity,
    purpose: quest.purpose,
    execution: quest.execution,
    completion_contract: quest.completion_contract,
    verification_profile: quest.verification_profile,
    difficulty_profile: quest.difficulty_profile,
    rewards: quest.rewards,
    metadata: quest.metadata,
    resolved_snapshot: quest,
  };
}
