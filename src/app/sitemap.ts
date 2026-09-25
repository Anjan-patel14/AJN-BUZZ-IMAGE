import type { MetadataRoute } from 'next';
import { IMAGE_TOOLS } from '@/lib/image-tools';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

const GENERATED_AT = new Date();
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
    lastModified: GENERATED_AT,
    changeFrequency: path === '/' || path === '/tools' ? ('daily' as const) : ('weekly' as const),
    priority: path === '/' ? 1 : path === '/tools' ? 0.95 : 0.65,
  }));

  const toolEntries: MetadataRoute.Sitemap = IMAGE_TOOLS.map(tool => ({
    url: `${SITE_URL}/tools/${tool.id}`,
    lastModified: GENERATED_AT,
    changeFrequency: tool.id === 'compress' ? ('daily' as const) : ('weekly' as const),
    priority: tool.id === 'compress' ? 1 : tool.featured ? 0.9 : 0.8,
  }));

  return [...staticEntries, ...toolEntries];
}
