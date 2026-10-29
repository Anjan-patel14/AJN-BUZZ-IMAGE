'use client';

import { Inter, Manrope } from 'next/font/google';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body className="ajn-light-only" style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '60px 20px', background: '#f7f9fd' }}>
        <h1 style={{ fontSize: '32px', color: '#14243a' }}>System Error</h1>
        <p style={{ color: '#627189', margin: '16px 0 24px' }}>
          {error.message || 'An unexpected global application error occurred.'}
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            background: '#1769e8',
            color: '#fff',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
