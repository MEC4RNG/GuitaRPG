import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";
import type { QuestCodexReference } from "@/lib/quest/codex-references";

const ROLE_COPY: Record<string, string> = {
  primary_skill: "This is the primary skill targeted by your Quest.",
  secondary_skill: "This skill supports the Quest's primary focus.",
  required_technique: "This technique is required for the Quest's execution.",
  concept: "This musical concept is used by the Quest.",
  constraint: "This defines a requirement or boundary for the Quest.",
  tuning: "This tuning provides musical context for the Quest.",
  style: "This style provides musical context for the Quest.",
  playing_role: "This playing role provides musical context for the Quest.",
  accompaniment: "This accompaniment provides musical context for the Quest.",
  tonal_center: "This tonal center provides musical context for the Quest.",
};

export const codexQuestRelevance = (role: string) =>
  ROLE_COPY[role] ?? "This reference provides verified context for the Quest.";

export const findCodexPeekEntry = (reference: QuestCodexReference) =>
  CODEX_ENTRIES.find(
    (candidate) => candidate.kind === reference.kind && candidate.slug === reference.slug,
  ) ?? null;
