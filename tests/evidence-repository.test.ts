import { describe, expect, it, vi } from "vitest";

import { finalizeQuestResult } from "@/lib/evidence/repository";

describe("EVD-002 Result repository", () => {
  it("submits only Session identity, SELF observations, reflection, and notes", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: { id: "result-1", outcome: "CLEARED" }, error: null });
    const result = await finalizeQuestResult(
      { rpc },
      {
        sessionId: "session-1",
        selfCriteria: [{ ordinal: 3, observed_value: true }],
        reflection: "GOOD_CHALLENGE",
        notes: "Even accents.",
      },
    );
    expect(rpc).toHaveBeenCalledWith("finalize_quest_result", {
      p_session_id: "session-1",
      p_self_criteria: [{ ordinal: 3, observed_value: true }],
      p_reflection: "GOOD_CHALLENGE",
      p_notes: "Even accents.",
    });
    expect(result.outcome).toBe("CLEARED");
  });

  it("does not manufacture a Result after an RPC failure", async () => {
    await expect(
      finalizeQuestResult(
        { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "ENDED required" } }) },
        { sessionId: "session-1", selfCriteria: [] },
      ),
    ).rejects.toThrow("ENDED required");
  });
});
