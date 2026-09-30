import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("v1 launch-facing surface truthfulness", () => {
  const sources = [
    read("app/page.tsx"),
    read("components/app-shell.tsx"),
    read("components/sidebar.tsx"),
  ].join("\n");

  it("removes known development-era product claims", () => {
    const prohibited = [
      "PHASE 1",
      "PRODUCT FOUNDATION",
      "Foundation online",
      "Phase 0 contracts locked",
      "v1 foundation",
      "Quest construction arrives",
      "when the Player foundation tickets land",
    ];

    for (const claim of prohibited) {
      expect(sources).not.toContain(claim);
    }
  });

  it("offers current practice and development destinations", () => {
    const home = read("app/page.tsx");

    expect(home).toContain('href="/generate"');
    expect(home).toContain('href="/training"');
    expect(home).toContain('href="/skills"');
    expect(home).not.toContain('href="/settings"');
  });

  it("removes the Settings placeholder route", () => {
    expect(() => read("app/settings/page.tsx")).toThrow();
  });
});
