import { describe, expect, it } from "vitest";

import {
  QUEST_DRAFT_STORAGE_KEY,
  QUEST_DRAFT_TTL_MS,
  QUEST_DRAFT_VERSION,
  clearQuestDraft,
  readQuestDraft,
  saveQuestDraft,
} from "@/lib/quest/draft-v1";
import { generateQuickQuest } from "@/lib/quest/generator";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("QST_DRAFT_V1", () => {
  const owner = "10000000-0000-4000-8000-000000000001";
  const now = new Date("2026-10-17T12:00:00Z");

  it("round-trips one canonical owner-bound Quest for 24 hours", () => {
    const storage = new MemoryStorage();
    const quest = generateQuickQuest({ seed: "draft" }).quest;
    const saved = saveQuestDraft(storage, owner, quest, now);

    expect(saved).toMatchObject({ version: QUEST_DRAFT_VERSION, ownerId: owner, quest });
    expect(Date.parse(saved.expiresAt) - now.getTime()).toBe(QUEST_DRAFT_TTL_MS);
    expect(readQuestDraft(storage, owner, new Date(now.getTime() + 1))).toEqual(saved);
  });

  it.each([
    ["expired", (value: Record<string, unknown>) => ({ ...value, expiresAt: now.toISOString() })],
    [
      "wrong owner",
      (value: Record<string, unknown>) => ({ ...value, ownerId: crypto.randomUUID() }),
    ],
    ["wrong version", (value: Record<string, unknown>) => ({ ...value, version: "QST_DRAFT_V0" })],
    [
      "malformed Quest",
      (value: Record<string, unknown>) => ({ ...value, quest: { identity: {} } }),
    ],
  ])("fails closed for an %s draft", (_label, mutate) => {
    const storage = new MemoryStorage();
    saveQuestDraft(storage, owner, generateQuickQuest({ seed: "invalid-draft" }).quest, now);
    const raw = JSON.parse(storage.getItem(QUEST_DRAFT_STORAGE_KEY)!) as Record<string, unknown>;
    storage.setItem(QUEST_DRAFT_STORAGE_KEY, JSON.stringify(mutate(raw)));

    expect(readQuestDraft(storage, owner, now)).toBeNull();
    expect(storage.getItem(QUEST_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("retains a valid draft until explicitly cleared", () => {
    const storage = new MemoryStorage();
    saveQuestDraft(storage, owner, generateQuickQuest({ seed: "clear" }).quest, now);
    expect(readQuestDraft(storage, owner, now)).not.toBeNull();
    clearQuestDraft(storage);
    expect(readQuestDraft(storage, owner, now)).toBeNull();
  });
});
