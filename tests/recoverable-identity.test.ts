import { describe, expect, it, vi } from "vitest";

import {
  beginGuestEmailLink,
  identityStateFromUser,
  readIdentityState,
  sendReturningSignInLink,
  signOutRecoverableUser,
  type RecoverableIdentityClient,
} from "@/lib/auth/recoverable-identity";

const guest = {
  id: "11111111-1111-4111-8111-111111111111",
  is_anonymous: true,
};
const permanent = {
  id: guest.id,
  email: "player@example.test",
  email_confirmed_at: "2026-10-01T12:00:00Z",
  is_anonymous: false,
};

function clientFor(user: typeof guest | typeof permanent | null) {
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue({
        data: {
          claims: user
            ? {
                sub: user.id,
                email: "email" in user ? user.email : undefined,
                is_anonymous: user.is_anonymous,
              }
            : null,
        },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  } as unknown as RecoverableIdentityClient;
}

describe("DATA-003 recoverable identity boundary", () => {
  it("derives unauthenticated, guest, and verified recoverable state from trusted Auth users", () => {
    expect(identityStateFromUser(null).status).toBe("UNAUTHENTICATED");
    expect(identityStateFromUser(guest)).toMatchObject({ status: "GUEST", recoverable: false });
    expect(identityStateFromUser(permanent)).toEqual({
      status: "RECOVERABLE",
      authenticated: true,
      anonymous: false,
      recoverable: true,
      email: "player@example.test",
    });
    expect(identityStateFromUser({ ...permanent, email_confirmed_at: undefined }).status).toBe(
      "RECOVERABLE",
    );
    expect(identityStateFromUser({ id: guest.id, email: permanent.email }).status).toBe(
      "RECOVERABLE",
    );
    expect(identityStateFromUser({ id: guest.id, is_anonymous: false }).status).toBe("GUEST");
  });

  it("prefers verified JWT claims for browser identity reads", async () => {
    const client = clientFor(permanent);
    await expect(readIdentityState(client)).resolves.toMatchObject({
      status: "RECOVERABLE",
      email: permanent.email,
    });
    expect(client.auth.getUser).not.toHaveBeenCalled();
  });

  it("links an email through updateUser in the current guest context", async () => {
    const client = clientFor(guest);
    await expect(
      beginGuestEmailLink(
        client,
        " Player@Example.Test ",
        "http://localhost:3000/auth/confirm?next=/profile",
      ),
    ).resolves.toEqual({ requested: true });
    expect(client.auth.updateUser).toHaveBeenCalledWith(
      { email: "player@example.test" },
      { emailRedirectTo: "http://localhost:3000/auth/confirm?next=/profile" },
    );
  });

  it("uses no-create semantics for returning passwordless sign-in", async () => {
    const client = clientFor(null);
    await sendReturningSignInLink(
      client,
      "player@example.test",
      "http://localhost:3000/auth/confirm?next=/profile",
    );
    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "player@example.test",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/confirm?next=/profile",
        shouldCreateUser: false,
      },
    });
  });

  it("allows sign-out only for a verified recoverable account", async () => {
    const protectedClient = clientFor(permanent);
    await signOutRecoverableUser(protectedClient);
    expect(protectedClient.auth.signOut).toHaveBeenCalledOnce();

    const guestClient = clientFor(guest);
    await expect(signOutRecoverableUser(guestClient)).rejects.toThrow(
      "Guest Players cannot sign out",
    );
    expect(guestClient.auth.signOut).not.toHaveBeenCalled();
  });

  it("normalizes a linking conflict without exposing provider details or changing session", async () => {
    const client = clientFor(guest);
    vi.mocked(client.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: { message: "A user with this email address has already been registered" },
    });
    await expect(
      beginGuestEmailLink(
        client,
        "used@example.test",
        "http://localhost:3000/auth/confirm?next=/profile",
      ),
    ).rejects.toThrow("Your current guest progress has not been changed");
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });
});
