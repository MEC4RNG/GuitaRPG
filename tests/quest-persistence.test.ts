import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");
const migration = read("supabase/migrations/20260928030000_qst_002_quest_persistence.sql");
const databaseTest = read("supabase/tests/database/quest_persistence_rls.test.sql");

describe("QST-002 Quest persistence implementation", () => {
  it("creates immutable player-owned Quest and composition tables", () => {
    for (const table of [
      "quests",
      "quest_skill_roles",
      "quest_concepts",
      "quest_contexts",
      "quest_constraints",
      "quest_objective_criteria",
    ]) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain("references auth.users(id) on delete cascade");
    expect(migration).toContain("resolved_snapshot jsonb not null");
    expect(migration).not.toContain("grant update on table public.quests to authenticated");
  });

  it("enforces QST-001 composition, taxonomy, and boundary invariants", () => {
    expect(migration).toContain("primary_domain_id must reference a DOMAIN taxonomy entity");
    expect(migration).toContain("primary_skill_id must reference a SKILL taxonomy entity");
    expect(migration).toContain(
      "TUNING quest context must reference a TUNING Context taxonomy entity",
    );
    expect(migration).toContain("Quest requires at least one canonical Concept");
    expect(migration).toContain("Quest requires one to three Constraints");
    expect(migration).toContain("Quest requires at least one Objective criterion");
    expect(migration).toContain("mastery_claimed' = 'false'");
    expect(migration).toContain("progression_effects_embedded' = 'false'");
  });

  it("ships pgTAP RLS, lifecycle, and composition coverage", () => {
    for (const phrase of [
      "create extension if not exists pgtap",
      "owner sees only their immutable Quest",
      "non-owner cannot read another Player Quest",
      "anonymous role cannot read private Quests",
      "owner cannot update immutable Quest rows",
      "taxonomy kind validation rejects a Skill as a Quest Concept",
      "deleting Auth identity cascades Quest persistence",
    ])
      expect(databaseTest).toContain(phrase);
  });
});
