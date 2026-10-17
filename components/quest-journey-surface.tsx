"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CodexReferenceLink } from "@/components/quest-codex-reference";
import { questCodexReferences } from "@/lib/quest/codex-references";
import {
  ensureQuestJourney,
  setQuestJourneyStage,
  transitionQuestJourney,
  type JourneyRpcClient,
} from "@/lib/quest/journey-repository";
import {
  journeyStageContent,
  journeyStatusLabel,
  questConstraintText,
  questContextEntries,
  questTargetTempo,
} from "@/lib/quest/journey-presentation";
import type { QuestJourneyAction, QuestJourneyStage } from "@/lib/quest/journey-runtime";
import { readQuestJourneyDetail, type QuestLibraryClient } from "@/lib/quest/library-repository";
import {
  sessionAction,
  type QuestSessionSummary,
  type SavedQuestSummary,
} from "@/lib/quest/library-runtime";
import {
  startJourneyPractice,
  type JourneyPracticeClient,
} from "@/lib/quest/start-journey-practice";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Detail = SavedQuestSummary & { recentSessions: QuestSessionSummary[] };
type JourneyClient = QuestLibraryClient & JourneyRpcClient & JourneyPracticeClient;
const client = () => createBrowserSupabaseClient() as unknown as JourneyClient;
const stages = ["MAP", "EXPLORE", "CRAFT"] as const;
const dateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );

