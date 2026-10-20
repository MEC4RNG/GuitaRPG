const DEFAULT_ONBOARDING_RETURN = "/";

export function safeOnboardingReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_ONBOARDING_RETURN;
  }

  try {
    const parsed = new URL(value, "https://guitarpg.local");
    if (parsed.origin !== "https://guitarpg.local") return DEFAULT_ONBOARDING_RETURN;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_ONBOARDING_RETURN;
  }
}
