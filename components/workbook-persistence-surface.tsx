"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  WorkbookEditorPrototype,
  type WorkbookEditorPage,
} from "@/components/workbook-editor-prototype";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  createPage,
  createQuickNote,
  createWorkbook,
  deletePage,
  duplicatePage,
  readRevisions,
  readWorkbookSnapshot,
  reorderPages,
  restoreRevision,
  savePage,
  updateWorkbook,
  type WorkbookClient,
  type WorkbookPageRow,
  type WorkbookRevisionRow,
  type WorkbookRow,
} from "@/lib/workbook/repository";

export function WorkbookPersistenceSurface() {
  const router = useRouter();
  const clientRef = useRef<WorkbookClient | null>(null);
  const getClient = useCallback(() => {
    clientRef.current ??= createBrowserSupabaseClient() as unknown as WorkbookClient;
    return clientRef.current;
  }, []);
  const [workbooks, setWorkbooks] = useState<WorkbookRow[]>([]);
  const [pages, setPages] = useState<WorkbookPageRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [initialPageId, setInitialPageId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<WorkbookEditorPage | null>(null);
  const [revisions, setRevisions] = useState<WorkbookRevisionRow[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await readWorkbookSnapshot(getClient());
      if (!snapshot.authenticated) {
        router.replace("/onboarding?next=/workbooks");
        return;
      }
      setAnonymous(snapshot.anonymous);
      setWorkbooks(snapshot.workbooks);
      setPages(snapshot.pages);
      setSelectedId((current) =>
        current && snapshot.workbooks.some((item) => item.id === current)
          ? current
          : (snapshot.workbooks.find((item) => !item.archived_at)?.id ?? null),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Workbooks are unavailable.");
    } finally {
      setLoading(false);
    }
  }, [getClient, router]);

  useEffect(() => {
    // Initial owner-scoped hydration is intentionally driven by the browser Auth client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const selected = workbooks.find((item) => item.id === selectedId) ?? null;
  const selectedPages = pages
    .filter((page) => page.workbook_id === selectedId)
    .sort((a, b) => a.position - b.position);
  const recentPages = [...pages]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);

  const create = async () => {
    const title = window.prompt("Workbook title", "New workbook")?.trim();
    if (!title) return;
    try {
      const accepted = await createWorkbook(getClient(), title);
      setWorkbooks((current) => [accepted.workbook, ...current]);
      setPages((current) => [...current, accepted.page]);
      setSelectedId(accepted.workbook.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Workbook could not be created.");
    }
  };

  const quickNote = async () => {
    try {
      const accepted = await createQuickNote(getClient());
      setWorkbooks((current) => {
        const without = current.filter((item) => item.id !== accepted.workbook.id);
        return [accepted.workbook, ...without];
      });
      setPages((current) => [...current, accepted.page]);
      setSelectedId(accepted.workbook.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Quick Note could not be created.");
    }
  };

  const archive = async (workbook: WorkbookRow, archived: boolean) => {
    try {
      const updated = await updateWorkbook(getClient(), workbook, { archived });
      setWorkbooks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (archived && selectedId === workbook.id) setSelectedId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Workbook could not be updated.");
    }
  };

  const rename = async (workbook: WorkbookRow) => {
    const title = window.prompt("Rename workbook", workbook.title)?.trim();
    if (!title || title === workbook.title) return;
    try {
      const updated = await updateWorkbook(getClient(), workbook, { title });
      setWorkbooks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Workbook could not be renamed.");
    }
  };

  const describe = async (workbook: WorkbookRow) => {
    const description = window.prompt("Workbook description", workbook.description ?? "");
    if (description === null || description === workbook.description) return;
    try {
      const updated = await updateWorkbook(getClient(), workbook, { description });
      setWorkbooks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Description could not be updated.");
    }
  };

  const showHistory = async () => {
    if (!activePage) return;
    try {
      setRevisions(await readRevisions(getClient(), activePage.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Revision history is unavailable.");
    }
  };

  if (loading) return <p role="status">Loading your Workbooks…</p>;

  return (
    <section className="workbook-library" aria-labelledby="workbook-library-title">
      <header className="workbook-library__header">
        <div>
          <span className="eyebrow">Private Player workspace · preview</span>
          <h1 id="workbook-library-title">Workbooks</h1>
          <p>Structured guitar notes that belong to your Player, independently of Quests.</p>
        </div>
        <div className="workbook-library__actions">
          <button type="button" onClick={() => void create()}>
            New Workbook
          </button>
          <button type="button" onClick={() => void quickNote()}>
            Quick Note
          </button>
        </div>
      </header>
      {anonymous ? (
        <p className="workbook-account-warning">
          This guest Workbook is private to this browser session.{" "}
          <Link href="/profile">Protect your Player</Link> for reliable cross-device recovery.
        </p>
      ) : (
        <p className="workbook-account-note">
          Protected Player · accepted revisions are available after sign-in on another device.
        </p>
      )}
      <p role="status" className="workbook-library__message">
        {message}
      </p>
      <div className="workbook-library__grid">
        <aside className="workbook-library__list" aria-label="Workbook library">
          <h2>Recent pages</h2>
          {recentPages.map((page) => (
            <button
              type="button"
              key={`recent-${page.id}`}
              onClick={() => {
                setSelectedId(page.workbook_id);
                setInitialPageId(page.id);
              }}
            >
              {page.title}
            </button>
          ))}
          <h2>Active</h2>
          {workbooks.filter((item) => !item.archived_at).length ? null : <p>No Workbooks yet.</p>}
          {workbooks
            .filter((item) => !item.archived_at)
            .map((workbook) => (
              <article
                key={workbook.id}
                className={selectedId === workbook.id ? "is-selected" : ""}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(workbook.id);
                    setInitialPageId(null);
                  }}
                >
                  {workbook.title}
                </button>
                <small>
                  {workbook.kind === "QUICK_NOTES"
                    ? "Quick Notes"
                    : `Updated ${new Date(workbook.updated_at).toLocaleDateString()}`}
                </small>
                <div>
                  <button type="button" onClick={() => void rename(workbook)}>
                    Rename
                  </button>
                  <button type="button" onClick={() => void describe(workbook)}>
                    Description
                  </button>
                  <button type="button" onClick={() => void archive(workbook, true)}>
                    Archive
                  </button>
                </div>
              </article>
            ))}
          <details>
            <summary>
              Archived Workbooks ({workbooks.filter((item) => item.archived_at).length})
            </summary>
            {workbooks
              .filter((item) => item.archived_at)
              .map((workbook) => (
                <article key={workbook.id}>
                  <strong>{workbook.title}</strong>
                  <button type="button" onClick={() => void archive(workbook, false)}>
                    Restore
                  </button>
                </article>
              ))}
          </details>
          <p className="workbook-export-disclosure">
            Player export V1 does not yet include Workbook content. Download page JSON from the
            editor when you need a portable copy; DATA-005 owns complete account export integration.
          </p>
        </aside>
        <div className="workbook-library__workspace">
          {selected && selectedPages.length ? (
            <>
              <WorkbookEditorPrototype
                key={`${selected.id}-${initialPageId ?? "first"}`}
                persistent
                workbookTitle={selected.title}
                initialActivePageId={initialPageId ?? undefined}
                initialPages={selectedPages}
                onActivePageChange={setActivePage}
                onCreatePage={(title, document) =>
                  createPage(getClient(), selected.id, title, document)
                }
                onDuplicatePage={(pageId) => duplicatePage(getClient(), pageId)}
                onDeletePage={(pageId) => deletePage(getClient(), pageId)}
                onReorderPages={(ids) => reorderPages(getClient(), selected.id, ids)}
                onSavePage={async (page, requestId) => {
                  const result = await savePage(
                    getClient(),
                    { ...page, revision: page.revision ?? 1 },
                    requestId,
                  );
                  return result.status === "conflict"
                    ? { status: "conflict", revision: result.revision, serverPage: result.page }
                    : { status: "accepted", revision: result.revision };
                }}
              />
              <section className="workbook-revisions" aria-labelledby="workbook-revisions-title">
                <h2 id="workbook-revisions-title">Recovery revisions</h2>
                <p>
                  The latest 50 accepted snapshots are retained. Restoring creates a new revision.
                </p>
                <button type="button" onClick={() => void showHistory()}>
                  Load revision history
                </button>
                <ol>
                  {revisions.map((revision) => (
                    <li key={revision.id}>
                      Revision {revision.revision} ·{" "}
                      {new Date(revision.created_at).toLocaleString()}{" "}
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            !activePage ||
                            !window.confirm(
                              `Restore revision ${revision.revision} as a new revision?`,
                            )
                          )
                            return;
                          const result = await restoreRevision(
                            getClient(),
                            activePage.id,
                            revision.revision,
                            activePage.revision ?? 1,
                          );
                          if (result.status === "conflict")
                            setMessage("Restore conflict · reload before choosing a revision.");
                          else window.location.reload();
                        }}
                      >
                        Restore
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          ) : (
            <div className="workbook-library__empty">
              <h2>Choose or create a Workbook</h2>
              <p>Your pages and accepted revisions will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
