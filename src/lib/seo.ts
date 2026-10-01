import type { Metadata } from 'next';

const configuredSiteUrl = process.env.NODE_ENV === 'production'
  ? 'https://www.ajn.buzz'
  : process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ajn.buzz';

export const SITE_URL = configuredSiteUrl.replace(/\/$/, '');
export const SITE_NAME = 'AJN BUZZ IMAGE';
export const SITE_DESCRIPTION = 'Online image tools for resizing, compression, photo sizing, signatures, cropping, conversion, background work and image editing.';
export const DEFAULT_OG_IMAGE = '/brand/ajn-buzz-logo.png';

export const BASE_IMAGE_KEYWORDS = [
  'image tools', 'online image tools', 'resize image', 'compress image', 'compress image to kb',
  'compress image to mb', 'reduce image size', 'image size reducer', 'photo compressor',
  'resize image in cm', 'resize image in mm', 'resize image in inches', 'photo size converter',
  'passport photo maker', 'id photo maker', '35x45 photo', '2x2 photo', 'signature maker',
  'signature resize', 'signature size reducer', 'crop image', 'aspect ratio crop', 'photo editor',
  'watermark image', 'remove background', 'change photo background', 'upscale image',
  'rotate image', 'remove image metadata', 'image to jpg', 'jpg to png', 'jpg to webp', 'AJN BUZZ',
];

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildPageMetadata({
  title, description, path, index = true, keywords = [], image = DEFAULT_OG_IMAGE,
}: {
  title: string; description: string; path: string; index?: boolean; keywords?: string[]; image?: string;
}): Metadata {
  const canonicalPath = path.startsWith('/') ? path : `/${path}`;
  const canonical = absoluteUrl(canonicalPath);
  const imageUrl = absoluteUrl(image);
  const mergedKeywords = [...new Set([...BASE_IMAGE_KEYWORDS, ...keywords])];
  return {
    title, description, keywords: mergedKeywords, alternates: { canonical }, category: 'technology',
    authors: [{ name: SITE_NAME, url: SITE_URL }], creator: SITE_NAME, publisher: SITE_NAME,
    robots: { index, follow: index, googleBot: { index, follow: index, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: canonical, siteName: SITE_NAME, type: 'website', images: [{ url: imageUrl, alt: title }] },
    twitter: { card: 'summary_large_image', title: `${title} | ${SITE_NAME}`, description, images: [imageUrl] },
  };
}
