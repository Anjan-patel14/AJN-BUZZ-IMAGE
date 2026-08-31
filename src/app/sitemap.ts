import type { MetadataRoute } from 'next';
import { IMAGE_TOOLS } from '@/lib/image-tools';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

const STATIC_INDEXABLE_ROUTES = [
  '/',
  '/tools',
  '/features',
  '/help',
  '/faq',
  '/about',
  '/privacy',
  '/terms',
  '/contact',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_INDEXABLE_ROUTES.map(path => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === '/' ? ('daily' as const) : ('weekly' as const),
    priority: path === '/' ? 1 : path === '/tools' ? 0.9 : 0.65,
  }));

  const toolEntries: MetadataRoute.Sitemap = IMAGE_TOOLS.map(tool => ({
    url: `${SITE_URL}/tools/${tool.id}`,
    changeFrequency: 'weekly' as const,
    priority: tool.featured ? 0.9 : 0.8,
  }));

  return [...staticEntries, ...toolEntries];
}
