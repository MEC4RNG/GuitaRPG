"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="error-fallback" aria-labelledby="global-error-title">
          <h1 id="global-error-title">GuitaRPG needs another try.</h1>
          <p>No technical details or private Player data are shown here.</p>
          <div className="error-fallback__actions">
            <button type="button" onClick={reset}>
              Retry
            </button>
            <Link href="/">Return Home</Link>
          </div>
        </main>
      </body>
    </html>
  );
}
