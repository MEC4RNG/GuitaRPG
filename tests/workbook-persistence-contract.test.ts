import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20261017020000_jrn_002_workbook_persistence.sql",
  "utf8",
);
const surface = readFileSync("components/workbook-persistence-surface.tsx", "utf8");
const editor = readFileSync("components/workbook-editor-prototype.tsx", "utf8");

describe("JRN-002 persistence contract", () => {
  it("creates the owner graph with account-deletion cascades and RLS", () => {
    for (const table of [
      "player_workbooks",
      "player_workbook_pages",
      "player_workbook_page_revisions",
    ])
      expect(migration).toContain(`create table public.${table}`);
    expect(migration).toContain("references auth.users(id) on delete cascade");
    expect(migration.match(/enable row level security/g)).toHaveLength(3);
    expect(migration).toContain("player_id = auth.uid()");
  });

  it("denies direct mutations and exposes narrow authenticated RPCs", () => {
    expect(migration).toContain("revoke all on table public.player_workbooks");
    expect(migration).toContain("grant select on table public.player_workbooks");
    expect(migration).toContain("security definer set search_path = ''");
    expect(migration).toContain("to authenticated, service_role");
  });

  it("enforces optimistic concurrency, idempotency, immutable snapshots, and bounded retention", () => {
    expect(migration).toContain("current_page.revision <> p_expected_revision");
    expect(migration).toContain("request_id=p_request_id");
    expect(migration).toContain("next_revision-50");
    expect(migration).toContain("Workbook revisions are immutable");
  });

  it("preserves the independent Workbook boundary", () => {
    expect(migration).not.toMatch(/\b(quest_id|session_id|result_id|proficiency|xp_award)\b/i);
  });

  it("provides autosave, conflict, guest recovery, archive, revision, and Quick Note UX", () => {
    expect(editor).toContain('setStatus("Saving")');
    expect(editor).toContain('setStatus("Saved")');
    expect(editor).toContain("Conflict · another accepted version exists");
    expect(surface).toContain("Protect your Player");
    expect(surface).toContain("Archived Workbooks");
    expect(surface).toContain("Recovery revisions");
    expect(surface).toContain("Quick Note");
  });
});
