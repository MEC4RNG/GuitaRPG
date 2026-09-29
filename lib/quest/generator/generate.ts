import { evaluateAbsoluteQuestDemand } from "@/lib/difficulty/dif-v1";
import {
  parseQuest,
  toQuestPersistenceInput,
  type Quest,
  type QuestType,
} from "@/lib/quest/runtime";
import { activeEntity, GENERATOR_TEMPLATES, skillDomain } from "./catalog";
import { choose, seeded, validateConstraints, validateEstimatedMinutes } from "./rules";
import {
  QUEST_GENERATOR_RULE_VERSION,
  QUEST_GENERATOR_VERSION,
  QuestGenerationError,
  type ConstraintRequest,
  type CustomQuestInput,
  type GeneratedQuest,
  type GeneratorTemplate,
  type QuickQuestInput,
} from "./types";

type Mode = "QUICK" | "CUSTOM";
type Ref = { slug: string; name: string };

const entityRef = (slug: string, kind: "SKILL" | "CONCEPT" | "CONSTRAINT" | "CONTEXT"): Ref => {
  const entity = activeEntity(slug, kind);
  if (!entity)
    throw new QuestGenerationError(
      "UNKNOWN_TAXONOMY",
      `${slug} is not an active canonical ${kind}`,
      { slug, kind },
    );
  return { slug: entity.slug, name: entity.name };
};

const stableToken = (value: string): string => {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36).padStart(7, "0");
};

function templateForCustom(input: CustomQuestInput): GeneratorTemplate {
  const domain = skillDomain(input.primary_skill);
  if (!domain || !activeEntity(input.primary_skill, "SKILL"))
    throw new QuestGenerationError(
      "INVALID_PRIMARY_SKILL",
      `${input.primary_skill} is not an active canonical Skill`,
    );
  const template = GENERATOR_TEMPLATES.find((item) =>
    item.primarySkills.includes(input.primary_skill),
  );
  if (!template)
    throw new QuestGenerationError(
      "INELIGIBLE_PRIMARY_SKILL",
      `${input.primary_skill} is not supported by QST_GEN_V1`,
    );
  if (template.domain !== domain)
    throw new QuestGenerationError(
      "SKILL_DOMAIN_MISMATCH",
      `${input.primary_skill} does not belong to ${template.domain}`,
    );
  if (input.quest_type && !template.questTypes.includes(input.quest_type))
    throw new QuestGenerationError(
      "UNSUPPORTED_QUEST_TYPE",
      `${input.quest_type} is incompatible with ${template.id}`,
    );
  return template;
}

function customList(
  requested: string[] | undefined,
  allowed: string[],
  kind: "SKILL" | "CONCEPT",
  label: string,
): string[] {
  if (!requested) return [];
  if (new Set(requested).size !== requested.length)
    throw new QuestGenerationError("DUPLICATE_SELECTION", `${label} contains a duplicate`);
  for (const slug of requested) {
    entityRef(slug, kind);
    if (!allowed.includes(slug))
      throw new QuestGenerationError(
        "INCOMPATIBLE_SELECTION",
        `${slug} is incompatible with the selected generator family`,
        { label, slug },
      );
  }
  return requested;
}

function assembleConstraints(
  input: CustomQuestInput,
  template: GeneratorTemplate,
): ConstraintRequest[] {
  const explicit = [...(input.constraints ?? [])];
  if (input.strings) explicit.push({ slug: "string_set", parameters: { strings: input.strings } });
  if (input.fret_range) explicit.push({ slug: "fret_range", parameters: input.fret_range });
  if (input.target_tempo_bpm)
    explicit.push({ slug: "target_tempo", parameters: { bpm: input.target_tempo_bpm } });
  const constraints = explicit.length ? explicit : template.defaultConstraints;
  for (const item of constraints) {
    entityRef(item.slug, "CONSTRAINT");
    if (!template.allowedConstraints.includes(item.slug))
      throw new QuestGenerationError(
        "INCOMPATIBLE_CONSTRAINT",
        `${item.slug} is incompatible with ${template.id}`,
      );
  }
  return validateConstraints(constraints);
}

