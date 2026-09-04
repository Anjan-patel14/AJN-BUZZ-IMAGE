import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { Page } from "@/components/Shell";
import { AdSlot } from "@/components/AdSlot";
import { ImageEditor } from "@/components/ImageEditor";
import { IMAGE_TOOLS, TOOL_MAP, type ToolId } from "@/lib/image-tools";
import { ToolIcon } from "@/components/ToolIcon";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";

export function generateStaticParams() {
  return IMAGE_TOOLS.map((tool) => ({ slug: tool.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = TOOL_MAP.get(slug as ToolId);
  if (!tool)
    return { title: "Tool Not Found", robots: { index: false, follow: false } };

  return buildPageMetadata({
    title: tool.seoTitle,
    description: tool.seoDescription,
    path: `/tools/${tool.id}`,
    index: true,
    keywords: [
      tool.name,
      tool.shortName,
      tool.category,
      tool.formats,
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

  const relatedTools = IMAGE_TOOLS.filter(
    (candidate) => candidate.id !== tool.id,
  )
    .sort(
      (a, b) =>
        Number(b.category === tool.category) -
        Number(a.category === tool.category),
    )
    .slice(0, 4);

  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/tools/${tool.id}#app`,
      name: tool.name,
      description: tool.seoDescription,
      url: `${SITE_URL}/tools/${tool.id}`,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any",
      browserRequirements:
        "Requires a modern browser with File and Canvas APIs",
      featureList: [tool.description, tool.formats, ...tool.useCases],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "AJN Buzz", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Image Tools",
          item: `${SITE_URL}/tools`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: tool.name,
          item: `${SITE_URL}/tools/${tool.id}`,
        },
      ],
    },
    {
      "@type": "HowTo",
      name: `How to use ${tool.name}`,
      description: tool.summary,
      step: tool.steps.map((text, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        text,
      })),
    },
  ];

  if (tool.faq.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: tool.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  const structuredData = { "@context": "https://schema.org", "@graph": graph };

  return (
    <Page>
      <main className="section tool-page">
        <div className="container">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />

          <div className="tool-hero compact-tool-hero">
            <div
              className={`tool-icon tool-icon-${tool.category.toLowerCase()} large`}
            >
              <ToolIcon name={tool.icon} size={28} />
            </div>
            <div>
              <div className="eyebrow">{tool.category}</div>
              <h1 className="tool-title">{tool.name}</h1>
              <p className="tool-summary">{tool.summary}</p>
            </div>
          </div>

          <ImageEditor tool={tool} />
          <AdSlot slot={`tool-${tool.id}`} />

          <section
            className="tool-seo-card"
            aria-labelledby={`${tool.id}-details`}
          >
            <div className="tool-seo-copy">
              <div className="eyebrow">Quick guide</div>
              <h2 id={`${tool.id}-details`}>{tool.seoTitle}</h2>
              <p>{tool.description}</p>
              <div className="use-case-chips" aria-label="Popular uses">
                {tool.useCases.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
            {tool.faq.length ? (
              <div className="tool-faq-mini">
                {tool.faq.map((item) => (
                  <details key={item.question}>
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            ) : null}
          </section>

          <section
            className="related-tools-section"
            aria-label="Related image tools"
          >
            <div className="compact-section-head">
              <div>
                <div className="eyebrow">Related tools</div>
                <h2>Continue with another image task.</h2>
              </div>
            </div>
            <div className="related-tool-grid">
              {relatedTools.map((item) => (
                <Link
                  href={`/tools/${item.id}`}
                  key={item.id}
                  className="related-tool-link"
                >
                  <span>
                    <b>{item.name}</b>
                    <small>{item.summary}</small>
                  </span>
                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </Page>
  );
}
