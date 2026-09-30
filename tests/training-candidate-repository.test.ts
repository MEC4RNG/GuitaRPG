import { describe, expect, it } from "vitest";
import taxonomy from "@/domain/taxonomy/canonical-taxonomy.json";
import {
  readRecommendationCandidatesV1,
  type TrainingCandidateReadClient,
} from "@/lib/training/repository";

class Query implements PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> {
  constructor(
    private readonly result: { data: unknown[] | null; error: { message: string } | null },
  ) {}
  select() {
    return this;
  }
  eq() {
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }
  then<TResult1 = { data: unknown[] | null; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: {
          data: unknown[] | null;
          error: { message: string } | null;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

const entities = taxonomy.entities.filter((item) => item.lifecycle === "ACTIVE");
const skills = entities.filter((item) => item.kind === "SKILL");
const states = skills.map((skill) => ({
  skill_id: skill.id,
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
  proficiency_model_version: "PROF_V1",
  confidence_model_version: "CONF_V1",
  readiness_model_version: "READY_V1",
}));

function client(refreshError: boolean): TrainingCandidateReadClient {
  const data: Record<string, unknown[]> = {
    player_profiles: [{ challenge_preference: "BALANCED", typical_session_minutes: 20 }],
    player_goals: [],
    player_tuning_preferences: [],
    player_skill_states: states,
    taxonomy_entities: entities,
  };
  return {
    rpc: async () => ({ data: null, error: refreshError ? { message: "failed" } : null }),
    from: (table) => new Query({ data: data[table] ?? [], error: null }),
  };
}

describe("TRN-001 candidate repository", () => {
  it("refreshes readiness before returning one on-demand snapshot", async () => {
    const result = await readRecommendationCandidatesV1(client(false), "2026-09-29T12:00:00Z");
    expect(result.candidates).toHaveLength(15);
    expect(result.evaluated_at).toBe("2026-09-29T12:00:00Z");
  });

  it("refuses to classify potentially stale readiness after refresh failure", async () => {
    await expect(readRecommendationCandidatesV1(client(true))).rejects.toThrow(
      "Current readiness is unavailable",
    );
  });
});
