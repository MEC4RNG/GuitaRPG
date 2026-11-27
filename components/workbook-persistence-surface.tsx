"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  WorkbookEditorPrototype,
  type WorkbookEditorPage,
} from "@/components/workbook-editor-prototype";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { WorkbookDisplay } from "./workbook-display";
import { WorkbookAssociations } from "./workbook-associations";
import { starterWorkbookDocument } from "@/lib/workbook/document-v1";
import {
  buildLessonWorkbookDocument,
  hasLessonSource,
  type CodexLessonWorkbookSource,
} from "@/lib/workbook/lesson-template";
import {
  attachWorkbookContext,
  attachExploreModulePage,
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
import { workbookContextHref, type WorkbookRouteContext } from "@/lib/workbook/context";
import { craftMaterial, mergeCraftPageOrder } from "@/lib/ux/craft-material";
import type { WorkbookDocumentV1 } from "@/lib/workbook/document-v1";

export function WorkbookPersistenceSurface({
  context,
  embeddedCraft = false,
  atlasCraft = false,
  craftReadOnly = false,
  onReturnToExplore,
  embeddedExplore,
  lessonSource = null,
  onEmbeddedPendingChange,
  onContinueInCraft,
  onReturnToActivity,
}: {
  context: WorkbookRouteContext | null;
  embeddedCraft?: boolean;
  atlasCraft?: boolean;
  craftReadOnly?: boolean;
  onReturnToExplore?: () => Promise<void>;
  embeddedExplore?: { pageId: string; moduleKey: string | null };
  lessonSource?: CodexLessonWorkbookSource | null;
  onEmbeddedPendingChange?: (pending: boolean) => void;
  onContinueInCraft?: (pageId: string) => Promise<void>;
  onReturnToActivity?: () => Promise<void>;
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
  const reportEmbeddedPending = useCallback(
    (pending: boolean) => {
      setPendingEdits(pending);
      onEmbeddedPendingChange?.(pending);
    },
    [onEmbeddedPendingChange],
  );
  const [transferring, setTransferring] = useState(false);
  const [craftCreating, setCraftCreating] = useState(false);
  const [craftTitle, setCraftTitle] = useState("New composition");
  const [craftTarget, setCraftTarget] = useState("");
  const [craftBusy, setCraftBusy] = useState(false);
  const [craftRetry, setCraftRetry] = useState(false);
  const compositionReceipt = useRef<{ requestId: string; title: string; target: string; document: WorkbookDocumentV1; page?: WorkbookPageRow } | null>(null);
  const [contextLinks, setContextLinks] = useState<WorkbookContextLinkRow[]>([]);
  const [questContextTitle, setQuestContextTitle] = useState<string | null>(null);
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [pageNavigationOpen, setPageNavigationOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [displayMode, setDisplayMode] = useState(false);
  const [documentToolsOpen, setDocumentToolsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPageId, setHistoryPageId] = useState<string | null>(null);
  const lessonCreatePendingRef = useRef(false);

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
        const contextPath = context
          ? workbookContextHref(context.questId, context.stage, context.relationship, {
              pageId: context.pageId,
              sessionId: context.sessionId,
            })
          : "/workbooks";
        const nextPath = lessonSource
          ? `${contextPath}${contextPath.includes("?") ? "&" : "?"}codex_module=${encodeURIComponent(lessonSource.moduleId)}`
          : contextPath;
        router.replace(
          nextPath === "/workbooks"
            ? "/onboarding?next=/workbooks"
            : `/onboarding?next=${encodeURIComponent(nextPath)}`,
        );
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
      const eligibleExplorePages = embeddedExplore
        ? links
            .filter(
              (link) => link.stage === "EXPLORE" && link.module_key === embeddedExplore.moduleKey,
            )
            .map((link) => snapshot.pages.find((page) => page.id === link.page_id))
            .filter((page): page is WorkbookPageRow => Boolean(page))
        : [];
      const requestedPage = (embeddedCraft ? eligibleCraftPages : snapshot.pages).find((item) => item.id === context?.pageId);
      const defaultPage =
        requestedPage ??
        eligibleExplorePages.find((item) => item.id === embeddedExplore?.pageId) ??
        eligibleCraftPages[0];
      setSelectedId((current) =>
        !atlasCraft && current && snapshot.workbooks.some((item) => item.id === current)
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
  }, [context, embeddedCraft, embeddedExplore, getClient, lessonSource, router, atlasCraft]);

  useEffect(() => {
    // Initial owner-scoped hydration is intentionally driven by the browser Auth client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const selected = workbooks.find((item) => item.id === selectedId) ?? null;
  const selectedPages = pages
    .filter((page) => page.workbook_id === selectedId)
    .sort((a, b) => a.position - b.position);
  const acceptedPage =
    selectedPages.find((page) => page.id === activePage?.id) ??
    selectedPages.find((page) => page.id === initialPageId) ??
    selectedPages[0];
  const showingDisplay = displayMode && !pendingEdits;
  const filteredWorkbooks = workbooks.filter((workbook) => {
    const query = librarySearch.trim().toLocaleLowerCase();
    return (
      !query ||
      workbook.title.toLocaleLowerCase().includes(query) ||
      (workbook.description ?? "").toLocaleLowerCase().includes(query) ||
      pages.some(
        (page) =>
          page.workbook_id === workbook.id && page.title.toLocaleLowerCase().includes(query),
      )
    );
  });
  const recentPages = [...pages]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);
  const lessonPages = lessonSource
    ? pages
        .filter((page) => hasLessonSource(page.document, lessonSource.moduleId))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    : [];

  const upsertPage = useCallback((accepted: WorkbookPageRow) => {
    setPages((current) => [...current.filter((page) => page.id !== accepted.id), accepted]);
    return accepted;
  }, []);

  const selectWorkbook = (workbookId: string, pageId: string | null = null) => {
    if (pendingEdits && (workbookId !== selectedId || pageId !== null)) {
      setMessage("Wait for the current page to show Saved before opening another Workbook.");
      return;
    }
    setMessage("");
    setSelectedId(workbookId);
    setInitialPageId(pageId);
    if (atlasCraft) setActivePage(null);
    setHistoryOpen(false);
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

  const lessonModuleKey =
    context?.stage === "EXPLORE" && context.relationship === "APPLIES_TO"
      ? (lessonSource?.skillSlug ?? null)
      : null;

  const attachContextPage = async (pageId: string) => {
    if (!context || !questContextTitle) throw new Error("Quest context is unavailable.");
    if (lessonModuleKey) {
      return attachExploreModulePage(getClient(), pageId, context.questId, lessonModuleKey);
    }
    return attachWorkbookContext(getClient(), {
      pageId,
      questId: context.questId,
      stage: context.stage,
      relationship: context.relationship,
      sessionId: context.sessionId,
    });
  };

  const createFromLesson = async (newWorkbook: boolean) => {
    if (!lessonSource || lessonCreatePendingRef.current) return;
    if (pendingEdits) {
      setMessage("Wait for the current page to show Saved before creating another page.");
      return;
    }
    if (!newWorkbook && (!selected || selected.archived_at)) {
      setMessage("Select an active Workbook first, or create a new one.");
      return;
    }
    lessonCreatePendingRef.current = true;
    setCreatingLesson(true);
    try {
      const document = buildLessonWorkbookDocument(lessonSource);
      const title = lessonSource.title.slice(0, 120);
      let page: WorkbookPageRow;
      let targetWorkbookId: string;
      if (newWorkbook) {
        const created = await createWorkbook(getClient(), `${lessonSource.skillName} Practice`, {
          document,
        });
        setWorkbooks((current) => [created.workbook, ...current]);
        page = created.page;
        targetWorkbookId = created.workbook.id;
      } else {
        targetWorkbookId = selected!.id;
        page = await createPage(getClient(), targetWorkbookId, title, document);
      }
      // The initial Page title for createWorkbook is supplied by its existing
      // trusted RPC. Rename through normal revision-checked save, never by
      // bypassing the document repository.
      let titleWarning = "";
      if (page.title !== title) {
        try {
          const saved = await savePage(
            getClient(),
            { ...page, title, revision: page.revision },
            crypto.randomUUID(),
          );
          if (saved.status === "accepted") page = saved.page;
          else titleWarning = " Its title could not be updated because a newer revision exists.";
        } catch {
          titleWarning = " Its title could not be updated; the saved lesson content is intact.";
        }
      }
      upsertPage(page);
      setSelectedId(targetWorkbookId);
      setInitialPageId(page.id);
      if (context && questContextTitle) {
        try {
          const link = await attachContextPage(page.id);
          setContextLinks((current) => [...current.filter((item) => item.id !== link.id), link]);
          setMessage(
            lessonModuleKey
              ? `Lesson page created and linked to this Explore ingredient.${titleWarning}`
              : `Lesson page created and linked to this Quest.${titleWarning}`,
          );
        } catch {
          setMessage(
            `Lesson page created but not linked to this Quest. Attach it later.${titleWarning}`,
          );
        }
      } else {
        setMessage(`Lesson page created in your Workbook.${titleWarning}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The lesson page could not be created.");
    } finally {
      lessonCreatePendingRef.current = false;
      setCreatingLesson(false);
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
            link.session_id === (context.sessionId ?? null) &&
            (!lessonModuleKey || link.module_key === lessonModuleKey),
        )
      : null;

  const linkCurrentPage = async () => {
    if (!context || !questContextTitle || !activePage || pendingEdits) {
      if (pendingEdits) setMessage("Wait for the current page to show Saved before linking it.");
      return;
    }
    try {
      const accepted = await attachContextPage(activePage.id);
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
      const pageId = activePage.id;
      const history = await readRevisions(getClient(), pageId);
      setRevisions(history);
      setHistoryPageId(pageId);
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

  async function linkCraftMaterial(page: WorkbookPageRow) {
    if (!context || !questContextTitle || pendingEdits || craftBusy || craftReadOnly) return;
    setCraftBusy(true);
    onEmbeddedPendingChange?.(true);
    try {
      const link = await attachWorkbookContext(getClient(), { pageId: page.id, questId: context.questId, stage: "CRAFT", relationship: "APPLIES_TO" });
      setContextLinks((current) => [...current.filter((item) => item.id !== link.id), link]);
      selectWorkbook(page.workbook_id, page.id);
      setDisplayMode(false);
      setMessage("Existing page linked to Craft. Your Explore material is unchanged.");
    } catch {
      setMessage("The page could not be linked to Craft. Your saved material is unchanged.");
    } finally {
      setCraftBusy(false);
      onEmbeddedPendingChange?.(false);
    }
  }

  async function createAtlasComposition() {
    if (!context || !questContextTitle || pendingEdits || craftBusy || craftReadOnly) return;
    const title = craftTitle.trim().slice(0, 120);
    if (!title) return;
    const receipt: NonNullable<typeof compositionReceipt.current> = compositionReceipt.current ?? { requestId: crypto.randomUUID(), title, target: craftTarget, document: starterWorkbookDocument() };
    if (!compositionReceipt.current && receipt.target && !workbooks.some((book) => book.id === receipt.target && !book.archived_at && book.kind === "WORKBOOK")) {
      setMessage("Choose an active Workbook.");
      return;
    }
    compositionReceipt.current = receipt;
    setCraftRetry(true);
    setCraftBusy(true);
    onEmbeddedPendingChange?.(true);
    try {
      const api = getClient();
      if (!receipt.page && receipt.target) {
        receipt.page = await createPage(api, receipt.target, receipt.title, receipt.document, receipt.requestId);
      }
      if (!receipt.page) {
        const created = await createWorkbook(api, "Compositions", { document: receipt.document, requestId: receipt.requestId });
        receipt.page = created.page;
        setWorkbooks((current) => [created.workbook, ...current.filter((book) => book.id !== created.workbook.id)]);
      }
      let page = receipt.page;
      if (page.title !== receipt.title) {
        const saved = await savePage(api, { ...page, title: receipt.title }, crypto.randomUUID());
        page = saved.page;
        receipt.page = page;
      }
      upsertPage(page);
      const link = await attachWorkbookContext(api, { pageId: page.id, questId: context.questId, stage: "CRAFT", relationship: "CREATED_DURING" });
      setContextLinks((current) => [...current.filter((item) => item.id !== link.id), link]);
      selectWorkbook(page.workbook_id, page.id);
      setDisplayMode(false);
      setCraftCreating(false);
      setCraftRetry(false);
      compositionReceipt.current = null;
      setMessage("Composition created and linked to this Quest.");
    } catch {
      setMessage("Your composition may already be saved. Retry with the same destination to finish linking it.");
    } finally {
      setCraftBusy(false);
      onEmbeddedPendingChange?.(false);
    }
  }

  if (loading) return <p role="status">Loading your Workbooks…</p>;

  const craftLinks = contextLinks.filter((link) => link.stage === "CRAFT");
  const craftPages = craftLinks
    .filter((link, index, all) => all.findIndex((item) => item.page_id === link.page_id) === index)
    .map((link) => pages.find((page) => page.id === link.page_id))
    .filter((page): page is WorkbookPageRow => Boolean(page))
    .filter((page) => workbooks.some((book) => book.id === page.workbook_id && !book.archived_at))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id));

  if (embeddedExplore && context) {
    const exploreLinks = contextLinks.filter(
      (link) => link.stage === "EXPLORE" && link.module_key === embeddedExplore.moduleKey,
    );
    const explorePages = exploreLinks
      .map((link) => pages.find((page) => page.id === link.page_id))
      .filter((page): page is WorkbookPageRow => Boolean(page));
    const page = explorePages.find((item) => item.id === embeddedExplore.pageId);
    const owner = page ? workbooks.find((item) => item.id === page.workbook_id) : null;
    if (!page || !owner) return <p role="status">This Explore page is unavailable.</p>;
    return (
      <section className="explore-editor" aria-labelledby="explore-editor-title">
        <header className="craft-workspace__header">
          <div>
            <p className="eyebrow">EXPLORE WORKBOOK</p>
            <h2 id="explore-editor-title">
              {owner.title} · {page.title}
            </h2>
          </div>
          <div className="craft-workspace__actions">
            {onReturnToActivity ? (
              <button
                type="button"
                className="action-button action-button--secondary"
                disabled={pendingEdits || transferring}
                onClick={() => void onReturnToActivity()}
              >
                Return to activity
              </button>
            ) : null}
            {onContinueInCraft ? (
              <button
                type="button"
                className="action-button action-button--primary"
                disabled={pendingEdits || transferring || !activePage}
                onClick={async () => {
                  if (!activePage || pendingEdits || transferring) return;
                  setTransferring(true);
                  try {
                    await onContinueInCraft(activePage.id);
                  } finally {
                    setTransferring(false);
                  }
                }}
              >
                Continue in Craft
              </button>
            ) : null}
            <Link
              className="action-button action-button--secondary"
              aria-disabled={pendingEdits}
              href={
                pendingEdits
                  ? "#explore-editor-title"
                  : `/workbooks?quest=${context.questId}&stage=EXPLORE&relationship=APPLIES_TO&page=${page.id}`
              }
              onClick={(event) => {
                if (pendingEdits) event.preventDefault();
              }}
            >
              Open Full Editor
            </Link>
          </div>
        </header>
        <p role="status" className="workbook-library__message">
          {message}
        </p>
        <WorkbookEditorPrototype
          key={page.id}
          persistent
          workbookTitle={owner.title}
          initialActivePageId={page.id}
          initialPages={[page]}
          onActivePageChange={setActivePage}
          onPendingChange={reportEmbeddedPending}
          onCreatePage={async (title, document) => {
            const created = await createPage(getClient(), owner.id, title, document);
            upsertPage(created);
            const link = embeddedExplore.moduleKey
              ? await attachExploreModulePage(
                  getClient(),
                  created.id,
                  context.questId,
                  embeddedExplore.moduleKey,
                )
              : await attachWorkbookContext(getClient(), {
                  pageId: created.id,
                  questId: context.questId,
                  stage: "EXPLORE",
                  relationship: "APPLIES_TO",
                });
            setContextLinks((current) => [...current, link]);
            return created;
          }}
          onDuplicatePage={async (pageId) => {
            const created = await duplicatePage(getClient(), pageId);
            upsertPage(created);
            const link = embeddedExplore.moduleKey
              ? await attachExploreModulePage(
                  getClient(),
                  created.id,
                  context.questId,
                  embeddedExplore.moduleKey,
                )
              : await attachWorkbookContext(getClient(), {
                  pageId: created.id,
                  questId: context.questId,
                  stage: "EXPLORE",
                  relationship: "APPLIES_TO",
                });
            setContextLinks((current) => [...current, link]);
            return created;
          }}
          onDeletePage={async (pageId) => {
            await deletePage(getClient(), pageId);
            setPages((current) => current.filter((item) => item.id !== pageId));
          }}
          onReorderPages={async () => undefined}
          onSavePage={async (next, requestId) => {
            const result = await savePage(
              getClient(),
              { ...next, revision: next.revision ?? 1 },
              requestId,
            );
            if (result.status === "conflict")
              return { status: "conflict", revision: result.revision, serverPage: result.page };
            upsertPage(result.page);
            return { status: "accepted", revision: result.revision };
          }}
        />
      </section>
    );
  }

  if (embeddedCraft && context) {
    const material = craftMaterial({ questId: context.questId, links: contextLinks, pages, workbooks });
    const reusable = material.filter((item) => item.explore && !item.craft);
    const selectedCraftPages = selectedPages.filter((page) => craftPages.some((craftPage) => craftPage.id === page.id));
    const currentCraftPage = selectedCraftPages.find((page) => page.id === activePage?.id) ?? selectedCraftPages.find((page) => page.id === initialPageId) ?? selectedCraftPages[0];
    const craftDisabled = pendingEdits || craftBusy || craftReadOnly;
    return (
      <section className={`craft-workspace${atlasCraft ? " craft-workspace--atlas" : ""}`} aria-labelledby="craft-workspace-title">
        <header className="craft-workspace__header">
          <div>
            <p className="eyebrow">COMPOSITION WORKBOOK</p>
            <h2 id="craft-workspace-title">Create something using what you discovered</h2>
            <p>Private, persistent work. Editing never starts a Session or claims progress.</p>
          </div>
          <div className="craft-workspace__actions">
            {atlasCraft && onReturnToExplore ? <button type="button" className="action-button action-button--secondary" disabled={pendingEdits || craftBusy || craftReadOnly} onClick={() => void onReturnToExplore()}>Back to Explore</button> : null}
            {(!atlasCraft || craftPages.length > 0) ? <button type="button" disabled={atlasCraft ? craftDisabled : pendingEdits} onClick={() => atlasCraft ? setCraftCreating(true) : void createComposition()}>New Composition</button> : null}
            {(atlasCraft ? currentCraftPage : activePage) ? (
              <Link
                className="action-button action-button--secondary"
                aria-disabled={pendingEdits || craftBusy}
                href={
                  pendingEdits || craftBusy
                    ? "#craft-workspace-title"
                    : workbookContextHref(
                        context.questId,
                        "CRAFT",
                        craftLinks.find((link) => link.page_id === (atlasCraft ? currentCraftPage?.id : activePage?.id))?.relationship ??
                          "APPLIES_TO",
                        { pageId: (atlasCraft ? currentCraftPage?.id : activePage?.id) },
                      )
                }
                onClick={(event) => {
                  if (pendingEdits || craftBusy) event.preventDefault();
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
        {atlasCraft && craftReadOnly ? <p className="atlas-lesson-note">This Quest is archived. Restore it before creating or editing linked material.</p> : null}
        {atlasCraft && craftCreating ? (
          <section className="atlas-composition-form" aria-labelledby="atlas-composition-title">
            <h3 id="atlas-composition-title">Create a composition page</h3>
            <label>Composition title<input value={craftTitle} maxLength={120} disabled={craftDisabled || craftRetry} onChange={(event) => setCraftTitle(event.target.value)} /></label>
            <label>Composition destination<select value={craftTarget} disabled={craftDisabled || craftRetry} onChange={(event) => setCraftTarget(event.target.value)}><option value="">Create a new Workbook</option>{workbooks.filter((book) => !book.archived_at && book.kind === "WORKBOOK").map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label>
            <div className="craft-workspace__actions"><button type="button" className="action-button action-button--primary" disabled={craftDisabled || !craftTitle.trim()} onClick={() => void createAtlasComposition()}>{craftRetry ? "Retry composition save" : "Create composition"}</button><button type="button" disabled={craftBusy || craftRetry} onClick={() => setCraftCreating(false)}>Cancel</button></div>
          </section>
        ) : null}
        {atlasCraft && reusable.length ? (
          <details className="atlas-craft-material" open={!craftPages.length || undefined}>
            <summary>Develop material from Explore · {reusable.length}</summary>
            <p>Use the original page, not a copy. Linking does not change its content.</p>
            <ul>{reusable.map(({ page, workbook }) => <li key={page.id}><span><strong>{page.title}</strong><small>{workbook.title}</small></span><button type="button" disabled={craftDisabled} onClick={() => void linkCraftMaterial(page)}>Develop this page</button></li>)}</ul>
          </details>
        ) : null}
        {atlasCraft && currentCraftPage ? (
          <section className="atlas-craft-context" aria-label="Current Craft page">
            <p className="eyebrow">QUEST / CRAFT / WORKBOOK</p>
            <h3>{selected?.title} · {currentCraftPage.title}</h3>
            <p>{material.find((item) => item.page.id === currentCraftPage.id)?.explore ? "Linked to Explore and Craft · same saved page" : "Linked to this Quest’s Craft stage"}</p>
            <div className="workbook-mode-switch" role="group" aria-label="Craft mode">
              <button type="button" aria-pressed={!showingDisplay && !craftReadOnly} disabled={craftReadOnly || craftBusy} onClick={() => setDisplayMode(false)}>Edit</button>
              <button type="button" aria-pressed={showingDisplay || craftReadOnly} disabled={pendingEdits || craftBusy} onClick={() => setDisplayMode(true)}>Display</button>
            </div>
          </section>
        ) : null}
        {[...new Set(craftPages.map((page) => page.workbook_id))].length > 1 ? (
          <label className="craft-workspace__selector">
            Composition Workbook
            <select
              value={selectedId ?? ""}
              disabled={pendingEdits || craftBusy}
              onChange={(event) => {
                const next = craftPages.find((page) => page.workbook_id === event.target.value);
                if (next) selectWorkbook(next.workbook_id, next.id);
              }}
            >
              {[...new Set(craftPages.map((page) => page.workbook_id))].map((workbookId) => (
                <option key={workbookId} value={workbookId}>
                  {workbooks.find((book) => book.id === workbookId)?.title ?? "Workbook"}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {!craftPages.length ? (
          <div className="craft-workspace__empty">
            <h3>No Quest composition yet</h3>
            <p>Create one explicitly when you are ready. Nothing has been created automatically.</p>
            <button type="button" disabled={atlasCraft ? craftDisabled : pendingEdits} onClick={() => atlasCraft ? setCraftCreating(true) : void createComposition()}>New Composition</button>
          </div>
        ) : null}
        {atlasCraft && (showingDisplay || craftReadOnly) && currentCraftPage ? (
          <section className="atlas-craft-reading" aria-label="Craft display mode">
            {selectedCraftPages.length > 1 ? <label className="craft-workspace__selector">Display page<select value={currentCraftPage.id} disabled={craftBusy} onChange={(event) => selected && selectWorkbook(selected.id, event.target.value)}>{selectedCraftPages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</select></label> : null}
            <WorkbookDisplay document={currentCraftPage.document} />
          </section>
        ) : null}
        {selected && (atlasCraft ? selectedCraftPages.length > 0 && !showingDisplay && !craftReadOnly : selectedPages.length && craftPages.length) ? (
          <div className="atlas-craft-editor" inert={atlasCraft && craftBusy}>
          <WorkbookEditorPrototype
            key={`${selected.id}-${initialPageId ?? "first"}`}
            persistent
            workbookTitle={selected.title}
            initialActivePageId={atlasCraft ? currentCraftPage?.id : initialPageId ?? undefined}
            initialPages={selectedPages.filter((page) =>
              craftPages.some((craftPage) => craftPage.id === page.id),
            )}
            onActivePageChange={setActivePage}
            onPendingChange={reportEmbeddedPending}
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
              const order = atlasCraft ? mergeCraftPageOrder(selectedPages.map((page) => page.id), selectedCraftPages.map((page) => page.id), ids) : ids;
              await reorderPages(getClient(), selected.id, order);
              const positions = new Map(order.map((id, position) => [id, position]));
              setPages((current) => current.map((page) => positions.has(page.id) ? { ...page, position: positions.get(page.id)! } : page));
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
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className="workbook-library workbook-library--redesign"
      aria-labelledby="workbook-library-title"
    >
      <header className="workbook-library__header">
        <div>
          <span className="eyebrow">Private Player workspace · preview</span>
          <h1 id="workbook-library-title">Workbooks</h1>
        </div>
        <div className="workbook-library__actions">
          <button
            type="button"
            aria-pressed={focusMode}
            onClick={() => setFocusMode((value) => !value)}
          >
            {focusMode ? "Show navigation" : "Focus page"}
          </button>
          <button type="button" onClick={() => void create()}>
            New Workbook
          </button>
          <button type="button" onClick={() => void quickNote()}>
            Quick Note
          </button>
        </div>
      </header>
      {lessonSource ? (
        <section className="workbook-context" aria-labelledby="workbook-lesson-title">
          <div>
            <span className="eyebrow">CODEX LESSON → WORKBOOK</span>
            <h2 id="workbook-lesson-title">{lessonSource.title}</h2>
            <p>
              {lessonSource.skillName} · {lessonSource.applicationTitle} · {lessonSource.level}.
              Create an editable starting Page with the lesson, objectives, exercises, and room for
              notes. Only a deliberate button press creates private content.
            </p>
            {lessonSource.status === "DRAFT_REVIEW" ? (
              <p>
                Preview curriculum draft · not a published lesson or automatic progress evidence.
              </p>
            ) : null}
          </div>
          <div className="workbook-context__actions">
            {lessonPages.slice(0, 3).map((page) => (
              <button
                key={page.id}
                type="button"
                disabled={pendingEdits || creatingLesson}
                onClick={() => selectWorkbook(page.workbook_id, page.id)}
              >
                Open existing: {page.title}
              </button>
            ))}
            <button
              type="button"
              disabled={
                !selected || Boolean(selected.archived_at) || pendingEdits || creatingLesson
              }
              onClick={() => void createFromLesson(false)}
            >
              Add Page to selected Workbook
            </button>
            <button
              type="button"
              disabled={pendingEdits || creatingLesson}
              onClick={() => void createFromLesson(true)}
            >
              Create new Workbook from lesson
            </button>
          </div>
        </section>
      ) : null}
      {context ? (
        <section className="workbook-context" aria-labelledby="workbook-context-title">
          <div>
            <span className="eyebrow">WORKBOOK CONTEXT · {context.stage}</span>
            <h2 id="workbook-context-title">{questContextTitle ?? "Unavailable Quest"}</h2>
            <p>
              {lessonModuleKey
                ? "Creating a lesson page here links it to this Quest's matching Explore ingredient. To link an existing page, open it and choose Link current page."
                : "Choose any existing page, Quick Note, or new Workbook. Linking adds context only; it does not change the Quest, Session, Result, or progression."}
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
      <div
        className={`workbook-library__grid${focusMode || !libraryOpen ? " workbook-library__grid--collapsed" : ""}`}
      >
        <aside
          className="workbook-library__list"
          aria-label="Workbook library"
          hidden={focusMode || !libraryOpen}
        >
          <label className="workbook-library__search">
            Search Workbooks and Pages
            <input
              type="search"
              value={librarySearch}
              onChange={(event) => setLibrarySearch(event.target.value)}
              placeholder="Search your library"
            />
          </label>
          <details className="workbook-library__recent">
            <summary>Recent pages</summary>
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
          </details>
          <h2>Active</h2>
          {filteredWorkbooks.filter((item) => !item.archived_at).length ? null : (
            <p>No matching Workbooks.</p>
          )}
          {filteredWorkbooks
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
                <details className="workbook-library__manage">
                  <summary>Workbook actions</summary>
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
                </details>
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
          <div className="workbook-workspace-controls">
            {!focusMode ? (
              <button
                type="button"
                aria-expanded={libraryOpen}
                onClick={() => setLibraryOpen((value) => !value)}
              >
                {libraryOpen ? "Hide library" : "Show library"}
              </button>
            ) : null}
            {selected ? (
              <>
                {!focusMode ? (
                  <button
                    type="button"
                    aria-expanded={pageNavigationOpen}
                    onClick={() => setPageNavigationOpen((value) => !value)}
                  >
                    {pageNavigationOpen ? "Hide pages" : "Show pages"}
                  </button>
                ) : null}
                <div role="group" aria-label="Workbook mode" className="workbook-mode-switch">
                  <button
                    type="button"
                    aria-pressed={!showingDisplay}
                    onClick={() => setDisplayMode(false)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-pressed={showingDisplay}
                    disabled={pendingEdits}
                    onClick={() => setDisplayMode(true)}
                  >
                    Display
                  </button>
                </div>
              </>
            ) : null}
          </div>
          {selected && selectedPages.length ? (
            <>
              {acceptedPage ? (
                <WorkbookAssociations
                  pageId={acceptedPage.id}
                  getClient={getClient}
                  refreshKey={contextLinks
                    .map((link) => link.id)
                    .sort()
                    .join(",")}
                />
              ) : null}
              {showingDisplay && acceptedPage ? (
                <section className="workbook-reading-workspace" aria-label="Display mode">
                  <header>
                    <span className="eyebrow">{selected.title} · Saved page</span>
                    <h2>{acceptedPage.title}</h2>
                  </header>
                  {!focusMode && pageNavigationOpen ? (
                    <nav aria-label="Display pages" className="workbook-reading-pages">
                      {selectedPages.map((page) => (
                        <button
                          type="button"
                          key={page.id}
                          aria-current={page.id === acceptedPage.id ? "page" : undefined}
                          onClick={() => selectWorkbook(selected.id, page.id)}
                        >
                          {page.title}
                        </button>
                      ))}
                    </nav>
                  ) : null}
                  <WorkbookDisplay document={acceptedPage.document} />
                </section>
              ) : null}
              <div
                hidden={showingDisplay}
                className={`workbook-editor-shell${focusMode || !pageNavigationOpen ? " workbook-editor-shell--page-only" : ""}${documentToolsOpen ? " workbook-editor-shell--tools" : ""}`}
              >
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
                <button
                  type="button"
                  className="workbook-tools-toggle"
                  aria-expanded={documentToolsOpen}
                  onClick={() => setDocumentToolsOpen((open) => !open)}
                >
                  {documentToolsOpen ? "Hide document tools" : "Document import / export"}
                </button>
                <button
                  type="button"
                  className="workbook-tools-toggle"
                  aria-expanded={historyOpen}
                  onClick={() => setHistoryOpen((open) => !open)}
                >
                  {historyOpen ? "Hide recovery revisions" : "Recovery revisions"}
                </button>
                <section
                  className="workbook-revisions"
                  aria-labelledby="workbook-revisions-title"
                  hidden={!historyOpen}
                >
                  <h2 id="workbook-revisions-title">Recovery revisions</h2>
                  <p>
                    The latest 50 accepted snapshots are retained. Restoring creates a new revision.
                  </p>
                  <button type="button" onClick={() => void showHistory()}>
                    Load revision history
                  </button>
                  <ol>
                    {(historyPageId === activePage?.id ? revisions : []).map((revision) => (
                      <li key={revision.id}>
                        Revision {revision.revision} ·{" "}
                        {new Date(revision.created_at).toLocaleString()}{" "}
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !activePage ||
                              historyPageId !== activePage.id ||
                              pendingEdits ||
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
              </div>
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
