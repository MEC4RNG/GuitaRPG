"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  WorkbookEditorPrototype,
  type WorkbookEditorPage,
} from "@/components/workbook-editor-prototype";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { starterWorkbookDocument } from "@/lib/workbook/document-v1";
import {
  attachWorkbookContext,
  createPage,
  createQuickNote,
  createWorkbook,
  deletePage,
  detachWorkbookContext,
  duplicatePage,
  readQuestWorkbookLinks,
  readOwnedQuestWorkbookContext,
  readRevisions,
  readWorkbookSnapshot,
  reorderPages,
  restoreRevision,
  savePage,
  updateWorkbook,
  type WorkbookClient,
  type WorkbookContextLinkRow,
  type WorkbookPageRow,
  type WorkbookRevisionRow,
  type WorkbookRow,
} from "@/lib/workbook/repository";
import type { WorkbookRouteContext } from "@/lib/workbook/context";

export function WorkbookPersistenceSurface({
  context,
  embeddedCraft = false,
}: {
  context: WorkbookRouteContext | null;
  embeddedCraft?: boolean;
}) {
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
  const [pendingEdits, setPendingEdits] = useState(false);
  const [contextLinks, setContextLinks] = useState<WorkbookContextLinkRow[]>([]);
  const [questContextTitle, setQuestContextTitle] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [snapshot, links, questContext] = await Promise.all([
        readWorkbookSnapshot(getClient()),
        context ? readQuestWorkbookLinks(getClient(), context.questId) : Promise.resolve([]),
        context
          ? readOwnedQuestWorkbookContext(getClient(), context.questId)
          : Promise.resolve(null),
      ]);
      if (!snapshot.authenticated) {
        router.replace("/onboarding?next=/workbooks");
        return;
      }
      setAnonymous(snapshot.anonymous);
      setWorkbooks(snapshot.workbooks);
      setPages(snapshot.pages);
      setContextLinks(links);
      setQuestContextTitle(questContext?.title ?? null);
      if (context && !questContext)
        setMessage("This Quest context is unavailable. Your standalone Workbooks are unchanged.");
      const eligibleCraftPages = embeddedCraft
        ? links
            .filter((link) => link.stage === "CRAFT")
            .map((link) => snapshot.pages.find((page) => page.id === link.page_id))
            .filter((page): page is WorkbookPageRow => Boolean(page))
            .filter((page) =>
              snapshot.workbooks.some(
                (workbook) => workbook.id === page.workbook_id && !workbook.archived_at,
              ),
            )
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id))
        : [];
      const requestedPage = snapshot.pages.find((item) => item.id === context?.pageId);
      const defaultPage = requestedPage ?? eligibleCraftPages[0];
      setSelectedId((current) =>
        current && snapshot.workbooks.some((item) => item.id === current)
          ? current
          : (defaultPage?.workbook_id ??
            snapshot.workbooks.find((item) => !item.archived_at)?.id ??
            null),
      );
      if (defaultPage) setInitialPageId(defaultPage.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Workbooks are unavailable.");
    } finally {
      setLoading(false);
    }
  }, [context, embeddedCraft, getClient, router]);

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

  const upsertPage = useCallback((accepted: WorkbookPageRow) => {
    setPages((current) => [...current.filter((page) => page.id !== accepted.id), accepted]);
    return accepted;
  }, []);

  const selectWorkbook = (workbookId: string, pageId: string | null = null) => {
    if (pendingEdits && workbookId !== selectedId) {
      setMessage("Wait for the current page to show Saved before opening another Workbook.");
      return;
    }
    setMessage("");
    setSelectedId(workbookId);
    setInitialPageId(pageId);
  };

  const create = async () => {
    if (pendingEdits) {
      setMessage("Wait for the current page to show Saved before creating another Workbook.");
      return;
    }
    const title = window.prompt("Workbook title", "New workbook")?.trim();
    if (!title) return;
    try {
      const accepted = await createWorkbook(getClient(), title);
      setWorkbooks((current) => [accepted.workbook, ...current]);
      setPages((current) => [...current, accepted.page]);
      selectWorkbook(accepted.workbook.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Workbook could not be created.");
    }
  };

  const quickNote = async () => {
    if (pendingEdits) {
      setMessage("Wait for the current page to show Saved before creating a Quick Note.");
      return;
    }
    try {
      const accepted = await createQuickNote(getClient());
      setWorkbooks((current) => {
        const without = current.filter((item) => item.id !== accepted.workbook.id);
        return [accepted.workbook, ...without];
      });
      upsertPage(accepted.page);
      selectWorkbook(accepted.workbook.id, accepted.page.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Quick Note could not be created.");
    }
  };

  const archive = async (workbook: WorkbookRow, archived: boolean) => {
    if (pendingEdits && workbook.id === selectedId) {
      setMessage("Wait for the current page to show Saved before archiving this Workbook.");
      return;
    }
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

  const currentContextLink =
    context && activePage
      ? contextLinks.find(
          (link) =>
            link.page_id === activePage.id &&
            link.stage === context.stage &&
            link.relationship === context.relationship &&
            link.session_id === (context.sessionId ?? null),
        )
      : null;

  const linkCurrentPage = async () => {
    if (!context || !questContextTitle || !activePage || pendingEdits) {
      if (pendingEdits) setMessage("Wait for the current page to show Saved before linking it.");
      return;
    }
    try {
      const accepted = await attachWorkbookContext(getClient(), {
        pageId: activePage.id,
        questId: context.questId,
        stage: context.stage,
        relationship: context.relationship,
        sessionId: context.sessionId,
      });
      setContextLinks((current) => [
        ...current.filter((item) => item.id !== accepted.id),
        accepted,
      ]);
      setMessage("Page linked to this Quest Journey.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Page could not be linked.");
    }
  };

  const unlinkCurrentPage = async () => {
    if (!currentContextLink || pendingEdits) {
      if (pendingEdits) setMessage("Wait for the current page to show Saved before unlinking it.");
      return;
    }
    try {
      await detachWorkbookContext(getClient(), currentContextLink.id);
      setContextLinks((current) => current.filter((item) => item.id !== currentContextLink.id));
      setMessage("Page unlinked. Its content and revision history are unchanged.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Page could not be unlinked.");
    }
  };

  const returnToJourney = () => {
    if (!context) return;
    if (pendingEdits) {
      setMessage("Wait for the current page to show Saved before returning to the Journey.");
      return;
    }
    router.push(`/quest/${context.questId}`);
  };

  const showHistory = async () => {
    if (!activePage) return;
    try {
      setRevisions(await readRevisions(getClient(), activePage.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Revision history is unavailable.");
    }
  };

  const createComposition = async () => {
    if (!context || pendingEdits) {
      if (pendingEdits)
        setMessage("Wait for the current page to show Saved before creating a composition.");
      return;
    }
    const title = window.prompt("Composition title", "New composition")?.trim();
    if (!title) return;
    try {
      let acceptedPage: WorkbookPageRow;
      let workbookId = selected?.archived_at ? null : selected?.id;
      if (!workbookId) {
        const created = await createWorkbook(getClient(), "Compositions");
        setWorkbooks((current) => [created.workbook, ...current]);
        acceptedPage = created.page;
        workbookId = created.workbook.id;
      } else {
        acceptedPage = await createPage(getClient(), workbookId, title, starterWorkbookDocument());
      }
      if (acceptedPage.title !== title) {
        const saved = await savePage(
          getClient(),
          { ...acceptedPage, title, revision: acceptedPage.revision ?? 1 },
          crypto.randomUUID(),
        );
        if (saved.status === "accepted") acceptedPage = saved.page;
      }
      upsertPage(acceptedPage);
      setSelectedId(workbookId);
      setInitialPageId(acceptedPage.id);
      try {
        const link = await attachWorkbookContext(getClient(), {
          pageId: acceptedPage.id,
          questId: context.questId,
          stage: "CRAFT",
          relationship: "CREATED_DURING",
        });
        setContextLinks((current) => [...current.filter((item) => item.id !== link.id), link]);
        setMessage("Composition created and linked to this Quest.");
      } catch (error) {
        setMessage(
          `${error instanceof Error ? error.message : "The composition could not be linked."} The page is safe in your Workbook and can be linked later.`,
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Composition could not be created.");
    }
  };

  if (loading) return <p role="status">Loading your Workbooks…</p>;

  const craftLinks = contextLinks.filter((link) => link.stage === "CRAFT");
  const craftPages = craftLinks
    .map((link) => pages.find((page) => page.id === link.page_id))
    .filter((page): page is WorkbookPageRow => Boolean(page))
    .filter((page) => workbooks.some((book) => book.id === page.workbook_id && !book.archived_at))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id));

  if (embeddedCraft && context) {
    return (
      <section className="craft-workspace" aria-labelledby="craft-workspace-title">
        <header className="craft-workspace__header">
          <div>
            <p className="eyebrow">COMPOSITION WORKBOOK</p>
            <h2 id="craft-workspace-title">Create something using what you discovered</h2>
            <p>Private, persistent work. Editing never starts a Session or claims progress.</p>
          </div>
          <div className="craft-workspace__actions">
            {workbooks.some((workbook) => !workbook.archived_at) ? (
              <label>
                Save new composition in
                <select
                  value={selectedId ?? ""}
                  disabled={pendingEdits}
                  onChange={(event) => selectWorkbook(event.target.value)}
                >
                  {workbooks
                    .filter((workbook) => !workbook.archived_at)
                    .map((workbook) => (
                      <option key={workbook.id} value={workbook.id}>
                        {workbook.title}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <small>A Compositions Workbook will be created after confirmation.</small>
            )}
            <button type="button" disabled={pendingEdits} onClick={() => void createComposition()}>
              New Composition
            </button>
            {activePage ? (
              <Link
                className="action-button action-button--secondary"
                aria-disabled={pendingEdits}
                href={
                  pendingEdits
                    ? "#craft-workspace-title"
                    : `/workbooks?quest=${context.questId}&stage=CRAFT&relationship=CREATED_DURING&page=${activePage.id}`
                }
                onClick={(event) => {
                  if (pendingEdits) event.preventDefault();
                }}
              >
                Open in Full Workbook Editor
              </Link>
            ) : null}
          </div>
        </header>
        <p role="status" className="workbook-library__message">
          {message}
        </p>
        {craftPages.length ? (
          <label className="craft-workspace__selector">
            Composition
            <select
              value={activePage?.id ?? initialPageId ?? ""}
              disabled={pendingEdits}
              onChange={(event) => {
                const page = craftPages.find((item) => item.id === event.target.value);
                if (page) selectWorkbook(page.workbook_id, page.id);
              }}
            >
              {craftPages.map((page) => {
                const owner = workbooks.find((book) => book.id === page.workbook_id);
                return (
                  <option key={page.id} value={page.id}>
                    {owner?.title ?? "Workbook"} · {page.title}
                  </option>
                );
              })}
            </select>
          </label>
        ) : (
          <div className="craft-workspace__empty">
            <h3>No Quest composition yet</h3>
            <p>Create one explicitly when you are ready. Nothing has been created automatically.</p>
            <button type="button" onClick={() => void createComposition()}>
              New Composition
            </button>
          </div>
        )}
        {selected && selectedPages.length && craftPages.length ? (
          <WorkbookEditorPrototype
            key={`${selected.id}-${initialPageId ?? "first"}`}
            persistent
            workbookTitle={selected.title}
            initialActivePageId={initialPageId ?? undefined}
            initialPages={selectedPages.filter((page) =>
              craftPages.some((craftPage) => craftPage.id === page.id),
            )}
            onActivePageChange={setActivePage}
            onPendingChange={setPendingEdits}
            onCreatePage={async (title, document) => {
              const page = await createPage(getClient(), selected.id, title, document);
              upsertPage(page);
              const link = await attachWorkbookContext(getClient(), {
                pageId: page.id,
                questId: context.questId,
                stage: "CRAFT",
                relationship: "CREATED_DURING",
              });
              setContextLinks((current) => [...current, link]);
              return page;
            }}
            onDuplicatePage={async (pageId) => {
              const page = await duplicatePage(getClient(), pageId);
              upsertPage(page);
              const link = await attachWorkbookContext(getClient(), {
                pageId: page.id,
                questId: context.questId,
                stage: "CRAFT",
                relationship: "CREATED_DURING",
              });
              setContextLinks((current) => [...current, link]);
              return page;
            }}
            onDeletePage={async (pageId) => {
              await deletePage(getClient(), pageId);
              setPages((current) => current.filter((page) => page.id !== pageId));
            }}
            onReorderPages={async (ids) => {
              await reorderPages(getClient(), selected.id, ids);
            }}
            onSavePage={async (page, requestId) => {
              const result = await savePage(
                getClient(),
                { ...page, revision: page.revision ?? 1 },
                requestId,
              );
              if (result.status === "conflict")
                return { status: "conflict", revision: result.revision, serverPage: result.page };
              upsertPage(result.page);
              return { status: "accepted", revision: result.revision };
            }}
          />
        ) : null}
      </section>
    );
  }

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
      {context ? (
        <section className="workbook-context" aria-labelledby="workbook-context-title">
          <div>
            <span className="eyebrow">WORKBOOK CONTEXT · {context.stage}</span>
            <h2 id="workbook-context-title">{questContextTitle ?? "Unavailable Quest"}</h2>
            <p>
              Choose any existing page, Quick Note, or new Workbook. Linking adds context only; it
              does not change the Quest, Session, Result, or progression.
            </p>
          </div>
          <div className="workbook-context__actions">
            {currentContextLink ? (
              <button
                type="button"
                disabled={pendingEdits}
                onClick={() => void unlinkCurrentPage()}
              >
                Unlink current page
              </button>
            ) : (
              <button
                type="button"
                disabled={!questContextTitle || !activePage || pendingEdits}
                onClick={() => void linkCurrentPage()}
              >
                Link current page
              </button>
            )}
            <button type="button" disabled={pendingEdits} onClick={returnToJourney}>
              Return to Journey
            </button>
          </div>
        </section>
      ) : null}
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
                selectWorkbook(page.workbook_id, page.id);
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
                    selectWorkbook(workbook.id);
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
                  {workbook.kind === "QUICK_NOTES" ? (
                    <ul
                      className="workbook-library__archived-pages"
                      aria-label="Archived Quick Note pages"
                    >
                      {pages
                        .filter((page) => page.workbook_id === workbook.id)
                        .sort((a, b) => a.position - b.position)
                        .map((page) => (
                          <li key={page.id}>{page.title}</li>
                        ))}
                    </ul>
                  ) : null}
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
                onPendingChange={setPendingEdits}
                onCreatePage={async (title, document) =>
                  upsertPage(await createPage(getClient(), selected.id, title, document))
                }
                onDuplicatePage={async (pageId) =>
                  upsertPage(await duplicatePage(getClient(), pageId))
                }
                onDeletePage={async (pageId) => {
                  await deletePage(getClient(), pageId);
                  setPages((current) => current.filter((page) => page.id !== pageId));
                }}
                onReorderPages={async (ids) => {
                  await reorderPages(getClient(), selected.id, ids);
                  const positions = new Map(ids.map((id, position) => [id, position]));
                  setPages((current) =>
                    current.map((page) =>
                      page.workbook_id === selected.id && positions.has(page.id)
                        ? { ...page, position: positions.get(page.id) ?? page.position }
                        : page,
                    ),
                  );
                }}
                onSavePage={async (page, requestId) => {
                  const result = await savePage(
                    getClient(),
                    { ...page, revision: page.revision ?? 1 },
                    requestId,
                  );
                  if (result.status === "conflict")
                    return {
                      status: "conflict",
                      revision: result.revision,
                      serverPage: result.page,
                    };
                  upsertPage(result.page);
                  return { status: "accepted", revision: result.revision };
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