function IngredientList({
  title,
  items,
  kind = "concept",
}: {
  title: string;
  items: Array<{ slug: string; name: string }>;
  kind?: "skill" | "technique" | "concept";
}) {
  if (!items.length) return null;
  return (
    <section className={`journey-ingredient journey-ingredient--${kind}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item.slug}>{item.name}</li>
        ))}
      </ul>
    </section>
  );
}

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
    if (pending || !detail || detail.journey.lifecycleStatus === "ARCHIVED") return;
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

  async function lifecycle(action: QuestJourneyAction) {
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
    if (pending || !detail || detail.journey.lifecycleStatus === "ARCHIVED") return;
    setPending(true);
    setError(null);
    try {
      const started = await startJourneyPractice(client(), detail.journey);
      router.push(`/session/${started.session.id}`);
    } catch {
      setError("Your Quest is saved, but Practice could not start. Please retry.");
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
  const references = questCodexReferences(quest);
  const constraints = questConstraintText(quest);
  const context = questContextEntries(quest);
  const targetTempo = questTargetTempo(quest);
  const archived = journey.lifecycleStatus === "ARCHIVED";
  const practiceLabel = detail.sessionCount ? "Practice Again" : "Start Practice";

  return (
    <section className="generate-stack journey-shell" aria-labelledby="quest-journey-title">
      <Link className="text-link journey-back" href="/quests">
        ← Saved Quests
      </Link>
      <header className="journey-header">
        <div>
          <p className="eyebrow">{quest.identity.type} QUEST JOURNEY</p>
          <h1 id="quest-journey-title">{quest.identity.title}</h1>
          <p>{quest.objective.summary}</p>
        </div>
        <dl className="journey-header__meta">
          <div>
            <dt>Status</dt>
            <dd>{journeyStatusLabel[journey.lifecycleStatus]}</dd>
          </div>
          <div>
            <dt>Working stage</dt>
            <dd>{journeyStageContent[journey.currentStage].label}</dd>
          </div>
          <div>
            <dt>Demand</dt>
            <dd>Level {quest.difficulty_profile.declared_overall_demand}</dd>
          </div>
          <div>
            <dt>Primary Skill</dt>
            <dd>{quest.execution.primary_skill.name}</dd>
          </div>
          <div>
            <dt>Suggested Session</dt>
            <dd>{quest.execution.estimated_minutes} minutes</dd>
          </div>
        </dl>
      </header>
      {error ? (
        <p className="session-notice" role="alert">
          {error}
        </p>
      ) : null}

      <nav className="mec-navigator" aria-label="Quest Journey stages">
        {stages.map((stage) => {
          const copy = journeyStageContent[stage];
          const current = journey.currentStage === stage;
          return (
            <button
              key={stage}
              type="button"
              aria-pressed={current}
              className={current ? "mec-stage is-current" : "mec-stage"}
              disabled={pending || archived}
              onClick={() => void chooseStage(stage)}
            >
              <span>{copy.label}</span>
              <small>{copy.verb}</small>
              {current ? <em>Current stage</em> : null}
            </button>
          );
        })}
      </nav>

      <div className="journey-layout">
        <main className="panel journey-canvas" aria-live="polite">
          {journey.currentStage === "MAP" ? (
            <>
              <p className="eyebrow">MAP · UNDERSTAND</p>
              <h2>Map the territory</h2>
              <p>Understand the material and relationships involved before or while you work.</p>
              <div className="journey-focus">
                <span>Primary focus</span>
                <strong>
                  <CodexReferenceLink reference={references.primarySkill} />
                </strong>
              </div>
              <div className="journey-ingredients">
                <IngredientList
                  title="Supporting skills"
                  items={quest.execution.secondary_skills}
                  kind="skill"
                />
                <IngredientList
                  title="Required techniques"
                  items={quest.execution.required_techniques}
                  kind="technique"
                />
                <IngredientList title="Musical concepts" items={quest.concepts} />
              </div>
              {context.length ? (
                <section>
                  <h3>Context</h3>
                  <dl className="journey-detail-list">
                    {context.map((item) => (
                      <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}
              {constraints.length ? (
                <section>
                  <h3>Boundaries & constraints</h3>
                  <ul className="journey-list">
                    {constraints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <section>
                <h3>Objective</h3>
                <p>{quest.objective.summary}</p>
              </section>
            </>
          ) : null}
          {journey.currentStage === "EXPLORE" ? (
            <>
              <p className="eyebrow">EXPLORE · PLAY / INVESTIGATE</p>
              <h2>Explore it on the instrument</h2>
              <p>Work with the material, listen closely, and investigate what changes.</p>
              <div className="journey-focus">
                <span>Practice focus</span>
                <strong>{quest.execution.primary_skill.name}</strong>
                <p>{quest.objective.summary}</p>
              </div>
              {targetTempo ? (
                <div className="journey-tempo">
                  <span>Target tempo</span>
                  <strong>{targetTempo} BPM</strong>
                  <small>A target, not an achievement claim.</small>
                </div>
              ) : null}
              {constraints.length ? (
                <section>
                  <h3>Working boundaries</h3>
                  <ul className="journey-list">
                    {constraints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <div className="journey-ingredients">
                <IngredientList
                  title="Supporting skills"
                  items={quest.execution.secondary_skills}
                  kind="skill"
                />
                <IngredientList
                  title="Required techniques"
                  items={quest.execution.required_techniques}
                  kind="technique"
                />
              </div>
              <section>
                <h3>Practice activity</h3>
                <p>
                  {detail.sessionCount
                    ? `${detail.sessionCount} Session${detail.sessionCount === 1 ? "" : "s"} recorded for this Journey.`
                    : "No Sessions yet. Start when this Journey is useful to you."}
                </p>
              </section>
            </>
          ) : null}
          {journey.currentStage === "CRAFT" ? (
            <>
              <p className="eyebrow">CRAFT · CREATE</p>
              <h2>Create something using what you discovered.</h2>
              <p>
                Use the Quest ingredients as a creative launch point. These prompts do not save or
                grade an artifact.
              </p>
              <div className="craft-prompts" aria-label="Creative prompt ideas">
                {[
                  "Riff",
                  "Progression",
                  "Melody",
                  "Solo",
                  "Groove",
                  "Chord part",
                  "Étude / study",
                  "Freeform idea",
                ].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="journey-focus">
                <span>Primary ingredient</span>
                <strong>{quest.execution.primary_skill.name}</strong>
              </div>
              <div className="journey-ingredients">
                <IngredientList
                  title="Supporting skills"
                  items={quest.execution.secondary_skills}
                  kind="skill"
                />
                <IngredientList title="Concepts" items={quest.concepts} />
              </div>
              {constraints.length ? (
                <section>
                  <h3>Creative boundaries</h3>
                  <ul className="journey-list">
                    {constraints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : null}
        </main>

        <aside className="panel journey-practice" aria-labelledby="journey-practice-title">
          <p className="eyebrow">PRACTICE THIS JOURNEY</p>
          <h2 id="journey-practice-title">Suggested Session</h2>
          <strong className="journey-duration">{quest.execution.estimated_minutes} minutes</strong>
          <p>This Quest can span multiple practice Sessions.</p>
          {archived ? (
            <button
              className="action-button action-button--primary"
              disabled={pending}
              onClick={() => void lifecycle("UNARCHIVE")}
            >
              Restore Quest
            </button>
          ) : (
            <>
              {journey.lifecycleStatus === "SAVED" ? (
                <button
                  className="action-button action-button--secondary"
                  disabled={pending}
                  onClick={() => void lifecycle("START")}
                >
                  Start Quest
                </button>
              ) : null}
              <button
                className="action-button action-button--primary"
                disabled={pending}
                onClick={() => void practice()}
              >
                {pending ? "Working…" : practiceLabel}
              </button>
              {journey.lifecycleStatus === "CONCLUDED" ||
              journey.lifecycleStatus === "ABANDONED" ? (
                <button
                  className="action-button action-button--secondary"
                  disabled={pending}
                  onClick={() => void lifecycle("REOPEN")}
                >
                  Reopen Quest
                </button>
              ) : null}
            </>
          )}
        </aside>
      </div>

      <section className="panel journey-sessions" aria-labelledby="quest-sessions-title">
        <div className="journey-section-heading">
          <div>
            <p className="eyebrow">PRACTICE ACTIVITY</p>
            <h2 id="quest-sessions-title">Recent Sessions</h2>
          </div>
          <strong>{detail.sessionCount} total</strong>
        </div>
        {!detail.recentSessions.length ? (
          <p>No Sessions yet. This is activity history, not a measure of ability.</p>
        ) : (
          <ul className="quest-session-list">
            {detail.recentSessions.map((session) => {
              const action = sessionAction(session);
              return (
                <li key={session.id}>
                  <div>
                    <strong>
                      {session.status === "ENDED"
                        ? "Ended"
                        : session.status === "ACTIVE"
                          ? "In progress"
                          : "Paused"}
                    </strong>
                    <span>
                      {dateTime(session.startedAt)}
                      {session.resultOutcome
                        ? ` · Session result: ${session.resultOutcome[0] + session.resultOutcome.slice(1).toLowerCase()}`
                        : ""}
                    </span>
                  </div>
                  <Link className="text-link" href={action.href}>
                    {action.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <details className="panel journey-options">
        <summary>Journey options</summary>
        <div>
          {journey.lifecycleStatus === "ACTIVE" ? (
            <>
              <button
                className="action-button action-button--secondary"
                disabled={pending}
                onClick={() => void lifecycle("CONCLUDE")}
              >
                Conclude Quest
              </button>
              <button
                className="text-button"
                disabled={pending}
                onClick={() => void lifecycle("ABANDON")}
              >
                Stop Quest
              </button>
            </>
          ) : null}
          {journey.lifecycleStatus === "SAVED" ? (
            <button
              className="text-button"
              disabled={pending}
              onClick={() => void lifecycle("ABANDON")}
            >
              Stop Quest
            </button>
          ) : null}
          {!archived ? (
            <button
              className="text-button"
              disabled={pending}
              onClick={() => void lifecycle("ARCHIVE")}
            >
              Archive Quest
            </button>
          ) : null}
        </div>
        {journey.lifecycleStatus === "ACTIVE" ? (
          <p>
            Conclude when this Journey has reached a useful stopping point. It does not claim
            mastery.
          </p>
        ) : null}
      </details>
    </section>
  );
}
