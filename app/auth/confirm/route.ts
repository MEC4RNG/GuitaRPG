import { type NextRequest, NextResponse } from "next/server";

import { confirmEmailToken, parseConfirmationRequest } from "@/lib/auth/confirmation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const confirmation = parseConfirmationRequest(request.nextUrl);
  if (!confirmation.valid || !confirmation.type)
    return new NextResponse(null, {
      status: 303,
      headers: { Location: "/profile?auth_error=invalid" },
    });

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/profile?auth_error=invalid" },
  });
  const confirmed = await confirmEmailToken(
    await createServerSupabaseClient(
      (batch) =>
        batch.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      request.cookies.getAll(),
    ),
    confirmation.tokenHash,
    confirmation.type,
  );
  const destination = confirmed ? confirmation.next : "/profile?auth_error=invalid";
  response.headers.set("location", destination);
  return response;
}
