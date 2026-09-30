export type ProfileGoalKind = "SKILL" | "DOMAIN" | "OBJECTIVE";

export type ProfileGoal = {
  id: string | null;
  kind: ProfileGoalKind;
  targetId: string | null;
  objective: string;
};

export type ProfileTaxonomyEntity = {
  id: string;
  kind: "SKILL" | "DOMAIN" | "CONTEXT";
  slug: string;
  name: string;
};

export type ProfileSnapshot = {
  authenticated: boolean;
  initialized: boolean;
  displayName: string;
  experienceBackground: string;
  typicalSessionMinutes: number | null;
  challengePreference: string;
  onboardingStatus: string;
  calibrationStatus: string;
  defaultTuningContextId: string | null;
  goals: ProfileGoal[];
  domains: ProfileTaxonomyEntity[];
  skills: ProfileTaxonomyEntity[];
  tunings: ProfileTaxonomyEntity[];
};

type Result<T> = { data: T | null; error: { message: string } | null };
type Query<T> = PromiseLike<Result<T>> & {
  select(columns: string): Query<T>;
  eq(column: string, value: string | boolean): Query<T>;
  order(column: string, options?: { ascending?: boolean }): Query<T>;
  limit(count: number): Query<T>;
  maybeSingle(): Query<T>;
};

export type ProfileClient = {
  auth: { getUser(): PromiseLike<{ data: { user: { id: string } | null } }> };
  from<T = unknown>(table: string): Query<T>;
  rpc(
    name: "save_player_profile_v1",
    parameters: {
      p_display_name: string | null;
      p_experience_background: string;
      p_typical_session_minutes: number | null;
      p_challenge_preference: string;
      p_default_tuning_context_id: string | null;
      p_goals: Array<{
        id: string | null;
        kind: ProfileGoalKind;
        target_id: string | null;
        objective: string | null;
      }>;
    },
  ): PromiseLike<{ error: { message: string } | null }>;
};

const emptySnapshot = (authenticated: boolean): ProfileSnapshot => ({
  authenticated,
  initialized: false,
  displayName: "",
  experienceBackground: "UNSPECIFIED",
  typicalSessionMinutes: null,
  challengePreference: "BALANCED",
  onboardingStatus: "NOT_STARTED",
  calibrationStatus: "NOT_STARTED",
  defaultTuningContextId: null,
  goals: [],
  domains: [],
  skills: [],
  tunings: [],
});

export async function readProfileSnapshot(client: ProfileClient): Promise<ProfileSnapshot> {
  const auth = await client.auth.getUser();
  if (!auth.data.user) return emptySnapshot(false);

  const [profileResult, tuningResult, goalsResult, taxonomyResult] = await Promise.all([
    client
      .from<Record<string, unknown>>("player_profiles")
      .select(
        "display_name,experience_background,typical_session_minutes,challenge_preference,onboarding_status,calibration_status",
      )
      .limit(1)
      .maybeSingle(),
    client
      .from<Array<{ tuning_context_id: string }>>("player_tuning_preferences")
      .select("tuning_context_id")
      .eq("is_default", true)
      .limit(1),
    client
      .from<Array<Record<string, unknown>>>("player_goals")
      .select("id,domain_id,skill_id,objective,priority,is_active")
      .eq("is_active", true)
      .order("priority"),
    client
      .from<Array<Record<string, unknown>>>("taxonomy_entities")
      .select("id,kind,slug,name:display_name,metadata")
      .eq("lifecycle", "ACTIVE")
      .order("display_name"),
  ]);
  if (profileResult.error || goalsResult.error || tuningResult.error || taxonomyResult.error)
    throw new Error("Profile data is unavailable");
  if (!profileResult.data) return emptySnapshot(true);

  const entities = (taxonomyResult.data ?? []) as Array<Record<string, unknown>>;
  const mapEntity = (row: Record<string, unknown>): ProfileTaxonomyEntity => ({
    id: String(row.id),
    kind: row.kind as ProfileTaxonomyEntity["kind"],
    slug: String(row.slug),
    name: String(row.name),
  });
  const profile = profileResult.data;
  return {
    authenticated: true,
    initialized: true,
    displayName: String(profile.display_name ?? ""),
    experienceBackground: String(profile.experience_background),
    typicalSessionMinutes:
      profile.typical_session_minutes === null ? null : Number(profile.typical_session_minutes),
    challengePreference: String(profile.challenge_preference),
    onboardingStatus: String(profile.onboarding_status),
    calibrationStatus: String(profile.calibration_status),
    defaultTuningContextId: tuningResult.data?.[0]?.tuning_context_id ?? null,
    goals: (goalsResult.data ?? []).map((row) => ({
      id: String(row.id),
      kind: row.skill_id ? "SKILL" : row.domain_id ? "DOMAIN" : "OBJECTIVE",
      targetId: row.skill_id ? String(row.skill_id) : row.domain_id ? String(row.domain_id) : null,
      objective: String(row.objective ?? ""),
    })),
    domains: entities.filter((row) => row.kind === "DOMAIN").map(mapEntity),
    skills: entities.filter((row) => row.kind === "SKILL").map(mapEntity),
    tunings: entities
      .filter(
        (row) =>
          row.kind === "CONTEXT" &&
          (row.metadata as Record<string, unknown> | null)?.context_family === "TUNING",
      )
      .map(mapEntity),
  };
}

export async function saveProfileSnapshot(
  client: ProfileClient,
  snapshot: Pick<
    ProfileSnapshot,
    | "displayName"
    | "experienceBackground"
    | "typicalSessionMinutes"
    | "challengePreference"
    | "defaultTuningContextId"
    | "goals"
  >,
) {
  const result = await client.rpc("save_player_profile_v1", {
    p_display_name: snapshot.displayName.trim() || null,
    p_experience_background: snapshot.experienceBackground,
    p_typical_session_minutes: snapshot.typicalSessionMinutes,
    p_challenge_preference: snapshot.challengePreference,
    p_default_tuning_context_id: snapshot.defaultTuningContextId,
    p_goals: snapshot.goals.map((goal) => ({
      id: goal.id,
      kind: goal.kind,
      target_id: goal.kind === "OBJECTIVE" ? null : goal.targetId,
      objective: goal.kind === "OBJECTIVE" ? goal.objective.trim() || null : null,
    })),
  });
  if (result.error) throw new Error("Profile could not be saved. Your changes are still here.");
}
