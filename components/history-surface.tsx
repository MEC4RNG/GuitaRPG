"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  criterionStateLabel,
  reflectionLabel,
  verificationModeLabel,
  type HistoryAttempt,
} from "@/lib/history/runtime";
import {
  readHistoryAttempt,
  readHistoryPage,
  type HistoryReadClient,
} from "@/lib/history/repository";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const client = () => createBrowserSupabaseClient() as unknown as HistoryReadClient;

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function AttemptCard({ attempt }: { attempt: HistoryAttempt }) {
  const result = attempt.result;
  return (
    <article className="history-attempt">
      <div className="history-attempt__summary">
        <div>
          <p className="panel__label">
            {attempt.quest.type} · {attempt.quest.primaryDomain}
          </p>
          <h2>{attempt.quest.title}</h2>
          <p>{attempt.quest.objective}</p>
        </div>
        <span className="history-status">{attempt.lifecycle.label}</span>
      </div>
      <dl className="history-meta">
        <div>
          <dt>Started</dt>
          <dd>{dateTime(attempt.startedAt)}</dd>
        </div>
        <div>
          <dt>Active time</dt>
          <dd>{duration(attempt.activeSeconds)}</dd>
        </div>
        <div>
          <dt>Primary skill</dt>
          <dd>{attempt.quest.primarySkill}</dd>
        </div>
        {result ? (
          <>
            <div>
              <dt>Confidence</dt>
              <dd>{result.confidence_summary}</dd>
            </div>
            <div>
              <dt>Finalized</dt>
              <dd>{dateTime(result.finalized_at)}</dd>
            </div>
          </>
        ) : null}
      </dl>
      <Link className="action-button action-button--secondary" href={attempt.action.href}>
        {attempt.action.label}
      </Link>
    </article>
  );
}

