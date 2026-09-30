import {
  buildCharacterProgressionView,
  buildSkillsProgressionView,
  type AttributeStateRow,
  type CharacterProgressionView,
  type CharacterStateRow,
  type SkillStateRow,
  type SkillView,
  type TaxonomyEntity,
  type TaxonomyRelationship,
} from "./read-model";

type ReadResponse<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

type ProgressionQuery<T> = {
  select(columns: string): ProgressionQuery<T>;
  eq(column: string, value: string): ProgressionQuery<T>;
  order(column: string, options?: { ascending?: boolean }): ProgressionQuery<T>;
  limit(count: number): ProgressionQuery<T>;
  then: ReadResponse<T>["then"];
};

export type ProgressionReadClient = {
  from(table: string): ProgressionQuery<unknown>;
  rpc(name: "refresh_player_readiness"): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

export type SkillsReadResult = {
  skills: SkillView[];
  readinessCurrent: boolean;
};

function rows<T>(
  response: { data: unknown[] | null; error: { message: string } | null },
  scope: string,
) {
  if (response.error) throw new Error(`${scope} is unavailable`);
  return (response.data ?? []) as T[];
}

export async function readCharacterProgression(
  client: ProgressionReadClient,
): Promise<CharacterProgressionView> {
  const [characterResponse, statesResponse, attributesResponse] = await Promise.all([
    client
      .from("player_character_states")
      .select(
        "practice_xp,character_level,total_practice_seconds,xp_model_version,character_model_version",
      )
      .limit(1),
    client
      .from("player_attribute_states")
      .select("attribute_id,assessment_status,score")
      .order("attribute_id"),
    client
      .from("taxonomy_entities")
      .select("id,kind,slug,display_name,lifecycle")
      .eq("kind", "ATTRIBUTE")
      .eq("lifecycle", "ACTIVE")
      .order("display_name"),
  ]);
  const character = rows<CharacterStateRow>(characterResponse, "Character progression")[0];
  if (!character) throw new Error("Character progression is unavailable");
  return buildCharacterProgressionView({
    character,
    attributeStates: rows<AttributeStateRow>(statesResponse, "Attribute progression"),
    attributeEntities: rows<TaxonomyEntity>(attributesResponse, "Attribute taxonomy"),
  });
}

export async function readSkillsProgression(
  client: ProgressionReadClient,
): Promise<SkillsReadResult> {
  const refresh = await client.rpc("refresh_player_readiness");
  const readinessCurrent = !refresh.error;
  const [skillsResponse, domainsResponse, relationshipsResponse, statesResponse] =
    await Promise.all([
      client
        .from("taxonomy_entities")
        .select("id,kind,slug,display_name,lifecycle")
        .eq("kind", "SKILL")
        .eq("lifecycle", "ACTIVE")
        .order("display_name"),
      client
        .from("taxonomy_entities")
        .select("id,kind,slug,display_name,lifecycle")
        .eq("kind", "DOMAIN")
        .eq("lifecycle", "ACTIVE")
        .order("display_name"),
      client
        .from("taxonomy_relationships")
        .select("relationship_type,source_entity_id,target_entity_id")
        .eq("relationship_type", "BELONGS_TO")
        .order("source_entity_id"),
      client
        .from("player_skill_states")
        .select(
          "skill_id,assessment_status,visible_level,proficiency_score,confidence_score,readiness_status,readiness_score,exposure_count,evidence_count,last_practiced_at,last_evidence_at",
        )
        .order("skill_id"),
    ]);
  return {
    readinessCurrent,
    skills: buildSkillsProgressionView({
      skillEntities: rows<TaxonomyEntity>(skillsResponse, "Skill taxonomy"),
      domainEntities: rows<TaxonomyEntity>(domainsResponse, "Domain taxonomy"),
      relationships: rows<TaxonomyRelationship>(relationshipsResponse, "Skill domains"),
      skillStates: rows<SkillStateRow>(statesResponse, "Skill progression"),
    }),
  };
}
