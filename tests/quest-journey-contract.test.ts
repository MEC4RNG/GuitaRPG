import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");

describe("QST-006 Quest Journey contract", () => {
  const migration = read(
    "supabase/migrations/20261017000000_qst_006_quest_journey_persistence.sql",
  );

  it("adds one owner-scoped Journey per immutable Quest", () => {
    expect(migration).toContain("create table public.player_quest_journeys");
    expect(migration).toContain("quest_id uuid primary key references public.quests(id)");
    expect(migration).toContain(
      "alter table public.player_quest_journeys enable row level security",
    );
    expect(migration).toContain("player_id = (select auth.uid())");
    expect(migration).not.toContain("xp_ledger");
    expect(migration).not.toContain("player_skill_state");
  });

  it("exposes only explicit trusted mutation boundaries", () => {
    for (const signature of [
      "public.ensure_quest_journey(uuid)",
      "public.save_generated_quest_journey(jsonb,text)",
      "public.set_quest_journey_stage(uuid,text)",
      "public.transition_quest_journey(uuid,text)",
    ]) {
      expect(migration).toContain(`revoke all on function ${signature}`);
      expect(migration).toContain(`grant execute on function ${signature}`);
    }
    expect(migration).toContain("security definer set search_path = ''");
    expect(migration).toContain(
      "grant select on table public.player_quest_journeys to authenticated",
    );
  });

  it("ships Save, Start, Practice, draft replacement, and the durable route", () => {
    const generate = read("components/generate-quest-surface.tsx");
    const route = read("components/quest-journey-surface.tsx");
    const practice = read("lib/quest/start-journey-practice.ts");
    expect(generate).toContain("Save Quest");
    expect(generate).toContain("Start Quest");
    expect(generate).toContain("Replace your unsaved Quest draft?");
    expect(generate).toContain("window.sessionStorage");
    expect(route).toContain('MAP", "EXPLORE", "CRAFT');
    expect(route).toContain("startJourneyPractice");
    expect(practice).toContain("startPracticeSession");
    expect(read("app/quest/[questId]/page.tsx")).toContain("QuestJourneySurface");
  });
});
