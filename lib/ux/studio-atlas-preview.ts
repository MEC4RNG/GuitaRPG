type PreviewEnvironment = {
  VERCEL_ENV?: string;
  NODE_ENV?: string;
  STUDIO_ATLAS_PREVIEW_ENABLED?: string;
};

/** F1 is isolated from production, including accidental opt-in. */
export function canAccessStudioAtlasPreview(
  environment: PreviewEnvironment = process.env,
): boolean {
  if (environment.VERCEL_ENV === "production") return false;
  if (environment.VERCEL_ENV === "preview" || environment.VERCEL_ENV === "development")
    return true;
  if (environment.VERCEL_ENV !== undefined) return false;
  return (
    environment.NODE_ENV === "development" || environment.STUDIO_ATLAS_PREVIEW_ENABLED === "true"
  );
}
