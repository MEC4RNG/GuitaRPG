"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  groupSavedQuests,
  questLifecycleLabel,
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
import { AtlasQuestIdentity } from "./studio-atlas-quest-elements";
import { AtlasStatus, type AtlasStatusKind } from "./studio-atlas-primitives";
import {
  filterLoadedQuests,
  questDomains,
  type QuestLibraryFilters,
} from "@/lib/ux/quest-discovery";
import type { QuestJourneyStatus } from "@/lib/quest/journey-runtime";

const client = () =>
  createBrowserSupabaseClient() as unknown as QuestLibraryClient &
    JourneyRpcClient &
    JourneyPracticeClient;

function date(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

const statusKind: Record<QuestJourneyStatus, AtlasStatusKind> = {
  ACTIVE: "success",
  SAVED: "information",
  CONCLUDED: "information",
  ABANDONED: "warning",
  ARCHIVED: "unknown",
};
const initialFilters: QuestLibraryFilters = { search: "", status: "ALL", domain: "" };

function QuestCard({
  atlas,
  item,
  busy,
  onArchive,
  onRestore,
  onPractice,
}: {
  atlas: boolean;
  item: SavedQuestSummary;
  busy: boolean;
  onArchive: () => void;
  onRestore: () => void;
  onPractice: () => void;
}) {
  const status = item.journey.lifecycleStatus;
  return (
    <article className="quest-library-card" data-lifecycle={atlas ? status : undefined}>
      {atlas ? <AtlasQuestIdentity quest={item.quest} /> : null}
      <div className="quest-library-card__heading">
        <div>
          <p className="eyebrow">{item.quest.identity.type} QUEST</p>
          <h3>{item.quest.identity.title}</h3>
        </div>
        {atlas ? (
          <AtlasStatus kind={statusKind[status]}>{questLifecycleLabel(status)}</AtlasStatus>
        ) : (
          <span className="status-chip">{questLifecycleLabel(status)}</span>
        )}
      </div>
      <p>{item.quest.objective.summary}</p>
      <dl className="quest-library-meta">
        <div>
          <dt>Stage</dt>
          <dd>{item.journey.currentStage[0] + item.journey.currentStage.slice(1).toLowerCase()}</dd>
        </div>
        <div>
          <dt>Primary Skill</dt>
          <dd>{item.quest.execution.primary_skill.name}</dd>
        </div>
        {atlas ? (
          <>
            <div>
              <dt>Demand</dt>
              <dd>Level {item.quest.difficulty_profile.declared_overall_demand}</dd>
            </div>
            <div>
              <dt>Suggested Session</dt>
              <dd>{item.quest.execution.estimated_minutes} min</dd>
            </div>
          </>
        ) : null}
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

export function QuestLibrarySurface({ atlas = false }: { atlas?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<SavedQuestSummary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyQuest, setBusyQuest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<QuestLibraryFilters>(initialFilters);

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

  const visibleItems = atlas ? filterLoadedQuests(items, filters) : items;
  const sections = groupSavedQuests(visibleItems);
  return (
    <section
      className={`quest-library${atlas ? " studio-atlas atlas-quest-library" : ""}`}
      aria-labelledby="quest-library-title"
    >
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">PLAY · QUESTS</p>
          <h1 id="quest-library-title">Your Quest journeys.</h1>
          <p>
            {atlas
              ? "Revisit your discoveries, continue a musical journey, or choose what to practice next. Recorded Sessions and Results live in History."
              : "Saved work stays actionable here. Practice History remains a separate record of Sessions and Results."}
          </p>
        </div>
        <Link className="action-button" href="/generate">
          Generate Quest
        </Link>
      </header>
      {error ? (
        <div className="session-notice" role="alert">
          <p>{error}</p>
          {atlas ? (
            <button
              className="sa-button sa-button--secondary"
              type="button"
              disabled={loading || busyQuest !== null}
              onClick={() => void load(0, false)}
            >
              Refresh Quest library
            </button>
          ) : null}
        </div>
      ) : null}
      {atlas && items.length ? (
        <section
          className="sa-panel atlas-library-filters"
          aria-labelledby="atlas-library-filters-title"
        >
          <h2 id="atlas-library-filters-title">Find a Quest</h2>
          <div className="atlas-library-filter-grid">
            <label>
              Search loaded Quests
              <input
                type="search"
                value={filters.search}
                placeholder="Title, Skill or concept"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
              />
            </label>
            <label>
              Lifecycle
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as QuestLibraryFilters["status"],
                  }))
                }
              >
                <option value="ALL">All states</option>
                <option value="ACTIVE">Active</option>
                <option value="SAVED">Saved</option>
                <option value="CONCLUDED">Concluded</option>
                <option value="ABANDONED">Stopped</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label>
              Musical domain
              <select
                value={filters.domain}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, domain: event.target.value }))
                }
              >
                <option value="">All domains</option>
                {questDomains.map((domain) => (
                  <option key={domain.slug} value={domain.slug}>
                    {domain.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="sa-actions">
            <p role="status">
              Showing {visibleItems.length} of {items.length} loaded Quests
              {hasMore ? " · Load more to search additional Quests" : ""}.
            </p>
            <button
              type="button"
              className="sa-button sa-button--secondary"
              onClick={() => setFilters(initialFilters)}
            >
              Clear filters
            </button>
          </div>
        </section>
      ) : null}
      {atlas && items.length > 0 && !visibleItems.length ? (
        <section className="sa-panel">
          <h2>No matching loaded Quests</h2>
          <p>Change your filters or load more Quests if available.</p>
        </section>
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
                  atlas={atlas}
                  busy={atlas ? busyQuest !== null || loading : busyQuest === item.questId}
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
          disabled={loading || (atlas && busyQuest !== null)}
          onClick={() => void load(items.length, true)}
          type="button"
        >
          {loading ? "Loading more Quests…" : "Load more Quests"}
        </button>
      ) : null}
    </section>
  );
}
