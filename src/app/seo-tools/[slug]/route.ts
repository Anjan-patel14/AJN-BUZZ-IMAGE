import { IMAGE_TOOLS } from '@/lib/image-tools';
export { GET } from '../[slug].svg/route';

export function generateStaticParams() {
  return IMAGE_TOOLS.map(tool => ({ slug: `${tool.id}.svg` }));
}
