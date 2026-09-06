import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  FileText,
  Infinity,
  QrCode,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import { Page } from "@/components/Shell";
import { HomeQuickCompress } from "@/components/HomeQuickCompress";
import { IMAGE_TOOLS, PRIMARY_TOOL_IDS, type ToolId } from "@/lib/image-tools";
import { ToolIcon } from "@/components/ToolIcon";

export const metadata = buildPageMetadata({
  title: "AJN Buzz Image Tools — Compress, Resize, Crop, Convert & Edit",
  description:
    "Fast online image tools for exact KB/MB compression, resize, crop, convert, watermark cleanup, photo editing, HTML to image and more with AJN Buzz.",
  path: "/",
  index: true,
  keywords: [
    "AJN Buzz",
    "image tools",
    "compress image to 100kb",
    "compress image to 200kb",
    "resize image online",
    "crop image online",
    "image converter online",
    "remove watermark from image",
    "html to image",
  ],
});

const primaryTools = PRIMARY_TOOL_IDS.map((id) =>
  IMAGE_TOOLS.find((tool) => tool.id === id),
).filter(Boolean);

const secondaryIds: ToolId[] = [
  "remove-watermark",
  "rotate",
  "watermark",
  "photo-editor",
  "upscale",
  "html-to-image",
  "jpg-to-png",
];

const secondaryTools = secondaryIds
  .map((id) => IMAGE_TOOLS.find((tool) => tool.id === id))
  .filter(Boolean);

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

const homeWebAppData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AJN Buzz",
  url: SITE_URL,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any",
  description:
    "Browser-based image tools for compression, resizing, cropping, conversion and editing.",
  featureList: [
    "Exact target-size image compression in KB or MB",
    "Image resize and crop",
    "JPG, PNG and WebP conversion",
    "Watermark add and selected-area repair",
    "Photo adjustments and browser-safe upscaling",
    "HTML to PNG, JPG or WebP",
  ],
};

