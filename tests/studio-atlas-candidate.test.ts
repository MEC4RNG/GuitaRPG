import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import candidate from "@/domain/ux/studio-atlas-candidate.json";
import current from "@/domain/ux/design-system-contract.json";
import { canAccessStudioAtlasPreview } from "@/lib/ux/studio-atlas-preview";

function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((value) => parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("Studio Atlas F1 design-system candidate", () => {
  it("keeps the accepted contract and preview gate distinct", () => {
    expect(current.design_system_version).toBe("UX_V1_1");
    expect(candidate.status).toBe("PREVIEW_ONLY");
    expect(canAccessStudioAtlasPreview({ VERCEL_ENV: "production", STUDIO_ATLAS_PREVIEW_ENABLED: "true" })).toBe(false);
    expect(canAccessStudioAtlasPreview({ NODE_ENV: "production" })).toBe(false);
    expect(canAccessStudioAtlasPreview({ VERCEL_ENV: "preview" })).toBe(true);
    expect(canAccessStudioAtlasPreview({ NODE_ENV: "development" })).toBe(true);
    expect(canAccessStudioAtlasPreview({ NODE_ENV: "production", STUDIO_ATLAS_PREVIEW_ENABLED: "true" })).toBe(true);
  });

  it("keeps all text, semantic and functional control contrast pairs readable", () => {
    const c = candidate.colors;
    for (const surface of [c.canvas, c.panel, c.raised]) {
      for (const text of [
        c.text, c.muted, c.brand, c.discovery, c.information, c.success,
        c.warning, c.danger, c.estimated, c.unknown,
      ]) {
        expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(c["border-control"], surface)).toBeGreaterThanOrEqual(3);
    }
    for (const ink of [c["paper-text"], c["paper-muted"], c["paper-accent"]]) {
      expect(contrast(ink, c.paper)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(c.canvas, c.brand)).toBeGreaterThanOrEqual(4.5);
    for (const domain of candidate.domains) {
      expect(contrast(domain.color, c.panel)).toBeGreaterThanOrEqual(3);
    }
  });

  it("maps all six identities and keeps CSS tokens synchronized", () => {
    expect(candidate.domains.map((d) => d.slug)).toEqual([
      "technique",
      "fretboard",
      "harmony_theory",
      "rhythm",
      "ear_musicianship",
      "creativity_expression",
    ]);
    const css = readFileSync("app/studio-atlas-tokens.css", "utf8");
    for (const [name, value] of Object.entries(candidate.colors)) {
      expect(css).toContain(`--sa-${name}: ${value.toLowerCase()};`);
    }
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(candidate.layout.touch_target_px).toBeGreaterThanOrEqual(44);
  });

  it("keeps text-free decorative SVG assets bounded and local", () => {
    for (const name of ["atlas-horizon.svg", "atlas-contours.svg", "guitar-study.svg"]) {
      const source = readFileSync(`public/studio-atlas/${name}`, "utf8");
      expect(source.length).toBeLessThan(12_000);
      expect(source).not.toMatch(/<script|<foreignObject|<text|\son[a-z]+\s*=|href\s*=/i);
    }
  });
});
