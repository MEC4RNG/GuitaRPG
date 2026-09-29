import { describe, expect, it } from "vitest";

import {
  buildHistoryAttempts,
  HISTORY_PAGE_SIZE,
  orderSessions,
  pageHistorySessions,
  type HistorySession,
} from "@/lib/history/runtime";
import { SESSION_RUNTIME_VERSION, type PracticeSessionEvent } from "@/lib/session/runtime";
import { parseQuest } from "@/lib/quest/runtime";

const quest = parseQuest({
  identity: {
    id: "dorian",
    slug: "dorian_crossroads",
    title: "DORIAN CROSSROADS",
    schema_version: 1,
    type: "TECHNIQUE",
    origin: "fixture",
  },
  purpose: { reason: "DEVELOP_SKILL", primary_domain: "technique", generation_mode: "CUSTOM" },
  execution: {
    primary_skill: {
      slug: "hybrid_picking",
      name: "Hybrid Picking",
      domain: "technique",
      role: "PRIMARY_SKILL",
    },
    secondary_skills: [],
    required_techniques: [],
    estimated_minutes: 10,
  },
  concepts: [{ slug: "dorian", name: "Dorian" }],
  constraints: [{ slug: "target_tempo", name: "Target Tempo", parameters: { bpm: 90 } }],
  objective: {
    kind: "practice",
    summary: "Play Dorian cleanly",
    clear_rule: "ALL_CRITERIA",
    criteria: [{ metric: "target_tempo", operator: "EQ", value: 90, unit: "bpm" }],
  },
  completion_contract: { attempt_rule: "MEANINGFUL_ACTIVITY", mastery_claimed: false },
  verification_profile: {
    allowed_modes: ["SELF", "SESSION"],
    recommended_mode: "SESSION",
    verification_required_for_clear: false,
  },
  difficulty_profile: { declared_overall_demand: "III", computation_status: "COMPUTED" },
  rewards: { policy: "STANDARD", fixed_xp: null, progression_effects_embedded: false },
  metadata: {},
});
const session = (
  id: string,
  status: HistorySession["status"],
  started_at: string,
): HistorySession => ({
  id,
  quest_id: "quest",
  status,
  started_at,
  ended_at: status === "ENDED" ? "2026-09-29T12:10:12.000Z" : null,
  created_at: started_at,
});
const events = (session_id: string, end = true): PracticeSessionEvent[] => [
  {
    id: `${session_id}-1`,
    session_id,
    sequence: 1,
    event_type: "START",
    occurred_at: "2026-09-29T12:00:00.000Z",
    runtime_version: SESSION_RUNTIME_VERSION,
  },
  ...(end
    ? [
        {
          id: `${session_id}-2`,
          session_id,
          sequence: 2,
          event_type: "END" as const,
          occurred_at: "2026-09-29T12:10:12.000Z",
          runtime_version: SESSION_RUNTIME_VERSION,
        },
      ]
    : []),
];

