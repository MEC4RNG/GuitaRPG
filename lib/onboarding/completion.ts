export type OnboardingCompletionInput = {
  experienceBackground: string;
  typicalSessionMinutes: number | null;
  challengePreference: string;
  calibrationStatus: "SKIPPED" | "IN_PROGRESS";
  tuningContextId: string;
  goal: string;
};

export type OnboardingRpcClient = {
  rpc(
    name: "complete_player_onboarding",
    parameters: {
      p_experience_background: string;
      p_typical_session_minutes: number | null;
      p_challenge_preference: string;
      p_calibration_status: "SKIPPED" | "IN_PROGRESS";
      p_tuning_context_id: string;
      p_goal: string | null;
    },
  ): PromiseLike<{ error: { message: string } | null }>;
};

export type OnboardingCompletionResult = { complete: true } | { complete: false; error: string };

export async function completeOnboarding(
  client: OnboardingRpcClient,
  input: OnboardingCompletionInput,
): Promise<OnboardingCompletionResult> {
  const result = await client.rpc("complete_player_onboarding", {
    p_experience_background: input.experienceBackground,
    p_typical_session_minutes: input.typicalSessionMinutes,
    p_challenge_preference: input.challengePreference,
    p_calibration_status: input.calibrationStatus,
    p_tuning_context_id: input.tuningContextId,
    p_goal: input.goal.trim() || null,
  });

  if (result.error) return { complete: false, error: result.error.message };
  return { complete: true };
}
