import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { evaluateSessionCriterion } from "@/lib/evidence/session-evidence";
import {
  deriveConfidenceSummary,
  deriveResultOutcome,
  validateEvidenceAuthority,
  validateMeaningfulAttemptContract,
} from "@/lib/evidence/runtime";
import { finalizeQuestResult } from "@/lib/evidence/repository";
import { buildHistoryAttempts } from "@/lib/history/runtime";
import { evaluateAbsoluteQuestDemand } from "@/lib/difficulty/dif-v1";
import { generateCustomQuest, generateQuickQuest } from "@/lib/quest/generator";
import { parseQuest, toQuestPersistenceInput } from "@/lib/quest/runtime";
import {
  GeneratedQuestStartError,
  startGeneratedQuestPractice,
} from "@/lib/quest/start-generated-quest";
import type { ControlEvent } from "@/lib/session/controls/runtime";
import { deriveRecordedActiveSeconds, type PracticeSessionEvent } from "@/lib/session/runtime";

describe("REL-002 production core-loop seams", () => {
  const read = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");

  it("composes Quick generation, atomic persistence, and SES start in production order", async () => {
    const generated = generateQuickQuest({ seed: "rel-002-quick" });
    expect(parseQuest(generated.quest)).toBe(generated.quest);
    expect(toQuestPersistenceInput(generated.quest)).toEqual(generated.persistence);
    expect(generated.quest.difficulty_profile).toEqual(
      expect.objectContaining({ model_version: "DIF_V1", computation_status: "COMPUTED" }),
    );

    const session = { id: crypto.randomUUID(), quest_id: generated.quest.identity.id };
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: generated.quest.identity.id }, error: null })
      .mockResolvedValueOnce({ data: session, error: null });
    await expect(startGeneratedQuestPractice({ rpc }, generated.quest, null)).resolves.toEqual({
      questId: generated.quest.identity.id,
      session,
    });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "persist_generated_quest",
      "start_practice_session",
    ]);
    expect(session.quest_id).toBe(generated.quest.identity.id);
  });

  it("stops before Session on persistence failure and reuses durable identity after Session failure", async () => {
    const quest = generateQuickQuest().quest;
    const persistenceFailure = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "write rejected" },
    });
    await expect(
      startGeneratedQuestPractice({ rpc: persistenceFailure }, quest, null),
    ).rejects.toMatchObject({
      stage: "PERSISTENCE",
      durableQuestId: null,
    });
    expect(persistenceFailure).toHaveBeenCalledOnce();

    const first = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: quest.identity.id }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "start unavailable" } });
    let durableId: string | null = null;
    try {
      await startGeneratedQuestPractice({ rpc: first }, quest, null);
    } catch (error) {
      expect(error).toBeInstanceOf(GeneratedQuestStartError);
      durableId = (error as GeneratedQuestStartError).durableQuestId;
    }
    const retry = vi.fn().mockResolvedValue({
      data: { id: "session-retry", quest_id: quest.identity.id },
      error: null,
    });
    await startGeneratedQuestPractice({ rpc: retry }, quest, durableId);
    expect(retry).toHaveBeenCalledExactlyOnceWith("start_practice_session", {
      p_quest_id: quest.identity.id,
    });
  });

  it("carries exact DORIAN Session evidence through EVD and the History read model", async () => {
    const quest = generateCustomQuest({
      id: "81111111-1111-4111-8111-111111111111",
      seed: "dorian-rel-002",
      primary_skill: "hybrid_picking",
      quest_type: "TECHNIQUE",
      secondary_skills: ["scale_mapping", "syncopation_control"],
      concepts: ["dorian", "eighth_note_subdivision", "syncopation"],
      tonal_center: "E",
      strings: [2, 3, 4, 5],
      fret_range: { min: 5, max: 12 },
      target_tempo_bpm: 90,
      estimated_minutes: 10,
      meter: "4/4",
    }).quest;
    expect(evaluateAbsoluteQuestDemand(quest).overall).toMatchObject({ score: 54, level: "III" });

    const sessionId = "82222222-2222-4222-8222-222222222222";
    const resultId = "83333333-3333-4333-8333-333333333333";
    const events: PracticeSessionEvent[] = [
      {
        id: "1",
        session_id: sessionId,
        sequence: 1,
        event_type: "START",
        occurred_at: "2026-09-29T12:00:00Z",
        runtime_version: "SES_V1",
      },
      {
        id: "2",
        session_id: sessionId,
        sequence: 2,
        event_type: "PAUSE",
        occurred_at: "2026-09-29T12:10:00Z",
        runtime_version: "SES_V1",
      },
      {
        id: "3",
        session_id: sessionId,
        sequence: 3,
        event_type: "RESUME",
        occurred_at: "2026-09-29T12:11:00Z",
        runtime_version: "SES_V1",
      },
      {
        id: "4",
        session_id: sessionId,
        sequence: 4,
        event_type: "END",
        occurred_at: "2026-09-29T12:11:12Z",
        runtime_version: "SES_V1",
      },
    ];
    const controls: ControlEvent[] = [
      { sequence: 1, event_type: "METRONOME_BPM_SET", payload: { bpm: 90 } },
      { sequence: 2, event_type: "REP_ADJUST", payload: { delta: 1 } },
    ];
    expect(deriveRecordedActiveSeconds(events)).toBe(612);
    expect(validateMeaningfulAttemptContract(quest.completion_contract, 612)).toBe(true);

    const sessionEvidence = quest.objective.criteria
      .slice(0, 2)
      .map((criterion) => evaluateSessionCriterion(criterion, events, controls));
    expect(sessionEvidence).toEqual([
      expect.objectContaining({
        observedValue: 612,
        state: "MET",
      }),
      expect.objectContaining({
        observedValue: 90,
        state: "MET",
      }),
    ]);
    const selfEvidence = validateEvidenceAuthority({
      verification_mode: "SELF",
      criterion_state: "MET",
      confidence: "MODERATE",
      source_authority: "PLAYER",
    });
    expect(deriveResultOutcome(true, ["MET", "MET", selfEvidence.criterion_state])).toBe("CLEARED");
    expect(deriveConfidenceSummary(["HIGH", "HIGH", selfEvidence.confidence])).toBe("MIXED");

    const finalized = {
      id: resultId,
      player_id: "player",
      quest_id: quest.identity.id,
      session_id: sessionId,
      evidence_model_version: "EVD_V1" as const,
      meaningful_attempt: true,
      outcome: "CLEARED" as const,
      verification_modes: ["SESSION", "SELF"],
      confidence_summary: "MIXED" as const,
      reflection: "GOOD_CHALLENGE" as const,
      player_notes: null,
      finalized_at: "2026-09-29T12:11:13Z",
    };
    const resultRpc = vi.fn().mockResolvedValue({ data: finalized, error: null });
    await expect(
      finalizeQuestResult(
        { rpc: resultRpc },
        {
          sessionId,
          selfCriteria: [{ ordinal: 3, observed_value: true }],
          reflection: "GOOD_CHALLENGE",
        },
      ),
    ).resolves.toEqual(finalized);

    const attempts = buildHistoryAttempts({
      sessions: [
        {
          id: sessionId,
          quest_id: quest.identity.id,
          status: "ENDED",
          started_at: events[0]!.occurred_at,
          ended_at: events[3]!.occurred_at,
          created_at: events[0]!.occurred_at,
        },
      ],
      quests: [{ id: quest.identity.id, resolved_snapshot: quest }],
      events,
      results: [finalized],
      criteria: quest.objective.criteria.map((criterion, index) => ({
        result_id: resultId,
        quest_criterion_ordinal: index + 1,
        metric: criterion.metric,
        operator: criterion.operator,
        target_value: criterion.value,
        unit: criterion.unit,
        criterion_state: "MET",
      })),
      evidence: [
        {
          result_id: resultId,
          criterion_metric: "practice_duration",
          verification_mode: "SESSION",
          evidence_confidence: "HIGH",
          rationale: null,
        },
        {
          result_id: resultId,
          criterion_metric: "target_tempo",
          verification_mode: "SESSION",
          evidence_confidence: "HIGH",
          rationale: null,
        },
        {
          result_id: resultId,
          criterion_metric: "constraint_compliance",
          verification_mode: "SELF",
          evidence_confidence: "MODERATE",
          rationale: null,
        },
      ],
      observedAt: "2026-09-29T12:11:13Z",
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      sessionId,
      activeSeconds: 612,
      lifecycle: { label: "CLEARED" },
      result: { id: resultId, outcome: "CLEARED", confidence_summary: "MIXED" },
    });
    expect(attempts[0]!.result?.criteria).toHaveLength(3);
    expect(attempts[0]!.result?.evidence).toHaveLength(3);
    expect(quest).not.toHaveProperty("xp");
    expect(quest).not.toHaveProperty("progression");
  });

  it("wires the production surfaces across Generate, Session, Complete, and History", () => {
    const generate = read("components/generate-quest-surface.tsx");
    const session = read("components/session-practice-surface.tsx");
    const completion = read("components/result-completion-surface.tsx");
    const history = read("components/history-surface.tsx");
    const navigation = read("lib/navigation.ts");

    expect(generate).toContain("generateQuickQuest()");
    expect(generate).toContain(
      "startGeneratedQuestPractice(client, generated.quest, durableQuestId)",
    );
    expect(generate).toContain("router.push(`/session/${started.session.id}`)");
    expect(session).toContain("endPracticeSession");
    expect(session).toContain("href={`/session/${sessionId}/complete`}");
    expect(completion).toContain("finalizeQuestResult(client");
    expect(completion).toContain('.select("status,quest_id")');
    expect(completion).toContain('.select("title")');
    expect(history).toContain("readHistoryPage(client()");
    expect(history).toContain("readHistoryAttempt(client(), sessionId)");
    expect(navigation).toContain('{ label: "History", href: "/history"');
  });
});
