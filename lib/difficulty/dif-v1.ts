import {
  criterionNumberValue,
  extractDifficultyFeatures,
  featureNumber,
  type DifficultyFeatures,
} from "./features";
import {
  DIFFICULTY_DIMENSIONS,
  type AbsoluteDifficultyProfile,
  type DifficultyBasis,
  type DifficultyDimension,
  type DifficultyLevel,
  type DimensionEvaluation,
} from "./types";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function levelForScore(score: number): DifficultyLevel {
  const value = clamp(score);
  if (value < 20) return "I";
  if (value < 40) return "II";
  if (value < 60) return "III";
  if (value < 80) return "IV";
  return "V";
}

const basis = (code: string, contribution: number, detail?: string | number | boolean) => ({
  code,
  contribution,
  ...(detail === undefined ? {} : { detail }),
});

function applicable(items: DifficultyBasis[]): DimensionEvaluation {
  const score = clamp(items.reduce((total, item) => total + item.contribution, 0));
  return { applicable: true, score, level: levelForScore(score), basis: items };
}

function notApplicable(code: string): DimensionEvaluation {
  return { applicable: false, score: null, level: null, basis: [basis(code, 0)] };
}

function technique(f: DifficultyFeatures): DimensionEvaluation {
  if (f.questType === "KNOWLEDGE" && f.primaryDomain !== "fretboard")
    return notApplicable("no_physical_execution_requirement");

  if (f.primaryDomain === "technique") {
    const items = [basis("technique_quest_execution", 20)];
    if (f.stringCount) items.push(basis("string_traversal", f.stringCount * 4, f.stringCount));
    if (f.objectiveKind === "CLEAN_REPETITIONS") items.push(basis("clean_repetition_control", 5));
    if (f.conceptSlugs.has("syncopation")) items.push(basis("syncopated_execution", 7));
    if (f.conceptSlugs.has("eighth_note_subdivision"))
      items.push(basis("subdivision_execution", 5));
    items.push(
      basis("supporting_skill_coordination", f.quest.execution.secondary_skills.length * 4),
    );
    return applicable(items);
  }

  if (f.primaryDomain === "fretboard" && f.questType === "EXPLORATION") {
    const positions = criterionNumberValue(f, "distinct_positions") ?? 0;
    return applicable([
      basis("exploration_execution", 8),
      basis("played_position_discovery", positions, positions),
    ]);
  }

  if (f.conceptSlugs.has("metric_modulation"))
    return applicable([
      basis("performance_execution", 14),
      basis("pulse_transition_coordination", 18),
    ]);

  if (f.questType === "CREATIVE")
    return applicable([
      basis("creative_output_execution", 8),
      basis("independent_output_execution", Math.min(8, Math.max(1, f.outputCount ?? 1) + 1)),
    ]);

  if (["PERFORMANCE", "TECHNIQUE"].includes(f.questType))
    return applicable([basis("physical_performance", 14)]);

  return notApplicable("no_physical_execution_requirement");
}

function fretboard(f: DifficultyFeatures): DimensionEvaluation {
  if (f.primaryDomain === "fretboard") {
    const positions = criterionNumberValue(f, "distinct_positions") ?? 0;
    const items = [basis("primary_fretboard_navigation", 15)];
    if (f.fretSpan !== undefined) items.push(basis("fret_span", f.fretSpan, f.fretSpan));
    if (positions) items.push(basis("distinct_positions", Math.min(10, positions + 4), positions));
    return applicable(items);
  }

  if (f.skillDomains.has("fretboard")) {
    const items = [basis("supporting_fretboard_skill", 10)];
    if (f.stringCount)
      items.push(basis("multi_string_navigation", f.stringCount * 3, f.stringCount));
    if (f.fretSpan !== undefined) items.push(basis("fret_span", f.fretSpan * 2, f.fretSpan));
    if (f.skillSlugs.has("scale_mapping")) items.push(basis("scale_mapping", 8));
    if ((f.quest as Record<string, unknown>).musical_context)
      items.push(basis("resolved_tonal_navigation", 4));
    return applicable(items);
  }

  if (f.stringCount)
    return applicable([basis("fixed_string_set", f.stringCount * 5, f.stringCount)]);

  const sourceNotes = featureNumber(f, "source_note_count", "max");
  if (f.questType === "CREATIVE" && sourceNotes !== undefined)
    return applicable([
      basis("creative_material_navigation", 10),
      basis("source_note_space", sourceNotes * 2, sourceNotes),
    ]);

  return notApplicable("no_fretboard_navigation_requirement");
}

