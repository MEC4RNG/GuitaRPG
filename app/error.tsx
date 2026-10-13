"use client";

import Link from "next/link";

export default function RouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-fallback" aria-labelledby="route-error-title">
      <p className="eyebrow">RECOVERY</p>
      <h1 id="route-error-title">This screen could not be shown.</h1>
      <p>Your Player data has not been changed. Retry this screen or return Home.</p>
      <div className="error-fallback__actions">
        <button className="action-button action-button--primary" type="button" onClick={reset}>
          Retry
        </button>
        <Link className="action-button action-button--secondary" href="/">
          Return Home
        </Link>
      </div>
    </main>
  );
}
