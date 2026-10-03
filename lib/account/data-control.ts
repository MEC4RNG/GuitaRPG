export const PLAYER_EXPORT_VERSION = "GUITARPG_PLAYER_EXPORT_V1";
export const RECENT_SIGN_IN_WINDOW_MS = 10 * 60 * 1000;

export function hasRecentSignIn(value: string | undefined, now = Date.now()) {
  if (!value) return false;
  const signedInAt = Date.parse(value);
  return (
    Number.isFinite(signedInAt) &&
    now - signedInAt >= 0 &&
    now - signedInAt <= RECENT_SIGN_IN_WINDOW_MS
  );
}

export function isExactDeleteConfirmation(value: unknown): value is { confirmation: "DELETE" } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === 1 && record.confirmation === "DELETE";
}

export function isSameOrigin(
  requestUrl: string,
  origin: string | null,
  forwardedHost: string | null,
  host: string | null,
  forwardedProtocol: string | null = null,
) {
  if (!origin) return false;
  try {
    const request = new URL(requestUrl);
    const supplied = new URL(origin);
    const expectedHost = forwardedHost ?? host ?? request.host;
    const expectedProtocol = forwardedProtocol ? `${forwardedProtocol}:` : request.protocol;
    return supplied.host === expectedHost && supplied.protocol === expectedProtocol;
  } catch {
    return false;
  }
}
