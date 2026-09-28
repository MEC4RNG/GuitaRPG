import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type SkillRef = {
  slug: string;
  name: string;
  domain: string;
  role: string;
};

type QuestFixture = {
  identity: {
    id: string;
    slug: string;
    title: string;
    schema_version: number;
    type: string;
  };
  purpose: {
    primary_domain: string;
  };
  execution: {
    primary_skill: SkillRef;
    secondary_skills: SkillRef[];
    required_techniques: SkillRef[];
  };
  concepts: Array<{ slug: string; name: string }>;
  constraints: Array<{ slug: string; name: string; parameters: Record<string, unknown> }>;
  objective: {
    kind: string;
    summary: string;
    clear_rule: string;
    criteria: Array<{ metric: string; operator: string; value: unknown; unit: string }>;
  };
  completion_contract: {
    mastery_claimed: boolean;
  };
  verification_profile: {
    allowed_modes: string[];
    recommended_mode: string;
    verification_required_for_clear: boolean;
  };
  difficulty_profile: {
    declared_overall_demand: string;
    computation_status: string;
  };
  rewards: {
    fixed_xp: number | null;
    progression_effects_embedded: boolean;
  };
};

type QuestContract = {
  quest_types: string[];
  primary_domains: string[];
  verification_modes: string[];
  difficulty_levels: string[];
  invariants: {
    exactly_one_primary_skill: boolean;
    maximum_secondary_skills: number;
    minimum_concepts: number;
    minimum_constraints: number;
    maximum_normal_constraints: number;
    maximum_style_contexts: number;
    quest_outcome_embedded: boolean;
    session_result_embedded: boolean;
    reflection_embedded: boolean;
    progression_effects_embedded: boolean;
    completion_claims_mastery: boolean;
    verification_required_for_clear: boolean;
    fixed_xp_allowed_before_prog_001: boolean;
  };
};

const root = resolve(import.meta.dirname, "..");
const contract = JSON.parse(
  readFileSync(resolve(root, "domain/quest/quest-contract.json"), "utf8"),
) as QuestContract;
const fixtures = JSON.parse(
  readFileSync(resolve(root, "domain/quest/phase0-quest-fixtures.json"), "utf8"),
) as QuestFixture[];

describe("QST-001 canonical Quest contract", () => {
  it("provides at least 20 fixtures and covers all six primary Domains", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(20);

    const counts = new Map<string, number>();
    for (const fixture of fixtures) {
      counts.set(
        fixture.purpose.primary_domain,
        (counts.get(fixture.purpose.primary_domain) ?? 0) + 1,
      );
    }

    expect([...counts.keys()].sort()).toEqual([...contract.primary_domains].sort());

    for (const domain of contract.primary_domains) {
      expect(counts.get(domain) ?? 0, domain).toBeGreaterThanOrEqual(3);
    }
  });

  it("represents all five Quest Types", () => {
    const types = new Set(fixtures.map((fixture) => fixture.identity.type));
    expect([...types].sort()).toEqual([...contract.quest_types].sort());
  });

  it("enforces core composition invariants", () => {
    for (const fixture of fixtures) {
      expect(fixture.execution.primary_skill.role, fixture.identity.slug).toBe("PRIMARY_SKILL");
      expect(fixture.execution.primary_skill.domain, fixture.identity.slug).toBe(
        fixture.purpose.primary_domain,
      );
      expect(fixture.execution.secondary_skills.length, fixture.identity.slug).toBeLessThanOrEqual(
        contract.invariants.maximum_secondary_skills,
      );
      expect(fixture.concepts.length, fixture.identity.slug).toBeGreaterThanOrEqual(
        contract.invariants.minimum_concepts,
      );
      expect(fixture.constraints.length, fixture.identity.slug).toBeGreaterThanOrEqual(
        contract.invariants.minimum_constraints,
      );
      expect(fixture.constraints.length, fixture.identity.slug).toBeLessThanOrEqual(
        contract.invariants.maximum_normal_constraints,
      );

      const skillSlugs = [
        fixture.execution.primary_skill.slug,
        ...fixture.execution.secondary_skills.map((item) => item.slug),
        ...fixture.execution.required_techniques.map((item) => item.slug),
      ];
      expect(new Set(skillSlugs).size, fixture.identity.slug).toBe(skillSlugs.length);
    }
  });

  it("requires machine-readable Objective criteria rather than prose-only completion", () => {
    for (const fixture of fixtures) {
      expect(fixture.objective.summary.length, fixture.identity.slug).toBeGreaterThan(0);
      expect(fixture.objective.criteria.length, fixture.identity.slug).toBeGreaterThan(0);

      for (const criterion of fixture.objective.criteria) {
        expect(criterion.metric.length, fixture.identity.slug).toBeGreaterThan(0);
        expect(["EQ", "GTE", "LTE"], fixture.identity.slug).toContain(criterion.operator);
        expect(criterion.unit.length, fixture.identity.slug).toBeGreaterThan(0);
      }
    }
  });

  it("keeps completion, verification, and progression semantics separate", () => {
    for (const fixture of fixtures) {
      expect(fixture.completion_contract.mastery_claimed, fixture.identity.slug).toBe(false);
      expect(
        fixture.verification_profile.verification_required_for_clear,
        fixture.identity.slug,
      ).toBe(false);
      expect(fixture.rewards.fixed_xp, fixture.identity.slug).toBeNull();
      expect(fixture.rewards.progression_effects_embedded, fixture.identity.slug).toBe(false);
    }
  });

  it("uses only declared verification and demand values", () => {
    for (const fixture of fixtures) {
      expect(
        contract.difficulty_levels,
        fixture.identity.slug,
      ).toContain(fixture.difficulty_profile.declared_overall_demand);
      expect(fixture.difficulty_profile.computation_status, fixture.identity.slug).toBe(
        "ILLUSTRATIVE_PENDING_DIF_001",
      );

      for (const mode of fixture.verification_profile.allowed_modes) {
        expect(contract.verification_modes, fixture.identity.slug).toContain(mode);
      }
      expect(fixture.verification_profile.allowed_modes, fixture.identity.slug).toContain(
        fixture.verification_profile.recommended_mode,
      );
    }
  });

  it("keeps DORIAN CROSSROADS as the stable Phase 0 reference", () => {
    const reference = fixtures.find((fixture) => fixture.identity.slug === "dorian_crossroads");

    expect(reference?.identity.title).toBe("DORIAN CROSSROADS");
    expect(reference?.execution.primary_skill.slug).toBe("hybrid_picking");
    expect(reference?.concepts.some((item) => item.slug === "dorian")).toBe(true);
    expect(reference?.difficulty_profile.declared_overall_demand).toBe("III");
    expect(
      reference?.objective.criteria.some(
        (item) => item.metric === "target_tempo" && item.value === 90,
      ),
    ).toBe(true);
    expect(
      reference?.objective.criteria.some(
        (item) => item.metric === "practice_duration" && item.value === 600,
      ),
    ).toBe(true);
  });
});
