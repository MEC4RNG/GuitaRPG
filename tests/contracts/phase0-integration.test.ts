import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { contractPaths, loadJson, repoRoot } from "./fixture-loader";

type TaxonomyManifest = {
  entries: Array<{
    targets: Array<{ kind: string; slug: string }>;
  }>;
};

type PlayerContract = {
  visible_skill_levels: string[];
  readiness_statuses: string[];
  attribute_statuses: string[];
  invariants: {
    xp_can_directly_promote_skill: boolean;
    inactivity_can_directly_lower_proficiency: boolean;
  };
};

type QuestContract = {
  verification_modes: string[];
  difficulty_levels: string[];
};

type QuestFixture = {
  identity: { id: string; slug: string; title: string };
  purpose: { primary_domain: string };
  execution: {
    primary_skill: { slug: string };
    secondary_skills: Array<{ slug: string }>;
  };
  musical_context: {
    tonal_center: { pitch_class: string } | null;
  };
  concepts: Array<{ slug: string }>;
  objective: {
    criteria: Array<{ metric: string; value: unknown }>;
  };
  verification_profile: {
    allowed_modes: string[];
  };
  rewards: {
    progression_effects_embedded: boolean;
  };
};

type DifficultyContract = {
  absolute_levels: Record<string, unknown>;
  model_version: string;
  invariants: {
    readiness_changes_historical_proficiency: boolean;
  };
};

type DifficultyFixtures = {
  absolute_profiles: Array<{
    quest_slug: string;
    overall: { level: string };
  }>;
  personal_evaluations: Array<{ id: string; quest_slug: string }>;
};

type EvidenceContract = {
  verification_modes: string[];
  invariants: {
    self_can_support_clear: boolean;
    result_embeds_xp_mutation: boolean;
    result_embeds_proficiency_mutation: boolean;
  };
};

type EvidenceResult = {
  id: string;
  quest_slug: string;
  outcome: string;
  required_criteria: string[];
  evidence: Array<{
    criterion: string;
    verification_mode: string;
    observed_or_asserted_value: unknown;
  }>;
};

type EvidenceFixtures = {
  results: EvidenceResult[];
};

type ProgressionContract = {
  model_versions: { xp: string };
  xp_policy: {
    practice_xp_per_completed_minute: number;
    outcome_bonus: Record<string, number>;
  };
  proficiency: {
    bands: Record<string, [number, number]>;
  };
  readiness: {
    statuses: string[];
    inactivity_changes_proficiency: boolean;
  };
  attributes: {
    statuses: string[];
  };
  invariants: {
    xp_directly_changes_skill_proficiency: boolean;
    self_evidence_is_valid: boolean;
    one_clear_can_establish_mastery: boolean;
  };
};

type FrameworkManifest = {
  semantic_contracts: Array<{
    ticket: string;
    artifact: string;
    fixture?: string;
    contract_test: string;
  }>;
  shared_loader: string;
  integration_test: string;
  stable_reference_fixture: string;
};

type ReferenceFixture = {
  quest: {
    slug: string;
    fixture_id: string;
    title: string;
    primary_domain: string;
    primary_skill: string;
    secondary_skills: string[];
    concepts: string[];
    tonal_center_pitch_class: string;
    objective_metrics: string[];
    target_tempo_bpm: number;
    required_practice_seconds: number;
  };
  taxonomy_references: Array<{ kind: string; slug: string }>;
  difficulty: {
    absolute_profile_quest_slug: string;
    expected_overall_level: string;
    personal_evaluation_ids: string[];
  };
  evidence: {
    clear_result_id: string;
    partial_result_id: string;
  };
  progression: {
    xp_model_version: string;
    clear_result_expected_xp: number;
    mastery_from_single_clear: boolean;
  };
};

