export type SupabasePublicEnv = {
  url: string;
  publishableKey: string;
};

type PublicEnvInput = {
  url?: string;
  publishableKey?: string;
};

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validateProjectUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  const local =
    url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";

  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must use HTTPS except for localhost/127.0.0.1 local development.",
    );
  }

  return url.toString().replace(/\/$/, "");
}

export function parseSupabasePublicEnv(input: PublicEnvInput): SupabasePublicEnv {
  const rawUrl = clean(input.url);
  const publishableKey = clean(input.publishableKey);

  if (!rawUrl || !publishableKey) {
    throw new Error(
      "Supabase is not fully configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY together.",
    );
  }

  return {
    url: validateProjectUrl(rawUrl),
    publishableKey,
  };
}

export function getOptionalSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!url && !publishableKey) {
    return null;
  }

  return parseSupabasePublicEnv({ url, publishableKey });
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  return parseSupabasePublicEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
