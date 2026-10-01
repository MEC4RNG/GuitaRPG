import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";

type ProjectState = {
  phase: { id: number; name: string; status: string };
  legacy_branch: { preserve: boolean; production_cutover_authorized: boolean };
  active_ticket: null | { id: string; status: string };
  next_ticket: null | { id: string; authorized_to_start: boolean };
  phase_gate: { id: string; status: string };
  next_phase: { id: number; status: string; authorized_to_start: boolean };
  execution_status: string;
};

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const state = JSON.parse(read("docs/project-state.json")) as ProjectState;
const prerequisites = [
  "P5-SCOPE-001-R4",
  "UX-001-R1",
  "UX-004",
  "PLY-003",
  "CODEX-001",
  "QST-004",
  "REL-005",
] as const;

describe("P5-GATE-001 durable Phase 5 invariants", () => {
  it("requires every Phase 5 prerequisite to be terminal COMPLETE", () => {
    for (const ticket of prerequisites) {
      expect(read(`docs/tickets/${ticket}.md`), ticket).toContain("**Status:** COMPLETE");
    }
  });

  it("retains the complete launch package and omits Settings", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(packageJson.scripts["test:phase5-integration"]).toBeTruthy();
    expect(existsSync(resolve(root, "app/profile/page.tsx"))).toBe(true);
    expect(existsSync(resolve(root, "app/codex/page.tsx"))).toBe(true);
    expect(existsSync(resolve(root, "app/settings/page.tsx"))).toBe(false);
    expect(read("lib/codex/catalog-v1.ts")).toContain("CODEX_CONTENT_V1");
    expect(CODEX_ENTRIES).toHaveLength(197);
    expect(
      Object.fromEntries(
        ["SKILL", "CONCEPT", "CONTEXT", "CONSTRAINT"].map((kind) => [
          kind,
          CODEX_ENTRIES.filter((entry) => entry.kind === kind).length,
        ]),
      ),
    ).toEqual({ SKILL: 72, CONCEPT: 64, CONTEXT: 31, CONSTRAINT: 30 });
  });

  it("preserves the accepted database and deterministic dependency boundaries", () => {
    expect(
      existsSync(resolve(root, "supabase/migrations/20260929110000_ply_003_profile_editing.sql")),
    ).toBe(true);
    const workflow = read(".github/workflows/ci.yml");
    expect(workflow).toContain("npm ci --legacy-peer-deps --no-audit --no-fund");
    expect(state.legacy_branch).toEqual({
      name: "main",
      preserve: true,
      production_cutover_authorized: false,
    });
  });

  it("keeps gate lifecycle and Phase 6 authority explicit", () => {
    if (state.active_ticket) {
      if (state.active_ticket.id === "P6-SCOPE-001") {
        expect(state.phase).toEqual({ id: 6, name: "Hardening & Launch", status: "IN_PROGRESS" });
        expect(state.phase_gate).toEqual({ id: "P5-GATE-001", status: "PASS" });
        expect(state.next_phase).toMatchObject({
          id: 6,
          status: "IN_PROGRESS",
          authorized_to_start: true,
        });
        expect(state.next_ticket).toBeNull();
        expect(state.execution_status).toBe("P6_SCOPE_001_IN_PROGRESS");
        return;
      }
      if (state.active_ticket.id === "DATA-003") {
        expect(state.phase).toEqual({ id: 6, name: "Hardening & Launch", status: "IN_PROGRESS" });
        expect(state.phase_gate).toEqual({ id: "P5-GATE-001", status: "PASS" });
        expect(state.next_ticket).toMatchObject({ id: "DATA-004", authorized_to_start: false });
        expect(state.execution_status).toBe("DATA_003_IN_PROGRESS");
        return;
      }
      expect(state.phase).toEqual({
        id: 5,
        name: "Learning & Practice Tooling",
        status: "IN_PROGRESS",
      });
      expect(state.active_ticket).toEqual({
        id: "P5-GATE-001",
        title: "Phase 5 Learning & Practice Tooling Gate",
        status: "IN_PROGRESS",
      });
      expect(state.next_ticket).toBeNull();
      expect(state.execution_status).toBe("P5_GATE_001_IN_PROGRESS");
      return;
    }

    if (state.phase.id === 6) {
      expect(state.phase).toEqual({ id: 6, name: "Hardening & Launch", status: "IN_PROGRESS" });
      expect(state.phase_gate).toEqual({ id: "P5-GATE-001", status: "PASS" });
      expect(state.next_phase).toMatchObject({
        id: 6,
        status: "IN_PROGRESS",
        authorized_to_start: true,
      });
      expect(state.next_ticket).toMatchObject({ id: "DATA-003", authorized_to_start: false });
      expect(state.execution_status).toBe("AWAITING_EXPLICIT_DATA_003_AUTHORIZATION");
      return;
    }

    expect(state.phase.status).toBe("COMPLETE");
    expect(state.phase_gate).toEqual({ id: "P5-GATE-001", status: "PASS" });
    expect(state.next_phase).toMatchObject({
      id: 6,
      status: "PLANNED",
      authorized_to_start: false,
    });
    expect(state.next_ticket).toMatchObject({ id: "P6-SCOPE-001", authorized_to_start: false });
    expect(state.execution_status).toBe("AWAITING_EXPLICIT_P6_SCOPE_001_AUTHORIZATION");
  });
});
