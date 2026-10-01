import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DATA-003 local Auth configuration", () => {
  const config = readFileSync("supabase/config.toml", "utf8");

  it("keeps anonymous Auth and enables local manual linking", () => {
    expect(config).toContain("enable_anonymous_sign_ins = true");
    expect(config).toContain("enable_manual_linking = true");
    expect(config).toContain("enable_confirmations = true");
  });

  it("source-controls passwordless and guest-upgrade token-hash templates", () => {
    for (const [section, file, type] of [
      ["auth.email.template.magic_link", "supabase/templates/magic-link.html", "magiclink"],
      ["auth.email.template.email_change", "supabase/templates/email-change.html", "email_change"],
    ]) {
      expect(config).toContain(`[${section}]`);
      expect(existsSync(file), file).toBe(true);
      const template = readFileSync(file, "utf8");
      expect(template).toContain("{{ .TokenHash }}");
      expect(template).toContain(`type=${type}`);
      expect(template).not.toMatch(/password|secret|service.role/i);
    }
  });
});