export default function Home() {
  return (
    <Page>
      <main className="concept-home">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(toolListStructuredData),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homeWebAppData) }}
        />

        <section className="concept-hero">
          <div className="container concept-hero-grid">
            <div className="concept-hero-copy">
              <div className="hero-mini-proof">
                <span>Fast</span>
                <i>•</i>
                <span>Free</span>
                <i>•</i>
                <span>Online</span>
                <i>•</i>
                <span>No sign-up</span>
              </div>

              <h1>
                Image tools that do the <span>actual work.</span>
              </h1>
              <p>
                Compress, resize, convert and edit your images — fast, free and
                online.
              </p>

              <div className="concept-benefits">
                <div>
                  <span className="concept-benefit-icon purple">
                    <Zap size={18} />
                  </span>
                  <span>
                    <b>Fast</b>
                    <small>Get results in seconds</small>
                  </span>
                </div>
                <div>
                  <span className="concept-benefit-icon green">
                    <ShieldCheck size={18} />
                  </span>
                  <span>
                    <b>Private</b>
                    <small>Your files stay in your browser</small>
                  </span>
                </div>
                <div>
                  <span className="concept-benefit-icon blue">
                    <Infinity size={18} />
                  </span>
                  <span>
                    <b>100% Online</b>
                    <small>No installation needed</small>
                  </span>
                </div>
              </div>
            </div>

            <div
              className="concept-compression-visual"
              aria-label="Compression example"
            >
              <span className="hand-note note-top">Concept Preview</span>
              <span className="hand-note note-right">
                Your Images Do More Here
              </span>
              <span className="hand-note note-bottom">
                Same Beauty · Smaller Size
              </span>

              <div className="compression-photo before">
                <Image
                  src="/brand/compression-demo.svg"
                  alt="Example landscape before compression"
                  fill
                  priority
                  sizes="(max-width: 760px) 70vw, 340px"
                />
                <span>
                  Before
                  <b>3.4 MB</b>
                </span>
              </div>
              <div className="compression-arrow">
                <ArrowRight size={26} />
              </div>
              <div className="compression-photo after">
                <Image
                  src="/brand/compression-demo.svg"
                  alt="Example landscape after compression"
                  fill
                  sizes="(max-width: 760px) 42vw, 220px"
                />
                <span>
                  After
                  <b>100 KB</b>
                </span>
              </div>
              <span className="hero-sparkle one">
                <Sparkles size={22} />
              </span>
              <span className="hero-sparkle two">
                <Sparkles size={17} />
              </span>
            </div>
          </div>
        </section>

        <section className="concept-tools-section">
          <div className="container">
            <div className="home-section-heading">
              <div>
                <h2>Main Image Tools</h2>
                <p>Start with the tools people use the most.</p>
              </div>
              <Link href="/tools">
                View All Tools <ArrowRight size={15} />
              </Link>
            </div>

            <div className="concept-primary-grid">
              {primaryTools.map((tool, index) => {
                if (!tool) return null;
                const tones = ["green", "blue", "purple", "orange"];
                return (
                  <Link
                    href={`/tools/${tool.id}`}
                    className={`concept-primary-card tone-${tones[index]}`}
                    key={tool.id}
                  >
                    <span className="concept-card-icon">
                      <ToolIcon name={tool.icon} size={28} />
                    </span>
                    <span className="concept-card-copy">
                      <b>{tool.shortName}</b>
                      <small>{tool.summary}</small>
                    </span>
                    <span className="concept-card-arrow">
                      <ArrowRight size={16} />
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="home-section-heading secondary-heading">
              <div>
                <h2>More Image Tools</h2>
                <p>More ways to edit, transform and create with images.</p>
              </div>
            </div>

            <div className="concept-secondary-grid">
              {secondaryTools.map((tool, index) => {
                if (!tool) return null;
                const tones = [
                  "pink",
                  "teal",
                  "amber",
                  "magenta",
                  "green",
                  "code",
                  "blue",
                ];
                return (
                  <Link
                    href={`/tools/${tool.id}`}
                    className={`concept-secondary-card tone-${tones[index]}`}
                    key={tool.id}
                  >
                    <span className="concept-small-icon">
                      <ToolIcon name={tool.icon} size={22} />
                    </span>
                    <b>{tool.shortName}</b>
                    <span className="concept-small-arrow">
                      <ArrowRight size={13} />
                    </span>
                  </Link>
                );
              })}
            </div>

            <HomeQuickCompress />
          </div>
        </section>

        <section className="ajn-network-section">
          <div className="container">
            <div className="home-section-heading">
              <div>
                <h2>Explore the AJN Network</h2>
                <p>More focused online tools from AJN.</p>
              </div>
              <span className="network-kicker">
                ONE ECOSYSTEM · MORE POSSIBILITIES
              </span>
            </div>

            <div className="ajn-network-grid">
              <a
                className="ajn-network-card pdf-network-card"
                href="https://ajnpdf.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="network-brand-icon pdf">
                  <FileText size={30} />
                </span>
                <span className="network-card-copy">
                  <strong>
                    <span className="ajn-word">AJN</span> PDF
                  </strong>
                  <p>PDF tools for merge, split, compress and more.</p>
                  <span className="network-open">
                    Open ajnpdf.com <ExternalLink size={14} />
                  </span>
                </span>
                <span className="network-art pdf-art" aria-hidden="true">
                  <span>PDF</span>
                  <small>Merge · Split · Compress</small>
                </span>
              </a>

              <a
                className="ajn-network-card qr-network-card"
                href="https://qrajn.online"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="network-brand-icon qr">
                  <QrCode size={30} />
                </span>
                <span className="network-card-copy">
                  <strong>
                    QR <span className="ajn-word">AJN</span>
                  </strong>
                  <p>
                    Create and share QR codes for links, text, Wi-Fi, payments
                    and more.
                  </p>
                  <span className="network-open">
                    Open qrajn.online <ExternalLink size={14} />
                  </span>
                </span>
                <span className="network-qr">
                  <Image
                    src="/brand/qrajn-qr.png"
                    alt="QR code linking to qrajn.online"
                    width={112}
                    height={112}
                  />
                  <small>qrajn.online</small>
                </span>
              </a>
            </div>
          </div>
        </section>

        <section className="concept-footer-tagline">
          <div className="container">
            <span>
              <b>AJN Buzz</b>
              <small>IMAGE TOOLS FOR A BRIGHTER, SIMPLER TOMORROW</small>
            </span>
            <span>
              IMAGES &nbsp; | &nbsp; IDEAS &nbsp; | &nbsp; POSSIBILITIES
            </span>
          </div>
        </section>
      </main>
    </Page>
  );
}
