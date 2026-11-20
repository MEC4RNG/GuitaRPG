import type { CodexKind } from "@/lib/codex/catalog-v1";
import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";

export type LearningLevel = "foundational" | "intermediate" | "advanced";
export type EditorialStatus = "DRAFT_REVIEW" | "PUBLISHED";
export type CodexV2Inline = { text: string; term_id?: string };
export type CodexV2Module = {
  id: string;
  level: LearningLevel;
  application_id: string;
  title: string;
  explanation: string;
  steps: string[];
  editorial_status: EditorialStatus;
};
export type CodexV2Entry = {
  entity_id: string;
  kind: CodexKind;
  slug: string;
  revision: string;
  editorial_status: EditorialStatus;
  one_line: string;
  intro: CodexV2Inline[];
  applications: Array<{ id: string; title: string }>;
  modules: CodexV2Module[];
  relationships: Array<{
    type: "REQUIRED_PREREQUISITE" | "RECOMMENDED_FOUNDATION" | "RELATED" | "DEVELOPS_TOWARD";
    kind: CodexKind;
    slug: string;
    review_status: "PROPOSED" | "REVIEWED";
  }>;
};
export type CodexV2Term = {
  id: string;
  slug: string;
  term: string;
  definition: string;
  detail: string;
  editorial_status: EditorialStatus;
  related?: { kind: CodexKind; slug: string };
};
export type CodexV2Catalog = {
  schema: "SOUND_UNCHARTED_CODEX_V2";
  content_version: "CODEX_CONTENT_V2";
  entries: CodexV2Entry[];
  terms: CodexV2Term[];
};

const levels = new Set(["foundational", "intermediate", "advanced"]);
const kinds = new Set(["SKILL", "CONCEPT", "CONTEXT", "CONSTRAINT"]);
const relationTypes = new Set([
  "REQUIRED_PREREQUISITE",
  "RECOMMENDED_FOUNDATION",
  "RELATED",
  "DEVELOPS_TOWARD",
]);
const byIdentity = new Map(CODEX_ENTRIES.map((entry) => [`${entry.kind}:${entry.slug}`, entry]));

function object(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`Invalid CODEX_CONTENT_V2: ${name} must be an object`);
  return value as Record<string, unknown>;
}
function array(value: unknown, name: string, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length > limit)
    throw new Error(`Invalid CODEX_CONTENT_V2: ${name} must be a bounded array`);
  return value;
}
function string(value: unknown, name: string, max = 5000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(`Invalid CODEX_CONTENT_V2: ${name} must contain bounded text`);
  return value;
}
function slug(value: unknown, name: string): string {
  const result = string(value, name, 100);
  if (!/^[a-z0-9_]+$/.test(result))
    throw new Error(`Invalid CODEX_CONTENT_V2: ${name} must be a canonical slug`);
  return result;
}
function kind(value: unknown, name: string): CodexKind {
  if (typeof value !== "string" || !kinds.has(value))
    throw new Error(`Invalid CODEX_CONTENT_V2: ${name} has invalid kind`);
  return value as CodexKind;
}
function canonical(kindValue: CodexKind, slugValue: string) {
  const resolved = byIdentity.get(`${kindValue}:${slugValue}`);
  if (!resolved)
    throw new Error(
      `Invalid CODEX_CONTENT_V2: unknown canonical reference ${kindValue}:${slugValue}`,
    );
  return resolved;
}
function editorial(value: unknown, allowDrafts: boolean, name: string): EditorialStatus {
  if (value !== "DRAFT_REVIEW" && value !== "PUBLISHED")
    throw new Error(`Invalid CODEX_CONTENT_V2: ${name} has invalid editorial state`);
  if (!allowDrafts && value !== "PUBLISHED")
    throw new Error(`Invalid CODEX_CONTENT_V2: ${name} is not published`);
  return value;
}

