export type AuthIdentityUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  is_anonymous?: boolean;
};

type AuthError = { message?: string; code?: string; status?: number };
type AuthResult<T> = { data: T; error: AuthError | null };

export type RecoverableIdentityClient = {
  auth: {
    getUser(): PromiseLike<AuthResult<{ user: AuthIdentityUser | null }>>;
    updateUser(
      attributes: { email: string },
      options: { emailRedirectTo: string },
    ): PromiseLike<AuthResult<{ user: AuthIdentityUser | null }>>;
    signInWithOtp(credentials: {
      email: string;
      options: { emailRedirectTo: string; shouldCreateUser: false };
    }): PromiseLike<AuthResult<{ user: AuthIdentityUser | null }>>;
    signOut(): PromiseLike<{ error: AuthError | null }>;
  };
};

export type IdentityState =
  | {
      status: "UNAUTHENTICATED";
      authenticated: false;
      anonymous: false;
      recoverable: false;
      email: null;
    }
  | { status: "GUEST"; authenticated: true; anonymous: true; recoverable: false; email: null }
  | {
      status: "RECOVERABLE";
      authenticated: true;
      anonymous: false;
      recoverable: true;
      email: string;
    };

export const GUEST_RECOVERY_WARNING =
  "This guest Player is tied to this browser session. Signing out, clearing site data, or losing this session may make it unrecoverable. Link an email to protect access and sign in on another device.";

export function identityStateFromUser(user: AuthIdentityUser | null): IdentityState {
  if (!user)
    return {
      status: "UNAUTHENTICATED",
      authenticated: false,
      anonymous: false,
      recoverable: false,
      email: null,
    };

  if (user.is_anonymous === true)
    return {
      status: "GUEST",
      authenticated: true,
      anonymous: true,
      recoverable: false,
      email: null,
    };

  // With email confirmations enabled, Supabase only clears the authoritative
  // anonymous claim after the email-change token has been verified. The
  // browser user shape does not consistently repeat email_confirmed_at.
  if (user.is_anonymous !== true && user.email)
    return {
      status: "RECOVERABLE",
      authenticated: true,
      anonymous: false,
      recoverable: true,
      email: user.email,
    };

  return {
    status: "GUEST",
    authenticated: true,
    anonymous: true,
    recoverable: false,
    email: null,
  };
}

export async function readIdentityState(client: RecoverableIdentityClient) {
  const result = await client.auth.getUser();
  if (result.error) throw new Error("Account status is unavailable. Please try again.");
  return identityStateFromUser(result.data.user);
}

function normalizedEmail(email: string) {
  const value = email.trim().toLocaleLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(value)) throw new Error("Enter a valid email address.");
  return value;
}

export async function beginGuestEmailLink(
  client: RecoverableIdentityClient,
  email: string,
  emailRedirectTo: string,
) {
  const current = await readIdentityState(client);
  if (current.status !== "GUEST")
    throw new Error("Only a signed-in guest Player can protect progress this way.");

  const result = await client.auth.updateUser(
    { email: normalizedEmail(email) },
    { emailRedirectTo },
  );
  if (result.error)
    throw new Error(
      "That email can't be linked to this guest Player. Your current guest progress has not been changed.",
    );
  return { requested: true as const };
}

export async function sendReturningSignInLink(
  client: RecoverableIdentityClient,
  email: string,
  emailRedirectTo: string,
) {
  await client.auth.signInWithOtp({
    email: normalizedEmail(email),
    options: { emailRedirectTo, shouldCreateUser: false },
  });

  // Deliberately return the same result for existing and unknown emails.
  return { accepted: true as const };
}

export async function signOutRecoverableUser(client: RecoverableIdentityClient) {
  const current = await readIdentityState(client);
  if (current.status !== "RECOVERABLE")
    throw new Error(
      "Guest Players cannot sign out because their progress may become unrecoverable.",
    );
  const result = await client.auth.signOut();
  if (result.error) throw new Error("Unable to sign out. Please try again.");
}
