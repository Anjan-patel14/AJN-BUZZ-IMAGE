import type { MetadataRoute } from 'next';
import { IMAGE_TOOLS } from '@/lib/image-tools';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

const STATIC_ROUTES = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' as const },
  { path: '/tools', priority: 0.95, changeFrequency: 'daily' as const },
  { path: '/features', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/help', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/faq', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/about', priority: 0.65, changeFrequency: 'monthly' as const },
  { path: '/privacy', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/terms', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const toolEntries: MetadataRoute.Sitemap = IMAGE_TOOLS.map((tool) => ({
    url: `${SITE_URL}/${tool.id}`,
    lastModified: now,
    changeFrequency: tool.featured ? ('weekly' as const) : ('weekly' as const),
    priority: tool.featured ? 0.9 : 0.85,
  }));

  return [...staticEntries, ...toolEntries];
}
