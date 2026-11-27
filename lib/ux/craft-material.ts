import type { WorkbookContextLinkRow, WorkbookPageRow, WorkbookRow } from "@/lib/workbook/repository";

export function craftMaterial(input: {
  questId: string;
  links: readonly WorkbookContextLinkRow[];
  pages: readonly WorkbookPageRow[];
  workbooks: readonly WorkbookRow[];
}) {
  const active = new Map(input.workbooks.filter((book) => !book.archived_at).map((book) => [book.id, book]));
  return input.pages.flatMap((page) => {
    const workbook = active.get(page.workbook_id);
    if (!workbook) return [];
    const links = input.links.filter((link) => link.quest_id === input.questId && link.player_id === workbook.player_id && link.page_id === page.id);
    const craft = links.some((link) => link.stage === "CRAFT");
    const explore = links.some((link) => link.stage === "EXPLORE");
    return craft || explore ? [{ page, workbook, craft, explore }] : [];
  }).sort((a, b) => b.page.updated_at.localeCompare(a.page.updated_at) || a.page.id.localeCompare(b.page.id));
}

/** Reorder only the Craft-linked slots; unrelated pages retain their positions. */
export function mergeCraftPageOrder(allPageIds: readonly string[], craftPageIds: readonly string[], reordered: readonly string[]) {
  const eligible = new Set(craftPageIds);
  const original = allPageIds.filter((id) => eligible.has(id));
  if (original.length !== reordered.length || new Set(reordered).size !== reordered.length || reordered.some((id) => !original.includes(id))) throw new Error("The composition page order is unavailable.");
  let index = 0;
  return allPageIds.map((id) => eligible.has(id) ? reordered[index++]! : id);
}
