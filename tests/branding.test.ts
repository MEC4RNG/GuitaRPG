import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Sound Uncharted public branding", () => {
  it.each([
    "app/layout.tsx",
    "app/codex/page.tsx",
    "components/sidebar.tsx",
    "components/onboarding-flow.tsx",
    "components/account-recovery-panel.tsx",
    "app/global-error.tsx",
    "lib/app-config.ts",
    "supabase/templates/magic-link.html",
    "supabase/templates/email-change.html",
  ])("replaces the legacy public-facing brand in %s", (path) => {
    expect(read(path)).toContain("Sound Uncharted");
    expect(read(path)).not.toContain("GuitaRPG");
  });

  it("preserves technical schema and Supabase project identifiers", () => {
    expect(read("lib/workbook/document-v1.ts")).toContain("GUITARPG_WORKBOOK_DOCUMENT_V1");
    expect(read("lib/account/data-control.ts")).toContain("GUITARPG_PLAYER_EXPORT_V1");
    expect(read("supabase/config.toml")).toContain('project_id = "guitarrpg"');
  });
});
