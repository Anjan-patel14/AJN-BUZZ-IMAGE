import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { Page } from '@/components/Shell';
import { AdSlot } from '@/components/AdSlot';
import { ToolCatalog } from '@/components/ToolCatalog';
import { IMAGE_TOOLS } from '@/lib/image-tools';
import { PDF_SHORTCUTS } from '@/lib/pdf-shortcuts';

export const metadata = buildPageMetadata({
  title: 'Online Image Tools — Compress to KB/MB, Resize, Crop & Convert',
  description: 'Production browser image tools with real target-size compression, resize, crop, conversion, editing and direct AJN PDF shortcuts.',
  path: '/',
  index: true,
});

const toolListStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'AJN Buzz Image Tools',
  itemListElement: IMAGE_TOOLS.map((tool, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: tool.name,
    url: `${SITE_URL}/tools/${tool.id}`,
  })),
};

export default function Home() {
  return (
    <Page>
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(toolListStructuredData) }}
        />

        <section className="hero ajnpdf-hero" style={{ padding: '34px 0 20px' }}>
          <div className="simple-hero-inner">
            <div className="eyebrow">AJN Buzz</div>
            <h1>Image tools. Get it done.</h1>
            <div className="hero-actions">
              <Link className="btn primary" href="/tools/compress">
                Compress Image <ArrowRight size={16} />
              </Link>
              <Link className="btn" href="/tools">All Tools</Link>
            </div>
          </div>
        </section>

        <section className="section tools-home" style={{ padding: '12px 0 34px' }}>
          <div className="container">
            <ToolCatalog />
            <AdSlot slot="home" />
          </div>
        </section>

        <section className="section pdf-shortcuts-section" style={{ padding: '26px 0 42px' }}>
          <div className="container">
            <div className="pdf-section-head">
              <div>
                <div className="eyebrow">PDF tools</div>
                <h2>Open in AJN PDF</h2>
              </div>
              <a className="btn" href="https://ajnpdf.com" target="_blank" rel="noopener noreferrer">
                AJN PDF <ExternalLink size={15} />
              </a>
            </div>

            <div className="pdf-shortcut-grid">
              {PDF_SHORTCUTS.map(({ id, name, href, icon: Icon, tone }) => (
                <a
                  className={`pdf-shortcut-card ajn-v4-card ajn-card-${tone === 'amber' ? 'blue' : tone}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={id}
                >
                  <span className={`pdf-shortcut-icon pdf-tone-${tone}`}>
                    <Icon size={21} />
                  </span>
                  <span className="pdf-shortcut-copy"><b>{name}</b></span>
                  <ExternalLink className="pdf-external" size={16} />
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
    </Page>
  );
}