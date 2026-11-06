import { describe, expect, it, vi } from "vitest";

import { parseWorkbookRouteContext, workbookContextHref } from "@/lib/workbook/context";
import {
  attachWorkbookContext,
  detachWorkbookContext,
  type WorkbookClient,
} from "@/lib/workbook/repository";

const quest = "11111111-1111-4111-8111-111111111111";
const page = "22222222-2222-4222-8222-222222222222";

describe("JRN-004 Workbook context", () => {
  it("accepts bounded owner context and rejects unsafe or malformed input", () => {
    expect(
      parseWorkbookRouteContext({ quest, stage: "CRAFT", relationship: "CREATED_DURING", page }),
    ).toEqual({ questId: quest, stage: "CRAFT", relationship: "CREATED_DURING", pageId: page });
    expect(
      parseWorkbookRouteContext({ quest: "../other", stage: "MAP", relationship: "REFERENCE" }),
    ).toBeNull();
    expect(
      parseWorkbookRouteContext({ quest, stage: "MASTER", relationship: "REFERENCE" }),
    ).toBeNull();
    expect(parseWorkbookRouteContext({ quest, stage: "MAP", relationship: "OWNER" })).toBeNull();
  });

  it("builds an internal Workbook URL without caller-controlled destinations", () => {
    expect(workbookContextHref(quest, "EXPLORE", "APPLIES_TO", { pageId: page })).toBe(
      `/workbooks?quest=${quest}&stage=EXPLORE&relationship=APPLIES_TO&page=${page}`,
    );
  });

  it("uses only trusted attach and detach RPCs", async () => {
    const rpc = vi.fn(async (name: string) => ({
      data: name.startsWith("attach") ? { id: "link" } : true,
      error: null,
    }));
    const client = { rpc } as unknown as WorkbookClient;
    await attachWorkbookContext(client, {
      pageId: page,
      questId: quest,
      stage: "MAP",
      relationship: "REFERENCE",
    });
    await detachWorkbookContext(client, "link");
    expect(rpc).toHaveBeenNthCalledWith(1, "attach_player_workbook_context_v1", {
      p_page_id: page,
      p_quest_id: quest,
      p_stage: "MAP",
      p_relationship: "REFERENCE",
      p_session_id: null,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "detach_player_workbook_context_v1", {
      p_link_id: "link",
    });
  });
});
