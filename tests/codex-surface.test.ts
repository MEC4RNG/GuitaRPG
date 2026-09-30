import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
describe("Codex surfaces", () => {
  it("replaces the placeholder with search and all four filters", () => {
    const page = read("app/codex/page.tsx");
    const surface = read("components/codex-surface.tsx");
    expect(page).toContain("CodexSurface");
    expect(page).not.toContain("FoundationPage");
    expect(surface).toContain("Search the Codex");
    for (const label of ["Skills", "Concepts", "Contexts", "Constraints"])
      expect(surface).toContain(label);
    expect(surface).not.toMatch(/proficiency|confidence|readiness|recommendation score/i);
  });
  it("provides static detail routes and not-found behavior", () => {
    const detail = read("app/codex/[kind]/[slug]/page.tsx");
    expect(detail).toContain("generateStaticParams");
    expect(detail).toContain("notFound()");
    expect(detail).toContain("Back to Codex");
  });
});
