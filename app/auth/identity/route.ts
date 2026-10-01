import { Buffer } from "node:buffer";

import { type NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function cookieAccessToken(request: NextRequest) {
  const cookies = request.cookies.getAll();
  const whole = cookies.find(({ name }) => name.endsWith("-auth-token"))?.value;
  const chunks = cookies
    .filter(({ name }) => /-auth-token\.\d+$/.test(name))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
    .map(({ value }) => value)
    .join("");
  const encoded = decodeURIComponent(whole ?? chunks);
  if (!encoded.startsWith("base64-")) return null;

  try {
    const session = JSON.parse(Buffer.from(encoded.slice(7), "base64url").toString("utf8")) as {
      access_token?: unknown;
    };
    return typeof session.access_token === "string" ? session.access_token : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const client = await createServerSupabaseClient();
  const { data: sessionData } = await client.auth.getSession();
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : (sessionData.session?.access_token ?? cookieAccessToken(request));
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
