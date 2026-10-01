export const SUPPORTED_EMAIL_CONFIRMATION_TYPES = ["magiclink", "email", "email_change"] as const;
export type SupportedEmailConfirmationType = (typeof SUPPORTED_EMAIL_CONFIRMATION_TYPES)[number];

export type ConfirmationClient = {
  auth: {
    verifyOtp(parameters: {
      token_hash: string;
      type: SupportedEmailConfirmationType;
    }): PromiseLike<{ error: { message?: string } | null }>;
    refreshSession(): PromiseLike<{ error: { message?: string } | null }>;
  };
};

export function safeInternalPath(value: string | null, fallback = "/profile") {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function parseConfirmationRequest(url: URL) {
  const tokenHash = url.searchParams.get("token_hash")?.trim() ?? "";
  const rawType = url.searchParams.get("type");
  const type = SUPPORTED_EMAIL_CONFIRMATION_TYPES.find((candidate) => candidate === rawType);
  return {
    tokenHash,
    type: type ?? null,
    next: safeInternalPath(url.searchParams.get("next")),
    valid: Boolean(tokenHash && type),
  };
}

export async function confirmEmailToken(
  client: ConfirmationClient,
  tokenHash: string,
  type: SupportedEmailConfirmationType,
) {
  const result = await client.auth.verifyOtp({ token_hash: tokenHash, type });
  if (result.error) return false;
  const refreshed = await client.auth.refreshSession();
  return !refreshed.error;
}
