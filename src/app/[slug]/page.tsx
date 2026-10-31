import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, Image as ImageIcon } from 'lucide-react';
import { Page } from '@/components/Shell';
import { AdSlot } from '@/components/AdSlot';
import { ImageEditor } from '@/components/ImageEditor';
import { IMAGE_TOOLS, TOOL_MAP, type ToolId } from '@/lib/image-tools';
import { getToolDetailedGuide } from '@/lib/tool-seo-content';
import { ToolIcon } from '@/components/ToolIcon';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';

export function generateStaticParams() {
  return IMAGE_TOOLS.map(tool => ({ slug: tool.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = params ? await params : { slug: '' };
  const tool = TOOL_MAP.get(resolvedParams.slug as ToolId);
  if (!tool) return { title: 'Tool Not Found', robots: { index: false, follow: false } };
  return buildPageMetadata({
    title: tool.seoTitle,
    description: tool.seoDescription,
    path: `/${tool.id}`,
    index: true,
    keywords: [tool.name, tool.shortName, tool.category, tool.formats, ...tool.seoKeywords],
    image: `/seo-tools/${tool.id}.svg`,
  });
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = params ? await params : { slug: '' };
  const tool = TOOL_MAP.get(resolvedParams.slug as ToolId);
  if (!tool) return notFound();

  const guide = getToolDetailedGuide(tool);
  const mergedFaqs = [...tool.faq, ...guide.extraFaqs];
  const related = IMAGE_TOOLS.filter(t => t.id !== tool.id && (t.category === tool.category || t.seoKeywords.some(k => tool.seoKeywords.includes(k)))).slice(0, 6);

  const graph: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/${tool.id}#app`,
        name: tool.name,
        description: tool.seoDescription,
        url: `${SITE_URL}/${tool.id}`,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires a modern browser with File and Canvas APIs',
        featureList: [tool.description, tool.formats],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'AJN BUZZ IMAGE', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Image Tools', item: `${SITE_URL}/tools` },
          { '@type': 'ListItem', position: 3, name: tool.name, item: `${SITE_URL}/${tool.id}` },
        ],
      },
      {
        '@type': 'ImageObject',
        contentUrl: `${SITE_URL}/seo-tools/${tool.id}.svg`,
        url: `${SITE_URL}/seo-tools/${tool.id}.svg`,
        caption: `${tool.name} — AJN BUZZ IMAGE`,
      },
      {
        '@type': 'FAQPage',
        mainEntity: mergedFaqs.map(item => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  return (
    <Page>
      <main className="section tool-page">
        <div className="container">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">AJN BUZZ IMAGE</Link>
            <span>/</span>
            <Link href="/tools">Image Tools</Link>
            <span>/</span>
            <b>{tool.name}</b>
          </nav>

          <div className="tool-hero compact-tool-hero">
            <div className={`tool-icon tool-icon-${tool.category.toLowerCase().replaceAll(' ', '-')} large`}>
              <ToolIcon name={tool.icon} size={28} />
            </div>
            <div>
              <div className="eyebrow">{tool.category} · {tool.formats}</div>
              <h1 className="tool-title">{tool.name}</h1>
              <p className="tool-summary">{tool.summary}</p>
            </div>
          </div>

          <ImageEditor tool={tool} />

          <AdSlot slot={`tool-${tool.id}`} />

          <section className="tool-seo-card" aria-labelledby={`${tool.id}-details`}>
            <div className="tool-seo-copy">
              <div className="eyebrow">Step-by-step guide &amp; specifications</div>
              <h2 id={`${tool.id}-details`}>{tool.seoTitle}</h2>
              <p>{guide.purpose}</p>
              <p className="small muted"><b>Supported formats:</b> {tool.formats} · <b>Processing:</b> 100% browser-local HTML5 Canvas &amp; Blob APIs</p>

              <h3>How to use {tool.name}</h3>
              <ol>
                {guide.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>

              <h3>Practical use cases</h3>
              <ul className="tool-guide-list">
                {guide.useCases.map((uc, index) => (
                  <li key={index}>{uc}</li>
                ))}
              </ul>

              {guide.specs?.length ? (
                <div className="tool-spec-table-wrap">
                  <h3>Common size &amp; DPI reference specifications</h3>
                  <table className="tool-spec-table">
                    <thead>
                      <tr>
                        <th>Preset / Format</th>
                        <th>Physical Size</th>
                        <th>Pixels at 300 DPI</th>
                        <th>Common Application</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guide.specs.map(row => (
                        <tr key={row.label}>
                          <td><b>{row.label}</b></td>
                          <td>{row.dimension}</td>
                          <td>{row.pixels300Dpi}</td>
                          <td>{row.typicalUse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <h3>Common problems &amp; solutions</h3>
              <div className="tool-troubleshooting">
                {guide.troubleshooting.map(item => (
                  <div className="troubleshooting-item" key={item.problem}>
                    <b>Problem: {item.problem}</b>
                    <p>Solution: {item.solution}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="tool-faq-mini">
              <div className="eyebrow" style={{ marginBottom: '6px' }}>Frequently asked questions</div>
              {mergedFaqs.map((item, idx) => (
                <details key={item.question} open={idx === 0}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="tool-image-seo" style={{ marginTop: '24px' }}>
            <div className="tool-image-seo-copy">
              <div className="eyebrow">{tool.name}</div>
              <h2>Overview · {tool.name}</h2>
              <p>{tool.description}</p>
              <div className="tool-points">
                <span><Check size={14} /> Focused workflow</span>
                <span><Check size={14} /> Clear controls</span>
                <span><Check size={14} /> Download result</span>
              </div>
            </div>
            <div className="tool-image-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/seo-tools/${tool.id}.svg`}
                alt={`${tool.name} online tool preview`}
                width="1200"
                height="675"
                loading="lazy"
                style={{ maxWidth: '100%', width: '100%', height: 'auto', display: 'block' }}
              />
              <span><ImageIcon size={14} /> Tool preview</span>
            </div>
          </div>

          {related.length ? (
            <section className="related-tools">
              <div className="sectionhead">
                <div>
                  <div className="eyebrow">Related tools</div>
                  <h2>More {tool.category} tools</h2>
                </div>
              </div>
              <div className="related-grid">
                {related.map(t => (
                  <Link className="related-card" href={`/${t.id}`} key={t.id}>
                    <span className="tool-icon small">
                      <ToolIcon name={t.icon} size={18} />
                    </span>
                    <div>
                      <b>{t.name}</b>
                      <small>{t.summary}</small>
                    </div>
                    <ArrowRight size={15} />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </Page>
  );
}
