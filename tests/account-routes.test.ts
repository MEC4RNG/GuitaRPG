import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getVerifiedRequestUser: vi.fn(),
  rpc: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("@/lib/auth/server-user", () => ({
  getVerifiedRequestUser: mocks.getVerifiedRequestUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createAuthenticatedSupabaseClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ auth: { admin: { deleteUser: mocks.deleteUser } } }),
}));

import { POST as deleteAccount } from "@/app/api/account/delete/route";
import { GET as exportAccount } from "@/app/api/account/export/route";

const recentUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "player@example.test",
  is_anonymous: false,
  last_sign_in_at: new Date().toISOString(),
};

function deletionRequest(body: unknown, origin = "https://app.test") {
  return new NextRequest("https://app.test/api/account/delete", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("DATA-004 account routes", () => {
  beforeEach(() => {
    mocks.getVerifiedRequestUser.mockReset();
    mocks.rpc.mockReset();
    mocks.deleteUser.mockReset();
    mocks.getVerifiedRequestUser.mockResolvedValue({
      accessToken: "verified-token",
      data: { user: recentUser },
      error: null,
    });
    mocks.rpc.mockResolvedValue({
      data: { export_version: "GUITARPG_PLAYER_EXPORT_V1", profile: {} },
      error: null,
    });
    mocks.deleteUser.mockResolvedValue({ error: null });
  });

  it("rejects unauthenticated and guest exports and safely handles RPC failure", async () => {
    mocks.getVerifiedRequestUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect(
      (await exportAccount(new NextRequest("https://app.test/api/account/export"))).status,
    ).toBe(401);

    mocks.getVerifiedRequestUser.mockResolvedValueOnce({
      accessToken: "guest-token",
      data: { user: { ...recentUser, email: undefined, is_anonymous: true } },
      error: null,
    });
    const guest = await exportAccount(new NextRequest("https://app.test/api/account/export"));
    expect(guest.status).toBe(403);
    await expect(guest.json()).resolves.toMatchObject({ code: "ACCOUNT_PROTECTION_REQUIRED" });

    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "private detail" } });
    const failed = await exportAccount(new NextRequest("https://app.test/api/account/export"));
    expect(failed.status).toBe(500);
    await expect(failed.text()).resolves.not.toContain("private detail");
  });

  it("returns a no-store versioned attachment with no email in its filename", async () => {
    const response = await exportAccount(new NextRequest("https://app.test/api/account/export"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toMatch(
      /guitarrpg-player-data-\d{4}-\d{2}-\d{2}\.json/,
    );
    expect(response.headers.get("content-disposition")).not.toContain(recentUser.email);
    await expect(response.json()).resolves.toMatchObject({
      export_version: "GUITARPG_PLAYER_EXPORT_V1",
      identity: { player_id: recentUser.id, email: recentUser.email },
    });
  });

  it("rejects foreign origins, bad confirmation, spoofed ownership, and unauthenticated deletion", async () => {
    expect(
      (await deleteAccount(deletionRequest({ confirmation: "DELETE" }, "https://evil.test")))
        .status,
    ).toBe(403);
    expect((await deleteAccount(deletionRequest({ confirmation: "delete" }))).status).toBe(400);
    expect(
      (await deleteAccount(deletionRequest({ confirmation: "DELETE", user_id: "foreign" }))).status,
    ).toBe(400);
    mocks.getVerifiedRequestUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await deleteAccount(deletionRequest({ confirmation: "DELETE" }))).status).toBe(401);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("allows confirmed guest and recent permanent deletion of only the verified UUID", async () => {
    mocks.getVerifiedRequestUser.mockResolvedValueOnce({
      data: { user: { id: recentUser.id, is_anonymous: true } },
      error: null,
    });
    expect((await deleteAccount(deletionRequest({ confirmation: "DELETE" }))).status).toBe(200);
    expect(mocks.deleteUser).toHaveBeenLastCalledWith(recentUser.id, false);

    expect((await deleteAccount(deletionRequest({ confirmation: "DELETE" }))).status).toBe(200);
    expect(mocks.deleteUser).toHaveBeenLastCalledWith(recentUser.id, false);
  });

  it("requires real recent sign-in and preserves cookies when admin deletion fails", async () => {
    mocks.getVerifiedRequestUser.mockResolvedValueOnce({
      data: { user: { ...recentUser, last_sign_in_at: "2026-01-01T00:00:00Z" } },
      error: null,
    });
    const stale = await deleteAccount(deletionRequest({ confirmation: "DELETE" }));
    expect(stale.status).toBe(403);
    await expect(stale.json()).resolves.toMatchObject({ code: "REAUTH_REQUIRED" });

    mocks.deleteUser.mockResolvedValueOnce({ error: { message: "secret provider detail" } });
    const failedRequest = deletionRequest({ confirmation: "DELETE" });
    failedRequest.cookies.set("sb-test-auth-token", "preserve-me");
    const failed = await deleteAccount(failedRequest);
    expect(failed.status).toBe(500);
    expect(failed.headers.get("set-cookie")).toBeNull();
    await expect(failed.text()).resolves.not.toContain("secret provider detail");
  });

  it("expires local Auth cookies only after successful hard deletion", async () => {
    const request = deletionRequest({ confirmation: "DELETE" });
    request.cookies.set("sb-test-auth-token", "session-value");
    const response = await deleteAccount(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("sb-test-auth-token=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
