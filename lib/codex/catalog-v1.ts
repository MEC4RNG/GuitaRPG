import contentDocument from "@/domain/codex/codex-content-v1.json";
import taxonomyDocument from "@/domain/taxonomy/canonical-taxonomy.json";
import legacyDocument from "@/domain/taxonomy/legacy-normalization.json";

export const CODEX_CONTENT_VERSION = "CODEX_CONTENT_V1" as const;
export const CODEX_CATALOG_VERSION = "CODEX_CATALOG_V1" as const;
export const CODEX_KINDS = ["SKILL", "CONCEPT", "CONTEXT", "CONSTRAINT"] as const;
export type CodexKind = (typeof CODEX_KINDS)[number];
export type CodexRouteKind = "skills" | "concepts" | "contexts" | "constraints";
const routeByKind: Record<CodexKind, CodexRouteKind> = {
  SKILL: "skills",
  CONCEPT: "concepts",
  CONTEXT: "contexts",
  CONSTRAINT: "constraints",
};
const kindByRoute = Object.fromEntries(
  Object.entries(routeByKind).map(([kind, route]) => [route, kind]),
) as Record<CodexRouteKind, CodexKind>;
type TaxonomyEntity = (typeof taxonomyDocument.entities)[number];
type ContentEntry = (typeof contentDocument.entries)[number];
export type CodexRelationship = {
  direction: "OUTGOING" | "INCOMING";
  type: string;
  entity: Pick<CodexEntry, "id" | "slug" | "name" | "kind" | "href">;
};
export type CodexEntry = {
  id: string;
  slug: string;
  name: string;
  kind: CodexKind;
  href: string;
  definition: string;
  aliases: string[];
  legacySearchTerms: string[];
  domain: { id: string; name: string } | null;
  metadata: Record<string, unknown>;
  relationships: CodexRelationship[];
};
const eligibleKinds = new Set<string>(CODEX_KINDS);
const activeEntities = taxonomyDocument.entities.filter(
  (entity) => entity.lifecycle === "ACTIVE" && eligibleKinds.has(entity.kind),
);
const allEntities = new Map(taxonomyDocument.entities.map((entity) => [entity.id, entity]));
const contentById = new Map(contentDocument.entries.map((entry) => [entry.entity_id, entry]));

function legacyTermsFor(entity: TaxonomyEntity) {
  return legacyDocument.entries
    .filter((entry) => {
      if (entry.targets.length !== 1 || entry.disposition === "REMOVE") return false;
      const target = entry.targets[0];
      return (
        target.kind === entity.kind &&
        target.slug === entity.slug &&
        (!("parameters" in target) ||
          !target.parameters ||
          Object.keys(target.parameters).length === 0) &&
        entry.legacy_value.toLocaleLowerCase() !== entity.name.toLocaleLowerCase()
      );
    })
    .map((entry) => entry.legacy_value)
    .filter((term, index, terms) => terms.indexOf(term) === index);
}
export function codexHref(entity: Pick<TaxonomyEntity, "kind" | "slug">) {
  if (!eligibleKinds.has(entity.kind)) throw new Error(`Unsupported Codex kind: ${entity.kind}`);
  return `/codex/${routeByKind[entity.kind as CodexKind]}/${entity.slug}`;
}
function assertContent() {
  if (contentDocument.content_version !== CODEX_CONTENT_VERSION)
    throw new Error("Unsupported Codex content version");
  const ids = new Set<string>();
  const definitions = new Set<string>();
  for (const entry of contentDocument.entries) {
    const entity = allEntities.get(entry.entity_id);
    if (!entity || entity.lifecycle !== "ACTIVE" || !eligibleKinds.has(entity.kind))
      throw new Error(`Orphan Codex content: ${entry.entity_id}`);
    if (ids.has(entry.entity_id)) throw new Error(`Duplicate Codex content: ${entry.entity_id}`);
    if (entity.slug !== entry.slug || entity.kind !== entry.kind)
      throw new Error(`Codex identity mismatch: ${entry.slug}`);
    const definition = entry.definition.trim();
    if (
      definition.length < 25 ||
      definition.length > 400 ||
      /todo|tbd|placeholder|lorem ipsum/i.test(definition)
    )
      throw new Error(`Invalid Codex definition: ${entry.slug}`);
    if (definitions.has(definition)) throw new Error(`Duplicate Codex definition: ${entry.slug}`);
    for (const alias of entry.aliases)
      if (!alias.trim() || alias.toLocaleLowerCase() === entity.name.toLocaleLowerCase())
        throw new Error(`Invalid alias: ${entry.slug}`);
    ids.add(entry.entity_id);
    definitions.add(definition);
  }
  if (ids.size !== activeEntities.length)
    throw new Error(`Codex coverage mismatch: ${ids.size}/${activeEntities.length}`);
}
assertContent();
function relationStub(entity: TaxonomyEntity) {
  return {
    id: entity.id,
    slug: entity.slug,
    name: entity.name,
    kind: entity.kind as CodexKind,
    href: eligibleKinds.has(entity.kind) && entity.lifecycle === "ACTIVE" ? codexHref(entity) : "",
  };
}
function domainFor(entity: TaxonomyEntity) {
  if (entity.kind !== "SKILL") return null;
  const edge = taxonomyDocument.relationships.find(
    (relationship) =>
      relationship.relationship_type === "BELONGS_TO" &&
      relationship.source_entity_id === entity.id,
  );
  const domain = edge ? allEntities.get(edge.target_entity_id) : undefined;
  return domain ? { id: domain.id, name: domain.name } : null;
}
function relationshipsFor(entity: TaxonomyEntity): CodexRelationship[] {
  return taxonomyDocument.relationships.flatMap((relationship) => {
    const outgoing = relationship.source_entity_id === entity.id;
    const incoming = relationship.target_entity_id === entity.id;
    if (!outgoing && !incoming) return [];
    const related = allEntities.get(
      outgoing ? relationship.target_entity_id : relationship.source_entity_id,
    );
    if (!related) throw new Error(`Unresolvable relationship target: ${relationship.id}`);
    return [
      {
        direction: outgoing ? "OUTGOING" : "INCOMING",
        type: relationship.relationship_type,
        entity: relationStub(related),
      },
    ];
  });
}
function join(entity: TaxonomyEntity, content: ContentEntry): CodexEntry {
  return {
    id: entity.id,
    slug: entity.slug,
    name: entity.name,
    kind: entity.kind as CodexKind,
    href: codexHref(entity),
    definition: content.definition,
    aliases: [...content.aliases],
    legacySearchTerms: legacyTermsFor(entity),
    domain: domainFor(entity),
    metadata: entity.metadata,
    relationships: relationshipsFor(entity),
  };
}
export const CODEX_ENTRIES = activeEntities
  .map((entity) => join(entity, contentById.get(entity.id)!))
  .sort((a, b) => a.name.localeCompare(b.name));
export function getCodexEntry(routeKind: string, slug: string) {
  const kind = kindByRoute[routeKind as CodexRouteKind];
  return kind
    ? (CODEX_ENTRIES.find((entry) => entry.kind === kind && entry.slug === slug) ?? null)
    : null;
}
export function searchCodex(query = "", kind: CodexKind | "ALL" = "ALL") {
  const needle = query.trim().toLocaleLowerCase();
  return CODEX_ENTRIES.filter(
    (entry) =>
      (kind === "ALL" || entry.kind === kind) &&
      (!needle ||
        [entry.name, entry.slug, entry.definition, ...entry.aliases, ...entry.legacySearchTerms]
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle)),
  );
}
