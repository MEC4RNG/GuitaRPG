export const SESSION_RUNTIME_VERSION = "SES_V1" as const;
export const SESSION_STATUSES = ["ACTIVE", "PAUSED", "ENDED"] as const;
export const SESSION_EVENT_TYPES = ["START", "PAUSE", "RESUME", "END"] as const;
export const SESSION_COMMANDS = ["PAUSE", "RESUME", "END"] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];
export type SessionEventType = (typeof SESSION_EVENT_TYPES)[number];
export type SessionCommand = (typeof SESSION_COMMANDS)[number];

export type PracticeSession = {
  id: string;
  player_id: string;
  quest_id: string;
  runtime_version: typeof SESSION_RUNTIME_VERSION;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

export type PracticeSessionEvent = {
  id: string;
  session_id: string;
  sequence: number;
  event_type: SessionEventType;
  occurred_at: string;
  runtime_version: typeof SESSION_RUNTIME_VERSION;
};

export class SessionRuntimeError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SessionRuntimeError";
  }
}

const transitionMap: Record<
  SessionStatus,
  Partial<Record<SessionCommand, { status: SessionStatus; event: SessionEventType }>>
> = {
  ACTIVE: {
    PAUSE: { status: "PAUSED", event: "PAUSE" },
    END: { status: "ENDED", event: "END" },
  },
  PAUSED: {
    RESUME: { status: "ACTIVE", event: "RESUME" },
    END: { status: "ENDED", event: "END" },
  },
  ENDED: {},
};

export function resolveSessionTransition(status: SessionStatus, command: SessionCommand) {
  const transition = transitionMap[status][command];
  if (!transition)
    throw new SessionRuntimeError(
      "INVALID_TRANSITION",
      `Cannot ${command.toLowerCase()} a Session in ${status} state`,
    );
  return transition;
}

const timestamp = (value: string, label: string): number => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed))
    throw new SessionRuntimeError("INVALID_TIMESTAMP", `${label} must be an ISO timestamp`);
  return parsed;
};

export function validateSessionEvents(events: readonly PracticeSessionEvent[]): SessionStatus {
  if (!events.length || events[0]?.event_type !== "START")
    throw new SessionRuntimeError("INVALID_EVENT_HISTORY", "Session history must begin with START");
  let status: SessionStatus = "ACTIVE";
  let previousTime = timestamp(events[0]!.occurred_at, "START occurred_at");
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    if (event.runtime_version !== SESSION_RUNTIME_VERSION)
      throw new SessionRuntimeError(
        "UNSUPPORTED_VERSION",
        "Session event runtime version is unsupported",
      );
    if (event.sequence !== index + 1)
      throw new SessionRuntimeError(
        "INVALID_EVENT_ORDER",
        "Session event sequence must be contiguous",
      );
    const currentTime = timestamp(event.occurred_at, `${event.event_type} occurred_at`);
    if (currentTime < previousTime)
      throw new SessionRuntimeError(
        "INVALID_EVENT_ORDER",
        "Session event timestamps must not move backward",
      );
    previousTime = currentTime;
    if (index === 0) continue;
    const command =
      event.event_type === "PAUSE"
        ? "PAUSE"
        : event.event_type === "RESUME"
          ? "RESUME"
          : event.event_type === "END"
            ? "END"
            : null;
    if (!command)
      throw new SessionRuntimeError("INVALID_EVENT_HISTORY", "START may occur only once");
    status = resolveSessionTransition(status, command).status;
  }
  return status;
}

export function deriveRecordedActiveSeconds(
  events: readonly PracticeSessionEvent[],
  observedAt?: string,
): number {
  const status = validateSessionEvents(events);
  let activeStart = timestamp(events[0]!.occurred_at, "START occurred_at");
  let totalMilliseconds = 0;
  for (const event of events.slice(1)) {
    const at = timestamp(event.occurred_at, `${event.event_type} occurred_at`);
    if (event.event_type === "PAUSE" || event.event_type === "END") {
      if (activeStart !== -1) totalMilliseconds += at - activeStart;
      activeStart = -1;
    } else if (event.event_type === "RESUME") activeStart = at;
  }
  if (status === "ACTIVE" && observedAt) {
    const at = timestamp(observedAt, "observedAt");
    if (at < activeStart)
      throw new SessionRuntimeError("INVALID_TIMESTAMP", "observedAt precedes the active interval");
    totalMilliseconds += at - activeStart;
  }
  return Math.floor(totalMilliseconds / 1000);
}

export function validatePracticeSession(
  session: PracticeSession,
  events: readonly PracticeSessionEvent[],
): PracticeSession {
  if (session.runtime_version !== SESSION_RUNTIME_VERSION)
    throw new SessionRuntimeError("UNSUPPORTED_VERSION", "Session runtime version is unsupported");
  if (!session.id || !session.player_id || !session.quest_id)
    throw new SessionRuntimeError(
      "INVALID_SESSION",
      "Session identity, owner, and Quest are required",
    );
  timestamp(session.started_at, "started_at");
  timestamp(session.created_at, "created_at");
  const derivedStatus = validateSessionEvents(events);
  if (derivedStatus !== session.status)
    throw new SessionRuntimeError(
      "STATE_EVENT_MISMATCH",
      "Session state does not match event history",
    );
  if (session.status === "ENDED") {
    if (!session.ended_at)
      throw new SessionRuntimeError("INVALID_SESSION", "ENDED Session requires ended_at");
    const last = events.at(-1)!;
    if (
      last.event_type !== "END" ||
      timestamp(session.ended_at, "ended_at") !== timestamp(last.occurred_at, "END occurred_at")
    )
      throw new SessionRuntimeError(
        "STATE_EVENT_MISMATCH",
        "ended_at must equal the END event timestamp",
      );
  } else if (session.ended_at !== null)
    throw new SessionRuntimeError("INVALID_SESSION", "Open Session cannot have ended_at");
  return session;
}
