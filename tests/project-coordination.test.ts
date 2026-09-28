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
    code_ci_complete: boolean;
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
    expect(state.phase).toEqual({
      id: 1,
      name: "Product Foundation",
      status: "IN_PROGRESS",
    });
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

  it("records TAX-003 as terminal and leaves no active ticket", () => {
    const taxonomyTicket = read("docs/tickets/TAX-003.md");

    expect(state.last_terminal_ticket).toMatchObject({
      id: "TAX-003",
      status: "COMPLETE",
    });
    expect(taxonomyTicket).toContain("**Status:** COMPLETE");
    expect(taxonomyTicket).toContain("**COMPLETE — STAGING TAXONOMY MIGRATION VERIFIED**");
    expect(state.active_ticket).toBeNull();
  });

  it("does not authorize PLY-002 until the user explicitly proceeds", () => {
    expect(state.next_ticket.id).toBe("PLY-002");
    expect(state.next_ticket.authorized_to_start).toBe(false);
    expect(plan).toContain("Do **not** begin PLY-002 until the user explicitly authorizes");
  });

  it("provides Codex-facing repository instructions", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("docs/MASTER-BUILD-PLAN.md");
    expect(agents).toContain("docs/project-state.json");
    expect(agents).toContain("one authorized ticket or remediation at a time");
  });
});
