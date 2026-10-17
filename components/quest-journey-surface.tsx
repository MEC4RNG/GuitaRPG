"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ensureQuestJourney,
  setQuestJourneyStage,
  transitionQuestJourney,
  type JourneyRpcClient,
} from "@/lib/quest/journey-repository";
import type { QuestJourney, QuestJourneyStage } from "@/lib/quest/journey-runtime";
import { parseQuest, type Quest } from "@/lib/quest/runtime";
import { startPracticeSession, type SessionRpcClient } from "@/lib/session/repository";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type JourneyClient = JourneyRpcClient &
  SessionRpcClient & {
    from(table: "quests"): {
      select(columns: string): {
        eq(
          column: string,
          value: string,
        ): {
          maybeSingle(): PromiseLike<{
            data: { resolved_snapshot?: unknown } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };

export function QuestJourneySurface({ questId }: { questId: string }) {
  const router = useRouter();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [journey, setJourney] = useState<QuestJourney | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = createBrowserSupabaseClient() as unknown as JourneyClient;
    void Promise.all([
      client.from("quests").select("resolved_snapshot").eq("id", questId).maybeSingle(),
      ensureQuestJourney(client, questId),
    ])
      .then(([questResult, journeyResult]) => {
        if (questResult.error || !questResult.data?.resolved_snapshot)
          throw new Error("Quest unavailable");
        setQuest(parseQuest(questResult.data.resolved_snapshot));
        setJourney(journeyResult);
      })
      .catch(() => setError("This Quest is unavailable. Return to Generate and try again."));
  }, [questId]);

  async function chooseStage(stage: QuestJourneyStage) {
    if (pending || !journey) return;
    setPending(true);
    setError(null);
    try {
      setJourney(
        await setQuestJourneyStage(
          createBrowserSupabaseClient() as unknown as JourneyClient,
          journey.questId,
          stage,
        ),
      );
    } catch {
      setError("The Journey stage could not be updated. Your previous stage is unchanged.");
    } finally {
      setPending(false);
    }
  }

  async function startPractice() {
    if (pending || !journey) return;
    setPending(true);
    setError(null);
    try {
      const client = createBrowserSupabaseClient() as unknown as JourneyClient;
      if (journey.lifecycleStatus === "ARCHIVED") {
        throw new Error("Archived Journeys must be restored before practice");
      }
      if (journey.lifecycleStatus === "CONCLUDED" || journey.lifecycleStatus === "ABANDONED") {
        setJourney(await transitionQuestJourney(client, journey.questId, "REOPEN"));
      } else if (journey.lifecycleStatus === "SAVED") {
        setJourney(await transitionQuestJourney(client, journey.questId, "START"));
      }
      const session = await startPracticeSession(client, journey.questId);
      router.push(`/session/${session.id}`);
    } catch {
      setError("Your Quest is saved, but Practice could not start. Please retry.");
      setPending(false);
    }
  }

  if (!quest || !journey)
    return (
      <p className="session-notice" role={error ? "alert" : "status"}>
        {error ?? "Loading Quest…"}
      </p>
    );

  return (
    <section className="generate-stack" aria-labelledby="quest-journey-title">
      <header className="page-header">
        <div>
          <p className="eyebrow">QUEST JOURNEY · {journey.lifecycleStatus}</p>
          <h1 id="quest-journey-title">{quest.identity.title}</h1>
          <p>{quest.objective.summary}</p>
        </div>
      </header>
      {error ? (
        <p className="session-notice" role="alert">
          {error}
        </p>
      ) : null}
      <section className="panel" aria-labelledby="journey-stage-title">
        <p className="eyebrow">CURRENT STAGE</p>
        <h2 id="journey-stage-title">{journey.currentStage}</h2>
        <p>Suggested practice block: {quest.execution.estimated_minutes} minutes.</p>
        <div className="generate-actions" aria-label="Quest stage">
          {(["MAP", "EXPLORE", "CRAFT"] as const).map((stage) => (
            <button
              className={
                journey.currentStage === stage
                  ? "action-button action-button--primary"
                  : "action-button action-button--secondary"
              }
              aria-pressed={journey.currentStage === stage}
              disabled={pending || journey.lifecycleStatus === "ARCHIVED"}
              key={stage}
              onClick={() => void chooseStage(stage)}
              type="button"
            >
              {stage[0] + stage.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </section>
      <button
        className="action-button"
        disabled={pending || journey.lifecycleStatus === "ARCHIVED"}
        onClick={() => void startPractice()}
        type="button"
      >
        {pending ? "Working…" : "Start Practice"}
      </button>
    </section>
  );
}
