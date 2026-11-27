import { describe, expect, it } from "vitest";
import fixtureDocument from "@/domain/quest/phase0-quest-fixtures.json";
import { questJourneyTopics, topicWorkbookDocument } from "@/lib/quest/journey-topics";
import { parseQuest } from "@/lib/quest/runtime";
import { parseWorkbookDocument } from "@/lib/workbook/document-v1";

describe("Quest Journey topics", () => {
  const quest = parseQuest(fixtureDocument[0]);

  it("deduplicates snapshot identities while retaining their roles", () => {
    const topics = questJourneyTopics(quest);
    expect(new Set(topics.map((topic) => topic.key)).size).toBe(topics.length);
    expect(topics[0]).toMatchObject({ kind: "SKILL", roles: ["Primary Skill"] });
    expect(topics.some((topic) => topic.kind === "CRITERION")).toBe(true);
  });

  it("seeds a valid authoritative Workbook document from verified context", () => {
    const topic = questJourneyTopics(quest)[0];
    const document = parseWorkbookDocument(topicWorkbookDocument(topic, quest.identity.title));
    expect(document.type).toBe("GUITARPG_WORKBOOK_DOCUMENT_V1");
    expect(JSON.stringify(document)).toContain("My notes / observations");
    expect(JSON.stringify(document)).toContain(topic.name);
  });
});
