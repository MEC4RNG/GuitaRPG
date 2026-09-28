import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const migration = read("supabase/migrations/20260928020000_ply_002_player_persistence.sql");
const databaseTest = read("supabase/tests/database/player_persistence_rls.test.sql");

describe("PLY-002 Player persistence implementation", () => {
  it("creates the Player-authored and system-derived persistence layers", () => {
    for (const table of [
      "player_profiles",
      "player_tuning_preferences",
      "player_setups",
      "player_goals",
      "player_skill_states",
      "player_character_states",
      "player_attribute_states",
    ]) {
      expect(migration, table).toContain(`create table public.${table}`);
      expect(migration, table).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("keys every Player-owned table to auth.users with cascade deletion", () => {
    expect(migration.match(/references auth\.users\(id\) on delete cascade/g)).toHaveLength(7);
    expect(migration).not.toMatch(/email\s*=|display_name\s*=.*auth/i);
  });

  it("bootstraps the canonical new-Player state without fake proficiency", () => {
    expect(migration).toContain("create or replace function private.ensure_player_state");
    expect(migration).toContain("after insert on auth.users");
    expect(migration).toContain("where kind = 'SKILL'");
    expect(migration).toContain("where kind = 'ATTRIBUTE'");
    expect(migration).toContain("assessment_status text not null default 'UNRATED'");
    expect(migration).toContain("assessment_status text not null default 'UNASSESSED'");
    expect(migration).toContain("practice_xp bigint not null default 0");
    expect(migration).toContain("character_level integer not null default 1");
  });

  it("separates editable Player state from derived authoritative state", () => {
    expect(migration).toContain(
      "grant update (\n  display_name,\n  locale,\n  timezone,\n  experience_background",
    );
    expect(migration).toContain(
      "grant select on table public.player_skill_states to authenticated",
    );
    expect(migration).not.toContain(
      "grant update on table public.player_skill_states to authenticated",
    );
    expect(migration).not.toContain(
      "grant update on table public.player_character_states to authenticated",
    );
    expect(migration).not.toContain(
      "grant update on table public.player_attribute_states to authenticated",
    );
  });

  it("enforces PLY/PROG null, confidence, and visible-level invariants", () => {
    expect(migration).toContain("assessment_status = 'UNRATED'");
    expect(migration).toContain("confidence_score = 0");
    expect(migration).toContain("readiness_status = 'UNKNOWN'");
    expect(migration).toContain("assessment_status <> 'ESTABLISHED'");
    expect(migration).toContain("confidence_score >= 60");
    expect(migration).toContain("visible_level = 'V' and proficiency_score >= 80");
    expect(migration).toContain("assessment_status = 'UNASSESSED' and score is null");
  });

  it("stores tuning as Context preference rather than duplicating Skills", () => {
    expect(migration).toContain("tuning_context_id uuid not null");
    expect(migration).toContain("tuning_context_id must reference a CONTEXT taxonomy entity");
    expect(migration).toContain("primary key (player_id, skill_id)");
    expect(migration).not.toMatch(/player_skill_states[\s\S]{0,500}tuning_context_id/);
  });

  it("uses explicit operation policies and auth.uid ownership", () => {
    expect(migration).toContain("player_profiles_owner_select");
    expect(migration).toContain("player_profiles_owner_update");
    expect(migration).toContain("player_tuning_preferences_owner_insert");
    expect(migration).toContain("player_setups_owner_delete");
    expect(migration).toContain("player_goals_owner_update");
    expect(migration).toContain("player_skill_states_owner_select");
    expect(migration).toContain("using ((select auth.uid()) = player_id)");
    expect(migration).toContain("with check ((select auth.uid()) = player_id)");
  });

  it("ships executable pgTAP coverage for security and lifecycle behavior", () => {
    expect(databaseTest).toContain("create extension if not exists pgtap");
    expect(databaseTest).toContain("set local role anon");
    expect(databaseTest).toContain("set local role authenticated");
    expect(databaseTest).toContain("set local role service_role");
    expect(databaseTest).toContain("non-owner cannot read another Player profile");
    expect(databaseTest).toContain("owner cannot directly mutate derived Skill state");
    expect(databaseTest).toContain(
      "anonymous Auth user receives the same owner-isolated Player model",
    );
    expect(databaseTest).toContain(
      "deleting Auth identity cascades Player-owned and derived persistence",
    );
  });
});
