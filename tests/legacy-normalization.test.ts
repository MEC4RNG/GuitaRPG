import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type SourceOccurrence = {
  source: string;
  level: number | null;
};

type Entry = {
  legacy_value: string;
  source_occurrences: SourceOccurrence[];
  legacy_levels_are_provenance_only: boolean;
  disposition: string;
  targets: Array<{ kind: string; slug: string; name: string; domain?: string }>;
  notes: string;
};

type Manifest = {
  source_categories: string[];
  source_occurrence_count: number;
  unique_legacy_value_count: number;
  allowed_dispositions: string[];
  entries: Entry[];
};

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(root, "challenge.js"), "utf8");
const manifest = JSON.parse(
  readFileSync(resolve(root, "domain/taxonomy/legacy-normalization.json"), "utf8"),
) as Manifest;

function extractLegacyData(name: string): unknown {
  const marker = `const ${name} =`;
  const start = source.indexOf(marker);
  expect(start, `missing legacy declaration ${name}`).toBeGreaterThanOrEqual(0);

  const equals = source.indexOf("=", start) + 1;
  const semicolon = source.indexOf(";", equals);
  const expression = source.slice(equals, semicolon).trim();

  // challenge.js contains static array/object literals for these declarations.
  return Function(`"use strict"; return (${expression});`)();
}

function sourceOccurrences() {
  const rows: Array<{ source: string; level: number | null; value: string }> = [];

  for (const category of manifest.source_categories) {
    const value = extractLegacyData(category);

    if (Array.isArray(value)) {
      for (const item of value) rows.push({ source: category, level: null, value: String(item) });
      continue;
    }

    for (const [level, items] of Object.entries(value as Record<string, unknown[]>)) {
      for (const item of items) {
        rows.push({ source: category, level: Number(level), value: String(item) });
      }
    }
  }

  return rows;
}

describe("TAX-002 legacy normalization", () => {
  it("accounts for every legacy value and occurrence exactly", () => {
    const sourceRows = sourceOccurrences();
    const sourceValues = [...new Set(sourceRows.map((row) => row.value))].sort();
    const manifestValues = manifest.entries.map((entry) => entry.legacy_value).sort();

    expect(sourceRows).toHaveLength(manifest.source_occurrence_count);
    expect(sourceValues).toHaveLength(manifest.unique_legacy_value_count);
    expect(manifestValues).toEqual(sourceValues);

    const provenanceCount = manifest.entries.reduce(
      (total, entry) => total + entry.source_occurrences.length,
      0,
    );
    expect(provenanceCount).toBe(sourceRows.length);

    const key = (value: string, sourceName: string, level: number | null) =>
      `${value}::${sourceName}::${level ?? "null"}`;

    const sourceKeys = sourceRows
      .map((row) => key(row.value, row.source, row.level))
      .sort();

    const manifestKeys = manifest.entries
      .flatMap((entry) =>
        entry.source_occurrences.map((occurrence) =>
          key(entry.legacy_value, occurrence.source, occurrence.level),
        ),
      )
      .sort();

    expect(manifestKeys).toEqual(sourceKeys);
  });

  it("uses only accepted dispositions and treats legacy levels as provenance", () => {
    const allowed = new Set(manifest.allowed_dispositions);

    for (const entry of manifest.entries) {
      expect(allowed.has(entry.disposition), entry.legacy_value).toBe(true);
      expect(entry.legacy_levels_are_provenance_only, entry.legacy_value).toBe(true);
      expect(entry.notes.length, entry.legacy_value).toBeGreaterThan(0);
    }
  });

  it("assigns a canonical domain to every Skill target", () => {
    const domains = new Set([
      "technique",
      "fretboard",
      "harmony_theory",
      "rhythm",
      "ear_musicianship",
      "creativity_expression",
    ]);

    for (const entry of manifest.entries) {
      for (const target of entry.targets) {
        if (target.kind === "SKILL") {
          expect(domains.has(target.domain ?? ""), `${entry.legacy_value} -> ${target.slug}`).toBe(
            true,
          );
        }
      }
    }
  });
});