function theory(f: DifficultyFeatures): DimensionEvaluation {
  if (f.conceptSlugs.has("metric_modulation"))
    return applicable([
      basis("metric_modulation_understanding", 40),
      basis("applied_performance_reasoning", 8),
    ]);
  if (f.conceptSlugs.has("dorian"))
    return applicable([
      basis("modal_application", 22),
      basis("resolved_tonal_center", 4),
      basis("applied_material", 8),
    ]);
  if (f.conceptSlugs.has("chord_inversion"))
    return applicable([
      basis("inversion_knowledge", 15),
      basis("triad_structure", f.conceptSlugs.has("major_triad") ? 10 : 6),
    ]);
  if (f.primaryDomain === "harmony_theory")
    return applicable([
      basis("primary_theory_domain", 14),
      basis("concept_load", f.conceptSlugs.size * 7, f.conceptSlugs.size),
      basis("construction_reasoning", f.objectiveKind === "CONSTRUCTION" ? 8 : 4),
    ]);
  if (f.conceptSlugs.has("interval"))
    return applicable([basis("interval_categories", 15), basis("identification_reasoning", 8)]);
  if (f.questType === "CREATIVE")
    return applicable([basis("musical_material", 8), basis("generative_application", 8)]);
  return notApplicable("no_theory_requirement");
}

function rhythm(f: DifficultyFeatures): DimensionEvaluation {
  if (f.conceptSlugs.has("metric_modulation")) {
    const transitions = criterionNumberValue(f, "successful_transitions") ?? 0;
    return applicable([
      basis("metric_modulation", 70),
      basis("pulse_transitions", transitions * 4, transitions),
      basis("continuous_performance", 3),
    ]);
  }
  if (f.conceptSlugs.has("syncopation") && f.conceptSlugs.has("eighth_note_subdivision"))
    return applicable([
      basis("syncopation", 25),
      basis("eighth_note_grid", 12),
      basis("supporting_rhythm_skill", f.skillDomains.has("rhythm") ? 10 : 0),
      basis("explicit_meter", f.meter ? 5 : 0, f.meter),
    ]);
  if (f.conceptSlugs.has("eighth_note_subdivision"))
    return applicable([
      basis("eighth_note_grid", 12),
      basis("clean_cycle_consistency", f.objectiveKind === "CLEAN_REPETITIONS" ? 8 : 4),
      basis("paced_execution", f.targetBpm === undefined ? 0 : 9, f.targetBpm),
    ]);
  if (f.questType === "CREATIVE") return applicable([basis("open_rhythmic_organization", 15)]);
  if (f.primaryDomain === "rhythm") return applicable([basis("primary_rhythm_domain", 30)]);
  return notApplicable("no_rhythmic_requirement");
}

function creative(f: DifficultyFeatures): DimensionEvaluation {
  if (f.objectiveKind !== "CREATIVE_OUTPUT" && f.questType !== "CREATIVE")
    return notApplicable("no_generative_requirement");
  const outputs = Math.max(1, f.outputCount ?? 1);
  return applicable([
    basis("independent_generation", 30),
    basis("required_outputs", Math.min(30, outputs * 8), outputs),
  ]);
}

function tempo(f: DifficultyFeatures): DimensionEvaluation {
  if (f.conceptSlugs.has("metric_modulation"))
    return applicable([basis("maintain_and_reinterpret_pulse", 44)]);
  if (f.targetBpm !== undefined) {
    const items = [basis("target_bpm", f.targetBpm * 0.2, f.targetBpm)];
    if (f.primarySkill === "hybrid_picking") items.push(basis("hybrid_execution_pace", 10));
    if (f.primarySkill === "alternate_picking") items.push(basis("alternate_execution_pace", 8));
    if (f.stringCount)
      items.push(basis("paced_string_traversal", f.stringCount * 2, f.stringCount));
    if (f.conceptSlugs.has("syncopation")) items.push(basis("syncopated_pace", 5));
    if (f.conceptSlugs.has("eighth_note_subdivision")) items.push(basis("subdivision_pace", 4));
    if (f.objectiveKind === "CLEAN_REPETITIONS") items.push(basis("repetition_pace", 7));
    return applicable(items);
  }
  if (f.timeLimitSeconds !== undefined)
    return applicable([
      basis("timed_response", 40),
      basis("response_window", -f.timeLimitSeconds / 15, f.timeLimitSeconds),
    ]);
  const promptCount = featureNumber(f, "prompt_count", "count");
  if (f.objectiveKind === "IDENTIFICATION" && promptCount !== undefined)
    return applicable([
      basis("prompt_sequence_pacing", 6),
      basis("prompt_count", promptCount, promptCount),
    ]);
  return notApplicable("no_target_pace");
}