export function parseCodexV2(input: unknown, allowDrafts = false): CodexV2Catalog {
  const document = object(input, "catalog");
  if (
    document.schema !== "SOUND_UNCHARTED_CODEX_V2" ||
    document.content_version !== "CODEX_CONTENT_V2"
  )
    throw new Error("Invalid CODEX_CONTENT_V2: unsupported catalog version");

  const terms: CodexV2Term[] = [];
  const seenTerms = new Set<string>();
  for (const [index, raw] of array(document.terms, "terms", 4000).entries()) {
    const data = object(raw, `term ${index}`);
    const id = string(data.id, "term id", 110);
    const termSlug = slug(data.slug, "term slug");
    if (id !== `vocab:${termSlug}` || seenTerms.has(id))
      throw new Error("Invalid CODEX_CONTENT_V2: duplicate or mismatched term identity");
    seenTerms.add(id);
    const related = data.related ? object(data.related, "term related reference") : null;
    const relatedKind = related ? kind(related.kind, "term reference kind") : null;
    const relatedSlug = related ? slug(related.slug, "term reference slug") : null;
    if (relatedKind && relatedSlug) canonical(relatedKind, relatedSlug);
    terms.push({
      id,
      slug: termSlug,
      term: string(data.term, "term name", 110),
      definition: string(data.definition, "term definition", 600),
      detail: string(data.detail, "term detail", 2000),
      editorial_status: editorial(data.editorial_status, allowDrafts, "term"),
      ...(relatedKind && relatedSlug ? { related: { kind: relatedKind, slug: relatedSlug } } : {}),
    });
  }

  const entries: CodexV2Entry[] = [];
  const seenEntries = new Set<string>();
  const seenModules = new Set<string>();
  for (const [index, raw] of array(document.entries, "entries", 500).entries()) {
    const data = object(raw, `entry ${index}`);
    const entryKind = kind(data.kind, "entry kind");
    const entrySlug = slug(data.slug, "entry slug");
    const canonicalEntry = canonical(entryKind, entrySlug);
    if (canonicalEntry.id !== data.entity_id)
      throw new Error("Invalid CODEX_CONTENT_V2: entry taxonomy UUID mismatch");
    const key = `${entryKind}:${entrySlug}`;
    if (seenEntries.has(key)) throw new Error("Invalid CODEX_CONTENT_V2: duplicate entry");
    seenEntries.add(key);
    const status = editorial(data.editorial_status, allowDrafts, "entry");
    const intro: CodexV2Inline[] = array(data.intro, "intro", 50).map((rawInline) => {
      const part = object(rawInline, "intro text");
      const run: CodexV2Inline = { text: string(part.text, "intro text", 1000) };
      if (part.term_id !== undefined) {
        const termId = string(part.term_id, "intro glossary id", 110);
        if (!seenTerms.has(termId))
          throw new Error("Invalid CODEX_CONTENT_V2: missing glossary annotation");
        run.term_id = termId;
      }
      return run;
    });
    const applications = array(data.applications, "applications", 30).map((rawApplication) => {
      const application = object(rawApplication, "application");
      return {
        id: slug(application.id, "application id"),
        title: string(application.title, "application title", 120),
      };
    });
    if (new Set(applications.map((application) => application.id)).size !== applications.length)
      throw new Error("Invalid CODEX_CONTENT_V2: duplicate application");
    const moduleList: CodexV2Module[] = array(data.modules, "modules", 120).map((rawModule) => {
      const item = object(rawModule, "module");
      const id = string(item.id, "module id", 120);
      if (!/^[a-z0-9._-]+$/.test(id) || seenModules.has(id))
        throw new Error("Invalid CODEX_CONTENT_V2: duplicate or invalid module id");
      seenModules.add(id);
      const level = string(item.level, "module level", 30);
      const applicationId = slug(item.application_id, "module application");
      if (
        !levels.has(level) ||
        !applications.some((application) => application.id === applicationId)
      )
        throw new Error("Invalid CODEX_CONTENT_V2: unknown module level or application");
      const moduleStatus = editorial(item.editorial_status, allowDrafts, "module");
      if (status === "PUBLISHED" && moduleStatus !== "PUBLISHED")
        throw new Error("Invalid CODEX_CONTENT_V2: published entry contains draft module");
      const steps = array(item.steps, "exercise steps", 30).map((step) =>
        string(step, "exercise step", 1000),
      );
      return {
        id,
        level: level as LearningLevel,
        application_id: applicationId,
        title: string(item.title, "module title", 200),
        explanation: string(item.explanation, "module explanation", 4000),
        steps,
        editorial_status: moduleStatus,
      };
    });
    const relationships: CodexV2Entry["relationships"] = array(
      data.relationships,
      "relationships",
      50,
    ).map((rawRelationship) => {
      const relation = object(rawRelationship, "relationship");
      const relationKind = kind(relation.kind, "relationship kind");
      const relationSlug = slug(relation.slug, "relationship slug");
      canonical(relationKind, relationSlug);
      if (typeof relation.type !== "string" || !relationTypes.has(relation.type))
        throw new Error("Invalid CODEX_CONTENT_V2: unknown relationship type");
      if (relation.review_status !== "REVIEWED" && relation.review_status !== "PROPOSED")
        throw new Error("Invalid CODEX_CONTENT_V2: unknown relationship review state");
      if (status === "PUBLISHED" && relation.review_status !== "REVIEWED")
        throw new Error("Invalid CODEX_CONTENT_V2: published entry contains proposed relationship");
      return {
        type: relation.type as CodexV2Entry["relationships"][number]["type"],
        kind: relationKind,
        slug: relationSlug,
        review_status: relation.review_status as "REVIEWED" | "PROPOSED",
      };
    });
    entries.push({
      entity_id: canonicalEntry.id,
      kind: entryKind,
      slug: entrySlug,
      revision: string(data.revision, "entry revision", 80),
      editorial_status: status,
      one_line: string(data.one_line, "entry summary", 400),
      intro,
      applications,
      modules: moduleList,
      relationships,
    });
  }
  return {
    schema: "SOUND_UNCHARTED_CODEX_V2",
    content_version: "CODEX_CONTENT_V2",
    entries,
    terms,
  };
}

export function canonicalCodexHref(kindValue: CodexKind, slugValue: string) {
  return canonical(kindValue, slugValue).href;
}

/** Published canonical identity remains the authority for display names. */
export function canonicalCodexName(kindValue: CodexKind, slugValue: string) {
  return canonical(kindValue, slugValue).name;
}
