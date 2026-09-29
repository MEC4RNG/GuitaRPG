import { describe, expect, it, vi } from "vitest";

import {
  completeOnboarding,
  type OnboardingCompletionInput,
  type OnboardingRpcClient,
} from "@/lib/onboarding/completion";

const input: OnboardingCompletionInput = {
  experienceBackground: "SOME_EXPERIENCE",
  typicalSessionMinutes: 25,
  challengePreference: "BALANCED",
  calibrationStatus: "SKIPPED",
  tuningContextId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  goal: "  Improve timing  ",
};

describe("ONB-001-R1 onboarding completion boundary", () => {
  it("uses the atomic owner-derived RPC and never supplies a Player identifier", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });

    await expect(completeOnboarding({ rpc } as OnboardingRpcClient, input)).resolves.toEqual({
      complete: true,
    });
    expect(rpc).toHaveBeenCalledWith("complete_player_onboarding", {
      p_experience_background: "SOME_EXPERIENCE",
      p_typical_session_minutes: 25,
      p_challenge_preference: "BALANCED",
      p_calibration_status: "SKIPPED",
      p_tuning_context_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      p_goal: "Improve timing",
    });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("player_id");
  });

  it("does not report completion when persistence fails", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { message: "persistence denied" } });

    await expect(completeOnboarding({ rpc } as OnboardingRpcClient, input)).resolves.toEqual({
      complete: false,
      error: "persistence denied",
    });
  });

  it("makes retry use the same idempotent database boundary", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { rpc } as OnboardingRpcClient;

    await completeOnboarding(client, { ...input, goal: "" });
    await completeOnboarding(client, { ...input, goal: "" });

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({ p_goal: null });
  });
});
