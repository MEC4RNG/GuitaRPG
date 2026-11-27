import { describe, expect, it } from "vitest";

import { activityStorageKey, linkedLessonPage, resolveActivitySelection } from "@/lib/ux/mec-activity";
import { questJourneyTopics } from "@/lib/quest/journey-topics";
import { generateQuickQuest } from "@/lib/quest/generator";
import { starterWorkbookDocument } from "@/lib/workbook/document-v1";
import type { WorkbookContextLinkRow, WorkbookPageRow, WorkbookRow } from "@/lib/workbook/repository";

describe("F3C activity navigation", () => {
  const quest = generateQuickQuest({ primary_domain: "technique", seed: "activity" }).quest;
  const topics = questJourneyTopics(quest);
  const topic = topics[0]!;
  const catalog = { [topic.slug]: { modules: [{ id: "first", level: "foundational" as const }] } };

  it("restores only a current Quest ingredient and a lesson at its selected level", () => {
    expect(resolveActivitySelection({ topicKey: topic.key, level: "foundational", lessonId: "first" }, topics, catalog)).toEqual({ topicKey: topic.key, level: "foundational", lessonId: "first" });
    expect(resolveActivitySelection({ topicKey: topic.key, level: "intermediate", lessonId: "first" }, topics, catalog)?.lessonId).toBeNull();
    expect(resolveActivitySelection({ topicKey: "SKILL:unrelated", level: "foundational", lessonId: "first" }, topics, catalog)).toBeNull();
    expect(resolveActivitySelection({ topicKey: topic.key, level: "foundational", lessonId: "first" }, topics, {})?.lessonId).toBeNull();
    expect(activityStorageKey("player-a", "quest")).not.toBe(activityStorageKey("player-b", "quest"));
  });

  it("only reopens matching material with an accepted owner and Quest link in an active Workbook", () => {
    const time = "2026-11-27T00:00:00Z";
    const book: WorkbookRow = { id: "book", player_id: "player", title: "Practice", description: null, kind: "WORKBOOK", archived_at: null, revision: 1, created_at: time, updated_at: time };
    const page: WorkbookPageRow = { id: "page", workbook_id: book.id, title: "Lesson", position: 0, document: starterWorkbookDocument(), revision: 1, created_at: time, updated_at: time };
    const link: WorkbookContextLinkRow = { id: "link", player_id: "player", page_id: page.id, quest_id: "quest", stage: "EXPLORE", relationship: "APPLIES_TO", session_id: null, module_key: topic.slug, created_at: time };
    const input = { questId: "quest", playerId: "player", skillSlug: topic.slug, moduleId: "first", preferredPageId: page.id, links: [link], pages: [page], workbooks: [book] };
    expect(linkedLessonPage(input)).toEqual(page);
    expect(linkedLessonPage({ ...input, questId: "other" })).toBeNull();
    expect(linkedLessonPage({ ...input, playerId: "other" })).toBeNull();
    expect(linkedLessonPage({ ...input, workbooks: [{ ...book, archived_at: time }] })).toBeNull();
    expect(linkedLessonPage({ ...input, preferredPageId: undefined })).toBeNull();
    expect(linkedLessonPage({ ...input, links: [{ ...link, stage: "MAP" }] })).toBeNull();
  });
});
