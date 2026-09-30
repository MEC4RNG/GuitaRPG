"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "./page-header";
import { Panel } from "./panel";
import {
  formatPracticeDuration,
  type CharacterProgressionView,
} from "@/lib/progression/read-model";
import { readCharacterProgression, type ProgressionReadClient } from "@/lib/progression/repository";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const client = () => createBrowserSupabaseClient() as unknown as ProgressionReadClient;

function AttributeState({ status }: { status: string }) {
  return (
    <span className={`progression-state progression-state--${status.toLowerCase()}`}>{status}</span>
  );
}

export function CharacterProgressionSurface() {
  const [model, setModel] = useState<CharacterProgressionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setModel(await readCharacterProgression(client()));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  return (
    <div className="progression-stack">
      <PageHeader
        eyebrow="DEVELOPMENT · CHARACTER"
        title="Character progression."
        description="Practice XP reflects recorded effort. Character Level is practice progress—not an overall rating of your guitar ability."
      />

      {loading && !model ? (
        <p className="session-notice" role="status">
          Loading Character progression…
        </p>
      ) : null}
      {error ? (
        <div className="session-notice" role="alert">
          <p>Character progression is unavailable right now.</p>
          <button className="action-button action-button--secondary" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      {model ? (
        <>
          <section className="character-summary" aria-labelledby="character-level-heading">
            <Panel raised className="character-level-card">
              <span className="panel__label">CHARACTER LEVEL</span>
              <h2 id="character-level-heading">Level {model.progress.level}</h2>
              <p>Practice progress only; not a measure of overall guitar ability.</p>
            </Panel>
            <Panel className="character-xp-card">
              <div className="progression-card-heading">
                <div>
                  <span className="panel__label">PRACTICE XP</span>
                  <h2>{model.progress.practiceXp.toLocaleString()} XP</h2>
                </div>
                <span className="progression-data">
                  {model.progress.xpIntoLevel.toLocaleString()} /{" "}
                  {model.progress.xpForNextLevel.toLocaleString()}
                </span>
              </div>
              <div
                aria-label={`${Math.round(model.progress.progressPercent)}% progress toward Level ${model.progress.level + 1}`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={Math.round(model.progress.progressPercent)}
                className="progression-meter"
                role="progressbar"
              >
                <span style={{ width: `${model.progress.progressPercent}%` }} />
              </div>
              <p>
                {model.progress.xpIntoLevel.toLocaleString()} XP into this level ·{" "}
                {(model.progress.nextThreshold - model.progress.practiceXp).toLocaleString()} XP to
                Level {model.progress.level + 1}
              </p>
            </Panel>
            <Panel>
              <span className="panel__label">RECORDED MEANINGFUL PRACTICE</span>
              <h2>{formatPracticeDuration(model.totalPracticeSeconds)}</h2>
              <p>XP-eligible meaningful practice recorded by completed Sessions.</p>
            </Panel>
          </section>

          <section className="attribute-section" aria-labelledby="attributes-heading">
            <div className="progression-section-heading">
              <div>
                <span className="panel__label">CHARACTER ATTRIBUTES</span>
                <h2 id="attributes-heading">Development across related Skills</h2>
              </div>
              <p>
                Attributes derive from Skill proficiency, system confidence, and breadth of
                evidence—not Practice XP.
              </p>
            </div>
            {(["Physical", "Musical"] as const).map((group) => (
              <section
                className="attribute-group"
                aria-labelledby={`${group.toLowerCase()}-attributes`}
                key={group}
              >
                <h3 id={`${group.toLowerCase()}-attributes`}>{group}</h3>
                <div className="attribute-grid">
                  {model.attributes
                    .filter((attribute) => attribute.group === group)
                    .map((attribute) => (
                      <article className="attribute-card" key={attribute.id}>
                        <div className="progression-card-heading">
                          <h4>{attribute.name}</h4>
                          <AttributeState status={attribute.assessmentStatus} />
                        </div>
                        {attribute.score === null ? (
                          <p className="attribute-unassessed">Evidence is not yet broad enough.</p>
                        ) : (
                          <p className="attribute-score">
                            <strong>{attribute.score.toFixed(2)}</strong>
                            <span> / 100</span>
                          </p>
                        )}
                      </article>
                    ))}
                </div>
              </section>
            ))}
          </section>

          {model.progress.practiceXp === 0 ? (
            <Panel className="progression-empty">
              <h2>Your practice record starts here</h2>
              <p>
                Complete meaningful Quest practice to build Practice XP and development evidence.
              </p>
              <Link className="action-button action-button--primary" href="/generate">
                Generate a Quest
              </Link>
            </Panel>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
