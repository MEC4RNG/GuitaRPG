import contract from "@/domain/ux/studio-atlas-candidate.json";
import type { SavedQuestSummary } from "@/lib/quest/library-runtime";
import type { QuestJourneyStatus } from "@/lib/quest/journey-runtime";
import type { Quest } from "@/lib/quest/runtime";
import { humanizeQuestValue } from "@/lib/quest/journey-presentation";

export const questDomains = contract.domains;

export function questDomainIdentity(quest: Quest) {
  return questDomains.find((domain) => domain.slug === quest.purpose.primary_domain) ?? null;
}

export type QuestLibraryFilters = {
  search: string;
  status: "ALL" | QuestJourneyStatus;
  domain: string;
};

/** Filters loaded owner-scoped summaries only; never implies full-library search. */
export function filterLoadedQuests(items: readonly SavedQuestSummary[], filters: QuestLibraryFilters) {
  const terms = filters.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(({ quest, journey }) => {
    if (filters.status !== "ALL" && journey.lifecycleStatus !== filters.status) return false;
    if (filters.domain && quest.purpose.primary_domain !== filters.domain) return false;
    const searchable = [
      quest.identity.title,
      quest.execution.primary_skill.name,
      ...quest.execution.secondary_skills.map((skill) => skill.name),
      ...quest.execution.required_techniques.map((skill) => skill.name),
      ...quest.concepts.map((concept) => concept.name),
      questDomainIdentity(quest)?.name ?? quest.purpose.primary_domain,
      quest.objective.summary,
    ].join(" ").toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}

export function questCriterionLabel(criterion: Quest["objective"]["criteria"][number]) {
  const metric = humanizeQuestValue(criterion.metric);
  const comparison = criterion.operator === "GTE" ? "at least" : criterion.operator === "LTE" ? "at most" : "equals";
  return `${metric}: ${comparison} ${humanizeQuestValue(criterion.value)}${criterion.unit ? ` ${criterion.unit}` : ""}`;
}
