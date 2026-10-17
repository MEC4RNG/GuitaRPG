"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readQuestJourneyDetail, type QuestLibraryClient } from "@/lib/quest/library-repository";
import {
  sessionAction,
  type SavedQuestSummary,
  type QuestSessionSummary,
} from "@/lib/quest/library-runtime";
import {
  ensureQuestJourney,
  setQuestJourneyStage,
  transitionQuestJourney,
  type JourneyRpcClient,
} from "@/lib/quest/journey-repository";
import type { QuestJourneyStage } from "@/lib/quest/journey-runtime";
import {
  startJourneyPractice,
  type JourneyPracticeClient,
} from "@/lib/quest/start-journey-practice";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Detail = SavedQuestSummary & { recentSessions: QuestSessionSummary[] };
type JourneyClient = QuestLibraryClient & JourneyRpcClient & JourneyPracticeClient;
const client = () => createBrowserSupabaseClient() as unknown as JourneyClient;
const dateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );

export function QuestJourneySurface({ questId }: { questId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = client();
    void ensureQuestJourney(api, questId)
      .then(() => readQuestJourneyDetail(api, questId))
      .then((next) => {
        if (!next) throw new Error("Quest unavailable");
        setDetail(next);
      })
      .catch(() => setError("This Quest is unavailable. Return to Saved Quests and try again."));
  }, [questId]);

  async function chooseStage(stage: QuestJourneyStage) {
    if (pending || !detail) return;
    setPending(true);
    setError(null);
    try {
      setDetail({
        ...detail,
        journey: await setQuestJourneyStage(client(), detail.questId, stage),
      });
    } catch {
      setError("The Journey stage could not be updated. Your previous stage is unchanged.");
    } finally {
      setPending(false);
    }
  }

  async function lifecycle(action: "ARCHIVE" | "UNARCHIVE" | "REOPEN") {
    if (pending || !detail) return;
    setPending(true);
    setError(null);
    try {
      setDetail({
        ...detail,
        journey: await transitionQuestJourney(client(), detail.questId, action),
      });
    } catch {
      setError("The Journey could not be updated. Please retry.");
    } finally {
      setPending(false);
    }
  }

  async function practice() {
    if (pending || !detail) return;
    setPending(true);
    setError(null);
    try {
      const started = await startJourneyPractice(client(), detail.journey);
      router.push(`/session/${started.session.id}`);
    } catch {
      setError(
        detail.journey.lifecycleStatus === "ARCHIVED"
          ? "Restore this Quest before starting practice."
          : "Your Quest is saved, but Practice could not start. Please retry.",
      );
      setPending(false);
    }
  }

  if (!detail)
    return (
      <p className="session-notice" role={error ? "alert" : "status"}>
        {error ?? "Loading Quest…"}
      </p>
    );
  const { quest, journey } = detail;
  return (
    <section className="generate-stack" aria-labelledby="quest-journey-title">
      <Link className="text-link" href="/quests">
        ← All Saved Quests
      </Link>
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
      <div className="quest-library-actions">
        {journey.lifecycleStatus === "ARCHIVED" ? (
          <button
            className="action-button"
            disabled={pending}
            onClick={() => void lifecycle("UNARCHIVE")}
            type="button"
          >
            Restore Quest
          </button>
        ) : (
          <>
            <button
              className="action-button"
              disabled={pending}
              onClick={() => void practice()}
              type="button"
            >
              {pending ? "Working…" : detail.sessionCount ? "Practice Again" : "Start Practice"}
            </button>
            {journey.lifecycleStatus === "CONCLUDED" || journey.lifecycleStatus === "ABANDONED" ? (
              <button
                className="action-button action-button--secondary"
                disabled={pending}
                onClick={() => void lifecycle("REOPEN")}
                type="button"
              >
                Reopen Quest
              </button>
            ) : null}
            <button
              className="text-button"
              disabled={pending}
              onClick={() => void lifecycle("ARCHIVE")}
              type="button"
            >
              Archive Quest
            </button>
          </>
        )}
      </div>
      <section className="panel" aria-labelledby="quest-sessions-title">
        <p className="eyebrow">PRACTICE ACTIVITY</p>
        <h2 id="quest-sessions-title">Recent Sessions</h2>
        <p>
          {detail.sessionCount === 0
            ? "No Sessions yet. This says nothing about your ability."
            : `${detail.sessionCount} total Session${detail.sessionCount === 1 ? "" : "s"}.`}
        </p>
        {detail.recentSessions.length ? (
          <ul className="quest-session-list">
            {detail.recentSessions.map((session) => {
              const action = sessionAction(session);
              return (
                <li key={session.id}>
                  <div>
                    <strong>{session.status}</strong>
                    <span>
                      {dateTime(session.startedAt)}
                      {session.resultOutcome ? ` · Session result: ${session.resultOutcome}` : ""}
                    </span>
                  </div>
                  <Link className="text-link" href={action.href}>
                    {action.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </section>
  );
}
