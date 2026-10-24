import {
  parseWorkbookDocument,
  starterWorkbookDocument,
  type WorkbookDocumentV1,
} from "./document-v1";

type ErrorValue = { message: string; code?: string } | null;
type Result<T> = PromiseLike<{ data: T | null; error: ErrorValue }>;
type Query<T> = Result<T> & {
  select(columns: string): Query<T>;
  eq(column: string, value: string | boolean): Query<T>;
  order(column: string, options?: { ascending?: boolean }): Query<T>;
};

export type WorkbookClient = {
  auth: {
    getUser(): PromiseLike<{
      data: { user: { id: string; is_anonymous?: boolean } | null };
      error?: ErrorValue;
    }>;
  };
  from<T = unknown>(table: string): Query<T>;
  rpc(name: string, parameters?: Record<string, unknown>): Result<unknown>;
};

export type WorkbookRow = {
  id: string;
  player_id: string;
  title: string;
  description: string | null;
  kind: "WORKBOOK" | "QUICK_NOTES";
  archived_at: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
};

export type WorkbookPageRow = {
  id: string;
  workbook_id: string;
  title: string;
  position: number;
  document: WorkbookDocumentV1;
  revision: number;
  created_at: string;
  updated_at: string;
};

export type WorkbookRevisionRow = {
  id: string;
  page_id: string;
  revision: number;
  title: string;
  document: WorkbookDocumentV1;
  created_at: string;
};

export type WorkbookSnapshot = {
  authenticated: boolean;
  anonymous: boolean;
  workbooks: WorkbookRow[];
  pages: WorkbookPageRow[];
};

function fail(error: ErrorValue, message: string) {
  if (error) throw new Error(`${message}: ${error.message}`);
}

export async function readWorkbookSnapshot(client: WorkbookClient): Promise<WorkbookSnapshot> {
  const auth = await client.auth.getUser();
  if (auth.error) throw new Error("We couldn't prepare your Player session. Please try again.");
  if (!auth.data.user) return { authenticated: false, anonymous: false, workbooks: [], pages: [] };
  const [workbooks, pages] = await Promise.all([
    client
      .from<WorkbookRow[]>("player_workbooks")
      .select("*")
      .order("updated_at", { ascending: false }),
    client.from<WorkbookPageRow[]>("player_workbook_pages").select("*").order("position"),
  ]);
  fail(workbooks.error, "Workbooks could not be loaded");
  fail(pages.error, "Workbook pages could not be loaded");
  return {
    authenticated: true,
    anonymous: Boolean(auth.data.user.is_anonymous),
    workbooks: workbooks.data ?? [],
    pages: (pages.data ?? []).map((page) => ({
      ...page,
      document: parseWorkbookDocument(page.document),
    })),
  };
}

export async function createWorkbook(client: WorkbookClient, title: string) {
  const result = await client.rpc("create_player_workbook_v1", {
    p_title: title,
    p_description: null,
    p_kind: "WORKBOOK",
    p_document: starterWorkbookDocument(),
    p_request_id: crypto.randomUUID(),
  });
  fail(result.error, "Workbook could not be created");
  return result.data as { workbook: WorkbookRow; page: WorkbookPageRow };
}

export async function createQuickNote(client: WorkbookClient) {
  const result = await client.rpc("create_player_quick_note_v1", {
    p_title: null,
    p_document: starterWorkbookDocument(),
    p_request_id: crypto.randomUUID(),
  });
  fail(result.error, "Quick Note could not be created");
  return result.data as { workbook: WorkbookRow; page: WorkbookPageRow };
}

export async function updateWorkbook(
  client: WorkbookClient,
  workbook: WorkbookRow,
  changes: { title?: string; description?: string | null; archived?: boolean },
) {
  const result = await client.rpc("update_player_workbook_v1", {
    p_workbook_id: workbook.id,
    p_expected_revision: workbook.revision,
    p_title: changes.title ?? workbook.title,
    p_description: changes.description ?? workbook.description,
    p_archived: changes.archived ?? Boolean(workbook.archived_at),
  });
  fail(result.error, "Workbook could not be updated");
  return result.data as WorkbookRow;
}

export async function createPage(
  client: WorkbookClient,
  workbookId: string,
  title: string,
  document: WorkbookDocumentV1,
) {
  const result = await client.rpc("create_player_workbook_page_v1", {
    p_workbook_id: workbookId,
    p_title: title,
    p_document: parseWorkbookDocument(document),
    p_request_id: crypto.randomUUID(),
  });
  fail(result.error, "Page could not be created");
  return result.data as WorkbookPageRow;
}

export async function duplicatePage(client: WorkbookClient, pageId: string) {
  const result = await client.rpc("duplicate_player_workbook_page_v1", {
    p_page_id: pageId,
    p_request_id: crypto.randomUUID(),
  });
  fail(result.error, "Page could not be duplicated");
  return result.data as WorkbookPageRow;
}

export async function deletePage(client: WorkbookClient, pageId: string) {
  const result = await client.rpc("delete_player_workbook_page_v1", { p_page_id: pageId });
  fail(result.error, "Page could not be deleted");
}

export async function reorderPages(client: WorkbookClient, workbookId: string, pageIds: string[]) {
  const result = await client.rpc("reorder_player_workbook_pages_v1", {
    p_workbook_id: workbookId,
    p_page_ids: pageIds,
  });
  fail(result.error, "Page order could not be saved");
}

export async function savePage(
  client: WorkbookClient,
  page: Pick<WorkbookPageRow, "id" | "title" | "document" | "revision">,
  requestId: string,
) {
  const result = await client.rpc("save_player_workbook_page_v1", {
    p_page_id: page.id,
    p_expected_revision: page.revision,
    p_title: page.title,
    p_document: parseWorkbookDocument(page.document),
    p_request_id: requestId,
  });
  fail(result.error, "Page could not be saved");
  return result.data as {
    status: "accepted" | "conflict";
    revision: number;
    idempotent: boolean;
    page: WorkbookPageRow;
  };
}

export async function readRevisions(client: WorkbookClient, pageId: string) {
  const result = await client
    .from<WorkbookRevisionRow[]>("player_workbook_page_revisions")
    .select("*")
    .eq("page_id", pageId)
    .order("revision", { ascending: false });
  fail(result.error, "Revision history could not be loaded");
  return result.data ?? [];
}

export async function restoreRevision(
  client: WorkbookClient,
  pageId: string,
  revision: number,
  expectedRevision: number,
) {
  const result = await client.rpc("restore_player_workbook_page_revision_v1", {
    p_page_id: pageId,
    p_revision: revision,
    p_expected_revision: expectedRevision,
    p_request_id: crypto.randomUUID(),
  });
  fail(result.error, "Revision could not be restored");
  return result.data as {
    status: "accepted" | "conflict";
    revision: number;
    page: WorkbookPageRow;
  };
}
