import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";
import "./ambient-light.css";
import { AmbientBackground } from "@/components/AmbientBackground";
import { AdSenseScriptLoader } from "@/components/AdSenseScriptLoader";
import { CookieConsent } from "@/components/CookieConsent";
import { ADSENSE_CLIENT } from "@/lib/ads";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Online Image Tools — Compress, Resize, Crop & Convert | AJN Buzz",
    template: "%s | AJN Buzz",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "technology",
  authors: [{ name: "AJN Buzz", url: SITE_URL }],
  creator: "AJN Buzz",
  publisher: "AJN Buzz",
  keywords: [
    "online image tools",
    "compress image to kb",
    "compress image to 100kb",
    "compress image to 200kb",
    "image size reducer",
    "compress image to mb",
    "resize image",
    "crop image",
    "convert image",
    "photo editor",
    "remove background",
    "AJN Buzz",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: { canonical: "/" },
  openGraph: {
    title: "AJN Buzz — Online Image Tools",
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, alt: "AJN Buzz image tools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AJN Buzz — Online Image Tools",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  other: {
    "google-adsense-account": ADSENSE_CLIENT,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#application`,
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any",
      description: SITE_DESCRIPTION,
      featureList: [
        "Target-size image compression in KB or MB",
        "Image resize and crop",
        "Image format conversion",
        "Photo adjustments",
        "Text watermarking",
        "Flat-background removal",
        "Image upscaling",
        "Rotate and flip",
      ],
    },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      style={{ colorScheme: "light" }}
      className={`${manrope.variable} ${inter.variable} ${jetBrainsMono.variable}`}
    >
      <body className="ajn-light-only">
        <AmbientBackground />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        <AdSenseScriptLoader />
        <CookieConsent />
      </body>
    </html>
  );
}
