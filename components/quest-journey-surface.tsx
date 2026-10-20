"use client";

import Link from "next/link";
import { type KeyboardEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CodexReferenceLink, CodexReferenceList } from "@/components/quest-codex-reference";
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
type MapTab = "primary" | "supporting" | "concepts" | "techniques" | "context";
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
  const [mapTab, setMapTab] = useState<MapTab>("primary");

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
  const mapTabs = [
    { id: "primary" as const, label: "Primary Focus", present: true },
    {
      id: "supporting" as const,
      label: "Supporting Skills",
      present: references.secondarySkills.length > 0,
    },
    {
      id: "concepts" as const,
      label: "Musical Concepts",
      present: references.concepts.length > 0,
    },
    {
      id: "techniques" as const,
      label: "Required Techniques",
      present: references.requiredTechniques.length > 0,
    },
    { id: "context" as const, label: "Context", present: context.length > 0 },
  ].filter((tab) => tab.present);

  function moveMapTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = (index + 1) % mapTabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (index - 1 + mapTabs.length) % mapTabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = mapTabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = mapTabs[next];
    setMapTab(nextTab.id);
    document.getElementById(`map-tab-${nextTab.id}`)?.focus();
  }

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
              <div className="map-tabs" role="tablist" aria-label="Quest Map information">
                {mapTabs.map((tab, index) => (
                  <button
                    key={tab.id}
                    id={`map-tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={mapTab === tab.id}
                    aria-controls={`map-panel-${tab.id}`}
                    tabIndex={mapTab === tab.id ? 0 : -1}
                    onClick={() => setMapTab(tab.id)}
                    onKeyDown={(event) => moveMapTab(event, index)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {mapTabs.map((tab) => (
                <section
                  key={tab.id}
                  className="map-tab-panel"
                  role="tabpanel"
                  id={`map-panel-${tab.id}`}
                  aria-labelledby={`map-tab-${tab.id}`}
                  tabIndex={mapTab === tab.id ? 0 : -1}
                  hidden={mapTab !== tab.id}
                >
                  {tab.id === "primary" ? (
                    <div className="journey-focus">
                      <span>Primary focus</span>
                      <strong>
                        <CodexReferenceLink reference={references.primarySkill} />
                      </strong>
                    </div>
                  ) : null}
                  {tab.id === "supporting" ? (
                    <div className="map-reference-list">
                      <h3>Supporting Skills</h3>
                      <p>
                        <CodexReferenceList references={references.secondarySkills} />
                      </p>
                    </div>
                  ) : null}
                  {tab.id === "concepts" ? (
                    <div className="map-reference-list">
                      <h3>Musical Concepts</h3>
                      <p>
                        <CodexReferenceList references={references.concepts} />
                      </p>
                    </div>
                  ) : null}
                  {tab.id === "techniques" ? (
                    <div className="map-reference-list">
                      <h3>Required Techniques</h3>
                      <p>
                        <CodexReferenceList references={references.requiredTechniques} />
                      </p>
                    </div>
                  ) : null}
                  {tab.id === "context" ? (
                    <dl className="journey-detail-list">
                      {context.map((item) => (
                        <div key={item.label}>
                          <dt>{item.label}</dt>
                          <dd>{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </section>
              ))}
            </>
          ) : null}
          {journey.currentStage === "EXPLORE" ? (
            <>
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
            </>
          ) : null}
          {journey.currentStage === "CRAFT" ? (
            <>
              <div className="craft-invitation">
                <strong>Create something using what you discovered.</strong>
                <p>
                  Use the Quest ingredients as a creative launch point. These prompts do not save or
                  grade an artifact.
                </p>
              </div>
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

      {constraints.length ? (
        <details className="panel journey-requirements">
          <summary>Quest requirements</summary>
          <ul className="journey-list">
            {constraints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      ) : null}

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
