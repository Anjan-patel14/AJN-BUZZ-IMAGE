import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import { Page } from "@/components/Shell";
import { AdSlot } from "@/components/AdSlot";
import { ToolCatalog } from "@/components/ToolCatalog";
import { IMAGE_TOOLS, PRIMARY_TOOL_IDS } from "@/lib/image-tools";
import { PDF_SHORTCUTS } from "@/lib/pdf-shortcuts";
import { ToolIcon } from "@/components/ToolIcon";

export const metadata = buildPageMetadata({
  title: "Online Image Tools — Compress, Resize, Crop & Convert",
  description:
    "Compress images to KB or MB, resize dimensions, crop photos, convert formats and use focused image tools online with AJN Buzz.",
  path: "/",
  index: true,
  keywords: [
    "image tools",
    "online image tools",
    "compress image to 100kb",
    "compress image to 200kb",
    "resize image online",
    "crop image online",
    "image converter online",
  ],
});

const primaryTools = PRIMARY_TOOL_IDS.map(
  (id) => IMAGE_TOOLS.find((tool) => tool.id === id)!,
).filter(Boolean);

const toolListStructuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "AJN Buzz Online Image Tools",
  itemListElement: IMAGE_TOOLS.map((tool, index) => ({
    "@type": "ListItem",
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
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(toolListStructuredData),
          }}
        />

        <section className="hero ajnpdf-hero task-hero">
          <div className="simple-hero-inner">
            <div className="eyebrow">AJN Buzz · Image Tools</div>
            <h1>Online image tools for everyday work.</h1>
            <p className="lead">
              Compress to KB/MB, resize, crop, convert and edit images in
              focused workflows.
            </p>
            <div className="hero-actions">
              <Link className="btn primary" href="/tools/compress">
                Compress Image <ArrowRight size={16} />
              </Link>
              <Link className="btn" href="/tools">
                View All Tools
              </Link>
            </div>
          </div>
        </section>

        <section className="section popular-tools-section">
          <div className="container">
            <div className="compact-section-head">
              <div>
                <div className="eyebrow">Popular image tools</div>
                <h2>Start with the image actions you use most.</h2>
              </div>
            </div>
            <div className="popular-tool-grid">
              {primaryTools.map((tool) => (
                <Link
                  href={`/tools/${tool.id}`}
                  className="popular-tool-card ajn-v4-card"
                  key={tool.id}
                >
                  <span
                    className={`tool-icon tool-icon-${tool.category.toLowerCase()}`}
                  >
                    <ToolIcon name={tool.icon} size={21} />
                  </span>
                  <span>
                    <b>{tool.name}</b>
                    <small>{tool.summary}</small>
                  </span>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section tools-home">
          <div className="container">
            <ToolCatalog />
            <AdSlot slot="home" />
          </div>
        </section>

        <section className="section pdf-shortcuts-section">
          <div className="container">
            <div className="pdf-section-head">
              <div>
                <div className="eyebrow">PDF tools</div>
                <h2>Need a PDF tool?</h2>
                <p>Open the matching workflow on AJN PDF.</p>
              </div>
              <a
                className="btn"
                href="https://ajnpdf.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                AJN PDF <ExternalLink size={15} />
              </a>
            </div>
            <div className="pdf-shortcut-grid">
              {PDF_SHORTCUTS.map(({ id, name, href, icon: Icon, tone }) => (
                <a
                  className={`pdf-shortcut-card ajn-v4-card ajn-card-${tone === "amber" ? "blue" : tone}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={id}
                >
                  <span className={`pdf-shortcut-icon pdf-tone-${tone}`}>
                    <Icon size={21} />
                  </span>
                  <span className="pdf-shortcut-copy">
                    <b>{name}</b>
                  </span>
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
