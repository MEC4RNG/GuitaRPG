import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await (await createServerSupabaseClient()).auth.getUser();
  if (error) return NextResponse.json({ error: "Identity lookup failed" }, { status: 503 });

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
