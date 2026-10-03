import { Buffer } from "node:buffer";

import type { NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export function cookieAccessToken(request: NextRequest) {
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

export async function getVerifiedRequestUser(request: NextRequest) {
  const client = await createServerSupabaseClient();
  const { data: sessionData } = await client.auth.getSession();
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : (sessionData.session?.access_token ?? cookieAccessToken(request));
  const result = accessToken
    ? await client.auth.getUser(accessToken)
    : { data: { user: null }, error: null };
  return { accessToken, client, ...result };
}
