import { describe, expect, it, vi } from "vitest";

import { chooseHomeAction, pickHomeCodexEntry, readHomeOverview } from "@/lib/ux/home-overview";
import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";
import { generateQuickQuest } from "@/lib/quest/generator";
import { dailyChallengeSeed } from "@/lib/quest/generator/daily-preview";
import { useStudioAtlasShellPreview } from "@/lib/ux/studio-atlas-preview";

describe("Studio Atlas F2 Home", () => {
  it("never activates the new global shell on production", () => {
    expect(
      useStudioAtlasShellPreview({
        VERCEL_ENV: "production",
        STUDIO_ATLAS_PREVIEW_ENABLED: "true",
      }),
    ).toBe(false);
    expect(useStudioAtlasShellPreview({ VERCEL_ENV: "preview" })).toBe(true);
    expect(
      useStudioAtlasShellPreview({ NODE_ENV: "production", STUDIO_ATLAS_PREVIEW_ENABLED: "true" }),
    ).toBe(false);
  });

  it("prioritizes an open Session over a Quest or Quick Quest", () => {
    const quest = {
      id: "quest",
      title: "Study",
      stage: "EXPLORE" as const,
      skill: "Ear training",
      active: true,
    };
    expect(
      chooseHomeAction({ id: "session", status: "PAUSED", title: "Practice" }, quest),
    ).toMatchObject({
      kind: "session",
      href: "/session/session",
      label: "Resume Session",
      detail: "Practice paused",
    });
    expect(chooseHomeAction(null, quest)).toMatchObject({
      kind: "quest",
      href: "/quest/quest",
      label: "Continue in Explore",
    });
    expect(chooseHomeAction(null, { ...quest, active: false }).label).toBe("Open saved Quest");
    expect(chooseHomeAction(null, null)).toMatchObject({ kind: "quick", href: "/generate" });
  });

  it("does not initialize a Player or read private records for signed-out visitors", async () => {
    const from = vi.fn();
    const rpc = vi.fn();
    const client = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: null },
          error: { name: "AuthSessionMissingError" },
        })),
      },
      from,
      rpc,
    } as unknown as Parameters<typeof readHomeOverview>[0];
    await expect(readHomeOverview(client)).resolves.toEqual({ kind: "visitor" });
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not confuse a failed identity verification with a signed-out visitor", async () => {
    const from = vi.fn();
    const client = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: null },
          error: { name: "AuthRetryableFetchError" },
        })),
      },
      from,
    } as unknown as Parameters<typeof readHomeOverview>[0];
    await expect(readHomeOverview(client)).rejects.toThrow("Identity unavailable");
    expect(from).not.toHaveBeenCalled();
  });
});

describe("F2-R1 discovery modules", () => {
  it("selects a published Skill or Concept reference with its canonical route", () => {
    for (const sample of [0, 0.5, 0.999]) {
      const entry = pickHomeCodexEntry(sample);
      expect(["SKILL", "CONCEPT"]).toContain(entry.kind);
      expect(CODEX_ENTRIES.find((item) => item.href === entry.href)).toMatchObject(entry);
    }
  });

  it("rotates the challenge seed by UTC date and reuses the canonical one-Skill Quick Quest", () => {
    const seed = dailyChallengeSeed(new Date("2026-11-27T00:00:00Z"));
    expect(dailyChallengeSeed(new Date("2026-11-27T23:59:59Z"))).toBe(seed);
    expect(dailyChallengeSeed(new Date("2026-11-28T00:00:00Z"))).not.toBe(seed);
    const a = generateQuickQuest({ seed }).quest;
    const b = generateQuickQuest({ seed }).quest;
    expect(a.identity.title).toBe(b.identity.title);
    expect(a.identity.id).not.toBe(b.identity.id);
    expect(a.execution).toEqual(b.execution);
    expect(a.execution.secondary_skills).toEqual([]);
    expect(a.execution.required_techniques).toEqual([]);
    expect(a.execution.estimated_minutes).toBe(10);
    expect(a.purpose.generation_mode).toBe("QUICK");
  });
});
