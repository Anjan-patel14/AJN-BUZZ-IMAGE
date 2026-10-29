'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { Page } from '@/components/Shell';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Page>
      <main className="section page-top">
        <div className="container narrow" style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>
            Application Error
          </div>
          <h1 className="page-title">Something went wrong.</h1>
          <p className="lead" style={{ margin: '0 auto 24px' }}>
            {error.message || 'An unexpected error occurred while processing.'}
          </p>
          <div className="center-actions">
            <button className="btn primary" onClick={() => reset()}>
              <RefreshCw size={16} /> Try Again
            </button>
            <Link className="btn" href="/">
              Go to Homepage
            </Link>
          </div>
        </div>
      </main>
    </Page>
  );
}
