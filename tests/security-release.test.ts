import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { scanText } from "../scripts/security/secret-scan.mjs";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("SEC-001 release security", () => {
  it("defines a bounded CSP and modern defense-in-depth headers", () => {
    const config = read("next.config.ts");
    for (const directive of [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    ])
      expect(config).toContain(directive);
    expect(config).not.toContain("unsafe-eval");
    expect(config).not.toContain("connect-src *");
    expect(config).toContain("X-Frame-Options");
    expect(config).toContain("DENY");
    expect(config).toContain("X-Content-Type-Options");
    expect(config).toContain("strict-origin-when-cross-origin");
    expect(config).toContain("microphone=()");
  });

  it("keeps the privileged Supabase client outside every Client Component", () => {
    const componentFiles = readdirSync(resolve(root, "components"), { recursive: true })
      .map(String)
      .filter((path) => path.endsWith(".tsx"));
    for (const path of componentFiles) {
      const source = read(`components/${path}`);
      if (!source.startsWith('"use client"')) continue;
      expect(source, path).not.toMatch(
        /supabase\/admin|SUPABASE_SECRET_KEY|api\/account\/delete\/route/,
      );
    }
    expect(read("lib/supabase/admin.ts")).toContain('import "server-only"');
    expect(read(".env.example")).not.toContain("NEXT_PUBLIC_SUPABASE_SECRET_KEY");
  });

  it("pins every workflow action to a full immutable SHA and uses least privilege", () => {
    const workflows = readdirSync(resolve(root, ".github/workflows"))
      .filter((path) => path.endsWith(".yml"))
      .map((path) => read(`.github/workflows/${path}`));
    for (const workflow of workflows) {
      expect(workflow).toContain("permissions:\n  contents: read");
      expect(workflow).not.toContain("pull_request_target");
      for (const match of workflow.matchAll(/uses:\s*([^\s#]+)/g))
        expect(match[1]).toMatch(/@[0-9a-f]{40}$/);
    }
  });

  it("recognizes privileged secret classes without printing secret values", () => {
    const fakeSupabase = ["sb", "secret", "A".repeat(24)].join("_");
    const fakeGithub = ["ghp", "B".repeat(36)].join("_");
    const findings = scanText(`${fakeSupabase}\n${fakeGithub}`, "fixture");
    expect(findings.map(({ kind }) => kind).sort()).toEqual([
      "github-token",
      "supabase-secret-key",
    ]);
    expect(JSON.stringify(findings)).not.toContain(fakeSupabase);
    expect(JSON.stringify(findings)).not.toContain(fakeGithub);
  });

  it("retains exact caller-derived export and deletion security boundaries", () => {
    const exportMigration = read("supabase/migrations/20260929120000_data_004_player_export.sql");
    const deletion = read("app/api/account/delete/route.ts");
    expect(exportMigration).toContain("v_player_id uuid := auth.uid()");
    expect(exportMigration).not.toMatch(/export_player_data_v1\([^)]*player/i);
    expect(deletion).toContain("deleteUser(user.id, false)");
    expect(deletion).toContain("isSameOrigin");
    expect(deletion).toContain("isExactDeleteConfirmation");
    expect(deletion).toContain("hasRecentSignIn");
  });

  it("establishes secure function defaults and an explicit browser RPC allowlist", () => {
    const migration = read("supabase/migrations/20260929130000_sec_001_security_hardening.sql");
    expect(migration).toContain(
      "revoke execute on all functions in schema public, private from public, anon, authenticated",
    );
    expect(migration).toContain(
      "alter default privileges in schema public revoke execute on functions from public",
    );
    expect((migration.match(/to authenticated(?:, service_role)?;/g) ?? []).length).toBe(13);
  });
});
