import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { parseQuest } from "@/lib/quest/runtime";
import { journeyStageContent } from "@/lib/quest/journey-presentation";
import type { QuestJourneyStage } from "@/lib/quest/journey-runtime";
import { readCharacterProgression, type ProgressionReadClient } from "@/lib/progression/repository";
import type { CharacterProgressionView } from "@/lib/progression/read-model";
import { readRankedRecommendationsV1, type TrainingCandidateReadClient } from "@/lib/training/repository";
import { trainingPresentationV1 } from "@/lib/training/presentation-v1";

type Client = ReturnType<typeof createBrowserSupabaseClient>;
type Identity = { id: string; is_anonymous?: boolean };
type NextAction = {
  kind: "session" | "quest" | "quick";
  title: string;
  detail: string;
  label: string;
  href: string;
};
type WorkbookSummary = { id: string; title: string; kind: string };
type TrainingSummary = ReturnType<typeof trainingPresentationV1>;

export type HomeOverview =
  | { kind: "visitor" }
  | { kind: "setup" }
  | {
      kind: "player";
      name: string;
      anonymous: boolean;
      action: NextAction;
      training: TrainingSummary | null;
      progress: CharacterProgressionView | null;
      workbooks: WorkbookSummary[] | null;
    };

export function chooseHomeAction(
  session: { id: string; status: "ACTIVE" | "PAUSED"; title: string } | null,
  quest: { id: string; title: string; stage: QuestJourneyStage; skill: string; active: boolean } | null,
): NextAction {
  if (session)
    return {
      kind: "session",
      title: session.title,
      detail: session.status === "PAUSED" ? "Practice paused" : "Practice in progress",
      label: "Resume Session",
      href: `/session/${session.id}`,
    };
  if (quest)
    return {
      kind: "quest",
      title: quest.title,
      detail: `${quest.skill} · ${journeyStageContent[quest.stage].label}`,
      label: quest.active ? `Continue in ${journeyStageContent[quest.stage].label}` : "Open saved Quest",
      href: `/quest/${quest.id}`,
    };
  return {
    kind: "quick",
    title: "Your next musical discovery",
    detail: "Choose a focused challenge to begin your practice.",
    label: "Quick Quest",
    href: "/generate",
  };
}

async function verifiedIdentity(client: Client): Promise<Identity | null> {
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") throw new Error("Identity unavailable");
  return data.user;
}

async function questTitle(client: Client, id: string) {
  const response = await client.from("quests").select("resolved_snapshot").eq("id", id).single();
  if (response.error || !response.data) throw new Error("Quest unavailable");
  return parseQuest(response.data.resolved_snapshot);
}

async function readAction(client: Client, owner: string) {
  // Query open Sessions independently of journey recency, including legacy quests.
  const sessions = await client
    .from("practice_sessions")
    .select("id,quest_id,status")
    .eq("player_id", owner)
    .in("status", ["ACTIVE", "PAUSED"])
    .order("started_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);
  if (sessions.error) throw new Error("Session status unavailable");
  const session = sessions.data?.[0];
  if (session) {
    const quest = await questTitle(client, session.quest_id);
    return chooseHomeAction({ id: session.id, status: session.status, title: quest.identity.title }, null);
  }
  // Do not ensure or create journey overlays from Home. Existing library retains that authority.
  for (const status of ["ACTIVE", "SAVED"] as const) {
    const result = await client
      .from("player_quest_journeys")
      .select("quest_id,current_stage")
      .eq("player_id", owner)
      .eq("lifecycle_status", status)
      .order("last_worked_at", { ascending: false })
      .order("quest_id", { ascending: false })
      .limit(1);
    if (result.error) throw new Error("Quest status unavailable");
    const row = result.data?.[0];
    if (row) {
      const quest = await questTitle(client, row.quest_id);
      if (!(row.current_stage in journeyStageContent)) throw new Error("Quest stage unavailable");
      return chooseHomeAction(null, {
        id: row.quest_id,
        title: quest.identity.title,
        stage: row.current_stage as QuestJourneyStage,
        skill: quest.execution.primary_skill.name,
        active: status === "ACTIVE",
      });
    }
  }
  return chooseHomeAction(null, null);
}

async function readWorkbookMetadata(client: Client, owner: string): Promise<WorkbookSummary[]> {
  const response = await client
    .from("player_workbooks")
    .select("id,title,kind")
    .eq("player_id", owner)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(3);
  if (response.error) throw new Error("Workbook metadata unavailable");
  return response.data ?? [];
}

function valueOrNull<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

/** Owner-scoped projection. No creation, progression writes, or draft hydration on render. */
export async function readHomeOverview(client: Client): Promise<HomeOverview> {
  const identity = await verifiedIdentity(client);
  if (!identity) return { kind: "visitor" };
  const profile = await client
    .from("player_profiles")
    .select("display_name,onboarding_status")
    .eq("player_id", identity.id)
    .maybeSingle();
  if (profile.error) throw new Error("Player profile unavailable");
  if (!profile.data || profile.data.onboarding_status !== "COMPLETE") return { kind: "setup" };
  const action = await readAction(client, identity.id);
  const [training, progress, workbooks] = await Promise.allSettled([
    readRankedRecommendationsV1(
      client as unknown as TrainingCandidateReadClient,
      new Date().toISOString(),
      { refreshReadiness: false },
    ).then(trainingPresentationV1),
    readCharacterProgression(client as unknown as ProgressionReadClient),
    readWorkbookMetadata(client, identity.id),
  ]);
  if ((await verifiedIdentity(client))?.id !== identity.id) throw new Error("Player changed");
  return {
    kind: "player",
    name: profile.data.display_name ?? "",
    anonymous: Boolean(identity.is_anonymous),
    action,
    training: valueOrNull(training),
    progress: valueOrNull(progress),
    workbooks: valueOrNull(workbooks),
  };
}
