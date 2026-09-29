import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");
const migration = read(
  "supabase/migrations/20260929010000_evd_002_result_completion_reflection.sql",
);
const databaseTest = read("supabase/tests/database/quest_result_runtime.test.sql");

describe("EVD-002 persistence contract", () => {
  it("adds immutable Result, criterion, and evidence persistence", () => {
    expect(migration).toContain("create table public.quest_results");
    expect(migration).toContain("create table public.quest_result_criteria");
    expect(migration).toContain("create table public.quest_result_evidence");
    expect(migration).toContain("session_id uuid not null unique");
    expect(migration).toContain("evidence_model_version text not null default 'EVD_V1'");
    expect(migration).not.toMatch(/grant (insert|update|delete) on table public\.quest_result/);
  });

  it("uses a protected atomic finalizer with owner and ENDED checks", () => {
    expect(migration).toContain("public.finalize_quest_result");
    expect(migration).toContain("security definer set search_path = ''");
    expect(migration).toContain("Session is not owned by caller");
    expect(migration).toContain("Result finalization requires an ENDED Session");
    expect(migration).toContain("RESULT_ALREADY_FINALIZED");
    expect(migration).toContain("UNSUPPORTED_ATTEMPT_CONTRACT");
    expect(migration).toContain("for update");
  });

  it("derives authority, confidence, modes, outcome, and server timestamps", () => {
    for (const phrase of [
      "SESSION_SYSTEM",
      "SESSION_EVD_V1",
      "'MODERATE','PLAYER'",
      "count(distinct evidence_confidence)",
      "array_agg(distinct verification_mode",
      "clock_timestamp()",
      "final_outcome := case",
    ])
      expect(migration).toContain(phrase);
  });

  it("keeps progression and musical-performance inference outside persistence", () => {
    expect(migration).not.toMatch(
      /create table .*xp|insert into .*xp|proficiency|readiness|attribute_state/i,
    );
    expect(migration).toContain(
      "Verifies the latest recorded metronome configuration, not musical performance accuracy.",
    );
    expect(migration).not.toContain("clean_repetitions");
  });

  it("ships database coverage for security, DORIAN semantics, and deletion", () => {
    for (const phrase of [
      "direct Result INSERT denied",
      "client cannot submit SESSION_SYSTEM authority",
      "ACTIVE finalization denied",
      "PAUSED finalization denied",
      "DORIAN active duration is 612 seconds",
      "all MET derives CLEARED",
      "confidence summary is derived MIXED",
      "BPM evidence disclaims musical accuracy",
      "below threshold derives ABANDONED",
      "anonymous Auth owner uses the same finalization model",
      "account deletion removes Result graph",
    ])
      expect(databaseTest).toContain(phrase);
  });
});
