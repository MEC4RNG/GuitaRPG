import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicEnv } from "./env";

type ResponseCookie = {
  name: string;
  value: string;
  options: Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[0] extends {
    name: string;
    value: string;
  }
    ? Record<string, unknown>
    : never;
};

export async function createServerSupabaseClient(
  onSetCookies?: (cookiesToSet: ResponseCookie[]) => void,
) {
  const env = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        if (onSetCookies) {
          onSetCookies(cookiesToSet as ResponseCookie[]);
          return;
        }
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. The root proxy refreshes the
          // session and writes refreshed cookies before protected server reads.
        }
      },
    },
  });
}
