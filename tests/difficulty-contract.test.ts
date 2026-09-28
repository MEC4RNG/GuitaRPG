import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type Level = "I" | "II" | "III" | "IV" | "V";

type DimensionValue = {
  applicable: boolean;
  level: Level | null;
  score: number | null;
  basis: string[];
};

type AbsoluteProfile = {
  quest_slug: string;
  model_version: string;
  source: string;
  dimensions: Record<string, DimensionValue>;
  overall: {
    level: Level;
    score: number;
  };
};

type PersonalEvaluation = {
  id: string;
  quest_slug: string;
  player_state: {
    primary_skill: {
      assessment_status: string;
      visible_level: Level | null;
      readiness_status: string;
      confidence_score: number;
    };
  };
  evaluation: {
    status: string;
    personal_level: Level | null;
    uncertainty: string;
    modifiers: Array<{
      kind: string;
      personal_band_delta: number;
      changes_proficiency: boolean;
    }>;
  };
};

type DifficultyContract = {
  dimensions: string[];
  absolute_levels: Record<
    Level,
    {
      min_score: number;
      max_score: number;
      label: string;
    }
  >;
  personal_levels: Record<Level, string>;
  evaluation_statuses: string[];
  uncertainty_levels: string[];
  model_version: string;
  modifier_bounds: {
    readiness_max_personal_band_increase: number;
    context_novelty_max_personal_band_increase: number;
  };
  invariants: {
    skill_has_inherent_difficulty: boolean;
    quest_absolute_demand_is_player_independent: boolean;
    personal_difficulty_is_quest_property: boolean;
    unrated_primary_can_resolve_personal_difficulty: boolean;
    unknown_status_requires_null_level: boolean;
    xp_is_personal_difficulty_input: boolean;
    character_level_is_personal_difficulty_input: boolean;
    confidence_directly_changes_capability: boolean;
    readiness_changes_historical_proficiency: boolean;
    verification_changes_absolute_demand: boolean;
    reward_is_defined_by_difficulty: boolean;
  };
};

type Fixtures = {
  absolute_profiles: AbsoluteProfile[];
  personal_evaluations: PersonalEvaluation[];
};

const root = resolve(import.meta.dirname, "..");

const contract = JSON.parse(
  readFileSync(resolve(root, "domain/difficulty/difficulty-contract.json"), "utf8"),
) as DifficultyContract;

const fixtures = JSON.parse(
  readFileSync(resolve(root, "domain/difficulty/phase0-difficulty-fixtures.json"), "utf8"),
) as Fixtures;

function expectedLevel(score: number): Level {
  for (const [level, band] of Object.entries(contract.absolute_levels) as Array<
    [Level, { min_score: number; max_score: number }]
  >) {
    if (score >= band.min_score && score <= band.max_score) {
      return level;
    }
  }

  throw new Error(`score outside difficulty bands: ${score}`);
}

