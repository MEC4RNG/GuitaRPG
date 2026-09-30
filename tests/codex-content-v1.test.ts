import content from "@/domain/codex/codex-content-v1.json";
import taxonomy from "@/domain/taxonomy/canonical-taxonomy.json";
import { describe, expect, it } from "vitest";

describe("CODEX_CONTENT_V1", () => {
  it("covers every active eligible canonical entity exactly once", () => {
    const eligible = taxonomy.entities.filter(
      (entity) =>
        entity.lifecycle === "ACTIVE" &&
        ["SKILL", "CONCEPT", "CONTEXT", "CONSTRAINT"].includes(entity.kind),
    );
    expect(content.content_version).toBe("CODEX_CONTENT_V1");
    expect(content.entries).toHaveLength(197);
    expect(new Set(content.entries.map((entry) => entry.entity_id)).size).toBe(197);
    expect(
      Object.fromEntries(
        ["SKILL", "CONCEPT", "CONTEXT", "CONSTRAINT"].map((kind) => [
          kind,
          content.entries.filter((entry) => entry.kind === kind).length,
        ]),
      ),
    ).toEqual({ SKILL: 72, CONCEPT: 64, CONTEXT: 31, CONSTRAINT: 30 });
    expect(new Set(content.entries.map((entry) => entry.definition)).size).toBe(197);
    expect(new Set(content.entries.map((entry) => entry.entity_id))).toEqual(
      new Set(eligible.map((entity) => entity.id)),
    );
  });

  it("keeps content identities and useful definitions aligned", () => {
    for (const entry of content.entries) {
      const entity = taxonomy.entities.find((candidate) => candidate.id === entry.entity_id);
      expect(entity && { slug: entity.slug, kind: entity.kind }).toEqual({
        slug: entry.slug,
        kind: entry.kind,
      });
      expect(entry.definition.length).toBeGreaterThanOrEqual(25);
      expect(entry.definition.length).toBeLessThanOrEqual(400);
      expect(entry.definition).not.toMatch(/todo|tbd|placeholder|lorem ipsum/i);
    }
  });
});
