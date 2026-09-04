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
        <main className="recovery-page">
          <div className="recovery-card">
            <h1>AJN Buzz could not load this page.</h1>
            <p>Retry once. If the problem continues, return to the homepage.</p>
            <div className="recovery-actions">
              <button className="btn primary" onClick={reset}>
                Try again
              </button>
              <Link className="btn" href="/">
                Home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
