import { describe, expect, it } from "vitest";

import { getOptionalSupabasePublicEnv, parseSupabasePublicEnv } from "@/lib/supabase/env";

describe("DATA-002 Supabase environment contract", () => {
  it("accepts the hosted HTTPS project boundary", () => {
    expect(
      parseSupabasePublicEnv({
        url: "https://example.supabase.co/",
        publishableKey: "sb_publishable_test",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
  });

  it("accepts HTTP only for local development", () => {
    expect(
      parseSupabasePublicEnv({
        url: "http://127.0.0.1:54321",
        publishableKey: "local-publishable-key",
      }).url,
    ).toBe("http://127.0.0.1:54321");

    expect(() =>
      parseSupabasePublicEnv({
        url: "http://example.supabase.co",
        publishableKey: "sb_publishable_test",
      }),
    ).toThrow(/HTTPS/);
  });

  it("rejects partial configuration", () => {
    expect(() =>
      parseSupabasePublicEnv({
        url: "https://example.supabase.co",
      }),
    ).toThrow(/fully configured/);

    expect(() =>
      parseSupabasePublicEnv({
        publishableKey: "sb_publishable_test",
      }),
    ).toThrow(/fully configured/);
  });

  it("treats a fully absent runtime configuration as intentionally unconfigured", () => {
    const priorUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const priorKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    try {
      expect(getOptionalSupabasePublicEnv()).toBeNull();
    } finally {
      if (priorUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = priorUrl;

      if (priorKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = priorKey;
    }
  });
});
