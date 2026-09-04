import Link from "next/link";

export default function NotFound() {
  return (
    <main className="recovery-page">
      <div className="recovery-card">
        <div className="eyebrow">404</div>
        <h1>Image tool not found.</h1>
        <p>
          Open the image tools directory and choose a supported AJN Buzz
          workflow.
        </p>
        <div className="recovery-actions">
          <Link className="btn primary" href="/tools">
            Image Tools
          </Link>
          <Link className="btn" href="/">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
