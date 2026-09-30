import { characterLevelThresholdV1 } from "./xp-v1";

export const DOMAIN_ORDER = [
  "Technique",
  "Fretboard",
  "Harmony & Theory",
  "Rhythm",
  "Ear & Musicianship",
  "Creativity & Expression",
] as const;

export const ATTRIBUTE_GROUPS = {
  Physical: ["dexterity", "precision", "coordination", "control", "endurance"],
  Musical: ["fretboard", "rhythm", "theory", "ear", "creativity", "expression"],
} as const;

export type TaxonomyEntity = {
  id: string;
  kind: string;
  slug: string;
  display_name: string;
  lifecycle: string;
};

export type TaxonomyRelationship = {
  relationship_type: string;
  source_entity_id: string;
  target_entity_id: string;
};

export type CharacterStateRow = {
  practice_xp: number;
  character_level: number;
  total_practice_seconds: number;
  xp_model_version: string;
  character_model_version: string;
};

export type AttributeStateRow = {
  attribute_id: string;
  assessment_status: "UNASSESSED" | "ESTIMATED" | "ESTABLISHED";
  score: number | null;
};

export type SkillStateRow = {
  skill_id: string;
  assessment_status: "UNRATED" | "ESTIMATED" | "ESTABLISHED";
  visible_level: "I" | "II" | "III" | "IV" | "V" | null;
  proficiency_score: number | null;
  confidence_score: number;
  readiness_status: "UNKNOWN" | "LOW" | "MODERATE" | "HIGH";
  readiness_score: number | null;
  exposure_count: number;
  evidence_count: number;
  last_practiced_at: string | null;
  last_evidence_at: string | null;
};

export type CharacterProgress = {
  level: number;
  practiceXp: number;
  currentThreshold: number;
  nextThreshold: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
};

export type AttributeView = {
  id: string;
  slug: string;
  name: string;
  group: keyof typeof ATTRIBUTE_GROUPS;
  assessmentStatus: AttributeStateRow["assessment_status"];
  score: number | null;
};

export type CharacterProgressionView = {
  progress: CharacterProgress;
  totalPracticeSeconds: number;
  attributes: AttributeView[];
};

export type SkillView = {
  id: string;
  slug: string;
  name: string;
  domain: string;
  projectionAvailable: boolean;
  assessmentStatus: SkillStateRow["assessment_status"] | "UNAVAILABLE";
  visibleLevel: SkillStateRow["visible_level"];
  proficiencyScore: number | null;
  confidenceScore: number | null;
  readinessStatus: SkillStateRow["readiness_status"] | "UNAVAILABLE";
  readinessScore: number | null;
  exposureCount: number | null;
  evidenceCount: number | null;
  lastPracticedAt: string | null;
  lastEvidenceAt: string | null;
};

export type SkillFilters = {
  search: string;
  domain: string;
  assessment: "ALL" | SkillStateRow["assessment_status"];
};

export function calculateCharacterProgressV1(level: number, practiceXp: number): CharacterProgress {
  const currentThreshold = characterLevelThresholdV1(level);
  const nextThreshold = characterLevelThresholdV1(level + 1);
  const interval = nextThreshold - currentThreshold;
  const xpIntoLevel = Math.max(0, practiceXp - currentThreshold);
  return {
    level,
    practiceXp,
    currentThreshold,
    nextThreshold,
    xpIntoLevel,
    xpForNextLevel: interval,
    progressPercent: Math.min(100, Math.max(0, (xpIntoLevel / interval) * 100)),
  };
}

function attributeGroup(slug: string): keyof typeof ATTRIBUTE_GROUPS {
  return ATTRIBUTE_GROUPS.Physical.includes(slug as (typeof ATTRIBUTE_GROUPS.Physical)[number])
    ? "Physical"
    : "Musical";
}