function contextFor(input: Pick<CustomQuestInput, "tuning" | "tonal_center" | "style">) {
  if (input.tuning) {
    const entity = activeEntity(input.tuning, "CONTEXT");
    if (!entity || entity.metadata.context_family !== "TUNING")
      throw new QuestGenerationError(
        "INVALID_TUNING",
        `${input.tuning} is not an active tuning Context`,
      );
  }
  if (input.style) {
    const entity = activeEntity(input.style, "CONTEXT");
    if (
      !entity ||
      ["tonal_center", "standard_tuning", "drop_d", "dadgad"].includes(entity.slug) ||
      entity.slug.startsWith("playing_role_")
    )
      throw new QuestGenerationError(
        "INVALID_STYLE",
        `${input.style} is not an active style Context`,
      );
  }
  if (input.tonal_center && !/^[A-G](?:#|b)?$/.test(input.tonal_center))
    throw new QuestGenerationError(
      "INVALID_TONAL_CENTER",
      "tonal_center must be a pitch class such as E or Bb",
    );
  return {
    tuning: input.tuning ? entityRef(input.tuning, "CONTEXT") : null,
    tonal_center: input.tonal_center
      ? { kind: "TONAL_CENTER", pitch_class: input.tonal_center }
      : null,
    style: input.style ? entityRef(input.style, "CONTEXT") : null,
    playing_role: null,
    accompaniment: null,
  };
}

function objective(
  template: GeneratorTemplate,
  questType: QuestType,
  constraints: ConstraintRequest[],
  minutes: number,
  primary: Ref,
) {
  const kind = questType === "CREATIVE" ? "CREATIVE_OUTPUT" : template.objectiveKind;
  const tempo = constraints.find((item) => item.slug === "target_tempo")?.parameters?.bpm as
    number | undefined;
  const practiceSeconds = constraints.find((item) => item.slug === "practice_duration")?.parameters
    ?.seconds as number | undefined;
  const timeLimit = constraints.find((item) => item.slug === "time_limit")?.parameters?.seconds as
    number | undefined;
  const prompts = constraints.find((item) => item.slug === "prompt_count")?.parameters?.count as
    number | undefined;
  const bars = constraints.find((item) => item.slug === "output_length")?.parameters?.bars as
    number | undefined;
  const criteria: Quest["objective"]["criteria"] = [];
  if (kind === "IDENTIFICATION") {
    criteria.push({
      metric: "correct_answers",
      operator: "GTE",
      value: Math.max(1, Math.ceil((prompts ?? 8) * 0.75)),
      unit: "answers",
    });
    criteria.push({
      metric: "total_prompts",
      operator: "EQ",
      value: prompts ?? 8,
      unit: "prompts",
    });
  } else if (kind === "CREATIVE_OUTPUT") {
    criteria.push({ metric: "output_length", operator: "GTE", value: bars ?? 4, unit: "bars" });
    criteria.push({
      metric: "constraint_compliance",
      operator: "EQ",
      value: true,
      unit: "boolean",
    });
  } else if (kind === "POSITION_DISCOVERY") {
    criteria.push({ metric: "distinct_positions", operator: "GTE", value: 3, unit: "positions" });
    criteria.push({
      metric: "constraint_compliance",
      operator: "EQ",
      value: true,
      unit: "boolean",
    });
  } else if (kind === "CONSTRUCTION") {
    criteria.push({ metric: "correct_answers", operator: "GTE", value: 4, unit: "answers" });
    criteria.push({
      metric: "constraint_compliance",
      operator: "EQ",
      value: true,
      unit: "boolean",
    });
  } else {
    criteria.push({
      metric: "practice_duration",
      operator: "GTE",
      value: practiceSeconds ?? minutes * 60,
      unit: "seconds",
    });
    if (tempo) criteria.push({ metric: "target_tempo", operator: "EQ", value: tempo, unit: "bpm" });
    criteria.push({
      metric: "constraint_compliance",
      operator: "EQ",
      value: true,
      unit: "boolean",
    });
  }
  if (timeLimit)
    criteria.push({ metric: "time_elapsed", operator: "LTE", value: timeLimit, unit: "seconds" });
  return {
    kind,
    summary: `${questType === "CREATIVE" ? "Create with" : "Practice"} ${primary.name} under the resolved constraints.`,
    clear_rule: "ALL_CRITERIA" as const,
    criteria,
  };
}

function finalize(args: {
  mode: Mode;
  template: GeneratorTemplate;
  questType: QuestType;
  primarySkill: string;
  concepts: string[];
  secondarySkills: string[];
  requiredTechniques: string[];
  constraints: ConstraintRequest[];
  estimatedMinutes: number;
  meter?: string;
  context: ReturnType<typeof contextFor>;
  seed: string;
  identity: Pick<CustomQuestInput, "id" | "nonce" | "generated_at">;
}): GeneratedQuest {
  const primary = entityRef(args.primarySkill, "SKILL");
  const semanticKey = JSON.stringify({ ...args, identity: undefined });
  const token = stableToken(
    `${QUEST_GENERATOR_VERSION}:${args.seed}:${args.identity.nonce ?? ""}:${semanticKey}`,
  );
  const title = `${primary.name}: ${entityRef(args.concepts[0]!, "CONCEPT").name}`;
  const resolvedObjective = objective(
    args.template,
    args.questType,
    args.constraints,
    args.estimatedMinutes,
    primary,
  );
  const candidate: Quest = {
    identity: {
      id: args.identity.id ?? `qst_${token}`,
      slug: `${args.template.id.replace(/_v1$/, "")}_${token}`,
      title,
      schema_version: 1,
      type: args.questType,
      origin: QUEST_GENERATOR_VERSION,
    },
    purpose: {
      reason:
        args.questType === "CREATIVE"
          ? "CREATE"
          : args.questType === "EXPLORATION"
            ? "EXPLORE"
            : args.questType === "KNOWLEDGE"
              ? "ASSESS"
              : args.template.purpose,
      primary_domain: args.template.domain,
      generation_mode: args.mode,
    },
    musical_context: args.context,
    execution: {
      primary_skill: { ...primary, domain: args.template.domain, role: "PRIMARY_SKILL" },
      secondary_skills: args.secondarySkills.map((slug) => ({
        ...entityRef(slug, "SKILL"),
        domain: skillDomain(slug)!,
        role: "SECONDARY_SKILL" as const,
      })),
      required_techniques: args.requiredTechniques.map((slug) => ({
        ...entityRef(slug, "SKILL"),
        domain: skillDomain(slug)!,
        role: "REQUIRED_TECHNIQUE" as const,
      })),
      estimated_minutes: args.estimatedMinutes,
      ...(args.meter ? { meter: args.meter } : {}),
    },
    concepts: args.concepts.map((slug) => entityRef(slug, "CONCEPT")),
    constraints: args.constraints.map((item) => ({
      ...entityRef(item.slug, "CONSTRAINT"),
      parameters: item.parameters ?? {},
    })),
    objective: resolvedObjective,
    completion_contract: {
      attempt_rule: "MEANINGFUL_ACTIVITY",
      minimum_attempt_seconds: 60,
      clear_rule: "ALL_OBJECTIVE_CRITERIA",
      mastery_claimed: false,
    },
    verification_profile:
      resolvedObjective.kind === "IDENTIFICATION"
        ? {
            allowed_modes: ["SELF", "APP_VERIFIED"],
            recommended_mode: "APP_VERIFIED",
            verification_required_for_clear: false,
          }
        : {
            allowed_modes: ["SELF", "SESSION"],
            recommended_mode: "SESSION",
            verification_required_for_clear: false,
          },
    difficulty_profile: { declared_overall_demand: "I", computation_status: "PENDING_DIF_V1" },
    rewards: { policy: "STANDARD_PRACTICE", fixed_xp: null, progression_effects_embedded: false },
    metadata: {
      generator_version: QUEST_GENERATOR_VERSION,
      compatibility_rule_version: QUEST_GENERATOR_RULE_VERSION,
      template_id: args.template.id,
      generation_mode: args.mode,
      seed: args.seed,
      ...(args.identity.nonce ? { generation_nonce: args.identity.nonce } : {}),
      ...(args.identity.generated_at ? { generated_at: args.identity.generated_at } : {}),
      player_specific: false,
    },
  };
  parseQuest(candidate);
  const absolute = evaluateAbsoluteQuestDemand(candidate);
  const finalized = parseQuest({
    ...candidate,
    difficulty_profile: {
      declared_overall_demand: absolute.overall.level,
      computation_status: "COMPUTED",
      ...absolute,
    },
  });
  return { quest: finalized, persistence: toQuestPersistenceInput(finalized) };
}

export function generateQuickQuest(input: QuickQuestInput = {}): GeneratedQuest {
  const effectiveSeed = String(input.seed ?? globalThis.crypto.randomUUID());
  const random = seeded(effectiveSeed);
  const candidates = GENERATOR_TEMPLATES.filter(
    (template) =>
      (!input.primary_domain || template.domain === input.primary_domain) &&
      (!input.quest_type || template.questTypes.includes(input.quest_type)),
  );
  if (!candidates.length)
    throw new QuestGenerationError(
      "NO_COMPATIBLE_TEMPLATE",
      "No generator family matches the Quick filters",
    );
  const template = choose(candidates, random);
  const questType = input.quest_type ?? choose(template.questTypes, random);
  const primarySkill = choose(template.primarySkills, random);
  const concepts = [choose(template.concepts, random)];
  const constraints = validateConstraints(template.defaultConstraints);
  return finalize({
    mode: "QUICK",
    template,
    questType,
    primarySkill,
    concepts,
    secondarySkills: [],
    requiredTechniques: [],
    constraints,
    estimatedMinutes: 10,
    context: contextFor({ tuning: input.tuning }),
    seed: effectiveSeed,
    identity: input,
  });
}

export function generateCustomQuest(input: CustomQuestInput): GeneratedQuest {
  const template = templateForCustom(input);
  const effectiveSeed = String(input.seed ?? "custom-default");
  const random = seeded(effectiveSeed);
  const questType = input.quest_type ?? template.questTypes[0]!;
  const concepts = customList(input.concepts, template.concepts, "CONCEPT", "concepts");
  const selectedConcepts = concepts.length ? concepts : [choose(template.concepts, random)];
  const secondary = customList(
    input.secondary_skills,
    template.secondarySkills,
    "SKILL",
    "secondary_skills",
  );
  const required = customList(
    input.required_techniques,
    template.requiredTechniques,
    "SKILL",
    "required_techniques",
  );
  const roles = [input.primary_skill, ...secondary, ...required];
  if (new Set(roles).size !== roles.length)
    throw new QuestGenerationError("DUPLICATE_SKILL_ROLE", "A Skill may have only one Quest role");
  if (secondary.length > 2 || required.length > 2)
    throw new QuestGenerationError(
      "SKILL_ROLE_LIMIT",
      "Quest allows at most two Secondary and two Required Technique Skills",
    );
  return finalize({
    mode: "CUSTOM",
    template,
    questType,
    primarySkill: input.primary_skill,
    concepts: selectedConcepts,
    secondarySkills: secondary,
    requiredTechniques: required,
    constraints: assembleConstraints(input, template),
    estimatedMinutes: validateEstimatedMinutes(input.estimated_minutes ?? 10),
    meter: input.meter,
    context: contextFor(input),
    seed: effectiveSeed,
    identity: input,
  });
}
