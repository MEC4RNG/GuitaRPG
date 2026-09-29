import taxonomy from "@/domain/taxonomy/canonical-taxonomy.json";
import type { GeneratorTemplate } from "./types";

export const GENERATOR_TEMPLATES: readonly GeneratorTemplate[] = [
  {
    id: "execution_grid_v1",
    domain: "technique",
    questTypes: ["TECHNIQUE", "PERFORMANCE"],
    primarySkills: ["hybrid_picking", "alternate_picking", "string_skipping"],
    concepts: ["dorian", "eighth_note_subdivision", "syncopation", "major_scale"],
    secondarySkills: ["scale_mapping", "syncopation_control"],
    requiredTechniques: ["alternate_picking", "hybrid_picking"],
    allowedConstraints: ["string_set", "fret_range", "target_tempo", "practice_duration"],
    defaultConstraints: [
      { slug: "string_set", parameters: { strings: [2, 3, 4, 5] } },
      { slug: "target_tempo", parameters: { bpm: 90 } },
    ],
    purpose: "DEVELOP_SKILL",
    objectiveKind: "SUSTAINED_PERFORMANCE",
  },
  {
    id: "fretboard_route_v1",
    domain: "fretboard",
    questTypes: ["EXPLORATION", "PERFORMANCE"],
    primarySkills: ["scale_mapping", "chord_inversion_navigation", "note_location"],
    concepts: ["major_scale", "dorian", "chord_inversion"],
    secondarySkills: ["modal_application", "arpeggio_sequencing"],
    requiredTechniques: [],
    allowedConstraints: ["fret_range", "string_set", "single_string_only"],
    defaultConstraints: [{ slug: "fret_range", parameters: { min: 3, max: 10 } }],
    purpose: "EXPLORE",
    objectiveKind: "POSITION_DISCOVERY",
  },
  {
    id: "theory_builder_v1",
    domain: "harmony_theory",
    questTypes: ["KNOWLEDGE", "CREATIVE"],
    primarySkills: ["triad_construction", "modal_application", "chord_substitution_application"],
    concepts: ["diatonic_harmony", "modal_interchange", "secondary_dominant"],
    secondarySkills: ["voice_leading"],
    requiredTechniques: [],
    allowedConstraints: ["time_limit", "response_count", "borrowed_chord_count"],
    defaultConstraints: [{ slug: "time_limit", parameters: { seconds: 120 } }],
    purpose: "ASSESS",
    objectiveKind: "CONSTRUCTION",
  },
  {
    id: "rhythm_lock_v1",
    domain: "rhythm",
    questTypes: ["PERFORMANCE", "TECHNIQUE"],
    primarySkills: ["syncopation_control", "odd_meter_fluency", "subdivision_control"],
    concepts: ["syncopation", "eighth_note_subdivision", "meter_7_8"],
    secondarySkills: ["alternate_picking"],
    requiredTechniques: [],
    allowedConstraints: ["target_tempo", "practice_duration"],
    defaultConstraints: [{ slug: "target_tempo", parameters: { bpm: 80 } }],
    purpose: "DEVELOP_SKILL",
    objectiveKind: "SUSTAINED_PERFORMANCE",
  },
  {
    id: "ear_prompt_v1",
    domain: "ear_musicianship",
    questTypes: ["KNOWLEDGE", "EXPLORATION"],
    primarySkills: ["interval_recognition", "scale_degree_recognition"],
    concepts: ["major_scale", "minor_pentatonic"],
    secondarySkills: [],
    requiredTechniques: [],
    allowedConstraints: ["prompt_count", "time_limit"],
    defaultConstraints: [{ slug: "prompt_count", parameters: { count: 10 } }],
    purpose: "ASSESS",
    objectiveKind: "IDENTIFICATION",
  },
  {
    id: "creative_counterpoint_v1",
    domain: "creativity_expression",
    questTypes: ["CREATIVE"],
    primarySkills: ["two_voice_independence"],
    concepts: ["counterpoint", "melody"],
    secondarySkills: ["counterpoint_application"],
    requiredTechniques: [],
    allowedConstraints: ["output_length", "variation_count", "pitch_count"],
    defaultConstraints: [{ slug: "output_length", parameters: { bars: 4 } }],
    purpose: "CREATE",
    objectiveKind: "CREATIVE_OUTPUT",
  },
] as const;

type Entity = (typeof taxonomy.entities)[number];
const domainBySkill = new Map<string, string>();
const byId = new Map(taxonomy.entities.map((entity) => [entity.id, entity]));
for (const relationship of taxonomy.relationships) {
  if (relationship.relationship_type !== "BELONGS_TO") continue;
  const source = byId.get(relationship.source_entity_id);
  const target = byId.get(relationship.target_entity_id);
  if (source?.kind === "SKILL" && target?.kind === "DOMAIN")
    domainBySkill.set(source.slug, target.slug);
}

export function activeEntity(slug: string, kind: Entity["kind"]): Entity | undefined {
  return taxonomy.entities.find(
    (entity) => entity.slug === slug && entity.kind === kind && entity.lifecycle === "ACTIVE",
  );
}

export function skillDomain(slug: string): string | undefined {
  return domainBySkill.get(slug);
}

export function validateGeneratorCatalog(): string[] {
  const errors: string[] = [];
  for (const template of GENERATOR_TEMPLATES) {
    if (!activeEntity(template.domain, "DOMAIN")) errors.push(`${template.id}: invalid Domain`);
    for (const skill of [
      ...template.primarySkills,
      ...template.secondarySkills,
      ...template.requiredTechniques,
    ]) {
      if (!activeEntity(skill, "SKILL")) errors.push(`${template.id}: invalid Skill ${skill}`);
    }
    for (const skill of template.primarySkills) {
      if (skillDomain(skill) !== template.domain)
        errors.push(`${template.id}: ${skill} Domain mismatch`);
    }
    for (const concept of template.concepts) {
      if (!activeEntity(concept, "CONCEPT"))
        errors.push(`${template.id}: invalid Concept ${concept}`);
    }
    for (const constraint of template.allowedConstraints) {
      if (!activeEntity(constraint, "CONSTRAINT"))
        errors.push(`${template.id}: invalid Constraint ${constraint}`);
    }
    if (
      !template.questTypes.length ||
      !template.primarySkills.length ||
      !template.concepts.length ||
      !template.defaultConstraints.length
    )
      errors.push(`${template.id}: impossible empty composition`);
  }
  return errors;
}
