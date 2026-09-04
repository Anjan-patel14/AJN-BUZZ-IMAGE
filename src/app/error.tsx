"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("AJN Buzz route error", error);
  }, [error]);
  return (
    <main className="recovery-page">
      <div className="recovery-card">
        <div className="eyebrow">AJN Buzz</div>
        <h1>That tool hit a temporary error.</h1>
        <p>
          Your selected file was not uploaded by this error screen. Retry the
          tool or return to the image tools directory.
        </p>
        <div className="recovery-actions">
          <button className="btn primary" onClick={reset}>
            Try again
          </button>
          <Link className="btn" href="/tools">
            Image Tools
          </Link>
        </div>
      </div>
    </main>
  );
}
