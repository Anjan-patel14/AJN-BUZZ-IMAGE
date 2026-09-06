import type { Metadata } from "next";

const configuredSiteUrl =
  process.env.NODE_ENV === "production"
    ? "https://www.ajn.buzz"
    : process.env.NEXT_PUBLIC_SITE_URL || "https://www.ajn.buzz";

export const SITE_URL = configuredSiteUrl.replace(/\/$/, "");
export const SITE_NAME = "AJN Buzz";
export const SITE_DESCRIPTION =
  "Online image tools for exact KB or MB compression, resizing, cropping, converting, editing, watermark cleanup, HTML to image and more.";
export const DEFAULT_OG_IMAGE = "/brand/ajn-buzz-logo.png";

export const BASE_IMAGE_KEYWORDS = [
  "AJN Buzz",
  "online image tools",
  "image tools online",
  "compress image",
  "compress image online",
  "compress image to kb",
  "compress image to mb",
  "reduce image size",
  "image size reducer",
  "resize image",
  "resize image online",
  "crop image",
  "crop image online",
  "image converter",
  "convert image",
  "photo editor online",
  "watermark image",
  "upscale image",
  "rotate image",
  "html to image",
  "html to png",
  "jpg to png",
  "jpg to webp",
];

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const canonical = absoluteUrl(canonicalPath);
  const mergedKeywords = [...new Set([...BASE_IMAGE_KEYWORDS, ...keywords])];

  return {
    title,
    description,
    keywords: mergedKeywords,
    alternates: {
      canonical,
      languages: {
        en: canonical,
        "x-default": canonical,
      },
    },
    category: "technology",
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    robots: {
      index,
      follow: index,
      googleBot: {
        index,
        follow: index,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [
        {
          url: absoluteUrl(DEFAULT_OG_IMAGE),
          width: 512,
          height: 512,
          alt: "AJN Buzz online image tools",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [absoluteUrl(DEFAULT_OG_IMAGE)],
    },
  };
}
