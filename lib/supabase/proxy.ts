import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getOptionalSupabasePublicEnv } from "./env";

export async function updateSupabaseSession(request: NextRequest) {
  const env = getOptionalSupabasePublicEnv();

  // DATA-002 intentionally lets the application scaffold run before a remote
  // Supabase project is linked. Partial configuration still throws in env.ts.
  if (!env) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Server authorization must be based on verified claims, not an unverified
  // session object read directly from cookies.
  await supabase.auth.getClaims();

  return response;
}
