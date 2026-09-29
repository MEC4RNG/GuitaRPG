import { parseQuest, type Criterion, type Quest } from "@/lib/quest/runtime";

type JsonObject = Record<string, unknown>;

const numberValue = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export type DifficultyFeatures = {
  quest: Quest;
  questType: Quest["identity"]["type"];
  primaryDomain: string;
  primarySkill: string;
  skillSlugs: ReadonlySet<string>;
  skillDomains: ReadonlySet<string>;
  conceptSlugs: ReadonlySet<string>;
  constraints: ReadonlyMap<string, JsonObject>;
  objectiveKind: string;
  criteria: ReadonlyMap<string, Criterion>;
  meter?: string;
  targetBpm?: number;
  timeLimitSeconds?: number;
  stringCount?: number;
  fretSpan?: number;
  outputCount?: number;
};

function criterionNumber(criteria: ReadonlyMap<string, Criterion>, metric: string) {
  return numberValue(criteria.get(metric)?.value);
}

function parameterNumber(constraints: ReadonlyMap<string, JsonObject>, slug: string, key: string) {
  return numberValue(constraints.get(slug)?.[key]);
}

export function extractDifficultyFeatures(input: unknown): DifficultyFeatures {
  const quest = parseQuest(input);
  const constraints = new Map(quest.constraints.map((item) => [item.slug, item.parameters]));
  const criteria = new Map(quest.objective.criteria.map((item) => [item.metric, item]));
  const stringSet = constraints.get("string_set")?.strings;
  const explicitStrings = Array.isArray(stringSet) ? stringSet.length : undefined;
  const stringCount = explicitStrings ?? parameterNumber(constraints, "string_count", "count");
  const fretMin = parameterNumber(constraints, "fret_range", "min");
  const fretMax = parameterNumber(constraints, "fret_range", "max");
  const outputCount =
    criterionNumber(criteria, "variations_created") ??
    criterionNumber(criteria, "distinct_interpretations") ??
    criterionNumber(criteria, "output_length") ??
    parameterNumber(constraints, "variation_count", "min") ??
    parameterNumber(constraints, "output_length", "bars");

  return {
    quest,
    questType: quest.identity.type,
    primaryDomain: quest.purpose.primary_domain,
    primarySkill: quest.execution.primary_skill.slug,
    skillSlugs: new Set(
      [
        quest.execution.primary_skill,
        ...quest.execution.secondary_skills,
        ...quest.execution.required_techniques,
      ].map((skill) => skill.slug),
    ),
    skillDomains: new Set(
      [
        quest.execution.primary_skill,
        ...quest.execution.secondary_skills,
        ...quest.execution.required_techniques,
      ].map((skill) => skill.domain),
    ),
    conceptSlugs: new Set(quest.concepts.map((concept) => concept.slug)),
    constraints,
    objectiveKind: quest.objective.kind,
    criteria,
    meter:
      typeof (quest.execution as Record<string, unknown>).meter === "string"
        ? String((quest.execution as Record<string, unknown>).meter)
        : undefined,
    targetBpm:
      parameterNumber(constraints, "target_tempo", "bpm") ??
      criterionNumber(criteria, "target_tempo"),
    timeLimitSeconds:
      parameterNumber(constraints, "time_limit", "seconds") ??
      criterionNumber(criteria, "time_elapsed"),
    stringCount,
    fretSpan: fretMin === undefined || fretMax === undefined ? undefined : fretMax - fretMin,
    outputCount,
  };
}

export function featureNumber(features: DifficultyFeatures, constraint: string, parameter: string) {
  return parameterNumber(features.constraints, constraint, parameter);
}

export function criterionNumberValue(features: DifficultyFeatures, metric: string) {
  return criterionNumber(features.criteria, metric);
}
