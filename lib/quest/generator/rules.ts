import type { ConstraintRequest } from "./types";
import { QuestGenerationError } from "./types";

export const PARAMETER_BOUNDS = {
  estimatedMinutes: { min: 1, max: 120 },
  tempoBpm: { min: 30, max: 240 },
  fret: { min: 0, max: 24 },
  string: { min: 1, max: 6 },
  count: { min: 1, max: 64 },
  seconds: { min: 5, max: 3600 },
  bars: { min: 1, max: 64 },
} as const;

const finiteInteger = (value: unknown, min: number, max: number, label: string): number => {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max)
    throw new QuestGenerationError(
      "INVALID_PARAMETER",
      `${label} must be an integer from ${min} to ${max}`,
      { value },
    );
  return Number(value);
};

export function validateEstimatedMinutes(value: number): number {
  return finiteInteger(
    value,
    PARAMETER_BOUNDS.estimatedMinutes.min,
    PARAMETER_BOUNDS.estimatedMinutes.max,
    "estimated_minutes",
  );
}

export function validateConstraints(input: ConstraintRequest[]): ConstraintRequest[] {
  if (input.length < 1 || input.length > 3)
    throw new QuestGenerationError(
      "INVALID_CONSTRAINT_COUNT",
      "Quest requires one to three Constraints",
    );
  const seen = new Set<string>();
  const result = input.map(({ slug, parameters = {} }) => {
    if (seen.has(slug))
      throw new QuestGenerationError("DUPLICATE_CONSTRAINT", `Constraint ${slug} is duplicated`);
    seen.add(slug);
    const p = { ...parameters };
    if (slug === "string_set") {
      if (!Array.isArray(p.strings) || !p.strings.length)
        throw new QuestGenerationError("INVALID_PARAMETER", "string_set requires strings");
      p.strings = [
        ...new Set(p.strings.map((value) => finiteInteger(value, 1, 6, "string"))),
      ].sort();
    } else if (slug === "fret_range") {
      const min = finiteInteger(p.min, 0, 24, "fret_range.min");
      const max = finiteInteger(p.max, 0, 24, "fret_range.max");
      if (min > max)
        throw new QuestGenerationError("INVALID_PARAMETER", "fret_range.min must not exceed max");
      p.min = min;
      p.max = max;
    } else if (slug === "target_tempo") p.bpm = finiteInteger(p.bpm, 30, 240, "target_tempo.bpm");
    else if (slug === "time_limit" || slug === "practice_duration")
      p.seconds = finiteInteger(p.seconds, 5, 3600, `${slug}.seconds`);
    else if (
      [
        "prompt_count",
        "response_count",
        "borrowed_chord_count",
        "variation_count",
        "pitch_count",
      ].includes(slug)
    )
      p.count = finiteInteger(p.count, 1, 64, `${slug}.count`);
    else if (slug === "output_length") p.bars = finiteInteger(p.bars, 1, 64, "output_length.bars");
    else if (
      ["single_string_only", "non_adjacent_strings_only"].includes(slug) &&
      Object.keys(p).length
    )
      throw new QuestGenerationError("INVALID_PARAMETER", `${slug} accepts no parameters`);
    return { slug, parameters: p };
  });
  const stringSet = result.find((item) => item.slug === "string_set")?.parameters?.strings;
  if (seen.has("single_string_only") && Array.isArray(stringSet) && stringSet.length !== 1)
    throw new QuestGenerationError(
      "INCOMPATIBLE_CONSTRAINTS",
      "single_string_only conflicts with a multi-string string_set",
    );
  return result;
}

export function seeded(seed: string | number) {
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export const choose = <T>(items: readonly T[], random: () => number): T =>
  items[Math.floor(random() * items.length)]!;
