import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type LegacyTarget = {
  kind: string;
  slug: string;
  parameters?: Record<string, unknown>;
};

type LegacyEntry = {
  legacy_value: string;
  source_occurrences: unknown[];
  disposition: string;
  targets: LegacyTarget[];
};

type LegacyManifest = {
  entries: LegacyEntry[];
  source_occurrence_count: number;
  unique_legacy_value_count: number;
};

type SeedEntity = {
  id: string;
  kind: string;
  slug: string;
  name: string;
  lifecycle: string;
  metadata: Record<string, unknown>;
  primary_domain_slug?: string;
};

type SeedRelationship = {
  id: string;
  relationship_type: string;
  source_entity_id: string;
  target_entity_id: string;
};

type SeedLegacyMapping = {
  id: string;
  legacy_value: string;
  disposition: string;
  source_occurrences: unknown[];
  targets: Array<{
    ordinal: number;
    entity_id: string;
    kind: string;
    slug: string;
    parameters: Record<string, unknown>;
  }>;
};

type SeedManifest = {
  counts: Record<string, number>;
  entity_kinds: string[];
  relationship_types: string[];
  entities: SeedEntity[];
  relationships: SeedRelationship[];
  legacy_mappings: SeedLegacyMapping[];
};

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const legacy = JSON.parse(read("domain/taxonomy/legacy-normalization.json")) as LegacyManifest;
const seed = JSON.parse(read("domain/taxonomy/canonical-taxonomy.json")) as SeedManifest;
const migration = read("supabase/migrations/20260928010000_tax_003_canonical_taxonomy.sql");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

