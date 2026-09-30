import {
  buildRecommendationCandidateSetV1,
  type CandidateGoal,
  type CandidatePlayerContext,
  type CandidateSkillState,
  type CandidateTaxonomyEntity,
  type RecommendationCandidateSetV1,
} from "./candidates-v1";
import { rankRecommendationCandidatesV1, type RankedRecommendationSetV1 } from "./scoring-v1";

type Response = { data: unknown[] | null; error: { message: string } | null };
type Query = {
  select(columns: string): Query;
  eq(column: string, value: string | boolean): Query;
  order(column: string, options?: { ascending?: boolean }): Query;
  limit(count: number): Query;
  then: PromiseLike<Response>["then"];
};

export type TrainingCandidateReadClient = {
  from(table: string): Query;
  rpc(
    name: "refresh_player_readiness",
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

function rows<T>(response: Response, label: string): T[] {
  if (response.error) throw new Error(`${label} is unavailable`);
  return (response.data ?? []) as T[];
}

export async function readRecommendationCandidatesV1(
  client: TrainingCandidateReadClient,
  evaluatedAt = new Date().toISOString(),
): Promise<RecommendationCandidateSetV1> {
  const refresh = await client.rpc("refresh_player_readiness");
  if (refresh.error) throw new Error("Current readiness is unavailable");

  const [profileResponse, goalsResponse, tuningResponse, statesResponse, entitiesResponse] =
    await Promise.all([
      client
        .from("player_profiles")
        .select("challenge_preference,typical_session_minutes")
        .limit(1),
      client
        .from("player_goals")
        .select("id,domain_id,skill_id,objective,priority,is_active")
        .eq("is_active", true)
        .order("priority"),
      client
        .from("player_tuning_preferences")
        .select("tuning_context_id,rank,is_default")
        .eq("is_default", true)
        .limit(1),
      client
        .from("player_skill_states")
        .select(
          "skill_id,assessment_status,visible_level,proficiency_score,confidence_score,readiness_status,readiness_score,exposure_count,evidence_count,last_practiced_at,last_evidence_at,proficiency_model_version,confidence_model_version,readiness_model_version",
        )
        .order("skill_id"),
      client
        .from("taxonomy_entities")
        .select("id,kind,slug,name:display_name,lifecycle")
        .eq("lifecycle", "ACTIVE")
        .order("id"),
    ]);

  const profile = rows<Omit<CandidatePlayerContext, "default_tuning">>(
    profileResponse,
    "Training profile",
  )[0];
  if (!profile) throw new Error("Training profile is unavailable");
  const entities = rows<CandidateTaxonomyEntity>(entitiesResponse, "Training taxonomy");
  const tuningId = rows<{ tuning_context_id: string }>(tuningResponse, "Default tuning")[0]
    ?.tuning_context_id;
  const tuning = entities.find((entity) => entity.id === tuningId && entity.kind === "CONTEXT");
  return buildRecommendationCandidateSetV1({
    evaluated_at: evaluatedAt,
    entities,
    skill_states: rows<CandidateSkillState>(statesResponse, "Training Skill snapshot"),
    goals: rows<CandidateGoal>(goalsResponse, "Training goals"),
    player_context: {
      ...profile,
      default_tuning: tuning ? { id: tuning.id, slug: tuning.slug, name: tuning.name } : null,
    },
  });
}

export async function readRankedRecommendationsV1(
  client: TrainingCandidateReadClient,
  evaluatedAt = new Date().toISOString(),
): Promise<RankedRecommendationSetV1> {
  return rankRecommendationCandidatesV1(await readRecommendationCandidatesV1(client, evaluatedAt));
}