export function buildCharacterProgressionView(input: {
  character: CharacterStateRow;
  attributeEntities: readonly TaxonomyEntity[];
  attributeStates: readonly AttributeStateRow[];
}): CharacterProgressionView {
  const states = new Map(input.attributeStates.map((state) => [state.attribute_id, state]));
  const attributes = input.attributeEntities
    .filter((entity) => entity.kind === "ATTRIBUTE" && entity.lifecycle === "ACTIVE")
    .map((entity): AttributeView => {
      const state = states.get(entity.id);
      return {
        id: entity.id,
        slug: entity.slug,
        name: entity.display_name,
        group: attributeGroup(entity.slug),
        assessmentStatus: state?.assessment_status ?? "UNASSESSED",
        score: state?.assessment_status === "UNASSESSED" ? null : (state?.score ?? null),
      };
    })
    .sort((left, right) => {
      const group = Object.keys(ATTRIBUTE_GROUPS) as (keyof typeof ATTRIBUTE_GROUPS)[];
      const groupDelta = group.indexOf(left.group) - group.indexOf(right.group);
      if (groupDelta) return groupDelta;
      const slugs = ATTRIBUTE_GROUPS[left.group] as readonly string[];
      return slugs.indexOf(left.slug) - slugs.indexOf(right.slug);
    });

  return {
    progress: calculateCharacterProgressV1(
      input.character.character_level,
      input.character.practice_xp,
    ),
    totalPracticeSeconds: input.character.total_practice_seconds,
    attributes,
  };
}

const ASSESSMENT_ORDER: Record<SkillView["assessmentStatus"], number> = {
  ESTABLISHED: 0,
  ESTIMATED: 1,
  UNRATED: 2,
  UNAVAILABLE: 3,
};

export function buildSkillsProgressionView(input: {
  skillEntities: readonly TaxonomyEntity[];
  domainEntities: readonly TaxonomyEntity[];
  relationships: readonly TaxonomyRelationship[];
  skillStates: readonly SkillStateRow[];
}): SkillView[] {
  const domains = new Map(input.domainEntities.map((domain) => [domain.id, domain.display_name]));
  const domainBySkill = new Map(
    input.relationships
      .filter((relationship) => relationship.relationship_type === "BELONGS_TO")
      .map((relationship) => [relationship.source_entity_id, relationship.target_entity_id]),
  );
  const states = new Map(input.skillStates.map((state) => [state.skill_id, state]));

  return input.skillEntities
    .filter((entity) => entity.kind === "SKILL" && entity.lifecycle === "ACTIVE")
    .map((entity): SkillView => {
      const state = states.get(entity.id);
      const domainId = domainBySkill.get(entity.id);
      return {
        id: entity.id,
        slug: entity.slug,
        name: entity.display_name,
        domain: (domainId && domains.get(domainId)) || "Domain unavailable",
        projectionAvailable: Boolean(state),
        assessmentStatus: state?.assessment_status ?? "UNAVAILABLE",
        visibleLevel: state?.visible_level ?? null,
        proficiencyScore: state?.proficiency_score ?? null,
        confidenceScore: state?.confidence_score ?? null,
        readinessStatus: state?.readiness_status ?? "UNAVAILABLE",
        readinessScore: state?.readiness_score ?? null,
        exposureCount: state?.exposure_count ?? null,
        evidenceCount: state?.evidence_count ?? null,
        lastPracticedAt: state?.last_practiced_at ?? null,
        lastEvidenceAt: state?.last_evidence_at ?? null,
      };
    })
    .sort(
      (left, right) =>
        DOMAIN_ORDER.indexOf(left.domain as (typeof DOMAIN_ORDER)[number]) -
          DOMAIN_ORDER.indexOf(right.domain as (typeof DOMAIN_ORDER)[number]) ||
        ASSESSMENT_ORDER[left.assessmentStatus] - ASSESSMENT_ORDER[right.assessmentStatus] ||
        left.name.localeCompare(right.name),
    );
}

export function filterSkills(skills: readonly SkillView[], filters: SkillFilters): SkillView[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return skills.filter(
    (skill) =>
      (!search || skill.name.toLocaleLowerCase().includes(search)) &&
      (filters.domain === "ALL" || skill.domain === filters.domain) &&
      (filters.assessment === "ALL" || skill.assessmentStatus === filters.assessment),
  );
}

export function groupSkillsByDomain(skills: readonly SkillView[]) {
  return DOMAIN_ORDER.map((domain) => ({
    domain,
    skills: skills.filter((skill) => skill.domain === domain),
  })).filter((group) => group.skills.length > 0);
}

export function formatPracticeDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes}m`;
  return "0m";
}

export function formatRecency(value: string | null, emptyLabel: string, now = Date.now()) {
  if (!value) return emptyLabel;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return emptyLabel;
  const days = Math.max(0, Math.floor((now - timestamp) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(timestamp));
}