describe("HIST-001 attempt read model", () => {
  it("orders attempts newest-first with a deterministic ID tie-breaker", () => {
    expect(
      orderSessions([
        session("a", "ENDED", "2026-09-29T11:00:00Z"),
        session("z", "ENDED", "2026-09-29T11:00:00Z"),
        session("old", "ENDED", "2026-09-28T11:00:00Z"),
      ]).map((item) => item.id),
    ).toEqual(["z", "a", "old"]);
    expect(HISTORY_PAGE_SIZE).toBe(20);
    const attempts = Array.from({ length: 21 }, (_, index) =>
      session(
        `attempt-${String(index).padStart(2, "0")}`,
        "ENDED",
        `2026-09-29T${String(index % 20).padStart(2, "0")}:00:00Z`,
      ),
    );
    expect(pageHistorySessions(attempts, 0)).toHaveLength(20);
    expect(pageHistorySessions(attempts, 20)).toHaveLength(1);
  });

  it("keeps attempts distinct and derives DORIAN lifecycle, duration, result, criteria, evidence, and reflection", () => {
    const attempts = buildHistoryAttempts({
      sessions: [
        session("partial", "ENDED", "2026-09-29T10:00:00Z"),
        session("clear", "ENDED", "2026-09-29T12:00:00Z"),
        session("paused", "PAUSED", "2026-09-29T09:00:00Z"),
        session("active", "ACTIVE", "2026-09-29T08:00:00Z"),
      ],
      quests: [{ id: "quest", resolved_snapshot: quest }],
      events: [
        ...events("partial"),
        ...events("clear"),
        ...events("paused", false),
        ...events("active", false),
      ],
      results: [
        {
          id: "result-clear",
          session_id: "clear",
          outcome: "CLEARED",
          meaningful_attempt: true,
          confidence_summary: "MIXED",
          verification_modes: ["SESSION", "SELF"],
          reflection: "GOOD_CHALLENGE",
          player_notes: "Steady",
          finalized_at: "2026-09-29T12:11:00Z",
        },
        {
          id: "result-partial",
          session_id: "partial",
          outcome: "PARTIAL",
          meaningful_attempt: true,
          confidence_summary: "MODERATE",
          verification_modes: ["SELF"],
          reflection: null,
          player_notes: null,
          finalized_at: "2026-09-29T10:11:00Z",
        },
      ],
      criteria: [
        {
          result_id: "result-clear",
          quest_criterion_ordinal: 1,
          metric: "practice_duration",
          operator: "GTE",
          target_value: 600,
          unit: "seconds",
          criterion_state: "MET",
        },
        {
          result_id: "result-clear",
          quest_criterion_ordinal: 2,
          metric: "target_tempo",
          operator: "EQ",
          target_value: 90,
          unit: "bpm",
          criterion_state: "MET",
        },
      ],
      evidence: [
        {
          result_id: "result-clear",
          criterion_metric: "practice_duration",
          verification_mode: "SESSION",
          evidence_confidence: "HIGH",
          rationale: "Recorded active time",
        },
        {
          result_id: "result-clear",
          criterion_metric: "target_tempo",
          verification_mode: "SESSION",
          evidence_confidence: "HIGH",
          rationale: "Metronome configured",
        },
        {
          result_id: "result-clear",
          criterion_metric: "constraint_compliance",
          verification_mode: "SELF",
          evidence_confidence: "MODERATE",
          rationale: null,
        },
      ],
      observedAt: "2026-09-29T12:10:12.000Z",
    });
    expect(attempts).toHaveLength(4);
    expect(attempts.find((item) => item.sessionId === "clear")).toMatchObject({
      activeSeconds: 612,
      lifecycle: { label: "CLEARED" },
      quest: { title: "DORIAN CROSSROADS" },
      result: {
        confidence_summary: "MIXED",
        reflection: "GOOD_CHALLENGE",
        criteria: [
          { metric: "practice_duration", criterion_state: "MET" },
          { metric: "target_tempo", criterion_state: "MET" },
        ],
        evidence: [
          { verification_mode: "SESSION" },
          { verification_mode: "SESSION" },
          { verification_mode: "SELF" },
        ],
      },
    });
    expect(attempts.find((item) => item.sessionId === "paused")).toMatchObject({
      lifecycle: { label: "Paused" },
      action: { href: "/session/paused" },
    });
    expect(attempts.find((item) => item.sessionId === "active")).toMatchObject({
      lifecycle: { label: "In progress" },
    });
    expect(attempts.find((item) => item.sessionId === "partial")?.result?.outcome).toBe("PARTIAL");
  });

  it("shows an ended attempt with no Result as Result pending without fabricating progression", () => {
    const [attempt] = buildHistoryAttempts({
      sessions: [session("pending", "ENDED", "2026-09-29T12:00:00Z")],
      quests: [{ id: "quest", resolved_snapshot: quest }],
      events: events("pending"),
      results: [],
      criteria: [],
      evidence: [],
      observedAt: "2026-09-29T12:10:12Z",
    });
    expect(attempt).toMatchObject({
      lifecycle: { label: "Result pending" },
      action: { href: "/session/pending/complete" },
      result: null,
    });
    expect(JSON.stringify(attempt).toLowerCase()).not.toMatch(
      /xp|proficiency|readiness|attribute|master/,
    );
  });
});
