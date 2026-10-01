import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';
import './ambient-light.css';
import { AmbientBackground } from '@/components/AmbientBackground';
import { AdSenseScriptLoader } from '@/components/AdSenseScriptLoader';
import { CookieConsent } from '@/components/CookieConsent';
import { ADSENSE_CLIENT } from '@/lib/ads';
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'AJN BUZZ IMAGE — Resize, Compress, Crop & Convert Images', template: '%s | AJN BUZZ IMAGE' },
  description: SITE_DESCRIPTION, applicationName: SITE_NAME, category: 'technology',
  authors: [{ name: SITE_NAME, url: SITE_URL }], creator: SITE_NAME, publisher: SITE_NAME,
  keywords: ['resize image','compress image','compress image to 100kb','passport photo maker','signature maker','crop image','image converter','AJN BUZZ'],
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/favicon.ico' }, { url: '/favicon.png', type: 'image/png' }], apple: [{ url: '/apple-touch-icon.png' }] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  alternates: { canonical: '/' },
  openGraph: { title: 'AJN BUZZ IMAGE — Online Image Tools', description: SITE_DESCRIPTION, url: '/', siteName: SITE_NAME, type: 'website', images: [{ url: DEFAULT_OG_IMAGE, width: 512, height: 512, alt: 'AJN BUZZ IMAGE logo' }] },
  twitter: { card: 'summary_large_image', title: 'AJN BUZZ IMAGE — Online Image Tools', description: SITE_DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
  other: { 'google-adsense-account': ADSENSE_CLIENT },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description: SITE_DESCRIPTION, inLanguage: 'en' },
    { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/brand/ajn-buzz-logo.png` },
    { '@type': 'SoftwareApplication', '@id': `${SITE_URL}/#application`, name: SITE_NAME, url: SITE_URL, applicationCategory: 'MultimediaApplication', operatingSystem: 'Any', description: SITE_DESCRIPTION, featureList: ['Image compression to KB or MB targets','Pixel and physical image resizing','Passport and ID photo sizing','Signature creation and resizing','Image crop and aspect ratio crop','Image conversion to JPG, PNG and WebP','Background and photo editing','Image metadata removal'] },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-theme="light" style={{ colorScheme: 'light' }} className={`${manrope.variable} ${inter.variable}`}><body className="ajn-light-only"><AmbientBackground /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />{children}<AdSenseScriptLoader /><CookieConsent /></body></html>;
}
