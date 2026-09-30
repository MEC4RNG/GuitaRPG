import { CODEX_ENTRIES, codexHref, getCodexEntry, searchCodex } from "@/lib/codex/catalog-v1";
import { describe, expect, it } from "vitest";

describe("CODEX_CATALOG_V1", () => {
  it("keeps representative entities in their canonical kinds", () => {
    expect(getCodexEntry("contexts", "dadgad")?.kind).toBe("CONTEXT");
    expect(getCodexEntry("concepts", "dorian")?.kind).toBe("CONCEPT");
    const alternate = getCodexEntry("skills", "alternate_picking");
    expect(alternate?.domain?.name).toBe("Technique");
    expect(getCodexEntry("constraints", "target_tempo")?.kind).toBe("CONSTRAINT");
    expect(getCodexEntry("concepts", "alternate_picking")).toBeNull();
    expect(CODEX_ENTRIES).toHaveLength(197);
  });

  it("builds stable type-scoped links and searches names, copy, and safe terms", () => {
    expect(codexHref({ kind: "SKILL", slug: "alternate_picking" })).toBe(
      "/codex/skills/alternate_picking",
    );
    expect(searchCodex("Dorian").map((entry) => entry.slug)).toContain("dorian");
    expect(searchCodex("Barre Chords").map((entry) => entry.slug)).toContain(
      "barre_chord_fretting",
    );
    expect(searchCodex("Atonal & Serial Techniques")).toHaveLength(0);
    expect(
      searchCodex("A").find((entry) => entry.slug === "tonal_center")?.legacySearchTerms,
    ).not.toContain("A");
    expect(searchCodex("", "CONSTRAINT")).toHaveLength(30);
  });

  it("uses canonical relationship data without inventing links", () => {
    const alternate = getCodexEntry("skills", "alternate_picking")!;
    expect(alternate.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "BELONGS_TO", direction: "OUTGOING" }),
      ]),
    );
    expect(
      alternate.relationships.every((relationship) => relationship.type === "BELONGS_TO"),
    ).toBe(true);
  });
});
