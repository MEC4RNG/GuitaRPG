import fs from "node:fs";

import { describe, expect, it } from "vitest";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("CODEX-002 surface contract", () => {
  it("uses one app-shell provider and preserves unresolved references as plain text", () => {
    const shell = read("components/app-shell.tsx");
    const reference = read("components/quest-codex-reference.tsx");

    expect(shell).toContain("<CodexPeekProvider>");
    expect(reference).toContain("reference.href ? (");
    expect(reference).toContain("<button");
    expect(reference).toContain("reference.name");
    expect(reference).not.toContain("href={reference.href}");
  });

  it("implements bounded responsive focus and navigation behavior", () => {
    const peek = read("components/codex-peek.tsx");

    expect(peek).toContain('role="dialog"');
    expect(peek).toContain("aria-modal={mobile || undefined}");
    expect(peek).toContain('event.key === "Escape"');
    expect(peek).toContain('setAttribute("inert", "")');
    expect(peek).toContain("trigger.focus()");
    expect(peek).toContain('target="_blank"');
    expect(peek).toContain('rel="noopener noreferrer"');
  });

  it("exposes references throughout Map, Explore, and Craft without persistence code", () => {
    const journey = read("components/quest-journey-surface.tsx");
    const peekRuntime = read("lib/codex/peek-v1.ts");

    expect(journey.match(/CodexReferenceLink/g)?.length).toBeGreaterThanOrEqual(4);
    expect(journey.match(/CodexReferenceList/g)?.length).toBeGreaterThanOrEqual(6);
    expect(`${read("components/codex-peek.tsx")}\n${peekRuntime}`).not.toMatch(
      /supabase|\.rpc\(|\.insert\(|\.update\(/i,
    );
  });
});
