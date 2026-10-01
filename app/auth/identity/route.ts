import { type NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const client = await createServerSupabaseClient();
  const { data: sessionData } = await client.auth.getSession();
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : sessionData.session?.access_token;
  const { data, error } = accessToken
    ? await client.auth.getUser(accessToken)
    : { data: { user: null }, error: null };
  if (error)
    return NextResponse.json(
      {
        error: "Identity lookup failed",
        code: error.code ?? "unknown",
        authStatus: error.status ?? 0,
      },
      { status: 503 },
    );

  return NextResponse.json(
    {
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email,
            is_anonymous: data.user.is_anonymous,
          }
        : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
