import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  compareCriterionValue,
  deriveConfidenceSummary,
  deriveResultOutcome,
  EvidenceRuntimeError,
  validateEvidenceAuthority,
  validateMeaningfulAttemptContract,
  type CriterionState,
} from "@/lib/evidence/runtime";
import { evaluateSessionCriterion } from "@/lib/evidence/session-evidence";
import type { Criterion } from "@/lib/quest/runtime";
import type { ControlEvent } from "@/lib/session/controls/runtime";
import type { PracticeSessionEvent } from "@/lib/session/runtime";

const root = resolve(import.meta.dirname, "..");
const fixtures = JSON.parse(
  readFileSync(resolve(root, "domain/evidence/phase0-evidence-fixtures.json"), "utf8"),
) as {
  results: Array<{
    id: string;
    meaningful_attempt: boolean;
    outcome: "ABANDONED" | "ATTEMPTED" | "PARTIAL" | "CLEARED";
    required_criteria: string[];
    criterion_results: Record<string, CriterionState>;
    evidence: Array<Parameters<typeof validateEvidenceAuthority>[0]>;
    verification_summary: { confidence: "LOW" | "MODERATE" | "HIGH" | "MIXED" };
  }>;
};

const events: PracticeSessionEvent[] = [
  {
    id: "1",
    session_id: "s",
    sequence: 1,
    event_type: "START",
    occurred_at: "2026-01-01T00:00:00Z",
    runtime_version: "SES_V1",
  },
  {
    id: "2",
    session_id: "s",
    sequence: 2,
    event_type: "PAUSE",
    occurred_at: "2026-01-01T00:10:00Z",
    runtime_version: "SES_V1",
  },
  {
    id: "3",
    session_id: "s",
    sequence: 3,
    event_type: "RESUME",
    occurred_at: "2026-01-01T00:11:00Z",
    runtime_version: "SES_V1",
  },
  {
    id: "4",
    session_id: "s",
    sequence: 4,
    event_type: "END",
    occurred_at: "2026-01-01T00:11:12Z",
    runtime_version: "SES_V1",
  },
];

describe("EVD_V1 runtime", () => {
  it("derives exactly the four outcomes without verification or confidence inputs", () => {
    expect(deriveResultOutcome(false, ["MET"])).toBe("ABANDONED");
    expect(deriveResultOutcome(true, ["NOT_MET", "UNKNOWN"])).toBe("ATTEMPTED");
    expect(deriveResultOutcome(true, ["MET", "NOT_MET"])).toBe("PARTIAL");
    expect(deriveResultOutcome(true, ["MET", "MET"])).toBe("CLEARED");
    expect(new Set(fixtures.results.map((result) => result.outcome))).toEqual(
      new Set(["ABANDONED", "ATTEMPTED", "PARTIAL", "CLEARED"]),
    );
  });

  it("does not treat UNKNOWN or NOT_EVALUATED alone as partial progress", () => {
    expect(deriveResultOutcome(true, ["UNKNOWN"])).toBe("ATTEMPTED");
    expect(deriveResultOutcome(true, ["NOT_EVALUATED"])).toBe("ATTEMPTED");
  });

  it("compares EQ, GTE, and LTE scalar observations and rejects invalid types", () => {
    expect(compareCriterionValue("EQ", true, true)).toBe("MET");
    expect(compareCriterionValue("EQ", "dorian", "major")).toBe("NOT_MET");
    expect(compareCriterionValue("GTE", 8, 8)).toBe("MET");
    expect(compareCriterionValue("LTE", 83, 90)).toBe("MET");
    expect(() => compareCriterionValue("GTE", "8", 8)).toThrow(EvidenceRuntimeError);
    expect(() => compareCriterionValue("LTE", "a", "b")).toThrow(EvidenceRuntimeError);
  });

  it("derives uniform and mixed confidence summaries", () => {
    expect(deriveConfidenceSummary(["HIGH", "HIGH"])).toBe("HIGH");
    expect(deriveConfidenceSummary(["HIGH", "MODERATE"])).toBe("MIXED");
  });

  it("derives meaningful attempt only from a supported Quest threshold", () => {
    expect(
      validateMeaningfulAttemptContract(
        { attempt_rule: "MEANINGFUL_ACTIVITY", minimum_attempt_seconds: 60 },
        60,
      ),
    ).toBe(true);
    expect(
      validateMeaningfulAttemptContract(
        { attempt_rule: "MEANINGFUL_ACTIVITY", minimum_attempt_seconds: 60 },
        59,
      ),
    ).toBe(false);
    expect(() => validateMeaningfulAttemptContract({ attempt_rule: "UNKNOWN" }, 600)).toThrowError(
      /supported meaningful-activity/,
    );
  });

  it("validates every accepted Phase 0 fixture against runtime derivation and authority", () => {
    for (const fixture of fixtures.results) {
      const states = fixture.required_criteria.map((metric) => fixture.criterion_results[metric]!);
      expect(deriveResultOutcome(fixture.meaningful_attempt, states), fixture.id).toBe(
        fixture.outcome,
      );
      fixture.evidence.forEach(validateEvidenceAuthority);
      expect(
        deriveConfidenceSummary(fixture.evidence.map((item) => item.confidence)),
        fixture.id,
      ).toBe(fixture.verification_summary.confidence);
    }
  });
});

describe("EVD_V1 Session evidence registry", () => {
  const controls: ControlEvent[] = [
    { sequence: 1, event_type: "REP_ADJUST", payload: { delta: 1 } },
    { sequence: 2, event_type: "METRONOME_BPM_SET", payload: { bpm: 90 } },
  ];
  const criterion = (metric: string, value: Criterion["value"], unit = "count"): Criterion => ({
    metric,
    operator: "GTE",
    value,
    unit,
  });

  it("evaluates authoritative duration and persisted BPM configuration", () => {
    expect(
      evaluateSessionCriterion(criterion("practice_duration", 600, "seconds"), events, controls),
    ).toMatchObject({ observedValue: 612, state: "MET" });
    expect(
      evaluateSessionCriterion(
        { ...criterion("target_tempo", 90, "bpm"), operator: "EQ" },
        events,
        controls,
      ),
    ).toMatchObject({ observedValue: 90, state: "MET" });
  });

  it("does not guess unknown metrics or infer clean repetitions", () => {
    expect(
      evaluateSessionCriterion(criterion("clean_repetitions", 1), events, controls),
    ).toBeNull();
    expect(evaluateSessionCriterion(criterion("accuracy", 1), events, controls)).toBeNull();
  });

  it("requires persisted BPM telemetry instead of a UI fallback", () => {
    expect(
      evaluateSessionCriterion(
        { ...criterion("target_tempo", 90, "bpm"), operator: "EQ" },
        events,
        [],
      ),
    ).toBeNull();
  });
});
