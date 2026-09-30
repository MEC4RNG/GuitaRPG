import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const migration = read("supabase/migrations/20260929090000_prog_006_recompute_ops.sql");
const databaseTest = read("supabase/tests/database/progression_recompute.test.sql");

describe("PROG-006 progression operations contract", () => {
  it("adds separate append-only correction and private recompute receipt stores", () => {
    expect(migration).toContain("create table public.practice_xp_correction_ledger");
    expect(migration).toContain("create table private.progression_recompute_runs");
    expect(migration).toContain("unique (player_id, idempotency_key)");
    expect(migration).toContain(
      "grant insert on table public.practice_xp_correction_ledger to service_role",
    );
    expect(migration).not.toMatch(/grant (update|delete).*practice_xp_correction_ledger/i);
  });

  it("keeps correction and recomputation service-only", () => {
    expect(migration).toContain("private.apply_practice_xp_correction_v1");
    expect(migration).toContain("private.admin_recompute_player_progression_v1");
    expect(migration).toMatch(
      /revoke all on function private\.apply_practice_xp_correction_v1[\s\S]+from public,anon,authenticated/,
    );
    expect(migration).toMatch(
      /revoke all on function private\.admin_recompute_player_progression_v1[\s\S]+from public,anon,authenticated/,
    );
    expect(migration).not.toMatch(/grant execute[\s\S]{0,200}to authenticated/);
  });

  it("records the complete accepted V1 model bundle", () => {
    for (const version of [
      "XP_V1",
      "CHAR_V1",
      "PROF_V1",
      "CONF_V1",
      "READY_V1",
      "ATTR_V1",
      "ATTRIBUTE_GRAPH_V1",
    ]) {
      expect(migration).toContain(`'${version}'`);
    }
  });

  it("audits exact Result awards and Result×Skill identities before applying replay", () => {
    expect(migration).toContain("MISSING_RESULT_AWARD");
    expect(migration).toContain("MISSING_SKILL_EVENT");
    expect(migration).toContain("MISSING_SKILL_BASELINE");
    expect(migration).toContain("MODEL_VERSION_MISMATCH");
    expect(migration).toContain("safe_to_recompute");
  });

  it("preserves the accepted Character → Skill → readiness → Attribute rebuild order", () => {
    const body = migration.slice(
      migration.lastIndexOf("create or replace function private.rebuild_player_progression_v1"),
    );
    expect(body.indexOf("rebuild_player_character_state")).toBeLessThan(
      body.indexOf("rebuild_player_skill_states_v1"),
    );
    expect(body.indexOf("rebuild_player_skill_states_v1")).toBeLessThan(
      body.indexOf("refresh_player_readiness_v1"),
    );
    expect(body.indexOf("refresh_player_readiness_v1")).toBeLessThan(
      body.indexOf("rebuild_player_attributes_v1"),
    );
  });

  it("tests correction safety, deterministic drift repair, and immutable source history", () => {
    expect(databaseTest).toContain("negative aggregate XP is rejected");
    expect(databaseTest).toContain("healthy same-as-of recompute is semantic no-op");
    expect(databaseTest).toContain("missing historical Skill event makes audit unsafe");
    expect(databaseTest).toContain("recompute leaves Result unchanged");
    expect(databaseTest).toContain("DORIAN +31-day readiness is LOW 33.18");
  });

  it("introduces no browser or product correction workflow", () => {
    const applicationSources = [
      read("app/character/page.tsx"),
      read("app/skills/page.tsx"),
      read("components/character-progression-surface.tsx"),
      read("components/skills-progression-surface.tsx"),
    ].join("\n");
    expect(applicationSources).not.toMatch(
      /apply_practice_xp_correction|admin_recompute_player_progression/,
    );
  });
});
