"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  groupSavedQuests,
  questOpenLabel,
  type SavedQuestSummary,
} from "@/lib/quest/library-runtime";
import { readQuestLibraryPage, type QuestLibraryClient } from "@/lib/quest/library-repository";
import { transitionQuestJourney, type JourneyRpcClient } from "@/lib/quest/journey-repository";
import {
  startJourneyPractice,
  type JourneyPracticeClient,
} from "@/lib/quest/start-journey-practice";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const client = () =>
  createBrowserSupabaseClient() as unknown as QuestLibraryClient &
    JourneyRpcClient &
    JourneyPracticeClient;

function date(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function QuestCard({
  item,
  busy,
  onArchive,
  onRestore,
  onPractice,
}: {
  item: SavedQuestSummary;
  busy: boolean;
  onArchive: () => void;
  onRestore: () => void;
  onPractice: () => void;
}) {
  const status = item.journey.lifecycleStatus;
  return (
    <article className="quest-library-card">
      <div className="quest-library-card__heading">
        <div>
          <p className="eyebrow">{item.quest.identity.type} QUEST</p>
          <h3>{item.quest.identity.title}</h3>
        </div>
        <span className="status-chip">{status}</span>
      </div>
      <p>{item.quest.objective.summary}</p>
      <dl className="quest-library-meta">
        <div>
          <dt>Stage</dt>
          <dd>{item.journey.currentStage}</dd>
        </div>
        <div>
          <dt>Primary Skill</dt>
          <dd>{item.quest.execution.primary_skill.name}</dd>
        </div>
        <div>
          <dt>Sessions</dt>
          <dd>{item.sessionCount}</dd>
        </div>
        <div>
          <dt>Last worked</dt>
          <dd>{date(item.journey.lastWorkedAt)}</dd>
        </div>
        {item.latestSession?.resultOutcome ? (
          <div>
            <dt>Latest</dt>
            <dd>Session result: {item.latestSession.resultOutcome}</dd>
          </div>
        ) : null}
      </dl>
      <div className="quest-library-actions">
        <Link className="action-button action-button--secondary" href={`/quest/${item.questId}`}>
          {questOpenLabel(status)}
        </Link>
        {status !== "ARCHIVED" ? (
          <>
            <button className="action-button" disabled={busy} onClick={onPractice} type="button">
              {item.sessionCount ? "Practice Again" : "Start Practice"}
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={onArchive}
              type="button"
              aria-label={`Archive ${item.quest.identity.title}`}
            >
              Archive
            </button>
          </>
        ) : (
          <button
            className="action-button"
            disabled={busy}
            onClick={onRestore}
            type="button"
            aria-label={`Restore ${item.quest.identity.title}`}
          >
            Restore
          </button>
        )}
      </div>
    </article>
  );
}

export function QuestLibrarySurface() {
  const router = useRouter();
  const [items, setItems] = useState<SavedQuestSummary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyQuest, setBusyQuest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (offset: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const page = await readQuestLibraryPage(client(), { offset });
      setItems((current) => (append ? [...current, ...page.items] : page.items));
      setHasMore(page.hasMore);
    } catch {
      setError("Saved Quests are unavailable right now. Refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(0, false), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  async function transition(item: SavedQuestSummary, action: "ARCHIVE" | "UNARCHIVE") {
    setBusyQuest(item.questId);
    setError(null);
    try {
      const journey = await transitionQuestJourney(client(), item.questId, action);
      setItems((current) =>
        current.map((entry) => (entry.questId === item.questId ? { ...entry, journey } : entry)),
      );
    } catch {
      setError(
        `The Quest could not be ${action === "ARCHIVE" ? "archived" : "restored"}. Please retry.`,
      );
    } finally {
      setBusyQuest(null);
    }
  }

  async function practice(item: SavedQuestSummary) {
    setBusyQuest(item.questId);
    setError(null);
    try {
      const result = await startJourneyPractice(client(), item.journey);
      router.push(`/session/${result.session.id}`);
    } catch {
      setError("The Quest remains saved, but Practice could not start. Please retry.");
      setBusyQuest(null);
    }
  }

  const sections = groupSavedQuests(items);
  return (
    <section className="quest-library" aria-labelledby="quest-library-title">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">PLAY · QUESTS</p>
          <h1 id="quest-library-title">Your Quest journeys.</h1>
          <p>
            Saved work stays actionable here. Practice History remains a separate record of Sessions
            and Results.
          </p>
        </div>
        <Link className="action-button" href="/generate">
          Generate Quest
        </Link>
      </header>
      {error ? (
        <p className="session-notice" role="alert">
          {error}
        </p>
      ) : null}
      {loading && !items.length ? (
        <p className="session-notice" role="status">
          Loading Saved Quests…
        </p>
      ) : null}
      {!loading && !error && !items.length ? (
        <section className="panel">
          <h2>No Saved Quests yet</h2>
          <p>Generate and save a Quest when you want to return to it later.</p>
          <Link className="text-link" href="/generate">
            Generate Quest
          </Link>
        </section>
      ) : null}
      {sections.map((section) =>
        section.items.length ? (
          <section
            className="quest-library-section"
            aria-labelledby={`quest-section-${section.status.toLowerCase()}`}
            key={section.status}
          >
            <h2 id={`quest-section-${section.status.toLowerCase()}`}>{section.title}</h2>
            <div className="quest-library-grid">
              {section.items.map((item) => (
                <QuestCard
                  busy={busyQuest === item.questId}
                  item={item}
                  key={item.questId}
                  onArchive={() => void transition(item, "ARCHIVE")}
                  onRestore={() => void transition(item, "UNARCHIVE")}
                  onPractice={() => void practice(item)}
                />
              ))}
            </div>
          </section>
        ) : null,
      )}
      {hasMore ? (
        <button
          className="action-button action-button--secondary"
          disabled={loading}
          onClick={() => void load(items.length, true)}
          type="button"
        >
          {loading ? "Loading more Quests…" : "Load more Quests"}
        </button>
      ) : null}
    </section>
  );
}
