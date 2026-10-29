import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { Page } from '@/components/Shell';

export default function NotFound() {
  return (
    <Page>
      <main className="section page-top">
        <div className="container narrow" style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>
            <Search size={14} /> Page Not Found
          </div>
          <h1 className="page-title">404 — Tool or page not found.</h1>
          <p className="lead" style={{ margin: '0 auto 24px' }}>
            The requested image tool or page could not be found. Choose from our 30 focused image tools.
          </p>
          <div className="center-actions">
            <Link className="btn primary" href="/tools">
              <ArrowLeft size={16} /> Browse All Image Tools
            </Link>
            <Link className="btn" href="/">
              Go to Homepage
            </Link>
          </div>
        </div>
      </main>
    </Page>
  );
}
