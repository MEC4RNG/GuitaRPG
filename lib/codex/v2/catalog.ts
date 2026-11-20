import published from "@/domain/codex/v2/published.json";
import { parseCodexV2, type CodexV2Entry, type CodexV2Term } from "./content";

const catalog = parseCodexV2(published);

/** Only editorially published V2 material may be consumed by public routes. */
export const PUBLISHED_CODEX_V2_ENTRIES: readonly CodexV2Entry[] = catalog.entries;
export const PUBLISHED_CODEX_V2_TERMS: readonly CodexV2Term[] = catalog.terms;

export function publishedCodexV2Entry(kind: string, slug: string) {
  const routeKind: Record<string, string> = {
    skills: "SKILL",
    concepts: "CONCEPT",
    contexts: "CONTEXT",
    constraints: "CONSTRAINT",
  };
  return (
    catalog.entries.find((entry) => entry.kind === routeKind[kind] && entry.slug === slug) ?? null
  );
}
