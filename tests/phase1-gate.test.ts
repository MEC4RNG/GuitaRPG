import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type ProjectState = {
  phase: { id: number; name: string; status: string };
  production_development_branch: string;
  legacy_branch: {
    name: string;
    preserve: boolean;
    production_cutover_authorized: boolean;
  };
  last_terminal_ticket: { id: string; status: string };
  active_ticket: null | { id: string; status: string };
  next_ticket: null | { id: string; authorized_to_start: boolean };
  phase_gate: { id: string; status: string };
};

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const state = JSON.parse(read("docs/project-state.json")) as ProjectState;

const prerequisites = [
  "UX-002",
  "DATA-002",
  "TAX-003",
  "TAX-003-R1",
  "PLY-002",
  "ONB-001",
] as const;

const migrations = [
  "20260928000000_data_002_persistence_foundation.sql",
  "20260928010000_tax_003_canonical_taxonomy.sql",
  "20260928015000_tax_003_r1_tuning_contexts.sql",
  "20260928020000_ply_002_player_persistence.sql",
] as const;

describe("P1-GATE-001 durable integration invariants", () => {
  it("requires every Phase 1 prerequisite to be terminal COMPLETE", () => {
    for (const ticket of prerequisites) {
      expect(read(`docs/tickets/${ticket}.md`), ticket).toMatch(/\*\*Status:\*\* COMPLETE/);
    }
  });

  it("preserves the accepted migration chain without introducing Phase 2 schema", () => {
    for (const migration of migrations) {
      expect(existsSync(resolve(root, "supabase/migrations", migration)), migration).toBe(true);
    }

    expect(read("supabase/config.toml")).toContain("enable_anonymous_sign_ins = true");
    expect(migrations.some((migration) => migration.toLowerCase().includes("qst_002"))).toBe(false);
  });

  it("keeps the legacy branch and production cutover boundary intact", () => {
    expect(state.production_development_branch).toBe("v1-production");
    expect(state.legacy_branch).toEqual({
      name: "main",
      preserve: true,
      production_cutover_authorized: false,
    });
  });

  it("keeps the Phase 1 gate lifecycle internally coherent", () => {
    expect(["P1-GATE-001", "P2-GATE-001", "P3-GATE-001", "P4-GATE-001"]).toContain(
      state.phase_gate.id,
    );

    if (["P2-GATE-001", "P3-GATE-001", "P4-GATE-001"].includes(state.phase_gate.id)) {
      expect(state.phase_gate.status).toBe("PASS");
      const minimumPhase =
        state.phase_gate.id === "P4-GATE-001" ? 4 : state.phase_gate.id === "P3-GATE-001" ? 3 : 2;
      expect(state.phase.id).toBeGreaterThanOrEqual(minimumPhase);
      if (state.phase.id === 2) {
        expect(state.phase).toEqual({ id: 2, name: "Core Quest Loop", status: "COMPLETE" });
      }
      if (state.phase.id === 3) {
        expect(state.phase).toEqual({ id: 3, name: "Progression", status: "COMPLETE" });
      }
      if (state.phase.id === 4) {
        expect(state.phase).toEqual({ id: 4, name: "Adaptive GuitaRPG", status: "COMPLETE" });
      }
      expect(state.next_ticket === null || state.next_ticket.authorized_to_start === false).toBe(
        true,
      );
      return;
    }

    if (state.phase_gate.status === "VALIDATING") {
      expect(state.phase).toEqual({ id: 1, name: "Product Foundation", status: "IN_PROGRESS" });
      expect(state.active_ticket).toMatchObject({ id: "P1-GATE-001", status: "VALIDATING" });
      expect(state.next_ticket).toMatchObject({
        id: "P1-GATE-001",
        authorized_to_start: true,
      });
      return;
    }

    expect(state.phase_gate.status).toBe("PASS");
    if (state.phase.id === 1) {
      expect(state.phase).toEqual({ id: 1, name: "Product Foundation", status: "COMPLETE" });
      expect(state.active_ticket).toBeNull();
      expect(state.next_ticket).toMatchObject({ id: "QST-002", authorized_to_start: false });
    } else {
      expect(state.phase.id).toBe(2);
      expect(state.phase.name).toBe("Core Quest Loop");
      expect(["IN_PROGRESS", "COMPLETE"]).toContain(state.phase.status);
      expect(["COMPLETE", "BLOCKED"]).toContain(state.last_terminal_ticket.status);
      if (state.active_ticket) {
        expect(state.active_ticket.status).toBe("IN_PROGRESS");
        expect(state.next_ticket).toBeNull();
      } else {
        expect(state.next_ticket?.authorized_to_start).toBe(false);
      }
    }
  });

  it("preserves the stable Phase 0 cross-contract reference", () => {
    const reference = JSON.parse(read("domain/contracts/phase0-reference-fixture.json")) as {
      reference_id: string;
      quest: {
        fixture_id: string;
        slug: string;
        primary_skill: string;
        secondary_skills: string[];
        tonal_center_pitch_class: string;
        target_tempo_bpm: number;
        required_practice_seconds: number;
      };
      difficulty: { expected_overall_level: string };
      evidence: { clear_result_id: string; partial_result_id: string };
      progression: { clear_result_expected_xp: number };
    };

    expect(reference.reference_id).toBe("DORIAN_CROSSROADS");
    expect(reference.quest).toMatchObject({
      fixture_id: "QFIX-TECH-001",
      slug: "dorian_crossroads",
      primary_skill: "hybrid_picking",
      secondary_skills: ["scale_mapping", "syncopation_control"],
      tonal_center_pitch_class: "E",
      target_tempo_bpm: 90,
      required_practice_seconds: 600,
    });
    expect(reference.difficulty.expected_overall_level).toBe("III");
    expect(reference.evidence).toEqual({
      clear_result_id: "EVD-FIX-001",
      partial_result_id: "EVD-FIX-002",
    });
    expect(reference.progression.clear_result_expected_xp).toBe(15);
  });
});
