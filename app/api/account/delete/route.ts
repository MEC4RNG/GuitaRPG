import { type NextRequest, NextResponse } from "next/server";

import { getVerifiedRequestUser } from "@/lib/auth/server-user";
import {
  hasRecentSignIn,
  isExactDeleteConfirmation,
  isSameOrigin,
} from "@/lib/account/data-control";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
    return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!isExactDeleteConfirmation(body))
    return NextResponse.json(
      { error: 'Type "DELETE" to confirm permanent deletion.' },
      { status: 400 },
    );

  const { data, error: identityError } = await getVerifiedRequestUser(request);
  const user = data.user;
  if (identityError)
    return NextResponse.json({ error: "Identity verification failed." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!user.is_anonymous && !hasRecentSignIn(user.last_sign_in_at))
    return NextResponse.json(
      {
        error: "Sign in again before deleting this protected account.",
        code: "REAUTH_REQUIRED",
      },
      { status: 403 },
    );

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id, false);
  if (error)
    return NextResponse.json(
      { error: "Account deletion failed. No local session was cleared." },
      { status: 500 },
    );

  const response = NextResponse.json({ deleted: true });
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.includes("-auth-token") || cookie.name.includes("-code-verifier"))
      response.cookies.set(cookie.name, "", { expires: new Date(0), maxAge: 0, path: "/" });
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}
