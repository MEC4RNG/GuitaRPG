import { type NextRequest, NextResponse } from "next/server";

import { getVerifiedRequestUser } from "@/lib/auth/server-user";
import {
  hasRecentSignIn,
  isExactDeleteConfirmation,
  isSameOrigin,
} from "@/lib/account/data-control";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const privateJson = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function POST(request: NextRequest) {
  if (
    !isSameOrigin(
      request.url,
      request.headers.get("origin"),
      request.headers.get("x-forwarded-host"),
      request.headers.get("host"),
      request.headers.get("x-forwarded-proto"),
    )
  )
    return privateJson({ error: "Same-origin request required." }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!isExactDeleteConfirmation(body))
    return privateJson({ error: 'Type "DELETE" to confirm permanent deletion.' }, 400);

  const { data, error: identityError } = await getVerifiedRequestUser(request);
  const user = data.user;
  if (identityError) return privateJson({ error: "Identity verification failed." }, 503);
  if (!user) return privateJson({ error: "Authentication required." }, 401);
  if (!user.is_anonymous && !hasRecentSignIn(user.last_sign_in_at))
    return privateJson(
      {
        error: "Sign in again before deleting this protected account.",
        code: "REAUTH_REQUIRED",
      },
      403,
    );

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id, false);
  if (error)
    return privateJson({ error: "Account deletion failed. No local session was cleared." }, 500);

  const response = privateJson({ deleted: true }, 200);
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.includes("-auth-token") || cookie.name.includes("-code-verifier"))
      response.cookies.set(cookie.name, "", { expires: new Date(0), maxAge: 0, path: "/" });
  }
  return response;
}
