import { parseQuest, type Quest } from "./runtime";

export const QUEST_DRAFT_STORAGE_KEY = "guitarpg.quest-draft.v1";
export const QUEST_DRAFT_VERSION = "QST_DRAFT_V1" as const;
export const QUEST_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type QuestDraftEnvelope = {
  version: typeof QUEST_DRAFT_VERSION;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  quest: Quest;
};

export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function saveQuestDraft(
  storage: DraftStorage,
  ownerId: string,
  quest: Quest,
  now = new Date(),
): QuestDraftEnvelope {
  const parsed = parseQuest(quest);
  const prior = readQuestDraft(storage, ownerId, now);
  const envelope: QuestDraftEnvelope = {
    version: QUEST_DRAFT_VERSION,
    ownerId,
    createdAt: prior?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + QUEST_DRAFT_TTL_MS).toISOString(),
    quest: parsed,
  };
  storage.setItem(QUEST_DRAFT_STORAGE_KEY, JSON.stringify(envelope));
  return envelope;
}

export function readQuestDraft(
  storage: DraftStorage,
  ownerId: string,
  now = new Date(),
): QuestDraftEnvelope | null {
  const raw = storage.getItem(QUEST_DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<QuestDraftEnvelope>;
    if (
      value.version !== QUEST_DRAFT_VERSION ||
      value.ownerId !== ownerId ||
      typeof value.createdAt !== "string" ||
      typeof value.updatedAt !== "string" ||
      typeof value.expiresAt !== "string" ||
      Date.parse(value.expiresAt) <= now.getTime()
    )
      throw new Error("Draft envelope is invalid");
    return { ...value, quest: parseQuest(value.quest) } as QuestDraftEnvelope;
  } catch {
    storage.removeItem(QUEST_DRAFT_STORAGE_KEY);
    return null;
  }
}

export function clearQuestDraft(storage: DraftStorage) {
  storage.removeItem(QUEST_DRAFT_STORAGE_KEY);
}
