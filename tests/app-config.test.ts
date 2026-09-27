import { describe, expect, it } from "vitest";

import { APP_NAME, APP_PHASE } from "@/lib/app-config";

describe("production scaffold", () => {
  it("exposes the canonical application identity", () => {
    expect(APP_NAME).toBe("GuitaRPG");
    expect(APP_PHASE).toContain("Phase 0");
  });
});
