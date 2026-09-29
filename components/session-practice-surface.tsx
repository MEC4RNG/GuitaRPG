"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { BrowserMetronome, canRunMetronome } from "@/lib/session/controls/metronome";
import { BPM_MAX, BPM_MIN, DEFAULT_BPM } from "@/lib/session/controls/runtime";
import {
  adjustPracticeSessionReps,
  endPracticeSession,
  pausePracticeSession,
  readSessionControls,
  resumePracticeSession,
  setPracticeSessionMetronomeBpm,
  type SessionControlClient,
  type SessionRpcClient,
} from "@/lib/session/repository";
import {
  deriveRecordedActiveSeconds,
  type PracticeSession,
  type PracticeSessionEvent,
} from "@/lib/session/runtime";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type QuestReference = { title: string; execution: Record<string, unknown> };
type TempoConstraint = { parameters: { bpm?: number }; taxonomy_entities: { slug: string } | null };
type SessionReadClient = SessionRpcClient &
  SessionControlClient & {
    from(table: "practice_sessions"): {
      select(columns: string): {
        eq(
          column: string,
          value: string,
        ): {
          single(): PromiseLike<{
            data: PracticeSession | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    from(table: "practice_session_events"): {
      select(columns: string): {
        eq(
          column: string,
          value: string,
        ): {
          order(column: string): PromiseLike<{
            data: PracticeSessionEvent[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    from(table: "quests"): {
      select(columns: string): {
        eq(
          column: string,
          value: string,
        ): {
          single(): PromiseLike<{ data: QuestReference | null; error: { message: string } | null }>;
        };
      };
    };
    from(table: "quest_constraints"): {
      select(columns: string): {
        eq(
          column: string,
          value: string,
        ): PromiseLike<{
          data: TempoConstraint[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };

type PracticeSnapshot = {
  session: PracticeSession;
  sessionEvents: PracticeSessionEvent[];
  repCount: number;
  bpm: number;
  quest: QuestReference | null;
};

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function SessionPracticeSurface({ sessionId }: { sessionId: string }) {
  const [client] = useState(() => createBrowserSupabaseClient() as unknown as SessionReadClient);
  const [metronome] = useState(() => new BrowserMetronome());
  const [snapshot, setSnapshot] = useState<PracticeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [now, setNow] = useState(() => new Date().toISOString());
  const sessionStatus = snapshot?.session.status;
  const sessionBpm = snapshot?.bpm;

  const refresh = useCallback(async () => {
    const sessionResponse = await client
      .from("practice_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    if (sessionResponse.error || !sessionResponse.data)
      throw new Error(sessionResponse.error?.message ?? "Practice Session was not found");

    const [eventResponse, questResponse, constraintResponse] = await Promise.all([
      client
        .from("practice_session_events")
        .select("id,session_id,sequence,event_type,occurred_at,runtime_version")
        .eq("session_id", sessionId)
        .order("sequence"),
      client
        .from("quests")
        .select("title,execution")
        .eq("id", sessionResponse.data.quest_id)
        .single(),
      client
        .from("quest_constraints")
        .select("parameters,taxonomy_entities!inner(slug)")
        .eq("quest_id", sessionResponse.data.quest_id),
    ]);
    if (eventResponse.error) throw new Error(eventResponse.error.message);
    if (questResponse.error) throw new Error(questResponse.error.message);
    if (constraintResponse.error) throw new Error(constraintResponse.error.message);

    const targetTempo = constraintResponse.data?.find(
      (constraint) => constraint.taxonomy_entities?.slug === "target_tempo",
    )?.parameters.bpm;
    const controls = await readSessionControls(
      client,
      sessionId,
      Number.isInteger(targetTempo) ? targetTempo : DEFAULT_BPM,
    );

    setSnapshot({
      session: sessionResponse.data,
      sessionEvents: eventResponse.data ?? [],
      repCount: controls.repCount,
      bpm: controls.bpm,
      quest: questResponse.data,
    });
  }, [client, sessionId]);

  useEffect(() => {
    const load = window.setTimeout(() => {
      void refresh().catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unable to load the Practice Session");
      });
    }, 0);
    return () => window.clearTimeout(load);
  }, [refresh]);

  useEffect(() => {
    if (sessionStatus === "ACTIVE") {
      const interval = window.setInterval(() => setNow(new Date().toISOString()), 1000);
      return () => window.clearInterval(interval);
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus && sessionBpm && canRunMetronome(sessionStatus, metronomeEnabled)) {
      try {
        metronome.start(sessionBpm);
      } catch {
        metronome.stop();
      }
    } else {
      metronome.stop();
    }
    return () => metronome.stop();
  }, [metronome, metronomeEnabled, sessionBpm, sessionStatus]);

  const invokeAndReconcile = async (operation: () => Promise<unknown>) => {
    setPending(true);
    setError(null);
    try {
      await operation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Practice control could not be saved");
    } finally {
      try {
        await refresh();
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Unable to reconcile Practice Session state",
        );
      }
      setPending(false);
    }
  };

  if (error && !snapshot)
    return (
      <p className="session-notice" role="alert">
        {error}
      </p>
    );
  if (!snapshot)
    return (
      <p className="session-notice" aria-live="polite">
        Loading Practice Session…
      </p>
    );

  const activeSeconds = deriveRecordedActiveSeconds(
    snapshot.sessionEvents,
    snapshot.session.status === "ACTIVE" ? now : undefined,
  );
  const controlsActive = snapshot.session.status === "ACTIVE" && !pending;
  const executionEntries = Object.entries(snapshot.quest?.execution ?? {});

  return (
    <div className="session-practice">
      <header className="session-practice__header">
        <span className="page-header__eyebrow">INSTRUMENT HUD · PRACTICE SESSION</span>
        <h1>{snapshot.quest?.title ?? "Practice Session"}</h1>
        <p>
          Lifecycle time is recorded by SES-001. Reps and tempo are append-only SES-002 telemetry.
        </p>
      </header>

      {error ? (
        <p className="session-notice" role="alert">
          {error}
        </p>
      ) : null}

      <section className="session-dashboard" aria-label="Practice controls">
        <div className="session-stat">
          <span>ACTIVE TIME</span>
          <strong aria-live="polite">{formatTimer(activeSeconds)}</strong>
        </div>
        <div className="session-stat">
          <span>REPS</span>
          <strong>{snapshot.repCount}</strong>
        </div>
        <div className="session-stat">
          <span>SESSION</span>
          <strong>{snapshot.session.status}</strong>
        </div>
      </section>

      <section className="session-actions" aria-label="Session lifecycle">
        {snapshot.session.status === "ACTIVE" ? (
          <button
            className="action-button action-button--secondary"
            disabled={pending}
            onClick={() => void invokeAndReconcile(() => pausePracticeSession(client, sessionId))}
          >
            Pause
          </button>
        ) : null}
        {snapshot.session.status === "PAUSED" ? (
          <button
            className="action-button action-button--primary"
            disabled={pending}
            onClick={() => void invokeAndReconcile(() => resumePracticeSession(client, sessionId))}
          >
            Resume
          </button>
        ) : null}
        {snapshot.session.status !== "ENDED" ? (
          <button
            className="action-button action-button--secondary"
            disabled={pending}
            onClick={() => void invokeAndReconcile(() => endPracticeSession(client, sessionId))}
          >
            End Session
          </button>
        ) : (
          <Link
            className="action-button action-button--primary"
            href={`/session/${sessionId}/complete`}
          >
            Record Result
          </Link>
        )}
      </section>

      <section className="session-control-grid">
        <section className="panel" aria-labelledby="rep-controls-title">
          <span className="panel__label">MANUAL COUNT</span>
          <h2 id="rep-controls-title">Repetitions</h2>
          <div className="session-button-row">
            <button
              className="action-button action-button--secondary"
              disabled={!controlsActive || snapshot.repCount === 0}
              onClick={() =>
                void invokeAndReconcile(() => adjustPracticeSessionReps(client, sessionId, -1))
              }
            >
              −1 rep
            </button>
            <button
              className="action-button action-button--primary"
              disabled={!controlsActive}
              onClick={() =>
                void invokeAndReconcile(() => adjustPracticeSessionReps(client, sessionId, 1))
              }
            >
              +1 rep
            </button>
          </div>
        </section>
        <section className="panel" aria-labelledby="metronome-title">
          <span className="panel__label">WEB AUDIO</span>
          <h2 id="metronome-title">Metronome</h2>
          <label className="session-bpm-label" htmlFor="session-bpm">
            Tempo <output>{snapshot.bpm} BPM</output>
          </label>
          <input
            id="session-bpm"
            type="range"
            min={BPM_MIN}
            max={BPM_MAX}
            value={snapshot.bpm}
            disabled={!controlsActive}
            onChange={(event) =>
              void invokeAndReconcile(() =>
                setPracticeSessionMetronomeBpm(client, sessionId, Number(event.target.value)),
              )
            }
          />
          <button
            className="action-button action-button--secondary"
            disabled={!controlsActive}
            aria-pressed={metronomeEnabled}
            onClick={() => {
              const next = !metronomeEnabled;
              if (!next) {
                setMetronomeEnabled(false);
                return;
              }
              try {
                metronome.start(snapshot.bpm);
                setMetronomeEnabled(true);
              } catch (reason) {
                metronome.stop();
                setMetronomeEnabled(false);
                setError(reason instanceof Error ? reason.message : "Metronome could not start");
              }
            }}
          >
            {metronomeEnabled ? "Stop metronome" : "Start metronome"}
          </button>
        </section>
        <section className="panel session-reference" aria-labelledby="quest-reference-title">
          <span className="panel__label">QUEST REFERENCE</span>
          <h2 id="quest-reference-title">Practice parameters</h2>
          {executionEntries.length ? (
            <dl>
              {executionEntries.map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replaceAll("_", " ")}</dt>
                  <dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>No additional Quest execution parameters were recorded.</p>
          )}
        </section>
      </section>
    </div>
  );
}
