import { describe, expect, it, vi } from "vitest";

import { saveProfileSnapshot, type ProfileClient } from "@/lib/profile/repository";

describe("PLY-003 Profile save repository", () => {
  it("uses one atomic owner-derived RPC without Player identity or priority", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    await saveProfileSnapshot({ rpc } as unknown as ProfileClient, {
      displayName: "  Dorian  ",
      experienceBackground: "EXPERIENCED",
      typicalSessionMinutes: 35,
      challengePreference: "PUSH_ME",
      defaultTuningContextId: "40000000-0000-4000-8000-000000000029",
      goals: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          kind: "SKILL",
          targetId: "10000000-0000-4000-8000-000000000001",
          objective: "ignored",
        },
        { id: null, kind: "OBJECTIVE", targetId: null, objective: "  Use a metronome  " },
      ],
    });

    expect(rpc).toHaveBeenCalledWith("save_player_profile_v1", {
      p_display_name: "Dorian",
      p_experience_background: "EXPERIENCED",
      p_typical_session_minutes: 35,
      p_challenge_preference: "PUSH_ME",
      p_default_tuning_context_id: "40000000-0000-4000-8000-000000000029",
      p_goals: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          kind: "SKILL",
          target_id: "10000000-0000-4000-8000-000000000001",
          objective: null,
        },
        { id: null, kind: "OBJECTIVE", target_id: null, objective: "Use a metronome" },
      ],
    });
    expect(JSON.stringify(rpc.mock.calls)).not.toMatch(/player_id|priority/);
  });

  it("returns a recoverable message without changing submitted values when the RPC fails", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { message: "database detail" } });
    await expect(
      saveProfileSnapshot({ rpc } as unknown as ProfileClient, {
        displayName: "Dorian",
        experienceBackground: "SOME_EXPERIENCE",
        typicalSessionMinutes: null,
        challengePreference: "BALANCED",
        defaultTuningContextId: null,
        goals: [],
      }),
    ).rejects.toThrow("Profile could not be saved. Your changes are still here.");
  });
});
