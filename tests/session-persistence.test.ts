import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");
const migration = read("supabase/migrations/20260928040000_ses_001_practice_session_runtime.sql");
const databaseTest = read("supabase/tests/database/practice_session_runtime.test.sql");

describe("SES-001 persistence contract", () => {
  it("adds versioned Session and append-only event tables without Result fields", () => {
    expect(migration).toContain("create table public.practice_sessions");
    expect(migration).toContain("create table public.practice_session_events");
    expect(migration).toContain("runtime_version text not null default 'SES_V1'");
    expect(migration).toContain("status in ('ACTIVE', 'PAUSED', 'ENDED')");
    expect(migration).not.toMatch(/\boutcome\b|\bmastery\b|\bproficiency\b|\breadiness\b/);
    expect(migration).not.toContain("fixed_xp");
  });

  it("uses protected server-time RPCs and row locking for atomic transitions", () => {
    for (const name of ["start", "pause", "resume", "end"])
      expect(migration).toContain(`public.${name}_practice_session`);
    expect(migration).toContain("for update");
    expect(migration).toContain("clock_timestamp()");
    expect(migration).toContain("auth.uid()");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain(
      "revoke all on function public.start_practice_session(uuid) from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.start_practice_session(uuid) to authenticated",
    );
  });

  it("permits owner reads but denies direct lifecycle and event mutation", () => {
    expect(migration).toContain("alter table public.practice_sessions enable row level security");
    expect(migration).toContain(
      "alter table public.practice_session_events enable row level security",
    );
    expect(migration).toContain(
      "grant select on table public.practice_sessions, public.practice_session_events to authenticated",
    );
    expect(migration).not.toContain("grant insert on table public.practice_sessions");
    expect(migration).not.toContain("grant update on table public.practice_sessions");
    expect(migration).not.toContain("grant delete on table public.practice_session_events");
  });

  it("protects attempted Quests while retaining account-deletion cascades", () => {
    expect(migration).toContain(
      "quest_id uuid not null references public.quests(id) on delete cascade",
    );
    expect(migration).toContain(
      "player_id uuid not null references auth.users(id) on delete cascade",
    );
    expect(migration).toContain("Quest with Practice Sessions cannot be deleted");
    expect(databaseTest).toContain("ordinary Quest deletion is blocked after a Session exists");
    expect(databaseTest).toContain("account deletion removes attempted Quests");
  });

  it("ships database acceptance coverage for ownership, lifecycle, timing, and immutability", () => {
    for (const phrase of [
      "unauthenticated caller cannot start Session",
      "owner cannot start Session for another Player Quest",
      "ACTIVE to PAUSED succeeds",
      "PAUSED to ACTIVE succeeds",
      "ENDED is terminal",
      "client cannot forge lifecycle event",
      "recorded active time deterministically excludes paused interval",
      "anonymous Auth guest receives normal owner behavior",
      "account deletion removes Sessions",
    ])
      expect(databaseTest).toContain(phrase);
  });
});
