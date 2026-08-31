import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BadgeCheck, HardDrive, Images } from 'lucide-react';
import { Page } from '@/components/Shell';
import { AdSlot } from '@/components/AdSlot';
import { ImageEditor } from '@/components/ImageEditor';
import { IMAGE_TOOLS, TOOL_MAP, type ToolId } from '@/lib/image-tools';
import { ToolIcon } from '@/components/ToolIcon';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';

export function generateStaticParams() {
  return IMAGE_TOOLS.map(tool => ({ slug: tool.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = TOOL_MAP.get(slug as ToolId);
  if (!tool) return { title: 'Tool Not Found', robots: { index: false, follow: false } };

  return buildPageMetadata({
    title: `${tool.name} — Online Image Tool`,
    description: tool.description,
    path: `/tools/${tool.id}`,
    index: true,
    keywords: [
      tool.name,
      tool.shortName,
      tool.category,
      tool.formats,
      `${tool.name.toLowerCase()} online`,
      `${tool.name.toLowerCase()} tool`,
      ...tool.seoKeywords,
    ],
  });
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = TOOL_MAP.get(slug as ToolId);
  if (!tool) return notFound();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.name,
    description: tool.description,
    url: `${SITE_URL}/tools/${tool.id}`,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires a modern browser with File and Canvas APIs',
    featureList: [tool.description, tool.formats],
  };

  return (
    <Page>
      <main className="section tool-page">
        <div className="container">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
          <div className="tool-hero">
            <div className={`tool-icon tool-icon-${tool.category.toLowerCase()} large`}>
              <ToolIcon name={tool.icon} size={31} />
            </div>
            <div>
              <div className="eyebrow">
                {tool.category}
                {tool.badge ? ` · ${tool.badge}` : ''}
              </div>
              <h1 className="tool-title">{tool.name}</h1>
              <p className="lead">{tool.description}</p>
              <div className="tool-trust">
                <span><HardDrive size={15} /> Browser processing</span>
                <span><Images size={15} /> {tool.id === 'compress' ? 'Current selected image' : 'Multiple images'}</span>
                <span><BadgeCheck size={15} /> {tool.formats}</span>
              </div>
            </div>
          </div>
          <ImageEditor tool={tool} />
          <AdSlot slot={`tool-${tool.id}`} />
        </div>
      </main>
    </Page>
  );
}
