"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  beginGuestEmailLink,
  GUEST_RECOVERY_WARNING,
  type IdentityState,
  readIdentityState,
  sendReturningSignInLink,
  signOutRecoverableUser,
} from "@/lib/auth/recoverable-identity";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const identityClient = () => {
  const client = createBrowserSupabaseClient();
  return {
    auth: {
      getTrustedIdentity: async () => {
        const response = await fetch("/auth/identity", {
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok)
          return { data: { user: null }, error: { message: "Identity lookup failed" } };
        return {
          data: (await response.json()) as {
            user: { id: string; email?: string; is_anonymous?: boolean } | null;
          },
          error: null,
        };
      },
      getUser: () => client.auth.getUser(),
      updateUser: (...parameters: Parameters<typeof client.auth.updateUser>) =>
        client.auth.updateUser(...parameters),
      signInWithOtp: (...parameters: Parameters<typeof client.auth.signInWithOtp>) =>
        client.auth.signInWithOtp(...parameters),
      signOut: () => client.auth.signOut(),
    },
  };
};
const confirmationRedirect = () => `${window.location.origin}/auth/confirm?next=/profile`;

export function AccountRecoveryPanel({ onboarding = false }: { onboarding?: boolean }) {
  const router = useRouter();
  const [identity, setIdentity] = useState<IdentityState | null>(null);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void readIdentityState(identityClient())
      .then(setIdentity)
      .catch(() => setError("Account status is unavailable. Please try again."));
  }, []);

  async function protectProgress() {
    setPending(true);
    setError("");
    setMessage("");
    try {
      await beginGuestEmailLink(identityClient(), email, confirmationRedirect());
      setMessage("Check your inbox to finish protecting this guest Player.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to protect this guest Player.");
    } finally {
      setPending(false);
    }
  }

  async function requestSignIn() {
    setPending(true);
    setError("");
    try {
      await sendReturningSignInLink(identityClient(), email, confirmationRedirect());
      setMessage("If a linked GuitaRPG account exists for that email, check your inbox.");
    } catch {
      setMessage("If a linked GuitaRPG account exists for that email, check your inbox.");
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    setPending(true);
    setError("");
    try {
      await signOutRecoverableUser(identityClient());
      setIdentity({
        status: "UNAUTHENTICATED",
        authenticated: false,
        anonymous: false,
        recoverable: false,
        email: null,
      });
      setPending(false);
      router.push("/profile");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign out. Please try again.");
      setPending(false);
    }
  }

  if (!identity)
    return (
      <section className="panel account-recovery" aria-label="Account access">
        <p role={error ? "alert" : "status"}>{error || "Checking account protection…"}</p>
      </section>
    );

  if (identity.status === "UNAUTHENTICATED")
    return (
      <section className="panel account-recovery" aria-labelledby="account-access-title">
        <div>
          <p className="eyebrow">ACCOUNT ACCESS</p>
          <h2 id="account-access-title">Return to a protected Player</h2>
          <p>Request a passwordless email link for an existing linked GuitaRPG account.</p>
        </div>
        <label>
          Linked email
          <input
            autoComplete="email"
            inputMode="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button
          className="action-button action-button--primary"
          disabled={pending}
          type="button"
          onClick={() => void requestSignIn()}
        >
          Email me a sign-in link
        </button>
        <Link className="action-button action-button--secondary" href="/onboarding">
          Start a new guest Player
        </Link>
        {message ? <p role="status">{message}</p> : null}
      </section>
    );

  if (identity.status === "GUEST")
    return (
      <section
        className="panel account-recovery account-recovery--guest"
        aria-labelledby="guest-account-title"
      >
        <div>
          <p className="eyebrow">GUEST PLAYER</p>
          <h2 id="guest-account-title">Protect your progress</h2>
          <p className="guest-warning">{GUEST_RECOVERY_WARNING}</p>
        </div>
        <label>
          Email for recovery
          <input
            autoComplete="email"
            inputMode="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button
          className="action-button action-button--primary"
          disabled={pending}
          type="button"
          onClick={() => void protectProgress()}
        >
          Protect your progress
        </button>
        {onboarding ? (
          <Link className="action-button action-button--secondary" href="/">
            Continue as guest
          </Link>
        ) : null}
        {message ? <p role="status">{message}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </section>
    );

  return (
    <section
      className="panel account-recovery account-recovery--protected"
      aria-labelledby="protected-account-title"
    >
      <div>
        <p className="eyebrow">PROTECTED ACCOUNT</p>
        <h2 id="protected-account-title">Protected / recoverable account</h2>
        <p>
          Linked email: <strong>{identity.email}</strong>. You can recover this Player from another
          browser or device using a passwordless sign-in link.
        </p>
      </div>
      <button
        className="action-button action-button--secondary"
        disabled={pending}
        type="button"
        onClick={() => void signOut()}
      >
        Sign out
      </button>
      {onboarding ? (
        <Link className="action-button action-button--primary" href="/">
          Enter the app
        </Link>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
