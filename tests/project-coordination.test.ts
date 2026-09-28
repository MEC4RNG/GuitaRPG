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
  next_ticket: {
    id: string;
    authorized_to_start: boolean;
  };
};

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("GuitaRPG Master Build Plan coordination state", () => {
  const state = JSON.parse(read("docs/project-state.json")) as ProjectState;
  const plan = read("docs/MASTER-BUILD-PLAN.md");

  it("declares the repository operating authority", () => {
    expect(state.project).toBe("GuitaRPG");
    expect(state.phase).toEqual({ id: 2, name: "Core Quest Loop", status: "BLOCKED" });
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

  it("preserves the Phase 1 gate while QST-002 is active", () => {
    const remediationTicket = read("docs/tickets/TAX-003-R1.md");
    const playerTicket = read("docs/tickets/PLY-002.md");

    expect(state.last_terminal_ticket).toMatchObject({ id: "P1-GATE-001", status: "COMPLETE" });
    expect(remediationTicket).toContain(
      "**COMPLETE — STAGING TUNING CONTEXT REMEDIATION VERIFIED**",
    );

    expect(state.active_ticket).toMatchObject({ id: "QST-002", status: "BLOCKED" });
    expect(playerTicket).toContain("**Status:** COMPLETE");
    expect(read("docs/tickets/ONB-001.md")).toContain(
      "**COMPLETE — ONBOARDING AND CALIBRATION FOUNDATION VERIFIED**",
    );
  });

  it("authorizes only QST-002 in Phase 2", () => {
    expect(state.next_ticket.id).toBe("DIF-002");
    expect(state.next_ticket.authorized_to_start).toBe(false);
    expect(plan).toContain("QST-002 — Quest Runtime & Schema Implementation` — BLOCKED");
    expect(plan).toContain("Do **not** begin DIF-002 or any later Phase 2 ticket.");
  });

  it("provides Codex-facing repository instructions", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("docs/MASTER-BUILD-PLAN.md");
    expect(agents).toContain("docs/project-state.json");
    expect(agents).toContain("one authorized ticket or remediation at a time");
  });
});
