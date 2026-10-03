import { type NextRequest, NextResponse } from "next/server";
import { getVerifiedRequestUser } from "@/lib/auth/server-user";

export async function GET(request: NextRequest) {
  const { data, error } = await getVerifiedRequestUser(request);
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
