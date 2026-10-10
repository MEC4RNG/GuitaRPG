import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { safeErrorMessage } from "@/lib/ux/safe-error";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("UX-005 hardening contracts", () => {
  it("uses stable user-safe failure copy that never reflects provider text", () => {
    const providerSecret = "postgres role service_role failed with jwt=secret";
    for (const context of [
      "AUTH",
      "DELETE",
      "EXPORT",
      "PROFILE_READ",
      "QUEST_SAVE",
      "SESSION_READ",
      "RESULT_SAVE",
    ] as const) {
      const message = safeErrorMessage(context);
      expect(message).not.toContain(providerSecret);
      expect(message).not.toMatch(/postgres|service_role|jwt/i);
      expect(message.length).toBeGreaterThan(20);
    }
  });

  it("ships route and root error boundaries with retry and safe copy", () => {
    for (const path of ["app/error.tsx", "app/global-error.tsx"]) {
      const source = read(path);
      expect(source).toContain("Retry");
      expect(source).toContain("reset");
      expect(source).not.toContain("error.message");
      expect(source).not.toContain("error.stack");
    }
  });

  it("keeps failure UI actionable and honors motion and touch requirements", () => {
    expect(read("components/profile-surface.tsx")).toContain("Retry Profile");
    expect(read("components/session-practice-surface.tsx")).toContain("Retry Session");
    expect(read("components/result-completion-surface.tsx")).toContain("Retry Result");
    expect(read("app/globals.css")).toContain("prefers-reduced-motion: reduce");
    expect(read("app/design-tokens.css")).toContain("--touch-target-min: 2.75rem");
  });

  it("separates natural navigation speech from uppercase presentation", () => {
    const navigation = read("lib/navigation.ts");
    const sidebar = read("components/sidebar.tsx");
    const styles = read("app/globals.css");

    expect(navigation).toContain('label: "Play"');
    expect(navigation).toContain('label: "Development"');
    expect(navigation).toContain('label: "Learn"');
    expect(navigation).toContain('label: "System"');
    expect(navigation).not.toMatch(/label: "(PLAY|DEVELOPMENT|LEARN|SYSTEM)"/);
    expect(styles).toMatch(/\.nav-group h2[\s\S]*text-transform: uppercase/);
    expect(sidebar).toContain('aria-label="GuitaRPG home, Practice operating system"');
    expect(sidebar).toContain('<small aria-hidden="true">Practice OS</small>');
  });

  it("makes account email fields visibly identifiable without replacing their labels", () => {
    const panel = read("components/account-recovery-panel.tsx");
    const styles = read("app/globals.css");

    expect(panel).toContain("<span>Linked email</span>");
    expect(panel).toContain('className="account-recovery__field"');
    expect(styles).toMatch(/\.account-recovery__field input[\s\S]*border: 2px solid/);
    expect(styles).toMatch(/\.account-recovery__field input:focus-visible/);
  });

  it("provides a local-only private Player path for manual assistive-technology checks", () => {
    const harness = read("scripts/ux/start-narrator-smoke.ps1");

    expect(harness).toContain("supabase start");
    expect(harness).toContain("supabase db reset --local");
    expect(harness).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(harness).toContain("127.0.0.1:3000/onboarding");
    expect(harness).not.toMatch(/supabase\.co|vercel\.app/);
  });

  it("adds no database migration", () => {
    expect(read("docs/tickets/UX-005.md")).toContain("adds no database migration");
  });
});
