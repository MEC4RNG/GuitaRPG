import { describe, expect, it, vi } from "vitest";

import {
  createQuickNote,
  readWorkbookSnapshot,
  savePage,
  type WorkbookClient,
} from "@/lib/workbook/repository";
import { starterWorkbookDocument } from "@/lib/workbook/document-v1";

function clientWith(options: {
  user?: { id: string; is_anonymous?: boolean } | null;
  workbooks?: unknown[];
  pages?: unknown[];
  rpc?: (
    name: string,
    parameters?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: null }>;
}) {
  const query = (data: unknown[]) => {
    const result = { data, error: null };
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return chain;
  };
  return {
    auth: { getUser: async () => ({ data: { user: options.user ?? null }, error: null }) },
    from: (table: string) =>
      query(table === "player_workbooks" ? (options.workbooks ?? []) : (options.pages ?? [])),
    rpc: options.rpc ?? (async () => ({ data: null, error: null })),
  } as unknown as WorkbookClient;
}

describe("Workbook persistence repository", () => {
  it("returns a truthful unauthenticated state", async () => {
    await expect(readWorkbookSnapshot(clientWith({ user: null }))).resolves.toEqual({
      authenticated: false,
      anonymous: false,
      workbooks: [],
      pages: [],
    });
  });

  it("hydrates owner-scoped structured pages and guest status", async () => {
    const document = starterWorkbookDocument();
    const snapshot = await readWorkbookSnapshot(
      clientWith({
        user: { id: "player", is_anonymous: true },
        workbooks: [{ id: "workbook" }],
        pages: [{ id: "page", document }],
      }),
    );
    expect(snapshot.authenticated).toBe(true);
    expect(snapshot.anonymous).toBe(true);
    expect(snapshot.pages[0].document).toEqual(document);
  });

  it("uses stable save request IDs and revision tokens", async () => {
    const rpc = vi.fn(async (_name: string, parameters?: Record<string, unknown>) => ({
      data: { status: "accepted", revision: 5, idempotent: false, page: parameters },
      error: null,
    }));
    const document = starterWorkbookDocument();
    const result = await savePage(
      clientWith({ user: { id: "player" }, rpc }),
      { id: "page", title: "Title", document, revision: 4 },
      "e9f5e755-ce5d-48ad-b68b-2bb90dfc0dd9",
    );
    expect(result.revision).toBe(5);
    expect(rpc).toHaveBeenCalledWith(
      "save_player_workbook_page_v1",
      expect.objectContaining({
        p_expected_revision: 4,
        p_request_id: "e9f5e755-ce5d-48ad-b68b-2bb90dfc0dd9",
      }),
    );
  });

  it("creates Quick Notes through the concurrency-safe trusted operation", async () => {
    const rpc = vi.fn(async () => ({
      data: { workbook: { id: "quick" }, page: { id: "page" } },
      error: null,
    }));
    await createQuickNote(clientWith({ user: { id: "player" }, rpc }));
    expect(rpc).toHaveBeenCalledWith(
      "create_player_quick_note_v1",
      expect.objectContaining({ p_request_id: expect.any(String) }),
    );
  });
});
