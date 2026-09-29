import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");
const migration = read("supabase/migrations/20260929020000_qst_003_r1_generate_bridge.sql");
const databaseTest = read("supabase/tests/database/generated_quest_bridge.test.sql");

describe("QST-003-R1 generated Quest persistence boundary", () => {
  it("defines one protected authenticated atomic writer", () => {
    expect(migration).toContain("public.persist_generated_quest(p_quest jsonb)");
    expect(migration).toContain("caller_id uuid := auth.uid()");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("Only QST_GEN_V1 Quests");
    expect(migration).toContain("Only QUICK or CUSTOM generated Quests");
    expect(migration).toContain("revoke all on function public.persist_generated_quest(jsonb)");
    expect(migration).toContain(
      "grant execute on function public.persist_generated_quest(jsonb) to authenticated",
    );
    expect(migration).not.toContain("p_player_id");
  });

  it("writes the entire accepted Quest graph and resolves active taxonomy", () => {
    for (const table of [
      "public.quests",
      "public.quest_skill_roles",
      "public.quest_concepts",
      "public.quest_contexts",
      "public.quest_constraints",
      "public.quest_objective_criteria",
    ])
      expect(migration).toContain(`insert into ${table}`);
    expect(migration).toContain("lifecycle = 'ACTIVE'");
    expect(migration).toContain("set constraints all immediate");
    expect(migration).toContain("Quest persistence and snapshot identities must agree");
  });

  it("ships pgTAP ownership, integrity, rollback, Session, and deletion coverage", () => {
    for (const phrase of [
      "unauthenticated generated Quest persistence is denied",
      "durable Quest ID equals resolved snapshot identity",
      "DORIAN generated Quest graph persists",
      "unknown taxonomy rejects the whole generated Quest graph",
      "owner starts a Session for the persisted generated Quest",
      "another Player cannot start the generated Quest",
      "account deletion cascades generated Quest",
    ])
      expect(databaseTest).toContain(phrase);
  });
});