describe("TAX-003 canonical taxonomy seed", () => {
  it("seeds the canonical v1 inventory with stable unique identities", () => {
    expect(seed.counts).toMatchObject({
      entities: 196,
      domains: 6,
      skills: 72,
      concepts: 64,
      contexts: 28,
      constraints: 13,
      attributes: 11,
      tags: 2,
      relationships: 72,
      legacy_mappings: 207,
      legacy_mapping_targets: 238,
      legacy_source_occurrences: 216,
    });

    const ids = new Set<string>();
    const kindSlugs = new Set<string>();

    for (const entity of seed.entities) {
      expect(UUID_RE.test(entity.id), entity.slug).toBe(true);
      expect(SLUG_RE.test(entity.slug), entity.slug).toBe(true);
      expect(entity.lifecycle).toBe("ACTIVE");
      expect(ids.has(entity.id), entity.id).toBe(false);
      expect(kindSlugs.has(`${entity.kind}:${entity.slug}`), entity.slug).toBe(false);
      ids.add(entity.id);
      kindSlugs.add(`${entity.kind}:${entity.slug}`);

      expect(entity).not.toHaveProperty("level");
      expect(entity).not.toHaveProperty("difficulty");
      expect(entity).not.toHaveProperty("proficiency");
      expect(entity).not.toHaveProperty("xp");
    }
  });

  it("contains exactly the six TAX-001 Domains and eleven Attributes", () => {
    const domains = seed.entities
      .filter((entity) => entity.kind === "DOMAIN")
      .map((entity) => entity.slug);

    expect(domains).toEqual([
      "technique",
      "fretboard",
      "harmony_theory",
      "rhythm",
      "ear_musicianship",
      "creativity_expression",
    ]);

    const attributes = seed.entities
      .filter((entity) => entity.kind === "ATTRIBUTE")
      .map((entity) => entity.slug)
      .sort();

    expect(attributes).toEqual(
      [
        "dexterity",
        "precision",
        "coordination",
        "control",
        "endurance",
        "fretboard",
        "rhythm",
        "theory",
        "ear",
        "creativity",
        "expression",
      ].sort(),
    );
  });

  it("gives every Skill exactly one BELONGS_TO Domain relationship", () => {
    const entities = new Map(seed.entities.map((entity) => [entity.id, entity]));
    const skills = seed.entities.filter((entity) => entity.kind === "SKILL");

    for (const skill of skills) {
      const belongs = seed.relationships.filter(
        (relationship) =>
          relationship.relationship_type === "BELONGS_TO" &&
          relationship.source_entity_id === skill.id,
      );

      expect(belongs, skill.slug).toHaveLength(1);

      const domain = entities.get(belongs[0].target_entity_id);
      expect(domain?.kind, skill.slug).toBe("DOMAIN");
      expect(domain?.slug, skill.slug).toBe(skill.primary_domain_slug);
    }
  });

  it("preserves every TAX-002 mapping, target, parameter, and source occurrence", () => {
    expect(seed.legacy_mappings).toHaveLength(legacy.unique_legacy_value_count);

    const byLegacyValue = new Map(
      seed.legacy_mappings.map((mapping) => [mapping.legacy_value, mapping]),
    );

    let occurrenceCount = 0;
    let targetCount = 0;

    for (const legacyEntry of legacy.entries) {
      const mapping = byLegacyValue.get(legacyEntry.legacy_value);
      expect(mapping, legacyEntry.legacy_value).toBeDefined();
      expect(mapping?.disposition).toBe(legacyEntry.disposition);
      expect(mapping?.source_occurrences).toEqual(legacyEntry.source_occurrences);

      occurrenceCount += mapping?.source_occurrences.length ?? 0;
      targetCount += mapping?.targets.length ?? 0;

      expect(
        mapping?.targets.map((target) => ({
          kind: target.kind,
          slug: target.slug,
          parameters: Object.keys(target.parameters).length > 0 ? target.parameters : undefined,
        })),
        legacyEntry.legacy_value,
      ).toEqual(
        legacyEntry.targets.map((target) => ({
          kind: target.kind,
          slug: target.slug,
          parameters: target.parameters,
        })),
      );
    }

    expect(occurrenceCount).toBe(legacy.source_occurrence_count);
    expect(targetCount).toBe(238);
  });

  it("keeps all DORIAN_CROSSROADS taxonomy dependencies resolvable", () => {
    const keys = new Set(seed.entities.map((entity) => `${entity.kind}:${entity.slug}`));

    for (const key of [
      "SKILL:hybrid_picking",
      "SKILL:scale_mapping",
      "SKILL:syncopation_control",
      "CONCEPT:dorian",
      "CONCEPT:eighth_note_subdivision",
      "CONCEPT:syncopation",
    ]) {
      expect(keys.has(key), key).toBe(true);
    }
  });

  it("installs read-only public taxonomy tables and private legacy provenance", () => {
    expect(migration).toContain("public.taxonomy_entities");
    expect(migration).toContain("public.taxonomy_relationships");
    expect(migration).toContain("private.taxonomy_legacy_mappings");
    expect(migration).toContain("private.taxonomy_legacy_mapping_targets");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain(
      "grant select on table public.taxonomy_entities to anon, authenticated",
    );
    expect(migration).toContain(
      "grant select on table public.taxonomy_relationships to anon, authenticated",
    );
    expect(migration).toContain(
      "revoke all on table public.taxonomy_entities from anon, authenticated",
    );
    expect(migration).toContain(
      "revoke all on function private.seed_taxonomy_v1() from public, anon, authenticated",
    );
  });

  it("implements an idempotent migration-owned seed without mutable client authority", () => {
    expect(migration).toContain("create or replace function private.seed_taxonomy_v1()");
    expect(migration).toContain("on conflict (id) do update");
    expect(migration).toContain("on conflict (mapping_id, ordinal) do update");
    expect(read("supabase/seed.sql")).toContain("select private.seed_taxonomy_v1();");

    for (const entity of seed.entities) {
      expect(migration, entity.slug).toContain(entity.id);
      expect(migration, entity.slug).toContain(`'${entity.slug}'`);
    }

    for (const relationship of seed.relationships) {
      expect(migration, relationship.id).toContain(relationship.id);
    }

    for (const mapping of seed.legacy_mappings) {
      expect(migration, mapping.legacy_value).toContain(mapping.id);
      expect(migration, mapping.legacy_value).toContain(mapping.legacy_value.replaceAll("'", "''"));
    }
  });

  it("enforces structural relationship semantics and stable published identity", () => {
    expect(migration).toContain("taxonomy entity IDs are immutable");
    expect(migration).toContain("published taxonomy slugs are immutable");
    expect(migration).toContain("BELONGS_TO requires SKILL -> DOMAIN");
    expect(migration).toContain("AFFECTS requires SKILL -> ATTRIBUTE");
    expect(migration).toContain("relationship would create a cycle");
    expect(migration).toContain("taxonomy_one_primary_domain_per_skill_idx");
  });

  it("makes the remote migration fail atomically if seed counts are incomplete", () => {
    expect(migration).toContain("TAX-003 expected 196 canonical entities");
    expect(migration).toContain("TAX-003 expected 72 BELONGS_TO relationships");
    expect(migration).toContain("TAX-003 expected 207 legacy mappings");
    expect(migration).toContain("TAX-003 expected 238 legacy mapping targets");
    expect(migration).toContain("Skills without exactly one Domain");
  });
});
