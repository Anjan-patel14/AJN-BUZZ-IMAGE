"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

const KEY = 'ajn_buzz_cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(!localStorage.getItem(KEY));
  }, []);
  if (!visible) return null;

  const choose = (value: 'accepted' | 'essential') => {
    localStorage.setItem(KEY, value);
    window.dispatchEvent(new Event('ajn-buzz-cookie-consent-changed'));
    setVisible(false);
  };

  return (
    <div className="cookie-consent" role="dialog" aria-label="Cookie and storage preferences">
      <div>
        <b>Cookie &amp; local storage notice</b>
        <p>
          AJN BUZZ IMAGE processes images locally in your browser and uses <code>localStorage</code> for saved presets, favorites, and recent tools. The Google AdSense tag loads in the site header for publisher verification, while optional in-page ad slots remain off unless you select &ldquo;Allow optional ads&rdquo;. See our{' '}
          <Link href="/privacy" style={{ textDecoration: 'underline', fontWeight: 700, color: 'var(--ajn-blue)' }}>
            Privacy Policy
          </Link>
          .
        </p>
      </div>
      <div className="cookie-actions">
        <button className="btn compact" type="button" onClick={() => choose('essential')}>
          Essential only
        </button>
        <button className="btn primary compact" type="button" onClick={() => choose('accepted')}>
          Allow optional ads
        </button>
      </div>
    </div>
  );
}
