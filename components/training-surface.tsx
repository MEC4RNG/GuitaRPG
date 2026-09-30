"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "./page-header";
import {
  materializeTrainingQuestV1,
  type MaterializedTrainingQuestV1,
  type TrainingSelectionMode,
} from "@/lib/training/materialize-v1";
import { trainingPresentationV1 } from "@/lib/training/presentation-v1";
import {
  readRankedRecommendationsV1,
  type TrainingCandidateReadClient,
} from "@/lib/training/repository";
import type { RankedRecommendationSetV1 } from "@/lib/training/scoring-v1";
import {
  GeneratedQuestStartError,
  startGeneratedQuestPractice,
} from "@/lib/quest/start-generated-quest";
import type { QuestPersistenceRpcClient } from "@/lib/quest/repository";
import type { SessionRpcClient } from "@/lib/session/repository";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type TrainingClient = TrainingCandidateReadClient & QuestPersistenceRpcClient & SessionRpcClient;
const client = () => createBrowserSupabaseClient() as unknown as TrainingClient;
const joinNames = (items: Array<{ name: string }>) => items.map((item) => item.name).join(", ");

export function TrainingSurface() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<RankedRecommendationSetV1 | null>(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [materialized, setMaterialized] = useState<MaterializedTrainingQuestV1 | null>(null);
  const [durableQuestId, setDurableQuestId] = useState<string | null>(null);
  const [pending, setPending] = useState<"LOADING" | "BUILDING" | "STARTING" | null>("LOADING");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPending("LOADING");
    setError(null);
    setMaterialized(null);
    setDurableQuestId(null);
    try {
      const result = await readRankedRecommendationsV1(client());
      setSnapshot(result);
      setSelectedKey(result.unique_top_candidate_key ?? "");
    } catch {
      setSnapshot(null);
      setSelectedKey("");
      setError("Current Training recommendations are unavailable. Please try again.");
    } finally {
      setPending(null);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const presentation = useMemo(
    () => (snapshot ? trainingPresentationV1(snapshot) : null),
    [snapshot],
  );
  const selected = presentation?.recommendations.find((item) => item.key === selectedKey) ?? null;

  function selectionMode(): TrainingSelectionMode {
    if (!snapshot || !selected) throw new Error("Select a Training target first");
    if (snapshot.unique_top_candidate_key === selected.key) return "UNIQUE_TOP_ACCEPTED";
    if (selected.rank === 1 && snapshot.diagnostics.top_tie_count > 1)
      return "TOP_TIE_USER_SELECTED";
    return "ALTERNATIVE_USER_SELECTED";
  }

  function buildQuest() {
    if (!snapshot || !selected || pending) return;
    setPending("BUILDING");
    setError(null);
    try {
      setMaterialized(
        materializeTrainingQuestV1({
          recommendation_set: snapshot,
          candidate_key: selected.key,
          selection_mode: selectionMode(),
          seed: crypto.randomUUID(),
        }),
      );
      setDurableQuestId(null);
    } catch {
      setError("A Training Quest could not be built for that target. Choose another or retry.");
    } finally {
      setPending(null);
    }
  }

  async function startPractice() {
    if (!materialized || pending) return;
    setPending("STARTING");
    setError(null);
    try {
      const started = await startGeneratedQuestPractice(
        client(),
        materialized.quest,
        durableQuestId,
      );
      setDurableQuestId(started.questId);
      router.push(`/session/${started.session.id}`);
    } catch (caught) {
      if (caught instanceof GeneratedQuestStartError) {
        setDurableQuestId(caught.durableQuestId);
        setError(
          caught.stage === "SESSION_START"
            ? "Your Training Quest is saved. Retry Start Practice to enter it."
            : "The Training Quest could not be saved. Please retry.",
        );
      } else setError("Practice could not be started. Please retry.");
    } finally {
      setPending(null);
    }
  }

  const quest = materialized?.quest;
  const tempo = quest?.constraints.find((item) => item.slug === "target_tempo")?.parameters.bpm;
  const tuning = (quest?.musical_context as { tuning?: { name?: string } | null } | undefined)
    ?.tuning;

  return (
    <div className="training-stack">
      <PageHeader
        eyebrow="PLAY · TRAINING"
        title="Practice what matters next."
        description="Current Skill evidence becomes an explainable recommendation, then a canonical Training Quest you control."
      />

      {pending === "LOADING" ? (
        <p className="session-notice" role="status">
          Refreshing readiness and ranking Training targets…
        </p>
      ) : null}
      {error ? (
        <div className="session-notice training-error" role="alert">
          <p>{error}</p>
          {!snapshot ? (
            <button className="action-button action-button--secondary" onClick={() => void load()}>
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {snapshot && presentation ? (
        <>
          {!presentation.recommendations.length ? (
            <section className="panel">
              <h2>No supported Training targets</h2>
              <p>Current Skill projections do not contain a generator-capable target.</p>
            </section>
          ) : (
            <>
              <section
                className="panel panel--raised training-recommendation"
                aria-labelledby="training-recommendation-title"
              >
                <div>
                  <p className="eyebrow">
                    {presentation.uniqueTop ? "RECOMMENDED NEXT" : "EQUAL-PRIORITY RECOMMENDATIONS"}
                  </p>
                  <h2 id="training-recommendation-title">
                    {presentation.uniqueTop
                      ? presentation.uniqueTop.skill
                      : "Top recommendations are tied"}
                  </h2>
                  <p>
                    {presentation.uniqueTop
                      ? presentation.uniqueTop.intentLabel
                      : "We don't have enough evidence to prefer one calibration target yet."}
                  </p>
                </div>
                <button
                  className="action-button action-button--secondary"
                  type="button"
                  onClick={() => void load()}
                  disabled={pending !== null}
                >
                  Refresh recommendations
                </button>
              </section>

              <section className="panel training-selection" aria-labelledby="training-target-title">
                <div>
                  <p className="eyebrow">PLAYER CHOICE</p>
                  <h2 id="training-target-title">Choose a Training target</h2>
                </div>
                <label htmlFor="training-target">Training target</label>
                <select
                  id="training-target"
                  value={selectedKey}
                  onChange={(event) => {
                    setSelectedKey(event.target.value);
                    setMaterialized(null);
                    setDurableQuestId(null);
                  }}
                >
                  <option value="">Select an equal-priority target</option>
                  {presentation.recommendations.map((item) => (
                    <option key={item.key} value={item.key}>
                      Rank {item.rank} · {item.skill} · {item.intentLabel} · priority {item.score}
                    </option>
                  ))}
                </select>
                {selected ? (
                  <div className="training-selected" role="status">
                    <div className="training-selected__heading">
                      <div>
                        <strong>{selected.skill}</strong>
                        <span>
                          {selected.domain} · {selected.intentLabel}
                        </span>
                      </div>
                      <span className="status-chip">
                        Rank {selected.rank} · Training priority {selected.score}
                      </span>
                    </div>
                    <ul>
                      {selected.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <p className="training-disclaimer">
                      Training priority compares current training signals. It is not an ability or
                      mastery percentage.
                    </p>
                  </div>
                ) : null}
                <button
                  className="action-button action-button--primary"
                  type="button"
                  onClick={buildQuest}
                  disabled={!selected || pending !== null}
                >
                  {pending === "BUILDING"
                    ? "Building Training Quest…"
                    : quest
                      ? "Build another Quest"
                      : "Build Training Quest"}
                </button>
              </section>

              {presentation.missingProjectionCount || presentation.hasUnmappedGoals ? (
                <p className="session-notice" role="status">
                  {presentation.missingProjectionCount
                    ? "Some Training targets are unavailable because their current Skill state is missing. "
                    : ""}
                  {presentation.hasUnmappedGoals
                    ? "Some goals aren't mapped to structured Training targets yet."
                    : ""}
                </p>
              ) : null}

              <details className="panel training-ranked">
                <summary>View all {presentation.recommendations.length} ranked targets</summary>
                <div className="training-ranked__list">
                  {presentation.recommendations.map((item) => (
                    <details key={item.key} className="training-ranked__item">
                      <summary>
                        <strong>
                          Rank {item.rank} · {item.skill}
                        </strong>
                        <span>
                          {item.domain} · {item.intentLabel} · Training priority {item.score}
                        </span>
                      </summary>
                      <dl className="training-components">
                        {item.source.components.map((component) => (
                          <div key={component.key}>
                            <dt>{component.key.replaceAll("_", " ")}</dt>
                            <dd>
                              {component.points.toFixed(2)} / {component.max_points}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  ))}
                </div>
              </details>
            </>
          )}
        </>
      ) : null}

      {quest && selected ? (
        <section
          className="panel generate-preview training-preview"
          aria-labelledby="training-quest-title"
        >
          <div className="generate-preview__heading">
            <div>
              <p className="eyebrow">TRAINING · {quest.identity.type} QUEST</p>
              <h2 id="training-quest-title">{quest.identity.title}</h2>
            </div>
            <span className="status-chip">
              DIF_V1 demand {quest.difficulty_profile.declared_overall_demand}
            </span>
          </div>
          <div className="training-why">
            <h3>Why this Quest</h3>
            <p>
              {selected.skill} was selected at semantic rank {selected.rank} with Training priority{" "}
              {selected.score}. The Skill was ranked first; this Quest was materialized afterward.
            </p>
          </div>
          <dl className="generate-details">
            <div>
              <dt>Primary Skill</dt>
              <dd>{quest.execution.primary_skill.name}</dd>
            </div>
            <div>
              <dt>Quest Type</dt>
              <dd>{quest.identity.type}</dd>
            </div>
            <div>
              <dt>Estimated Time</dt>
              <dd>{quest.execution.estimated_minutes} minutes</dd>
            </div>
            <div>
              <dt>Concepts</dt>
              <dd>{joinNames(quest.concepts)}</dd>
            </div>
            <div>
              <dt>Constraints</dt>
              <dd>{joinNames(quest.constraints)}</dd>
            </div>
            <div>
              <dt>Tuning</dt>
              <dd>{tuning?.name ?? "Any tuning"}</dd>
            </div>
            <div>
              <dt>Target Tempo</dt>
              <dd>{typeof tempo === "number" ? `${tempo} BPM` : "Not required"}</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>{quest.verification_profile.recommended_mode.replaceAll("_", " ")}</dd>
            </div>
            <div className="generate-details__wide">
              <dt>Objective</dt>
              <dd>{quest.objective.summary}</dd>
            </div>
          </dl>
          <button
            className="action-button action-button--primary"
            type="button"
            onClick={() => void startPractice()}
            disabled={pending !== null}
          >
            {pending === "STARTING"
              ? "Starting Practice…"
              : durableQuestId
                ? "Retry Start Practice"
                : "Start Practice"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
