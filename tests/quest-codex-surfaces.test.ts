import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("QST-004 Quest learning references", () => {
  it("shares verified references across Generate and Training previews", () => {
    for (const path of [
      "components/generate-quest-surface.tsx",
      "components/training-surface.tsx",
    ]) {
      const source = read(path);
      expect(source).toContain("questCodexReferences");
      expect(source).toContain("CodexReferenceLink");
      expect(source).toContain("Start Practice");
    }
  });

  it("reads the immutable Session snapshot and renders useful references", () => {
    const source = read("components/session-practice-surface.tsx");
    expect(source).toContain('select("title,resolved_snapshot")');
    expect(source).toContain("parseQuest(questResponse.data.resolved_snapshot)");
    expect(source).toContain("questCodexReferences(snapshot.quest)");
    expect(source).not.toContain("JSON.stringify(value)");
    for (const control of ["Pause", "Resume", "End Session", "+1 rep", "Start metronome"])
      expect(source).toContain(control);
  });
});
