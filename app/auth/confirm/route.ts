import { type NextRequest, NextResponse } from "next/server";

import { confirmEmailToken, parseConfirmationRequest } from "@/lib/auth/confirmation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const confirmation = parseConfirmationRequest(request.nextUrl);
  if (!confirmation.valid || !confirmation.type)
    return NextResponse.redirect(new URL("/profile?auth_error=invalid", request.url));

  const response = NextResponse.redirect(new URL("/profile?auth_error=invalid", request.url));
  const confirmed = await confirmEmailToken(
    await createServerSupabaseClient(
      (batch) =>
        batch.forEach(({ name, value, options }) => {
          // Local GoTrue can return an email-change session that its own /user
          // endpoint rejects. The existing guest session remains valid for the
          // same UUID, so keep it until the normal proxy refreshes verified state.
          if (confirmation.type !== "email_change") response.cookies.set(name, value, options);
        }),
      request.cookies.getAll(),
    ),
    confirmation.tokenHash,
    confirmation.type,
  );
  const destination = confirmed ? confirmation.next : "/profile?auth_error=invalid";
  response.headers.set("location", new URL(destination, request.url).toString());
  return response;
}
