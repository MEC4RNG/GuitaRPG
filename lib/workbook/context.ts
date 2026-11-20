import type { WorkbookContextRelationship, WorkbookContextStage } from "./repository";

export type WorkbookRouteContext = {
  questId: string;
  stage: WorkbookContextStage;
  relationship: WorkbookContextRelationship;
  pageId?: string;
  sessionId?: string;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stages = new Set<WorkbookContextStage>(["MAP", "EXPLORE", "CRAFT"]);
const relationships = new Set<WorkbookContextRelationship>([
  "REFERENCE",
  "CREATED_DURING",
  "APPLIES_TO",
]);

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseWorkbookRouteContext(
  params: Record<string, string | string[] | undefined>,
): WorkbookRouteContext | null {
  const questId = one(params.quest);
  const stage = one(params.stage) as WorkbookContextStage | undefined;
  const relationship = one(params.relationship) as WorkbookContextRelationship | undefined;
  const pageId = one(params.page);
  const sessionId = one(params.session);
  if (!questId || !uuid.test(questId) || !stage || !stages.has(stage)) return null;
  if (!relationship || !relationships.has(relationship)) return null;
  if (pageId && !uuid.test(pageId)) return null;
  if (sessionId && !uuid.test(sessionId)) return null;
  return { questId, stage, relationship, pageId, sessionId };
}

export function workbookContextHref(
  questId: string,
  stage: WorkbookContextStage,
  relationship: WorkbookContextRelationship,
  extras: { pageId?: string; sessionId?: string } = {},
) {
  const params = new URLSearchParams({ quest: questId, stage, relationship });
  if (extras.pageId) params.set("page", extras.pageId);
  if (extras.sessionId) params.set("session", extras.sessionId);
  return `/workbooks?${params.toString()}`;
}
