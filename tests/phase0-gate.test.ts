import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type GateManifest = {
  decision: string;
  required_tickets: string[];
  required_artifacts: string[];
  external_evidence: {
    legacy_main_head: string;
    legacy_main_preserved: boolean;
    vercel_project: string;
    vercel_branch: string;
    vercel_deployment_state: string;
    vercel_url_captured_in_repo: boolean;
  };
  authorization_on_pass: {
    phase: string;
    authorized: boolean;
  };
};

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  readFileSync(resolve(root, "domain/contracts/phase0-gate-manifest.json"), "utf8"),
) as GateManifest;

describe("P0-GATE-001 Phase 0 integration gate", () => {
  it("requires every Phase 0 prerequisite ticket to be terminal COMPLETE", () => {
    for (const ticket of manifest.required_tickets) {
      const path = resolve(root, `docs/tickets/${ticket}.md`);
      expect(existsSync(path), ticket).toBe(true);

      const content = readFileSync(path, "utf8");
      expect(content, ticket).toMatch(/\*\*Status:\*\* COMPLETE/);
      expect(content, ticket).toMatch(/## Terminal disposition/);
      expect(content, ticket).not.toMatch(/\*\*BLOCKED\b/);
    }
  });

  it("requires every declared Phase 0 artifact to exist", () => {
    for (const artifact of manifest.required_artifacts) {
      expect(existsSync(resolve(root, artifact)), artifact).toBe(true);
    }
  });

  it("preserves the legacy deployment boundary and records staging evidence", () => {
    expect(manifest.external_evidence.legacy_main_preserved).toBe(true);
    expect(manifest.external_evidence.legacy_main_head).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.external_evidence.vercel_project).toBe("guitarpg");
    expect(manifest.external_evidence.vercel_branch).toBe("v1-production");
    expect(manifest.external_evidence.vercel_deployment_state).toBe("READY_USER_CONFIRMED");
  });

  it("records a passed gate only after the validating commit succeeds", () => {
    expect(manifest.decision).toBe("PASS");
    expect(manifest.authorization_on_pass.phase).toBe("PHASE_1_PRODUCT_FOUNDATION");
    expect(manifest.authorization_on_pass.authorized).toBe(true);
  });

  it("keeps the dedicated semantic contract command wired to integration and UX tests", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["test:contracts"]).toContain("tests/contracts/phase0-integration.test.ts");
    expect(pkg.scripts["test:contracts"]).toContain("tests/design-system-contract.test.ts");
  });
});
