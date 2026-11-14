import { CODEX_ENTRIES, type CodexEntry, type CodexKind } from "@/lib/codex/catalog-v1";
import { createId, type WorkbookDocumentV1 } from "@/lib/workbook/document-v1";
import {
  humanizeQuestValue,
  questConstraintText,
  questContextEntries,
} from "./journey-presentation";
import { questCodexReferences } from "./codex-references";
import type { Quest } from "./runtime";

export type JourneyTopic = {
  key: string;
  kind: CodexKind | "CRITERION";
  slug: string;
  name: string;
  roles: string[];
  codex: CodexEntry | null;
  questDetails: string[];
  moduleKey: string | null;
};

const entryFor = (kind: CodexKind, slug: string) =>
  CODEX_ENTRIES.find((entry) => entry.kind === kind && entry.slug === slug) ?? null;

export function questJourneyTopics(quest: Quest): JourneyTopic[] {
  const topics: JourneyTopic[] = [];
  const add = (topic: JourneyTopic) => {
    const existing = topics.find((item) => item.key === topic.key);
    if (existing) {
      existing.roles = [...new Set([...existing.roles, ...topic.roles])];
      existing.questDetails = [...new Set([...existing.questDetails, ...topic.questDetails])];
    } else topics.push(topic);
  };
  const skills = [
    { value: quest.execution.primary_skill, role: "Primary Skill" },
    ...quest.execution.secondary_skills.map((value) => ({ value, role: "Supporting Skill" })),
    ...quest.execution.required_techniques.map((value) => ({ value, role: "Required Technique" })),
  ];
  for (const { value, role } of skills)
    add({
      key: `SKILL:${value.slug}`,
      kind: "SKILL",
      slug: value.slug,
      name: value.name,
      roles: [role],
      codex: entryFor("SKILL", value.slug),
      questDetails: [
        role === "Primary Skill"
          ? quest.objective.summary
          : "Supports this Quest's shared objective; no separate target is inferred.",
      ],
      moduleKey: value.slug,
    });
  for (const value of quest.concepts)
    add({
      key: `CONCEPT:${value.slug}`,
      kind: "CONCEPT",
      slug: value.slug,
      name: value.name,
      roles: ["Concept"],
      codex: entryFor("CONCEPT", value.slug),
      questDetails: [quest.objective.summary],
      moduleKey: null,
    });
  for (const value of quest.constraints) {
    const detail = questConstraintText({ ...quest, constraints: [value] })[0];
    add({
      key: `CONSTRAINT:${value.slug}`,
      kind: "CONSTRAINT",
      slug: value.slug,
      name: value.name,
      roles: ["Constraint"],
      codex: entryFor("CONSTRAINT", value.slug),
      questDetails: [detail],
      moduleKey: null,
    });
  }
  const contextEntries = questContextEntries(quest);
  for (const reference of questCodexReferences(quest).contexts) {
    const detail = contextEntries.find(
      (item) => item.label.toLowerCase().replaceAll(" ", "_") === reference.role,
    );
    add({
      key: `CONTEXT:${reference.slug}`,
      kind: "CONTEXT",
      slug: reference.slug,
      name: reference.name,
      roles: [humanizeQuestValue(reference.role)],
      codex: entryFor("CONTEXT", reference.slug),
      questDetails: [
        detail ? `${detail.label}: ${detail.value}` : (reference.parameter ?? reference.name),
      ],
      moduleKey: null,
    });
  }
  quest.objective.criteria.forEach((criterion, index) =>
    add({
      key: `CRITERION:${index}:${criterion.metric}`,
      kind: "CRITERION",
      slug: `${criterion.metric}-${index}`,
      name: humanizeQuestValue(criterion.metric),
      roles: ["Objective criterion"],
      codex: null,
      questDetails: [
        `${humanizeQuestValue(criterion.metric)} ${criterion.operator} ${criterion.value}${criterion.unit ? ` ${criterion.unit}` : ""}`,
      ],
      moduleKey: null,
    }),
  );
  return topics;
}

export function topicWorkbookDocument(topic: JourneyTopic, questTitle: string): WorkbookDocumentV1 {
  const source = topic.codex
    ? `${topic.codex.definition}\n\nCodex reference: ${topic.codex.name}`
    : "No verified Codex definition is available for this snapshot item. Use the Quest context below.";
  return {
    type: "GUITARPG_WORKBOOK_DOCUMENT_V1",
    schema_version: 1,
    blocks: [
      { id: createId(), version: 1, type: "heading", level: 1, content: [{ text: topic.name }] },
      { id: createId(), version: 1, type: "paragraph", content: [{ text: source }] },
      {
        id: createId(),
        version: 1,
        type: "heading",
        level: 2,
        content: [{ text: `Within ${questTitle}` }],
      },
      {
        id: createId(),
        version: 1,
        type: "bullet_list",
        items: topic.questDetails.map((text) => [{ text }]),
      },
      {
        id: createId(),
        version: 1,
        type: "heading",
        level: 2,
        content: [{ text: "My notes / observations" }],
      },
      { id: createId(), version: 1, type: "paragraph", content: [{ text: "" }] },
    ],
  };
}
