import { type NextRequest, NextResponse } from "next/server";

import { confirmEmailToken, parseConfirmationRequest } from "@/lib/auth/confirmation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const confirmation = parseConfirmationRequest(request.nextUrl);
  if (!confirmation.valid || !confirmation.type)
    return NextResponse.redirect(new URL("/profile?auth_error=invalid", request.url));

  const cookiesToSet: Array<{
    name: string;
    value: string;
    options: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];
  const confirmed = await confirmEmailToken(
    await createServerSupabaseClient((batch) => cookiesToSet.push(...batch)),
    confirmation.tokenHash,
    confirmation.type,
  );
  const destination = confirmed ? confirmation.next : "/profile?auth_error=invalid";
  const response = NextResponse.redirect(new URL(destination, request.url));
  const hasReplacementSession = cookiesToSet.some(
    ({ name, value }) => name.includes("-auth-token") && Boolean(value),
  );
  cookiesToSet.forEach(({ name, value, options }) => {
    // email_change can confirm the existing user without returning a new
    // session. In that case, retain the valid incoming guest session cookie;
    // getUser() will resolve the same UUID to its now-permanent Auth record.
    if (value || hasReplacementSession) response.cookies.set(name, value, options);
  });
  return response;
}
