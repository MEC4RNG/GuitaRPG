import type { CodexKind } from "@/lib/codex/catalog-v1";
import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";

export type LearningLevel = "foundational" | "intermediate" | "advanced";
export type EditorialStatus = "DRAFT_REVIEW" | "PUBLISHED";
export type CodexV2Inline = { text: string; term_id?: string };
export type CodexV2Exercise = {
  id: string;
  title: string;
  setup: string;
  steps: string[];
  self_check: string;
  suggested_minutes: number;
  records_progress: false;
};
export type CodexV2ReferenceBlock = {
  id: string;
  kind: "SCALE_DEGREES" | "TRIAD_FRETBOARD" | "RHYTHM_GRID";
  location: "overview";
};
export type CodexV2Module = {
  id: string;
  level: LearningLevel;
  application_id: string;
  title: string;
  explanation: string;
  outcomes: string[];
  exercises: CodexV2Exercise[];
  visual_components: string[];
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
  overview: string;
  key_distinction: string;
  learning_levels: Array<{ id: LearningLevel; title: string; goal: string }>;
  reference_blocks: CodexV2ReferenceBlock[];
  applications: Array<{ id: string; title: string; summary: string; level_ids: LearningLevel[] }>;
  modules: CodexV2Module[];
  relationships: Array<{
    type: "REQUIRED_PREREQUISITE" | "RECOMMENDED_FOUNDATION" | "RELATED" | "DEVELOPS_TOWARD";
    kind: CodexKind;
    slug: string;
    scope: string;
    why: string;
    review_status: "PROPOSED" | "REVIEWED";
  }>;
};
export type CodexV2Term = {
  id: string;
  slug: string;
  term: string;
  definition: string;
  detail: string;
  group?: string;
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
      ...(data.group === undefined ? {} : { group: string(data.group, "term group", 160) }),
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
    const levelGoals = array(data.learning_levels, "learning levels", 3).map((rawLevel) => {
      const item = object(rawLevel, "learning level");
      const id = string(item.id, "learning level id", 30);
      if (!levels.has(id)) throw new Error("Invalid CODEX_CONTENT_V2: unknown learning level");
      return { id: id as LearningLevel, title: string(item.title, "learning level title", 100), goal: string(item.goal, "learning level goal", 600) };
    });
    if (new Set(levelGoals.map((goal) => goal.id)).size !== levelGoals.length)
      throw new Error("Invalid CODEX_CONTENT_V2: duplicate learning level");

    const blocks: CodexV2ReferenceBlock[] = array(data.reference_blocks, "reference blocks", 12).map((rawBlock) => {
      const item = object(rawBlock, "reference block");
      const id = string(item.id, "reference block id", 150);
      const mediaKind = string(item.kind, "reference block kind", 40);
      const expected: Record<string, CodexV2ReferenceBlock["kind"]> = {
        scale_degree_recognition: "SCALE_DEGREES",
        triad_construction: "TRIAD_FRETBOARD",
        subdivision_control: "RHYTHM_GRID",
      };
      if (mediaKind !== expected[entrySlug] || item.location !== "overview")
        throw new Error("Invalid CODEX_CONTENT_V2: unsupported reference block or musical identity");
      return { id, kind: mediaKind as CodexV2ReferenceBlock["kind"], location: "overview" };
    });
    if (new Set(blocks.map((block) => block.id)).size !== blocks.length)
      throw new Error("Invalid CODEX_CONTENT_V2: duplicate reference block");

    const applications = array(data.applications, "applications", 30).map((rawApplication) => {
      const application = object(rawApplication, "application");
      return {
        id: slug(application.id, "application id"),
        title: string(application.title, "application title", 120),
        summary: string(application.summary, "application summary", 1000),
        level_ids: array(application.level_ids, "application levels", 3).map((value) => {
          const level = string(value, "application level", 30);
          if (!levels.has(level)) throw new Error("Invalid CODEX_CONTENT_V2: unknown application level");
          return level as LearningLevel;
        }),
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
      const outcomes = array(item.outcomes, "module outcomes", 20).map((value) =>
        string(value, "module outcome", 700),
      );
      const exercises: CodexV2Exercise[] = array(item.exercises, "module exercises", 15).map((rawExercise) => {
        const exercise = object(rawExercise, "exercise");
        const duration = exercise.suggested_minutes;
        if (!Number.isInteger(duration) || (duration as number) < 1 || (duration as number) > 120)
          throw new Error("Invalid CODEX_CONTENT_V2: exercise duration outside bounds");
        if (exercise.records_progress !== false)
          throw new Error("Invalid CODEX_CONTENT_V2: Codex exercises cannot record progress");
        return {
          id: string(exercise.id, "exercise id", 150),
          title: string(exercise.title, "exercise title", 250),
          setup: string(exercise.setup, "exercise setup", 1000),
          steps: array(exercise.steps, "exercise steps", 30).map((value) =>
            string(value, "exercise step", 1000)),
          self_check: string(exercise.self_check, "exercise self-check", 800),
          suggested_minutes: duration as number,
          records_progress: false,
        };
      });
      const visual_components = array(item.visual_components, "visual component hints", 20)
        .map((value) => string(value, "visual component hint", 120));
      return {
        id,
        level: level as LearningLevel,
        application_id: applicationId,
        title: string(item.title, "module title", 200),
        explanation: string(item.explanation, "module explanation", 4000),
        outcomes,
        exercises,
        visual_components,
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
        scope: string(relation.scope, "relationship scope", 120),
        why: string(relation.why, "relationship rationale", 1200),
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
      overview: string(data.overview, "full overview", 3000),
      key_distinction: string(data.key_distinction, "key distinction", 1500),
      learning_levels: levelGoals,
      reference_blocks: blocks,
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
