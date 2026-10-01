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
  initialCookies?: Array<{ name: string; value: string }>,
) {
  const env = getSupabasePublicEnv();
  const cookieStore = await cookies();
  const requestCookies = new Map(
    (initialCookies ?? cookieStore.getAll()).map(({ name, value }) => [name, value]),
  );

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return Array.from(requestCookies, ([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          if (value) requestCookies.set(name, value);
          else requestCookies.delete(name);
        });
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
