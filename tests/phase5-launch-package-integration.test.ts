import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import taxonomy from "@/domain/taxonomy/canonical-taxonomy.json";
import { CODEX_ENTRIES, getCodexEntry, searchCodex } from "@/lib/codex/catalog-v1";
import { saveProfileSnapshot, type ProfileClient } from "@/lib/profile/repository";
import { questCodexReferences, resolveCodexReference } from "@/lib/quest/codex-references";
import { generateCustomQuest } from "@/lib/quest/generator";
import { toQuestPersistenceInput } from "@/lib/quest/runtime";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("REL-005 Phase 5 launch package integration", () => {
  it("keeps the launch shell truthful and Settings absent", () => {
    const shell = [
      read("app/page.tsx"),
      read("components/sidebar.tsx"),
      read("components/app-shell.tsx"),
      read("lib/navigation.ts"),
    ].join("\n");
    for (const route of [
      "/generate",
      "/training",
      "/character",
      "/skills",
      "/history",
      "/codex",
      "/profile",
    ])
      expect(shell).toContain(route);
    expect(shell).not.toContain('href="/settings"');
    expect(() => read("app/settings/page.tsx")).toThrow();
    expect(shell).not.toMatch(/PHASE 1|Foundation online|Phase 0 contracts locked|v1 foundation/);
  });

  it("joins all active Codex content to canonical taxonomy without private state", () => {
    expect(CODEX_ENTRIES).toHaveLength(197);
    expect(
      Object.fromEntries(
        ["SKILL", "CONCEPT", "CONTEXT", "CONSTRAINT"].map((kind) => [
          kind,
          CODEX_ENTRIES.filter((entry) => entry.kind === kind).length,
        ]),
      ),
    ).toEqual({ SKILL: 72, CONCEPT: 64, CONTEXT: 31, CONSTRAINT: 30 });
    expect(searchCodex("Barre Chords").map((entry) => entry.slug)).toContain(
      "barre_chord_fretting",
    );
    expect(getCodexEntry("concepts", "dorian")?.kind).toBe("CONCEPT");
    expect(getCodexEntry("skills", "dorian")).toBeNull();
    expect(read("lib/codex/catalog-v1.ts")).not.toMatch(/supabase|service.role/i);
    expect(taxonomy.entities).toHaveLength(216);
  });

  it("keeps Profile save atomic, owner-derived, and progression-neutral", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    await saveProfileSnapshot({ rpc } as unknown as ProfileClient, {
      displayName: "Player",
      experienceBackground: "SOME_EXPERIENCE",
      typicalSessionMinutes: 30,
      challengePreference: "PUSH_ME",
      defaultTuningContextId: "40000000-0000-4000-8000-000000000030",
      goals: [
        {
          id: null,
          kind: "SKILL",
          targetId: "20000000-0000-4000-8000-000000000001",
          objective: "",
        },
        {
          id: null,
          kind: "DOMAIN",
          targetId: "10000000-0000-4000-8000-000000000001",
          objective: "",
        },
        { id: null, kind: "OBJECTIVE", targetId: null, objective: "Use a metronome" },
      ],
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    const payload = rpc.mock.calls[0]?.[1] as Record<string, unknown>;
    for (const key of [
      "player_id",
      "priority",
      "xp",
      "proficiency",
      "confidence",
      "readiness",
      "attributes",
    ])
      expect(payload).not.toHaveProperty(key);
    expect(read("components/profile-surface.tsx")).not.toMatch(
      /name=["']priority|Priority.*input/i,
    );
  });

  it("derives complete Quest links without persisting Codex data", () => {
    const quest = generateCustomQuest({
      seed: "rel-005",
      primary_skill: "hybrid_picking",
      concepts: ["dorian"],
      tuning: "dadgad",
      tonal_center: "E",
      target_tempo_bpm: 90,
    }).quest;
    const refs = questCodexReferences(quest);
    expect(refs.primarySkill.href).toBe("/codex/skills/hybrid_picking");
    expect(refs.concepts[0]?.href).toBe("/codex/concepts/dorian");
    expect(refs.constraints.every((item) => item.href?.startsWith("/codex/constraints/"))).toBe(
      true,
    );
    expect(refs.contexts.find((item) => item.slug === "dadgad")?.href).toBe(
      "/codex/contexts/dadgad",
    );
    expect(refs.contexts.find((item) => item.slug === "tonal_center")?.parameter).toBe("E");
    expect(
      resolveCodexReference("SKILL", { slug: "retired", name: "Historical Name" }, "primary"),
    ).toMatchObject({ name: "Historical Name", href: null });
    expect(JSON.stringify(toQuestPersistenceInput(quest))).not.toMatch(
      /\/codex\/|definition|legacySearchTerms/,
    );
  });

  it("uses the persisted Session snapshot without changing controls", () => {
    const source = read("components/session-practice-surface.tsx");
    expect(source).toContain('select("title,resolved_snapshot")');
    expect(source).toContain("parseQuest(questResponse.data.resolved_snapshot)");
    for (const behavior of [
      "Pause",
      "Resume",
      "End Session",
      "+1 rep",
      "Start metronome",
      "Record Result",
    ])
      expect(source).toContain(behavior);
    expect(source).not.toContain("generateQuickQuest");
  });

  it("keeps Phase 5 public reads and reference resolution write-free", () => {
    for (const path of [
      "lib/codex/catalog-v1.ts",
      "lib/quest/codex-references.ts",
      "components/quest-codex-reference.tsx",
    ]) {
      expect(read(path)).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
    }
  });
});
