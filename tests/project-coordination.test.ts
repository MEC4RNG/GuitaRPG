import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type ProjectState = {
  project: string;
  phase: {
    id: number;
    name: string;
    status: string;
  };
  production_development_branch: string;
  legacy_branch: {
    name: string;
    preserve: boolean;
    production_cutover_authorized: boolean;
  };
  last_terminal_ticket: {
    id: string;
    status: string;
  };
  active_ticket: null | {
    id: string;
    status: string;
  };
  next_ticket: null | {
    id: string;
    authorized_to_start: boolean;
  };
  execution_status: string;
};

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("GuitaRPG Master Build Plan coordination state", () => {
  const state = JSON.parse(read("docs/project-state.json")) as ProjectState;
  const plan = read("docs/MASTER-BUILD-PLAN.md");

  it("declares the repository operating authority", () => {
    expect(state.project).toBe("GuitaRPG");
    expect(state.phase.id).toBe(5);
    expect(state.phase.name).toBe("Learning & Practice Tooling");
    expect(["IN_PROGRESS", "COMPLETE"]).toContain(state.phase.status);
    expect(state.production_development_branch).toBe("v1-production");
    expect(plan).toContain("# GuitaRPG Master Build Plan");
    expect(plan).toContain("## 12. Chat ↔ Codex operating model");
    expect(plan).toContain("## 14. Handoff protocol");
    expect(plan).toContain("## 22. Critical path");
  });

  it("preserves the legacy branch until explicit cutover", () => {
    expect(state.legacy_branch).toEqual({
      name: "main",
      preserve: true,
      production_cutover_authorized: false,
    });
  });

  it("preserves completed prerequisites after REL-005 closes", () => {
    const remediationTicket = read("docs/tickets/TAX-003-R1.md");
    const playerTicket = read("docs/tickets/PLY-002.md");

    expect(remediationTicket).toContain(
      "**COMPLETE — STAGING TUNING CONTEXT REMEDIATION VERIFIED**",
    );

    expect(state.last_terminal_ticket).toMatchObject({ id: "REL-005", status: "COMPLETE" });
    expect(state.active_ticket === null || state.active_ticket.id === "P5-GATE-001").toBe(true);
    expect(read("docs/tickets/REL-005.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/QST-004.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/CODEX-001.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/PLY-003.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/UX-004.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/UX-001-R1.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/P5-SCOPE-001.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/P5-SCOPE-001-R1.md")).toContain("**Status:** BLOCKED / SUPERSEDED");
    expect(read("docs/tickets/P5-SCOPE-001-R2.md")).toContain("**Status:** BLOCKED / SUPERSEDED");
    expect(read("docs/tickets/P5-SCOPE-001-R3.md")).toContain(
      "**Status:** BLOCKED / NOT COMMITTED IMPLEMENTATION",
    );
    expect(read("docs/tickets/P5-SCOPE-001-R4.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/P4-GATE-001.md")).toContain("**Status:** COMPLETE / PASS");
    expect(read("docs/tickets/REL-004.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/TRN-004.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/EVD-002.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/SES-001.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/SES-002.md")).toContain("**Status:** COMPLETE");
    expect(playerTicket).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/ONB-001.md")).toContain(
      "**COMPLETE — ONBOARDING AND CALIBRATION FOUNDATION VERIFIED**",
    );
  });

  it("keeps P5-GATE-001 lifecycle and cutover boundaries coherent", () => {
    if (state.active_ticket) {
      expect(state.phase.status).toBe("IN_PROGRESS");
      expect(state.active_ticket).toMatchObject({ id: "P5-GATE-001", status: "IN_PROGRESS" });
      expect(state.next_ticket).toBeNull();
      expect(state.execution_status).toBe("P5_GATE_001_IN_PROGRESS");
    } else {
      expect(state.phase.status).toBe("COMPLETE");
      expect(state.next_ticket).toMatchObject({ id: "P6-SCOPE-001", authorized_to_start: false });
      expect(state.execution_status).toBe("AWAITING_EXPLICIT_P6_SCOPE_001_AUTHORIZATION");
    }
    expect(state.legacy_branch.production_cutover_authorized).toBe(false);
    expect(read("docs/tickets/ONB-001-R1.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/HIST-001.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/REL-002.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/P2-GATE-001.md")).toContain("**Status:** COMPLETE / PASS");
    expect(read("docs/tickets/PROG-002.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/PROG-003.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/PROG-004.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/TAX-004.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/PROG-005.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/UX-003.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/PROG-006.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/REL-003.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/P3-GATE-001.md")).toContain("**Status:** COMPLETE / PASS");
    expect(read("docs/tickets/TRN-001.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/TRN-002.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/QST-003-R2.md")).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/TRN-003.md")).toContain("**Status:** COMPLETE");
    expect(plan).toContain("`REL-002` — core-loop integration tests");
    expect(plan).toContain("`P2-GATE-001` — Core Quest Loop integration gate — COMPLETE / PASS");
  });

  it("provides Codex-facing repository instructions", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("docs/MASTER-BUILD-PLAN.md");
    expect(agents).toContain("docs/project-state.json");
    expect(agents).toContain("one authorized ticket or remediation at a time");
  });
});
