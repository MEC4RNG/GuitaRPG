"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";
import {
  readOwnedQuestWorkbookContext,
  readPageWorkbookLinks,
  type WorkbookClient,
  type WorkbookContextLinkRow,
} from "@/lib/workbook/repository";

export function WorkbookAssociations({
  pageId,
  getClient,
  refreshKey,
}: {
  pageId: string;
  getClient: () => WorkbookClient;
  refreshKey: string;
}) {
  const [snapshot, setSnapshot] = useState<{
    key: string;
    links: WorkbookContextLinkRow[];
    titles: Record<string, string>;
    error: boolean;
  } | null>(null);
  const key = `${pageId}:${refreshKey}`;
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const links = await readPageWorkbookLinks(getClient(), pageId);
        if (active) setSnapshot({ key, links, titles: {}, error: false });
        const ids = [...new Set(links.map((link) => link.quest_id))];
        // Bound concurrent lookups; every association remains in the list.
        for (let start = 0; start < ids.length; start += 8) {
          const titles = await Promise.all(
            ids.slice(start, start + 8).map(async (id) => {
              try {
                const quest = await readOwnedQuestWorkbookContext(getClient(), id);
                return [id, quest?.title ?? "Quest Journey"] as const;
              } catch {
                return [id, "Quest Journey"] as const;
              }
            }),
          );
          if (!active) return;
          setSnapshot((current) =>
            current?.key === key
              ? { ...current, titles: { ...current.titles, ...Object.fromEntries(titles) } }
              : current,
          );
        }
      } catch {
        if (active) setSnapshot({ key, links: [], titles: {}, error: true });
      }
    })();
    return () => {
      active = false;
    };
  }, [getClient, key, pageId]);
  const current = snapshot?.key === key ? snapshot : null;
  if (!current) return <p className="workbook-associations-status">Loading page associations…</p>;
  if (current.error)
    return <p className="workbook-associations-status">Page associations could not be loaded.</p>;
  const questIds = [...new Set(current.links.map((link) => link.quest_id))];
  const skills = [
    ...new Set(current.links.flatMap((link) => (link.module_key ? [link.module_key] : []))),
  ];
  return (
    <details className="workbook-associations">
      <summary>
        Linked to: {questIds.length} {questIds.length === 1 ? "Quest" : "Quests"} · {skills.length}{" "}
        {skills.length === 1 ? "Quest Skill" : "Quest Skills"}
      </summary>
      {!current.links.length ? (
        <p>
          No Quest associations for this page. Link it from a Quest ingredient or contextual lesson.
        </p>
      ) : (
        <div className="workbook-associations__groups">
          <div>
            <h3>Quests</h3>
            <ul>
              {questIds.map((id) => (
                <li key={id}>
                  <Link href={`/quest/${id}`} target="_blank" rel="noopener noreferrer">
                    {current.titles[id] ?? "Quest Journey"} ↗
                  </Link>
                  <small>
                    {[
                      ...new Set(
                        current.links
                          .filter((link) => link.quest_id === id)
                          .map((link) => link.stage ?? "Quest"),
                      ),
                    ].join(" · ")}
                  </small>
                </li>
              ))}
            </ul>
          </div>
          {skills.length ? (
            <div>
              <h3>Quest Skills</h3>
              <ul>
                {skills.map((slug) => {
                  const entry = CODEX_ENTRIES.find(
                    (item) => item.kind === "SKILL" && item.slug === slug,
                  );
                  return (
                    <li key={slug}>
                      {entry ? (
                        <Link href={entry.href} target="_blank" rel="noopener noreferrer">
                          {entry.name} ↗
                        </Link>
                      ) : (
                        slug.replaceAll("_", " ")
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </details>
  );
}
