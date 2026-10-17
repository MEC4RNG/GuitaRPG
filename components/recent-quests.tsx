"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { readRecentQuestJourneys, type QuestLibraryClient } from "@/lib/quest/library-repository";
import type { SavedQuestSummary } from "@/lib/quest/library-runtime";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function RecentQuests() {
  const [items, setItems] = useState<SavedQuestSummary[] | null>(null);
  useEffect(() => {
    void readRecentQuestJourneys(createBrowserSupabaseClient() as unknown as QuestLibraryClient)
      .then(setItems)
      .catch(() => setItems([]));
  }, []);
  if (!items?.length) return null;
  return (
    <section className="recent-quests" aria-labelledby="recent-quests-title">
      <div className="recent-quests__heading">
        <div>
          <p className="eyebrow">CONTINUE</p>
          <h2 id="recent-quests-title">Recent Quests</h2>
        </div>
        <Link className="text-link" href="/quests">
          View all Saved Quests
        </Link>
      </div>
      <div className="quest-library-grid">
        {items.map((item) => (
          <article className="panel" key={item.questId}>
            <p className="eyebrow">
              {item.journey.lifecycleStatus} · {item.journey.currentStage}
            </p>
            <h3>{item.quest.identity.title}</h3>
            <p>{item.quest.objective.summary}</p>
            <Link className="text-link" href={`/quest/${item.questId}`}>
              Open Quest
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
