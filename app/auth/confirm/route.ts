import { type NextRequest, NextResponse } from "next/server";

import { confirmEmailToken, parseConfirmationRequest } from "@/lib/auth/confirmation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const confirmation = parseConfirmationRequest(request.nextUrl);
  if (!confirmation.valid || !confirmation.type)
    return NextResponse.redirect(new URL("/profile?auth_error=invalid", request.url));

  const confirmed = await confirmEmailToken(
    await createServerSupabaseClient(),
    confirmation.tokenHash,
    confirmation.type,
  );
  const destination = confirmed ? confirmation.next : "/profile?auth_error=invalid";
  return NextResponse.redirect(new URL(destination, request.url));
}
