import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const repoRoot = resolve(import.meta.dirname, "../..");

export function loadJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8")) as T;
}

export const contractPaths = {
  taxonomy: "domain/taxonomy/legacy-normalization.json",
  player: "domain/player/player-state-contract.json",
  quest: "domain/quest/quest-contract.json",
  questFixtures: "domain/quest/phase0-quest-fixtures.json",
  difficulty: "domain/difficulty/difficulty-contract.json",
  difficultyFixtures: "domain/difficulty/phase0-difficulty-fixtures.json",
  evidence: "domain/evidence/evidence-contract.json",
  evidenceFixtures: "domain/evidence/phase0-evidence-fixtures.json",
  progression: "domain/progression/progression-contract.json",
  progressionFixtures: "domain/progression/phase0-progression-fixtures.json",
  frameworkManifest: "domain/contracts/phase0-contract-manifest.json",
  referenceFixture: "domain/contracts/phase0-reference-fixture.json",
} as const;
