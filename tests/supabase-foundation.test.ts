import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("DATA-002 Supabase runtime and migration foundation", () => {
  it("pins the accepted Supabase runtime and CLI dependencies on Node 22+", () => {
    const pkg = JSON.parse(read("package.json")) as {
      engines: { node: string };
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(pkg.engines.node).toBe(">=22.0.0");
    expect(pkg.dependencies["@supabase/ssr"]).toBe("0.12.7");
    expect(pkg.dependencies["@supabase/supabase-js"]).toBe("2.117.2");
    expect(pkg.devDependencies.supabase).toBe("2.117.0");
  });

  it("keeps elevated credentials out of the public environment contract", () => {
    const envExample = read(".env.example");
    const browserClient = read("lib/supabase/client.ts");
    const serverClient = read("lib/supabase/server.ts");

    expect(envExample).toContain("NEXT_PUBLIC_SUPABASE_URL=");
    expect(envExample).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=");
    expect(envExample).toContain("SUPABASE_SECRET_KEY=");
    expect(envExample).not.toContain("NEXT_PUBLIC_SUPABASE_SECRET_KEY");
    expect(envExample).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");

    expect(browserClient).not.toMatch(/SECRET_KEY|SERVICE_ROLE/i);
    expect(serverClient).not.toMatch(/SECRET_KEY|SERVICE_ROLE/i);
  });

  it("uses separate browser and server SSR clients", () => {
    expect(read("lib/supabase/client.ts")).toContain("createBrowserClient");
    expect(read("lib/supabase/server.ts")).toContain("createServerClient");
    expect(read("lib/supabase/server.ts")).toContain("cookies");
  });

  it("refreshes SSR auth with verified claims rather than trusting getSession", () => {
    const proxy = read("lib/supabase/proxy.ts");

    expect(proxy).toContain("getClaims");
    expect(proxy).not.toContain("getSession");
    expect(read("proxy.ts")).toContain("updateSupabaseSession");
  });

  it("initializes source-controlled local Supabase and pg-delta migrations", () => {
    const config = read("supabase/config.toml");

    expect(config).toContain('project_id = "guitarrpg"');
    expect(config).toContain("major_version = 17");
    expect(config).toContain("enable_anonymous_sign_ins = true");
    expect(config).toContain("[experimental.pgdelta]");
    expect(config).toContain("enabled = true");
  });

  it("creates only security/migration infrastructure, not product tables", () => {
    const migration = read(
      "supabase/migrations/20260928000000_data_002_persistence_foundation.sql",
    ).toLowerCase();

    expect(migration).toContain("create schema if not exists private");
    expect(migration).toContain("revoke all on schema private from anon");
    expect(migration).toContain("revoke all on schema private from authenticated");
    expect(migration).toContain("revoke create on schema public from anon");
    expect(migration).toContain("alter default privileges");
    expect(migration).not.toMatch(/create\s+table/);
  });

  it("keeps seed ownership reserved for later domain tickets", () => {
    const seed = read("supabase/seed.sql");
    expect(seed).toContain("TAX-003");
    expect(seed).toContain("Player-owned data must never be committed");
  });
});
