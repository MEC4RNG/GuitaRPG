import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "./env";

export function createBrowserSupabaseClient() {
  const env = getSupabasePublicEnv();

  return createBrowserClient(env.url, env.publishableKey);
}