const taxonomy = loadJson<TaxonomyManifest>(contractPaths.taxonomy);
const player = loadJson<PlayerContract>(contractPaths.player);
const questContract = loadJson<QuestContract>(contractPaths.quest);
const quests = loadJson<QuestFixture[]>(contractPaths.questFixtures);
const difficulty = loadJson<DifficultyContract>(contractPaths.difficulty);
const difficultyFixtures = loadJson<DifficultyFixtures>(contractPaths.difficultyFixtures);
const evidence = loadJson<EvidenceContract>(contractPaths.evidence);
const evidenceFixtures = loadJson<EvidenceFixtures>(contractPaths.evidenceFixtures);
const progression = loadJson<ProgressionContract>(contractPaths.progression);
const manifest = loadJson<FrameworkManifest>(contractPaths.frameworkManifest);
const reference = loadJson<ReferenceFixture>(contractPaths.referenceFixture);

describe("REL-001 Phase 0 contract integration", () => {
  it("declares only repository artifacts and tests that exist", () => {
    for (const item of manifest.semantic_contracts) {
      expect(existsSync(resolve(repoRoot, item.artifact)), item.ticket).toBe(true);
      expect(existsSync(resolve(repoRoot, item.contract_test)), item.ticket).toBe(true);

      if (item.fixture) {
        expect(existsSync(resolve(repoRoot, item.fixture)), item.ticket).toBe(true);
      }
    }

    expect(existsSync(resolve(repoRoot, manifest.shared_loader))).toBe(true);
    expect(existsSync(resolve(repoRoot, manifest.integration_test))).toBe(true);
    expect(existsSync(resolve(repoRoot, manifest.stable_reference_fixture))).toBe(true);
  });

  it("keeps shared Level, readiness, Attribute, and verification enums aligned", () => {
    const absoluteLevels = Object.keys(difficulty.absolute_levels);
    const progressionLevels = Object.keys(progression.proficiency.bands);

    expect(player.visible_skill_levels).toEqual(questContract.difficulty_levels);
    expect(player.visible_skill_levels).toEqual(absoluteLevels);
    expect(player.visible_skill_levels).toEqual(progressionLevels);
    expect(player.readiness_statuses).toEqual(progression.readiness.statuses);
    expect(player.attribute_statuses).toEqual(progression.attributes.statuses);
    expect(questContract.verification_modes).toEqual(evidence.verification_modes);
  });

  it("resolves every difficulty and evidence Quest reference", () => {
    const questSlugs = new Set(quests.map((quest) => quest.identity.slug));

    for (const profile of difficultyFixtures.absolute_profiles) {
      expect(questSlugs.has(profile.quest_slug), profile.quest_slug).toBe(true);
    }

    for (const evaluation of difficultyFixtures.personal_evaluations) {
      expect(questSlugs.has(evaluation.quest_slug), evaluation.id).toBe(true);
    }

    for (const result of evidenceFixtures.results) {
      expect(questSlugs.has(result.quest_slug), result.id).toBe(true);
    }
  });

  it("keeps Result criteria and verification modes compatible with each Quest", () => {
    const questBySlug = new Map(quests.map((quest) => [quest.identity.slug, quest]));

    for (const result of evidenceFixtures.results) {
      const quest = questBySlug.get(result.quest_slug);
      expect(quest, result.id).toBeDefined();

      const objectiveMetrics = new Set(
        quest?.objective.criteria.map((criterion) => criterion.metric) ?? [],
      );
      expect([...result.required_criteria].sort(), result.id).toEqual([...objectiveMetrics].sort());

      for (const item of result.evidence) {
        if (result.required_criteria.includes(item.criterion)) {
          expect(
            quest?.verification_profile.allowed_modes,
            `${result.id}:${item.verification_mode}`,
          ).toContain(item.verification_mode);
        }
      }
    }
  });

  it("keeps DORIAN CROSSROADS stable across taxonomy, Quest, and difficulty", () => {
    const quest = quests.find((item) => item.identity.slug === reference.quest.slug);
    const profile = difficultyFixtures.absolute_profiles.find(
      (item) => item.quest_slug === reference.difficulty.absolute_profile_quest_slug,
    );

    expect(quest?.identity.id).toBe(reference.quest.fixture_id);
    expect(quest?.identity.title).toBe(reference.quest.title);
    expect(quest?.purpose.primary_domain).toBe(reference.quest.primary_domain);
    expect(quest?.execution.primary_skill.slug).toBe(reference.quest.primary_skill);
    expect(quest?.execution.secondary_skills.map((item) => item.slug)).toEqual(
      reference.quest.secondary_skills,
    );
    expect(quest?.concepts.map((item) => item.slug)).toEqual(reference.quest.concepts);
    expect(quest?.musical_context.tonal_center?.pitch_class).toBe(
      reference.quest.tonal_center_pitch_class,
    );

    const criteria = new Map(
      quest?.objective.criteria.map((criterion) => [criterion.metric, criterion.value]) ?? [],
    );
    expect([...criteria.keys()]).toEqual(reference.quest.objective_metrics);
    expect(criteria.get("target_tempo")).toBe(reference.quest.target_tempo_bpm);
    expect(criteria.get("practice_duration")).toBe(reference.quest.required_practice_seconds);

    expect(profile?.overall.level).toBe(reference.difficulty.expected_overall_level);
  });

  it("resolves DORIAN CROSSROADS taxonomy references to canonical normalized targets", () => {
    const targetKeys = new Set(
      taxonomy.entries.flatMap((entry) =>
        entry.targets.map((target) => `${target.kind}:${target.slug}`),
      ),
    );

    for (const target of reference.taxonomy_references) {
      expect(targetKeys.has(`${target.kind}:${target.slug}`), target.slug).toBe(true);
    }
  });

  it("preserves every declared DORIAN personal-difficulty reference", () => {
    const ids = new Set(difficultyFixtures.personal_evaluations.map((item) => item.id));

    for (const id of reference.difficulty.personal_evaluation_ids) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("flows the stable DORIAN clear Result into XP_V1 without embedding progression", () => {
    const quest = quests.find((item) => item.identity.slug === reference.quest.slug);
    const result = evidenceFixtures.results.find(
      (item) => item.id === reference.evidence.clear_result_id,
    );

    expect(result?.quest_slug).toBe(reference.quest.slug);
    expect(result?.outcome).toBe("CLEARED");
    expect(progression.model_versions.xp).toBe(reference.progression.xp_model_version);

    const durationEvidence = result?.evidence.find(
      (item) => item.criterion === "practice_duration",
    );
    expect(typeof durationEvidence?.observed_or_asserted_value).toBe("number");

    const completedMinutes = Math.floor(Number(durationEvidence?.observed_or_asserted_value) / 60);
    const xp =
      completedMinutes * progression.xp_policy.practice_xp_per_completed_minute +
      progression.xp_policy.outcome_bonus[result?.outcome ?? "ABANDONED"];

    expect(xp).toBe(reference.progression.clear_result_expected_xp);
    expect(reference.progression.mastery_from_single_clear).toBe(false);
    expect(quest?.rewards.progression_effects_embedded).toBe(false);
    expect(evidence.invariants.result_embeds_xp_mutation).toBe(false);
    expect(evidence.invariants.result_embeds_proficiency_mutation).toBe(false);
  });

  it("keeps the major cross-contract anti-inflation invariants consistent", () => {
    expect(player.invariants.xp_can_directly_promote_skill).toBe(false);
    expect(progression.invariants.xp_directly_changes_skill_proficiency).toBe(false);

    expect(player.invariants.inactivity_can_directly_lower_proficiency).toBe(false);
    expect(difficulty.invariants.readiness_changes_historical_proficiency).toBe(false);
    expect(progression.readiness.inactivity_changes_proficiency).toBe(false);

    expect(evidence.invariants.self_can_support_clear).toBe(true);
    expect(progression.invariants.self_evidence_is_valid).toBe(true);
    expect(progression.invariants.one_clear_can_establish_mastery).toBe(false);
  });
});
