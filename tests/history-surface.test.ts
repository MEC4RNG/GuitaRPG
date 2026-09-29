import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("HIST-001 History surface contracts", () => {
  it("replaces the History placeholder with list and attempt detail routes", () => {
    expect(read("app/history/page.tsx")).toContain("HistorySurface");
    expect(read("app/history/[sessionId]/page.tsx")).toContain("HistoryDetailSurface");
    expect(read("components/history-surface.tsx")).toContain("No practice attempts yet");
    expect(read("components/history-surface.tsx")).toContain('role="alert"');
  });

  it("uses bounded Session-first batch reads rather than per-attempt reads", () => {
    const source = read("lib/history/repository.ts");
    expect(source).toContain("HISTORY_PAGE_SIZE");
    expect(source).toContain(".range(offset, offset + limit)");
    expect(source).toContain('.in("session_id", sessionIds)');
    expect(source).toContain('.in("result_id", resultIds)');
    expect(source).toContain("Promise.all");
    expect(source).not.toContain("for (const session of sessions) await");
  });

  it("keeps History read-only and distinguishes Result facts from Session facts", () => {
    const source = read("components/history-surface.tsx");
    expect(source).toContain("Result pending");
    expect(source).toMatch(/Recording a Result is separate\s+from practice timing and controls\./);
    expect(source).not.toMatch(/\.rpc\(|\.insert\(|\.update\(|\.delete\(/);
  });
});
