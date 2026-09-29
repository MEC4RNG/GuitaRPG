import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { generateQuickQuest } from "@/lib/quest/generator";
import { persistGeneratedQuest, QuestPersistenceError } from "@/lib/quest/repository";
import {
  GeneratedQuestStartError,
  startGeneratedQuestPractice,
} from "@/lib/quest/start-generated-quest";

const read = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");

describe("QST-003-R1 generated Quest application bridge", () => {
  it("persists the exact resolved Quest through the intended RPC", async () => {
    const generated = generateQuickQuest({
      seed: "repository",
      id: "11111111-1111-4111-8111-111111111111",
    });
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: { id: generated.quest.identity.id }, error: null });
    await expect(persistGeneratedQuest({ rpc }, generated.quest)).resolves.toBe(
      generated.quest.identity.id,
    );
    expect(rpc).toHaveBeenCalledWith("persist_generated_quest", {
      p_quest: generated.persistence,
    });
  });

  it("normalizes database errors and rejects identity divergence", async () => {
    const quest = generateQuickQuest().quest;
    await expect(
      persistGeneratedQuest(
        {
          rpc: vi
            .fn()
            .mockResolvedValue({ data: null, error: { message: "duplicate", code: "23505" } }),
        },
        quest,
      ),
    ).rejects.toMatchObject({ name: "QuestPersistenceError", code: "23505" });
    await expect(
      persistGeneratedQuest(
        {
          rpc: vi.fn().mockResolvedValue({ data: { id: crypto.randomUUID() }, error: null }),
        },
        quest,
      ),
    ).rejects.toBeInstanceOf(QuestPersistenceError);
  });

  it("persists once, starts SES-001, and returns its Session", async () => {
    const quest = generateQuickQuest().quest;
    const session = { id: crypto.randomUUID(), quest_id: quest.identity.id };
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: quest.identity.id }, error: null })
      .mockResolvedValueOnce({ data: session, error: null });
    await expect(startGeneratedQuestPractice({ rpc }, quest, null)).resolves.toEqual({
      questId: quest.identity.id,
      session,
    });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "persist_generated_quest",
      "start_practice_session",
    ]);
  });

  it("retains the durable Quest after Session failure and skips persistence on retry", async () => {
    const quest = generateQuickQuest().quest;
    const firstRpc = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: quest.identity.id }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "temporary" } });
    let durableId: string | null = null;
    try {
      await startGeneratedQuestPractice({ rpc: firstRpc }, quest, null);
    } catch (error) {
      expect(error).toBeInstanceOf(GeneratedQuestStartError);
      expect(error).toMatchObject({ stage: "SESSION_START", durableQuestId: quest.identity.id });
      durableId = (error as GeneratedQuestStartError).durableQuestId;
    }

    const session = { id: crypto.randomUUID() };
    const retryRpc = vi.fn().mockResolvedValue({ data: session, error: null });
    await expect(startGeneratedQuestPractice({ rpc: retryRpc }, quest, durableId)).resolves.toEqual(
      {
        questId: quest.identity.id,
        session,
      },
    );
    expect(retryRpc).toHaveBeenCalledOnce();
    expect(retryRpc).toHaveBeenCalledWith("start_practice_session", {
      p_quest_id: quest.identity.id,
    });
  });

  it("ships the real accessible Quick Generate surface without the placeholder", () => {
    const page = read("app/generate/page.tsx");
    const surface = read("components/generate-quest-surface.tsx");
    expect(page).toContain("GenerateQuestSurface");
    expect(page).not.toContain("FoundationPage");
    expect(surface).toContain("generateQuickQuest()");
    expect(surface).toContain("startGeneratedQuestPractice");
    expect(surface).toContain("Generate Quest");
    expect(surface).toContain("Start Practice");
    expect(surface).toContain("router.push(`/session/${started.session.id}`)");
    expect(surface).toContain('role="alert"');
    expect(surface).toContain("disabled={pending !== null}");
  });
});
