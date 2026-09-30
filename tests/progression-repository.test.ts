import { describe, expect, it } from "vitest";

import {
  readCharacterProgression,
  readSkillsProgression,
  type ProgressionReadClient,
} from "@/lib/progression/repository";

class Query implements PromiseLike<{ data: unknown[]; error: null }> {
  private result: unknown[];
  constructor(rows: unknown[]) {
    this.result = [...rows];
  }
  select() {
    return this;
  }
  eq(column: string, value: string) {
    this.result = this.result.filter((row) => (row as Record<string, unknown>)[column] === value);
    return this;
  }
  order() {
    return this;
  }
  limit(count: number) {
    this.result = this.result.slice(0, count);
    return this;
  }
  then<TResult1 = { data: unknown[]; error: null }, TResult2 = never>(
    onfulfilled?:
      ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: this.result, error: null }).then(onfulfilled, onrejected);
  }
}

function client(fixtures: Record<string, unknown[]>, readinessError = false) {
  const calls: string[] = [];
  const value = {
    from(table: string) {
      calls.push(table);
      return new Query(fixtures[table] ?? []);
    },
    rpc(name: string) {
      calls.push(`rpc:${name}`);
      return Promise.resolve({ data: null, error: readinessError ? { message: "offline" } : null });
    },
  } as unknown as ProgressionReadClient;
  return { value, calls };
}

describe("UX-003 progression repositories", () => {
  it("loads Character state, Attributes, and taxonomy in three bounded reads", async () => {
    const fake = client({
      player_character_states: [
        {
          practice_xp: 15,
          character_level: 1,
          total_practice_seconds: 612,
          xp_model_version: "XP_V1",
          character_model_version: "CHAR_V1",
        },
      ],
      player_attribute_states: [
        { attribute_id: "coordination", assessment_status: "ESTIMATED", score: 55.3 },
      ],
      taxonomy_entities: [
        {
          id: "coordination",
          kind: "ATTRIBUTE",
          slug: "coordination",
          display_name: "Coordination",
          lifecycle: "ACTIVE",
        },
      ],
    });
    const model = await readCharacterProgression(fake.value);
    expect(fake.calls).toEqual([
      "player_character_states",
      "player_attribute_states",
      "taxonomy_entities",
    ]);
    expect(model).toMatchObject({
      progress: { practiceXp: 15 },
      totalPracticeSeconds: 612,
      attributes: [{ name: "Coordination", assessmentStatus: "ESTIMATED", score: 55.3 }],
    });
  });

  it("refreshes owner readiness once before four batched Skill reads", async () => {
    const fake = client({
      taxonomy_entities: [
        {
          id: "skill",
          kind: "SKILL",
          slug: "hybrid_picking",
          display_name: "Hybrid Picking",
          lifecycle: "ACTIVE",
        },
        {
          id: "domain",
          kind: "DOMAIN",
          slug: "technique",
          display_name: "Technique",
          lifecycle: "ACTIVE",
        },
      ],
      taxonomy_relationships: [
        { relationship_type: "BELONGS_TO", source_entity_id: "skill", target_entity_id: "domain" },
      ],
      player_skill_states: [
        {
          skill_id: "skill",
          assessment_status: "UNRATED",
          visible_level: null,
          proficiency_score: null,
          confidence_score: 0,
          readiness_status: "UNKNOWN",
          readiness_score: null,
          exposure_count: 0,
          evidence_count: 0,
          last_practiced_at: null,
          last_evidence_at: null,
        },
      ],
    });
    const result = await readSkillsProgression(fake.value);
    expect(fake.calls).toEqual([
      "rpc:refresh_player_readiness",
      "taxonomy_entities",
      "taxonomy_entities",
      "taxonomy_relationships",
      "player_skill_states",
    ]);
    expect(result.readinessCurrent).toBe(true);
    expect(result.skills).toHaveLength(1);
  });

  it("keeps Skill data available while explicitly flagging refresh failure", async () => {
    const fake = client(
      { taxonomy_entities: [], taxonomy_relationships: [], player_skill_states: [] },
      true,
    );
    await expect(readSkillsProgression(fake.value)).resolves.toEqual({
      skills: [],
      readinessCurrent: false,
    });
  });
});
