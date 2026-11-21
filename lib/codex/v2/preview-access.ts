/**
 * Codex V2 draft content must not be exposed by an ordinary production server.
 * Vercel production is always denied, even if an opt-in is accidentally set.
 * Explicit local/CI opt-in is supported for Next.js production-mode browser tests.
 */
type PreviewEnvironment = {
  VERCEL_ENV?: string;
  NODE_ENV?: string;
  CODEX_V2_PREVIEW_ENABLED?: string;
};

export function canAccessCodexV2DraftPreview(
  environment: PreviewEnvironment = process.env,
): boolean {
  if (environment.VERCEL_ENV === "production") return false;
  if (environment.VERCEL_ENV === "preview") return true;
  if (environment.VERCEL_ENV === "development") return true;
  if (environment.VERCEL_ENV !== undefined) return false;
  if (environment.NODE_ENV === "development") return true;
  return environment.CODEX_V2_PREVIEW_ENABLED === "true";
}
