import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  confirmEmailToken,
  parseConfirmationRequest,
  safeInternalPath,
  type ConfirmationClient,
} from "@/lib/auth/confirmation";

describe("DATA-003 SSR email confirmation", () => {
  it("accepts only the bounded email OTP types and a token hash", () => {
    for (const type of ["magiclink", "email", "email_change"]) {
      const parsed = parseConfirmationRequest(
        new URL(`http://localhost/auth/confirm?token_hash=secret&type=${type}&next=/profile`),
      );
      expect(parsed).toMatchObject({ valid: true, tokenHash: "secret", type, next: "/profile" });
    }
    expect(
      parseConfirmationRequest(
        new URL("http://localhost/auth/confirm?token_hash=secret&type=recovery"),
      ).valid,
    ).toBe(false);
    expect(
      parseConfirmationRequest(new URL("http://localhost/auth/confirm?type=email")).valid,
    ).toBe(false);
  });

  it("allows only single-slash local redirect paths", () => {
    expect(safeInternalPath("/profile?linked=1")).toBe("/profile?linked=1");
    expect(safeInternalPath("https://attacker.test")).toBe("/profile");
    expect(safeInternalPath("//attacker.test")).toBe("/profile");
    expect(safeInternalPath(null)).toBe("/profile");
  });

  it("exchanges a supported token without logging or retaining it", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });
    const refreshSession = vi.fn().mockResolvedValue({ error: null });
    await expect(
      confirmEmailToken(
        { auth: { verifyOtp, refreshSession } } as ConfirmationClient,
        "one-time-hash",
        "email_change",
      ),
    ).resolves.toBe(true);
    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "one-time-hash",
      type: "email_change",
    });
    expect(refreshSession).toHaveBeenCalledOnce();
    verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    await expect(
      confirmEmailToken(
        { auth: { verifyOtp, refreshSession } } as ConfirmationClient,
        "expired-hash",
        "magiclink",
      ),
    ).resolves.toBe(false);
    expect(refreshSession).toHaveBeenCalledOnce();
  });

  it("uses the existing SSR server client and safe failure redirect", () => {
    const route = readFileSync("app/auth/confirm/route.ts", "utf8");
    expect(route).toContain("createServerSupabaseClient");
    expect(route).toContain("confirmEmailToken");
    expect(route).toContain("response.cookies.set");
    expect(route).toContain("/profile?auth_error=invalid");
    expect(route).not.toMatch(/console\.|tokenHash\)/);
  });
});
