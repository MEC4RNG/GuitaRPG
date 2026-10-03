import { type NextRequest, NextResponse } from "next/server";

import { getVerifiedRequestUser } from "@/lib/auth/server-user";
import { PLAYER_EXPORT_VERSION } from "@/lib/account/data-control";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { accessToken, data, error: identityError } = await getVerifiedRequestUser(request);
  const user = data.user;
  if (identityError)
    return NextResponse.json({ error: "Identity verification failed." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.is_anonymous || !user.email)
    return NextResponse.json(
      {
        error: "Protect this guest Player before exporting data.",
        code: "ACCOUNT_PROTECTION_REQUIRED",
      },
      { status: 403 },
    );

  if (!accessToken)
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const client = createAuthenticatedSupabaseClient(accessToken);
  const { data: snapshot, error } = await client.rpc("export_player_data_v1");
  if (error || !snapshot)
    return NextResponse.json({ error: "Player data export is unavailable." }, { status: 500 });

  const exportedAt = new Date().toISOString();
  const body = {
    ...(snapshot as Record<string, unknown>),
    export_version: PLAYER_EXPORT_VERSION,
    exported_at: (snapshot as Record<string, unknown>).exported_at ?? exportedAt,
    identity: { player_id: user.id, email: user.email, account_type: "RECOVERABLE" },
  };
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="guitarrpg-player-data-${exportedAt.slice(0, 10)}.json"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
