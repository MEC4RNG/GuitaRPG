import type { Quest } from "./runtime";
import type { QuestJourneyStatus } from "./journey-runtime";

export const journeyStatusLabel: Record<QuestJourneyStatus, string> = {
  SAVED: "Saved",
  ACTIVE: "In progress",
  CONCLUDED: "Concluded",
  ABANDONED: "Stopped",
  ARCHIVED: "Archived",
};

export const journeyStageContent = {
  MAP: { label: "Map", verb: "Understand" },
  EXPLORE: { label: "Explore", verb: "Play / Investigate" },
  CRAFT: { label: "Craft", verb: "Create" },
} as const;

export function humanizeQuestValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(humanizeQuestValue).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string")
    return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
  return "";
}

export function questContextEntries(quest: Quest) {
  const context = quest.musical_context;
  if (!context || typeof context !== "object" || Array.isArray(context)) return [];
  return Object.entries(context)
    .map(([key, raw]) => {
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const item = raw as Record<string, unknown>;
        return {
          label: humanizeQuestValue(key),
          value: humanizeQuestValue(item.name ?? item.value ?? item.slug),
        };
      }
      return { label: humanizeQuestValue(key), value: humanizeQuestValue(raw) };
    })
    .filter((entry) => entry.value);
}

export function questConstraintText(quest: Quest) {
  return quest.constraints.map((constraint) => {
    const details = Object.entries(constraint.parameters)
      .map(([key, value]) => `${humanizeQuestValue(key)}: ${humanizeQuestValue(value)}`)
      .filter((value) => !value.endsWith(": "));
    return details.length ? `${constraint.name} — ${details.join(" · ")}` : constraint.name;
  });
}

export function questTargetTempo(quest: Quest): number | null {
  const value = quest.constraints.find((item) => item.slug === "target_tempo")?.parameters.bpm;
  return typeof value === "number" ? value : null;
}
