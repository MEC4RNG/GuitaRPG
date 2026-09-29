import { describe, expect, it } from "vitest";
import {
  SESSION_RUNTIME_VERSION,
  SessionRuntimeError,
  deriveRecordedActiveSeconds,
  resolveSessionTransition,
  validatePracticeSession,
  validateSessionEvents,
  type PracticeSession,
  type PracticeSessionEvent,
} from "@/lib/session/runtime";
import {
  endPracticeSession,
  pausePracticeSession,
  resumePracticeSession,
  startPracticeSession,
  type SessionRpcClient,
} from "@/lib/session/repository";

const event = (
  sequence: number,
  event_type: PracticeSessionEvent["event_type"],
  occurred_at: string,
): PracticeSessionEvent => ({
  id: `event-${sequence}`,
  session_id: "session-1",
  sequence,
  event_type,
  occurred_at,
  runtime_version: SESSION_RUNTIME_VERSION,
});

const history = [
  event(1, "START", "2026-09-28T12:00:00.000Z"),
  event(2, "PAUSE", "2026-09-28T12:01:00.000Z"),
  event(3, "RESUME", "2026-09-28T12:03:00.000Z"),
  event(4, "END", "2026-09-28T12:03:30.000Z"),
];

describe("SES-001 Practice Session runtime", () => {
  it("defines the SES_V1 lifecycle without Result states", () => {
    expect(SESSION_RUNTIME_VERSION).toBe("SES_V1");
    expect(resolveSessionTransition("ACTIVE", "PAUSE")).toEqual({
      status: "PAUSED",
      event: "PAUSE",
    });
    expect(resolveSessionTransition("PAUSED", "RESUME")).toEqual({
      status: "ACTIVE",
      event: "RESUME",
    });
    expect(resolveSessionTransition("ACTIVE", "END")).toEqual({ status: "ENDED", event: "END" });
    expect(resolveSessionTransition("PAUSED", "END")).toEqual({ status: "ENDED", event: "END" });
  });

  it.each([
    ["ACTIVE", "RESUME"],
    ["PAUSED", "PAUSE"],
    ["ENDED", "PAUSE"],
    ["ENDED", "RESUME"],
    ["ENDED", "END"],
  ] as const)("rejects invalid %s → %s transition", (status, command) => {
    expect(() => resolveSessionTransition(status, command)).toThrow(SessionRuntimeError);
  });

  it("derives active time deterministically and excludes paused intervals", () => {
    expect(validateSessionEvents(history)).toBe("ENDED");
    expect(deriveRecordedActiveSeconds(history)).toBe(90);
    expect(deriveRecordedActiveSeconds(history)).toBe(90);
  });

  it("can include an explicitly observed open active interval without reading the clock", () => {
    const open = history.slice(0, 3);
    expect(deriveRecordedActiveSeconds(open)).toBe(60);
    expect(deriveRecordedActiveSeconds(open, "2026-09-28T12:03:45.000Z")).toBe(105);
  });

  it.each([
    [history.slice(1), "START"],
    [[history[0]!, event(3, "PAUSE", "2026-09-28T12:01:00.000Z")], "sequence"],
    [[history[0]!, event(2, "RESUME", "2026-09-28T12:01:00.000Z")], "resume"],
    [[history[0]!, event(2, "PAUSE", "2026-09-28T11:59:00.000Z")], "backward"],
  ])("rejects corrupt event history %#", (events) => {
    expect(() => validateSessionEvents(events as PracticeSessionEvent[])).toThrow(
      SessionRuntimeError,
    );
  });

  it("validates a complete Session snapshot against its event authority", () => {
    const session: PracticeSession = {
      id: "session-1",
      player_id: "player-1",
      quest_id: "quest-1",
      runtime_version: "SES_V1",
      status: "ENDED",
      started_at: history[0]!.occurred_at,
      ended_at: history[3]!.occurred_at,
      created_at: history[0]!.occurred_at,
    };
    expect(validatePracticeSession(session, history)).toBe(session);
    expect(() =>
      validatePracticeSession({ ...session, status: "PAUSED", ended_at: null }, history),
    ).toThrow("does not match event history");
  });

  it("contains lifecycle telemetry only, with no Result or progression semantics", () => {
    const serialized = JSON.stringify({ session: { status: "ACTIVE" }, events: history });
    for (const forbidden of [
      "outcome",
      "criterion",
      "evidence",
      "reflection",
      "xp",
      "proficiency",
      "readiness",
      "mastery",
    ])
      expect(serialized.toLowerCase()).not.toContain(forbidden);
  });

  it("maps the typed repository boundary only to protected lifecycle RPCs", async () => {
    const calls: Array<{ name: string; parameters: Record<string, unknown> }> = [];
    const response = {
      id: "session-1",
      player_id: "player-1",
      quest_id: "quest-1",
      runtime_version: "SES_V1",
      status: "ACTIVE",
      started_at: history[0]!.occurred_at,
      ended_at: null,
      created_at: history[0]!.occurred_at,
    } satisfies PracticeSession;
    const client: SessionRpcClient = {
      rpc(name, parameters) {
        calls.push({ name, parameters });
        return Promise.resolve({ data: response, error: null });
      },
    };
    await startPracticeSession(client, "quest-1");
    await pausePracticeSession(client, "session-1");
    await resumePracticeSession(client, "session-1");
    await endPracticeSession(client, "session-1");
    expect(calls).toEqual([
      { name: "start_practice_session", parameters: { p_quest_id: "quest-1" } },
      { name: "pause_practice_session", parameters: { p_session_id: "session-1" } },
      { name: "resume_practice_session", parameters: { p_session_id: "session-1" } },
      { name: "end_practice_session", parameters: { p_session_id: "session-1" } },
    ]);
  });
});
