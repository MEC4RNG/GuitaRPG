import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  hasRecentSignIn,
  isExactDeleteConfirmation,
  isSameOrigin,
  PLAYER_EXPORT_VERSION,
} from "@/lib/account/data-control";

const read = (path: string) => readFileSync(path, "utf8");

describe("DATA-004 Player data controls", () => {
  it("uses a stable export version and bounded recent-sign-in window", () => {
    expect(PLAYER_EXPORT_VERSION).toBe("GUITARPG_PLAYER_EXPORT_V1");
    const now = Date.parse("2026-10-03T12:00:00Z");
    expect(hasRecentSignIn("2026-10-03T11:50:00Z", now)).toBe(true);
    expect(hasRecentSignIn("2026-10-03T11:49:59Z", now)).toBe(false);
    expect(hasRecentSignIn(undefined, now)).toBe(false);
  });

  it("accepts only the exact destructive confirmation object", () => {
    expect(isExactDeleteConfirmation({ confirmation: "DELETE" })).toBe(true);
    expect(isExactDeleteConfirmation({ confirmation: "delete" })).toBe(false);
    expect(isExactDeleteConfirmation({ confirmation: "DELETE", player_id: "foreign" })).toBe(false);
  });

  it("requires a matching browser origin", () => {
    expect(
      isSameOrigin("https://app.test/api/account/delete", "https://app.test", null, "app.test"),
    ).toBe(true);
    expect(
      isSameOrigin("https://app.test/api/account/delete", "https://evil.test", null, "app.test"),
    ).toBe(false);
    expect(
      isSameOrigin("https://app.test/api/account/delete", "http://app.test", null, "app.test"),
    ).toBe(false);
    expect(isSameOrigin("https://app.test/api/account/delete", null, null, "app.test")).toBe(false);
  });

  it("keeps ownership server-derived and the elevated key server-only", () => {
    const migration = read("supabase/migrations/20260929120000_data_004_player_export.sql");
    const deletion = read("app/api/account/delete/route.ts");
    const admin = read("lib/supabase/admin.ts");
    const client = read("components/account-data-controls.tsx");
    expect(migration).toContain("v_player_id uuid := auth.uid()");
    expect(migration).not.toMatch(/export_player_data_v1\([^)]*player/i);
    expect(deletion).toContain("deleteUser(user.id, false)");
    expect(admin).toContain('import "server-only"');
    expect(admin).toContain("SUPABASE_SECRET_KEY");
    expect(client).not.toContain("player_id");
    expect(client).not.toContain("SUPABASE_SECRET_KEY");
  });

  it("surfaces export and an explicit, cancellable deletion warning", () => {
    const source = read("components/account-data-controls.tsx");
    expect(source).toContain("Download my data");
    expect(source).toContain("Type DELETE to confirm");
    expect(source).toContain("This cannot be");
    expect(source).toContain("Cancel");
  });
});
