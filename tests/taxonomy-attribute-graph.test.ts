import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type Entity = { id: string; kind: string; slug: string; lifecycle: string };
type Edge = {
  id: string;
  relationship_type: "AFFECTS";
  source_entity_id: string;
  target_entity_id: string;
  skill_slug: string;
  attribute_slug: string;
  metadata: Record<string, unknown>;
};

const root = resolve(import.meta.dirname, "..");
const taxonomy = JSON.parse(
  readFileSync(resolve(root, "domain/taxonomy/canonical-taxonomy.json"), "utf8"),
) as {
  counts: Record<string, number>;
  entities: Entity[];
  relationships: Array<{
    id: string;
    relationship_type: string;
    source_entity_id: string;
    target_entity_id: string;
  }>;
};
const graph = JSON.parse(
  readFileSync(resolve(root, "domain/taxonomy/skill-attribute-affects-v1.json"), "utf8"),
) as {
  graph_version: string;
  numeric_weights: boolean;
  active_skill_count: number;
  attribute_count: number;
  edge_count: number;
  attribute_contributor_counts: Record<string, number>;
  edges: Edge[];
};
const entities = new Map(taxonomy.entities.map((entity) => [entity.id, entity]));

describe("ATTRIBUTE_GRAPH_V1", () => {
  it("covers all active Skills and all canonical Attributes with valid endpoints", () => {
    const activeSkills = taxonomy.entities.filter(
      (entity) => entity.kind === "SKILL" && entity.lifecycle === "ACTIVE",
    );
    const attributes = taxonomy.entities.filter(
      (entity) => entity.kind === "ATTRIBUTE" && entity.lifecycle === "ACTIVE",
    );
    expect(activeSkills).toHaveLength(72);
    expect(attributes).toHaveLength(11);
    expect(graph).toMatchObject({
      graph_version: "ATTRIBUTE_GRAPH_V1",
      numeric_weights: false,
      active_skill_count: 72,
      attribute_count: 11,
      edge_count: 141,
    });
    expect(new Set(graph.edges.map((edge) => edge.source_entity_id))).toEqual(
      new Set(activeSkills.map((skill) => skill.id)),
    );
    expect(new Set(graph.edges.map((edge) => edge.target_entity_id))).toEqual(
      new Set(attributes.map((attribute) => attribute.id)),
    );
    for (const edge of graph.edges) {
      expect(entities.get(edge.source_entity_id)?.kind).toBe("SKILL");
      expect(entities.get(edge.target_entity_id)?.kind).toBe("ATTRIBUTE");
    }
  });

  it("has stable unique relationship identities and pairs", () => {
    expect(new Set(graph.edges.map((edge) => edge.id)).size).toBe(141);
    expect(
      new Set(graph.edges.map((edge) => `${edge.source_entity_id}:${edge.target_entity_id}`)).size,
    ).toBe(141);
    expect(graph.edges[0].id).toBe("91000000-0000-4000-8000-000000000001");
    expect(graph.edges.at(-1)?.id).toBe("91000000-0000-4000-8000-000000000141");
  });

  it("preserves the DORIAN anchor relationships", () => {
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ skill_slug: "hybrid_picking", attribute_slug: "coordination" }),
        expect.objectContaining({ skill_slug: "scale_mapping", attribute_slug: "fretboard" }),
        expect.objectContaining({ skill_slug: "syncopation_control", attribute_slug: "rhythm" }),
      ]),
    );
  });

  it("is conservative and contains no numeric contribution weights", () => {
    const edgeCounts = new Map<string, number>();
    for (const edge of graph.edges)
      edgeCounts.set(edge.skill_slug, (edgeCounts.get(edge.skill_slug) ?? 0) + 1);
    expect(Math.min(...edgeCounts.values())).toBe(1);
    expect(Math.max(...edgeCounts.values())).toBe(3);
    expect(Object.values(graph.attribute_contributor_counts).every((count) => count > 0)).toBe(
      true,
    );
    expect(JSON.stringify(graph)).not.toMatch(/"(?:weight|contribution|importance)"\s*:/);
  });

  it("does not alter canonical entities or the existing BELONGS_TO graph", () => {
    expect(taxonomy.counts.entities).toBe(216);
    expect(taxonomy.relationships).toHaveLength(72);
    expect(
      taxonomy.relationships.filter((edge) => edge.relationship_type === "BELONGS_TO"),
    ).toHaveLength(72);
    expect(new Set(taxonomy.relationships.map((edge) => edge.id)).size).toBe(72);
  });
});
