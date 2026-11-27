import { describe, expect, it, vi } from "vitest";

import { chooseHomeAction, readHomeOverview } from "@/lib/ux/home-overview";
import { useStudioAtlasShellPreview } from "@/lib/ux/studio-atlas-preview";

describe("Studio Atlas F2 Home", () => {
  it("never activates the new global shell on production", () => {
    expect(useStudioAtlasShellPreview({ VERCEL_ENV: "production", STUDIO_ATLAS_PREVIEW_ENABLED: "true" })).toBe(false);
    expect(useStudioAtlasShellPreview({ VERCEL_ENV: "preview" })).toBe(true);
    expect(useStudioAtlasShellPreview({ NODE_ENV: "production", STUDIO_ATLAS_PREVIEW_ENABLED: "true" })).toBe(false);
  });

  it("prioritizes an open Session over a Quest or Quick Quest", () => {
    const quest = { id: "quest", title: "Study", stage: "EXPLORE" as const, skill: "Ear training", active: true };
    expect(chooseHomeAction({ id: "session", status: "PAUSED", title: "Practice" }, quest)).toMatchObject({
      kind: "session", href: "/session/session", label: "Resume Session", detail: "Practice paused",
    });
    expect(chooseHomeAction(null, quest)).toMatchObject({
      kind: "quest", href: "/quest/quest", label: "Continue in Explore",
    });
    expect(chooseHomeAction(null, { ...quest, active: false }).label).toBe("Open saved Quest");
    expect(chooseHomeAction(null, null)).toMatchObject({ kind: "quick", href: "/generate" });
  });

  it("does not initialize a Player or read private records for signed-out visitors", async () => {
    const from = vi.fn();
    const rpc = vi.fn();
    const client = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: { name: "AuthSessionMissingError" } })),
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
        getUser: vi.fn(async () => ({ data: { user: null }, error: { name: "AuthRetryableFetchError" } })),
      },
      from,
    } as unknown as Parameters<typeof readHomeOverview>[0];
    await expect(readHomeOverview(client)).rejects.toThrow("Identity unavailable");
    expect(from).not.toHaveBeenCalled();
  });
});
