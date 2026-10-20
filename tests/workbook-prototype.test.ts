import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const page = readFileSync(resolve(root, "app/prototype/workbook/page.tsx"), "utf8");
const surface = readFileSync(resolve(root, "components/workbook-editor-prototype.tsx"), "utf8");

describe("workbook prototype boundary", () => {
  it("is unavailable on production deployments", () => {
    expect(page).toContain('process.env.VERCEL_ENV === "production"');
    expect(page).toContain("notFound()");
  });

  it("has no persistence, authentication, or Supabase dependency", () => {
    expect(`${page}\n${surface}`).not.toMatch(/supabase|auth\.getUser|fetch\(/i);
  });

  it("states its temporary nature and exposes the required editor actions", () => {
    for (const label of [
      "changes are not saved to your account",
      "Insert tablature",
      "Insert chord diagram",
      "Display document JSON",
      "Download JSON file",
      "Import document JSON",
      "Duplicate tab",
      "Clear position",
    ]) {
      expect(surface).toContain(label);
    }
  });
});
