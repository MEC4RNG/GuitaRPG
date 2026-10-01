import { CODEX_ENTRIES, type CodexKind } from "@/lib/codex/catalog-v1";
import type { Quest, TaxonomyReference } from "@/lib/quest/runtime";

export type QuestCodexReference = {
  kind: CodexKind;
  slug: string;
  name: string;
  role: string;
  href: string | null;
  parameter?: string;
};

export function resolveCodexReference(
  kind: CodexKind,
  reference: TaxonomyReference,
  role: string,
  parameter?: string,
): QuestCodexReference {
  const entry = CODEX_ENTRIES.find(
    (candidate) => candidate.kind === kind && candidate.slug === reference.slug,
  );
  return {
    kind,
    slug: reference.slug,
    name: reference.name,
    role,
    href: entry?.href ?? null,
    ...(parameter ? { parameter } : {}),
  };
}

function contextReferences(quest: Quest) {
  const context = quest.musical_context;
  if (!context || typeof context !== "object" || Array.isArray(context)) return [];
  const contextRecord = context as Record<string, unknown>;
  const refs: QuestCodexReference[] = [];
  for (const role of ["tuning", "style", "playing_role", "accompaniment"] as const) {
    const value = contextRecord[role];
    const valueRecord = value as Record<string, unknown> | null;
    if (
      valueRecord &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof valueRecord.slug === "string" &&
      typeof valueRecord.name === "string"
    ) {
      refs.push(resolveCodexReference("CONTEXT", valueRecord as TaxonomyReference, role));
    }
  }
  const tonalCenter = contextRecord.tonal_center;
  const tonalCenterRecord = tonalCenter as Record<string, unknown> | null;
  if (
    tonalCenterRecord &&
    typeof tonalCenter === "object" &&
    !Array.isArray(tonalCenter) &&
    typeof tonalCenterRecord.pitch_class === "string"
  ) {
    refs.push(
      resolveCodexReference(
        "CONTEXT",
        { slug: "tonal_center", name: "Tonal Center" },
        "tonal_center",
        tonalCenterRecord.pitch_class,
      ),
    );
  }
  return refs;
}

function parameterSummary(parameters: Record<string, unknown>) {
  if (typeof parameters.bpm === "number") return `${parameters.bpm} BPM`;
  if (Array.isArray(parameters.strings)) return `Strings ${parameters.strings.join("–")}`;
  if (typeof parameters.min === "number" && typeof parameters.max === "number")
    return `${parameters.min}–${parameters.max}`;
  if (typeof parameters.seconds === "number") return `${parameters.seconds} seconds`;
  return undefined;
}

export function questCodexReferences(quest: Quest) {
  return {
    primarySkill: resolveCodexReference("SKILL", quest.execution.primary_skill, "primary_skill"),
    secondarySkills: quest.execution.secondary_skills.map((reference) =>
      resolveCodexReference("SKILL", reference, "secondary_skill"),
    ),
    requiredTechniques: quest.execution.required_techniques.map((reference) =>
      resolveCodexReference("SKILL", reference, "required_technique"),
    ),
    concepts: quest.concepts.map((reference) =>
      resolveCodexReference("CONCEPT", reference, "concept"),
    ),
    constraints: quest.constraints.map((reference) =>
      resolveCodexReference(
        "CONSTRAINT",
        reference,
        "constraint",
        parameterSummary(reference.parameters),
      ),
    ),
    contexts: contextReferences(quest),
  };
}
