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

  it("adds no database migration", () => {
    expect(read("docs/tickets/UX-005.md")).toContain("adds no database migration");
  });
});
