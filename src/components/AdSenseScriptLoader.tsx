"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { IMAGE_TOOLS } from '@/lib/image-tools';
import { ADSENSE_CLIENT } from '@/lib/ads';

const SCRIPT_ID = 'ajn-buzz-adsense-script';
export const ADS_READY_EVENT = 'ajn-buzz-adsense-ready';
const AD_ELIGIBLE_PATHS = new Set(['/', ...IMAGE_TOOLS.map(tool => `/tools/${tool.id}`)]);
export function isBuzzAdEligiblePath(pathname: string) { const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname; return AD_ELIGIBLE_PATHS.has(normalized); }

export function AdSenseScriptLoader() {
  const pathname = usePathname();
  useEffect(() => {
    const sync = () => {
      const existing = document.getElementById(SCRIPT_ID);
      const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || ADSENSE_CLIENT;
      const host = window.location.hostname.toLowerCase();
      const productionHost = host === 'ajn.buzz' || host === 'www.ajn.buzz';
      const consent = localStorage.getItem('ajn_buzz_cookie_consent') === 'accepted';
      const allowed = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ADS_ENABLED === 'true' && productionHost && consent && Boolean(client) && isBuzzAdEligiblePath(pathname);
      if (!allowed) { existing?.remove(); return; }
      if (existing) { window.dispatchEvent(new Event(ADS_READY_EVENT)); return; }
      const script = document.createElement('script');
      script.id = SCRIPT_ID; script.async = true; script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
      script.addEventListener('load', () => window.dispatchEvent(new Event(ADS_READY_EVENT)), { once: true });
      document.head.appendChild(script);
    };
    sync(); window.addEventListener('ajn-buzz-cookie-consent-changed', sync);
    return () => window.removeEventListener('ajn-buzz-cookie-consent-changed', sync);
  }, [pathname]);
  return null;
}