describe("DIF-001 difficulty model contract", () => {
  it("defines exactly the seven canonical dimensions", () => {
    expect(contract.dimensions).toEqual([
      "TECHNIQUE",
      "FRETBOARD",
      "THEORY",
      "RHYTHM",
      "CREATIVE",
      "TEMPO",
      "CONSTRAINT",
    ]);
  });

  it("keeps dimensional applicability distinct from Level I", () => {
    for (const profile of fixtures.absolute_profiles) {
      expect(Object.keys(profile.dimensions).sort()).toEqual([...contract.dimensions].sort());

      for (const dimension of Object.values(profile.dimensions)) {
        if (!dimension.applicable) {
          expect(dimension.level).toBeNull();
          expect(dimension.score).toBeNull();
          continue;
        }

        expect(dimension.score).not.toBeNull();
        expect(dimension.level).not.toBeNull();

        const score = dimension.score as number;
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        expect(dimension.level).toBe(expectedLevel(score));
      }
    }
  });

  it("keeps overall absolute-demand scores inside their declared bands", () => {
    for (const profile of fixtures.absolute_profiles) {
      expect(profile.model_version).toBe(contract.model_version);
      expect(profile.overall.score).toBeGreaterThanOrEqual(0);
      expect(profile.overall.score).toBeLessThanOrEqual(100);
      expect(profile.overall.level).toBe(expectedLevel(profile.overall.score));
    }
  });

  it("keeps DORIAN CROSSROADS at absolute demand III", () => {
    const reference = fixtures.absolute_profiles.find(
      (item) => item.quest_slug === "dorian_crossroads",
    );

    expect(reference?.overall.level).toBe("III");
    expect(reference?.dimensions.TECHNIQUE.level).toBe("III");
    expect(reference?.dimensions.FRETBOARD.level).toBe("III");
    expect(reference?.dimensions.THEORY.level).toBe("II");
    expect(reference?.dimensions.RHYTHM.level).toBe("III");
    expect(reference?.dimensions.CREATIVE.applicable).toBe(false);
    expect(reference?.dimensions.TEMPO.level).toBe("III");
    expect(reference?.dimensions.CONSTRAINT.level).toBe("III");
  });

  it("does not invent personal difficulty for an unrated Primary Skill", () => {
    const unrated = fixtures.personal_evaluations.find((item) => item.id === "PDIFF-001");

    expect(unrated?.player_state.primary_skill.assessment_status).toBe("UNRATED");
    expect(unrated?.evaluation.status).toBe("UNKNOWN");
    expect(unrated?.evaluation.personal_level).toBeNull();
  });

  it("keeps estimated-player evaluations provisional", () => {
    const estimated = fixtures.personal_evaluations.find((item) => item.id === "PDIFF-002");

    expect(estimated?.player_state.primary_skill.assessment_status).toBe("ESTIMATED");
    expect(estimated?.evaluation.status).toBe("PROVISIONAL");
    expect(estimated?.evaluation.personal_level).toBe("III");
  });

  it("allows readiness to raise personal difficulty without changing proficiency", () => {
    const stale = fixtures.personal_evaluations.find((item) => item.id === "PDIFF-004");

    expect(stale?.player_state.primary_skill.visible_level).toBe("III");
    expect(stale?.evaluation.personal_level).toBe("IV");

    const modifier = stale?.evaluation.modifiers.find((item) => item.kind === "READINESS");
    expect(modifier?.personal_band_delta).toBeLessThanOrEqual(
      contract.modifier_bounds.readiness_max_personal_band_increase,
    );
    expect(modifier?.changes_proficiency).toBe(false);
  });

  it("bounds context novelty and keeps it out of proficiency", () => {
    const novel = fixtures.personal_evaluations.find((item) => item.id === "PDIFF-006");

    const modifier = novel?.evaluation.modifiers.find(
      (item) => item.kind === "CONTEXT_NOVELTY",
    );

    expect(novel?.evaluation.status).toBe("PROVISIONAL");
    expect(modifier?.personal_band_delta).toBeLessThanOrEqual(
      contract.modifier_bounds.context_novelty_max_personal_band_increase,
    );
    expect(modifier?.changes_proficiency).toBe(false);
  });

  it("keeps core semantic boundaries explicit", () => {
    expect(contract.invariants.skill_has_inherent_difficulty).toBe(false);
    expect(contract.invariants.quest_absolute_demand_is_player_independent).toBe(true);
    expect(contract.invariants.personal_difficulty_is_quest_property).toBe(false);
    expect(contract.invariants.unrated_primary_can_resolve_personal_difficulty).toBe(false);
    expect(contract.invariants.xp_is_personal_difficulty_input).toBe(false);
    expect(contract.invariants.character_level_is_personal_difficulty_input).toBe(false);
    expect(contract.invariants.confidence_directly_changes_capability).toBe(false);
    expect(contract.invariants.readiness_changes_historical_proficiency).toBe(false);
    expect(contract.invariants.verification_changes_absolute_demand).toBe(false);
    expect(contract.invariants.reward_is_defined_by_difficulty).toBe(false);
  });
});