function constraint(f: DifficultyFeatures): DimensionEvaluation {
  const items: DifficultyBasis[] = [];
  const count = f.constraints.size;
  for (const [slug] of f.constraints) {
    if (slug === "string_set") items.push(basis("restricted_string_set", 10));
    else if (slug === "fret_range") items.push(basis("bounded_fret_range", 14));
    else if (slug === "target_tempo") items.push(basis("target_tempo_restriction", 10));
    else if (slug === "time_limit") items.push(basis("time_limit", 14));
    else if (slug === "modulation_count") items.push(basis("metric_transition_restriction", 43));
    else if (slug === "source_note_count") items.push(basis("source_material_limit", 12));
    else if (slug === "variation_count") items.push(basis("variation_requirement", 13));
    else if (slug === "prompt_count") items.push(basis("prompt_set", 13));
    else items.push(basis(`constraint:${slug}`, 10));
  }
  if (count > 1) items.push(basis("simultaneous_constraint_interaction", (count - 1) * 5));
  if (f.primarySkill === "hybrid_picking") items.push(basis("execution_constraint_interaction", 7));
  if (f.objectiveKind === "CLEAN_REPETITIONS") items.push(basis("clean_cycle_threshold", 3));
  if (f.objectiveKind === "CONSTRUCTION") items.push(basis("answer_threshold", 8));
  const positions = criterionNumberValue(f, "distinct_positions");
  if (positions) items.push(basis("position_count", Math.min(10, positions + 4), positions));
  const transitions = criterionNumberValue(f, "successful_transitions");
  if (transitions) items.push(basis("transition_count", transitions * 5, transitions));
  if (f.objectiveKind === "CREATIVE_OUTPUT" && count > 1)
    items.push(basis("creative_restriction_interaction", 5));
  const correct = criterionNumberValue(f, "correct_answers");
  const total = criterionNumberValue(f, "total_prompts");
  if (correct && total) items.push(basis("accuracy_threshold", Math.round((correct / total) * 16)));
  return applicable(items);
}

const scorers: Record<DifficultyDimension, (features: DifficultyFeatures) => DimensionEvaluation> =
  {
    TECHNIQUE: technique,
    FRETBOARD: fretboard,
    THEORY: theory,
    RHYTHM: rhythm,
    CREATIVE: creative,
    TEMPO: tempo,
    CONSTRAINT: constraint,
  };

const BOTTLENECK_COEFFICIENT: Record<DifficultyFeatures["questType"], number> = {
  TECHNIQUE: 0.7,
  KNOWLEDGE: 0.85,
  EXPLORATION: 0.92,
  PERFORMANCE: 0.82,
  CREATIVE: 0.45,
};

function aggregateOverall(
  features: DifficultyFeatures,
  dimensions: AbsoluteDifficultyProfile["dimensions"],
) {
  const scores = DIFFICULTY_DIMENSIONS.flatMap((dimension) => {
    const value = dimensions[dimension];
    return value.applicable ? [value.score] : [];
  });
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const maximum = Math.max(...scores);
  const coefficient = BOTTLENECK_COEFFICIENT[features.questType];
  const promptLoad =
    features.questType === "KNOWLEDGE" &&
    features.objectiveKind === "IDENTIFICATION" &&
    (featureNumber(features, "prompt_count", "count") ?? 0) >= 10
      ? 6
      : 0;
  const score = clamp(mean + coefficient * (maximum - mean) + promptLoad);
  return {
    score,
    level: levelForScore(score),
    basis: [
      basis("applicable_dimension_mean", Number(mean.toFixed(2))),
      basis("quest_type_bottleneck_lift", Number((coefficient * (maximum - mean)).toFixed(2))),
      ...(promptLoad ? [basis("prompt_set_load", promptLoad)] : []),
    ],
  };
}

export function evaluateAbsoluteQuestDemand(input: unknown): AbsoluteDifficultyProfile {
  const features = extractDifficultyFeatures(input);
  const dimensions = Object.fromEntries(
    DIFFICULTY_DIMENSIONS.map((dimension) => [dimension, scorers[dimension](features)]),
  ) as AbsoluteDifficultyProfile["dimensions"];

  return {
    model_version: "DIF_V1",
    source: "COMPUTED",
    dimensions,
    overall: aggregateOverall(features, dimensions),
  };
}