function Detail({ attempt }: { attempt: HistoryAttempt }) {
  const result = attempt.result;
  return (
    <article className="history-detail">
      <Link className="text-link" href="/history">
        ← All attempts
      </Link>
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">PRACTICE ATTEMPT</p>
          <h1>{attempt.quest.title}</h1>
          <p>{attempt.quest.objective}</p>
        </div>
        <span className="history-status">{attempt.lifecycle.label}</span>
      </header>
      <section className="panel history-detail__section" aria-labelledby="attempt-overview">
        <h2 id="attempt-overview">Attempt overview</h2>
        <dl className="history-meta">
          <div>
            <dt>Started</dt>
            <dd>{dateTime(attempt.startedAt)}</dd>
          </div>
          <div>
            <dt>Active time</dt>
            <dd>{duration(attempt.activeSeconds)}</dd>
          </div>
          <div>
            <dt>Domain</dt>
            <dd>{attempt.quest.primaryDomain}</dd>
          </div>
          <div>
            <dt>Primary skill</dt>
            <dd>{attempt.quest.primarySkill}</dd>
          </div>
        </dl>
      </section>
      {result ? (
        <>
          <section className="panel history-detail__section" aria-labelledby="result-summary">
            <h2 id="result-summary">Result</h2>
            <dl className="history-meta">
              <div>
                <dt>Outcome</dt>
                <dd>{result.outcome}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{result.confidence_summary}</dd>
              </div>
              <div>
                <dt>Attempt</dt>
                <dd>{result.meaningful_attempt ? "Meaningful attempt" : "Recorded attempt"}</dd>
              </div>
              <div>
                <dt>Finalized</dt>
                <dd>{dateTime(result.finalized_at)}</dd>
              </div>
              <div>
                <dt>Verification</dt>
                <dd>
                  {result.verification_modes
                    .map((mode) => verificationModeLabel[mode] ?? mode)
                    .join(", ")}
                </dd>
              </div>
              {result.reflection ? (
                <div>
                  <dt>Reflection</dt>
                  <dd>{reflectionLabel[result.reflection]}</dd>
                </div>
              ) : null}
            </dl>
            {result.player_notes ? (
              <p className="history-note">
                <strong>Player note</strong>
                <br />
                {result.player_notes}
              </p>
            ) : null}
          </section>
          <section className="panel history-detail__section" aria-labelledby="criteria">
            <h2 id="criteria">Quest criteria</h2>
            {result.criteria.length ? (
              <ul className="history-list">
                {result.criteria.map((criterion) => (
                  <li key={`${criterion.metric}-${criterion.quest_criterion_ordinal}`}>
                    <strong>{criterionStateLabel[criterion.criterion_state]}</strong>
                    <span>
                      {criterion.metric} {criterion.operator} {String(criterion.target_value)}{" "}
                      {criterion.unit}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No criterion records are available for this Result.</p>
            )}
          </section>
          <section className="panel history-detail__section" aria-labelledby="evidence">
            <h2 id="evidence">Evidence</h2>
            {result.evidence.length ? (
              <ul className="history-list">
                {result.evidence.map((item, index) => (
                  <li key={`${item.criterion_metric}-${index}`}>
                    <strong>
                      {verificationModeLabel[item.verification_mode] ?? item.verification_mode} ·{" "}
                      {item.evidence_confidence}
                    </strong>
                    <span>
                      {item.criterion_metric}
                      {item.rationale ? ` — ${item.rationale}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No supporting evidence was recorded for this Result.</p>
            )}
          </section>
        </>
      ) : (
        <section className="panel history-detail__section">
          <h2>Result pending</h2>
          <p>
            This Session has ended, but no Result has been finalized. Recording a Result is separate
            from practice timing and controls.
          </p>
        </section>
      )}
    </article>
  );
}

export function HistorySurface() {
  const [attempts, setAttempts] = useState<HistoryAttempt[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    async (append: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const page = await readHistoryPage(client(), { offset: append ? attempts.length : 0 });
        setAttempts((current) => (append ? [...current, ...page.attempts] : page.attempts));
        setHasMore(page.hasMore);
      } catch {
        setError("History is unavailable right now. Refresh and try again.");
      } finally {
        setLoading(false);
      }
    },
    [attempts.length],
  );
  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(false), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);
  return (
    <section className="history-stack" aria-labelledby="history-title">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">DEVELOPMENT · HISTORY</p>
          <h1 id="history-title">Practice history.</h1>
          <p>
            Each Session remains a separate attempt. Results, evidence, and reflection are shown
            only when they were recorded.
          </p>
        </div>
      </header>
      {error ? (
        <p className="session-notice" role="alert">
          {error}
        </p>
      ) : null}
      {loading && !attempts.length ? (
        <p className="session-notice" role="status">
          Loading practice history…
        </p>
      ) : null}
      {!loading && !error && !attempts.length ? (
        <section className="panel">
          <h2>No practice attempts yet</h2>
          <p>
            Start a Quest when you are ready; completed and in-progress Sessions will appear here.
          </p>
          <Link className="text-link" href="/generate">
            Generate a Quest
          </Link>
        </section>
      ) : null}
      <div className="history-stack__items">
        {attempts.map((attempt) => (
          <AttemptCard attempt={attempt} key={attempt.sessionId} />
        ))}
      </div>
      {hasMore ? (
        <button
          className="action-button action-button--secondary"
          disabled={loading}
          onClick={() => void load(true)}
          type="button"
        >
          {loading ? "Loading…" : "Load more attempts"}
        </button>
      ) : null}
    </section>
  );
}

export function HistoryDetailSurface({ sessionId }: { sessionId: string }) {
  const [attempt, setAttempt] = useState<HistoryAttempt | null | undefined>(undefined);
  const [error, setError] = useState(false);
  useEffect(() => {
    void readHistoryAttempt(client(), sessionId)
      .then(setAttempt)
      .catch(() => setError(true));
  }, [sessionId]);
  if (error)
    return (
      <p className="session-notice" role="alert">
        This history item is unavailable. Return to History and try again.
      </p>
    );
  if (attempt === undefined)
    return (
      <p className="session-notice" role="status">
        Loading practice attempt…
      </p>
    );
  if (!attempt)
    return (
      <p className="session-notice" role="alert">
        This history item is unavailable.
      </p>
    );
  return <Detail attempt={attempt} />;
}
