import type { Metadata } from 'next';

const configuredSiteUrl = process.env.NODE_ENV === 'production'
  ? 'https://www.ajn.buzz'
  : process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ajn.buzz';

export const SITE_URL = configuredSiteUrl.replace(/\/$/, '');
export const SITE_NAME = 'AJN Buzz';
export const SITE_DESCRIPTION = 'Fast online image tools for compressing photos to KB or MB, resizing, cropping, converting, editing, watermarking and more.';
export const DEFAULT_OG_IMAGE = '/brand/ajn-buzz-logo.png';

export const BASE_IMAGE_KEYWORDS = [
  'online image tools',
  'compress image',
  'compress image to kb',
  'compress image to mb',
  'reduce image size',
  'image size reducer',
  'photo compressor',
  'resize image',
  'crop image',
  'convert image',
  'photo editor',
  'watermark image',
  'remove background',
  'upscale image',
  'image to jpg',
  'jpg to png',
  'jpg to webp',
  'AJN Buzz',
];

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildPageMetadata({
  title,
  description,
  path,
  index = true,
  keywords = [],
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  keywords?: string[];
}): Metadata {
  const canonicalPath = path.startsWith('/') ? path : `/${path}`;
  const canonical = absoluteUrl(canonicalPath);
  const mergedKeywords = [...new Set([...BASE_IMAGE_KEYWORDS, ...keywords])];

  return {
    title,
    description,
    keywords: mergedKeywords,
    alternates: { canonical },
    category: 'technology',
    authors: [{ name: 'AJN Buzz', url: SITE_URL }],
    creator: 'AJN Buzz',
    publisher: 'AJN Buzz',
    robots: {
      index,
      follow: index,
      googleBot: {
        index,
        follow: index,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: 'website',
      images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE), width: 512, height: 512, alt: 'AJN Buzz image tools' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [absoluteUrl(DEFAULT_OG_IMAGE)],
    },
  };
}
