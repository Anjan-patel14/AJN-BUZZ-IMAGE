import Link from 'next/link';
import { ArrowRight, Check, ExternalLink, FileImage, FileText, Image as ImageIcon, Maximize2, Minimize2, PenLine, ScanFace, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { Page } from '@/components/Shell';
import { AdSlot } from '@/components/AdSlot';
import { ToolCatalog } from '@/components/ToolCatalog';
import { AjnProductsSection } from '@/components/AjnProductsSection';
import { ToolIcon } from '@/components/ToolIcon';
import { IMAGE_TOOLS } from '@/lib/image-tools';

export const metadata = buildPageMetadata({
  title: 'Resize, Compress, Crop, Convert & Edit Images Online',
  description: 'Use 30 focused AJN BUZZ IMAGE tools for resizing, compression, KB targets, passport photos, signatures, cropping, conversion, background work and image editing.',
  path: '/', index: true,
  keywords: ['resize image online','compress image online','compress image to 100kb','passport photo maker','signature maker','image converter','photo size converter','remove background'],
});

const categoryCards = [
  {
    key: 'Optimize',
    title: 'Resize & Compress',
    icon: Maximize2,
    copy: 'Resize images, reduce file size, compress to a target KB or MB limit, and enlarge images.',
    countLabel: '4 tools',
    links: [
      { id: 'resize', name: 'Resize Image' },
      { id: 'compress', name: 'Compress Image' },
      { id: 'compress-to-kb', name: 'Compress Image to KB' },
      { id: 'upscale', name: 'Upscale Image' },
    ],
  },
  {
    key: 'Photo Size',
    title: 'Photo Size & DPI',
    icon: ScanFace,
    copy: 'Prepare passport, ID, and application photos using pixels, physical dimensions, and DPI settings.',
    countLabel: '6 tools',
    links: [
      { id: 'photo-size-converter', name: 'Photo Size Converter' },
      { id: 'passport-photo-maker', name: 'Passport Photo Maker' },
      { id: 'id-photo-maker', name: 'ID Photo Maker' },
      { id: 'photo-35x45', name: '35 × 45 mm Photo' },
    ],
  },
  {
    key: 'Signature',
    title: 'Signature Tools',
    icon: PenLine,
    copy: 'Draw or upload signatures, trim blank margins, resize, compress, and export supported image formats.',
    countLabel: '6 tools',
    links: [
      { id: 'signature-maker', name: 'Signature Maker' },
      { id: 'signature-upload-crop', name: 'Upload Signature & Crop' },
      { id: 'signature-resize', name: 'Signature Resize' },
      { id: 'signature-size-reducer', name: 'Signature Size Reducer' },
    ],
  },
  {
    key: 'Edit',
    title: 'Crop & Edit',
    icon: Wand2,
    copy: 'Crop, adjust, rotate, add watermarks, manage simple backgrounds, and clean image metadata.',
    countLabel: '8 tools',
    links: [
      { id: 'crop', name: 'Crop Image' },
      { id: 'aspect-ratio-crop', name: 'Aspect Ratio Crop' },
      { id: 'photo-editor', name: 'Photo Editor' },
      { id: 'watermark', name: 'Watermark Image' },
    ],
  },
  {
    key: 'Convert',
    title: 'Convert Images',
    icon: FileImage,
    copy: 'Convert supported image formats to JPG, PNG, and WebP where supported.',
    countLabel: '6 tools',
    links: [
      { id: 'convert', name: 'Convert Image' },
      { id: 'convert-to-jpg', name: 'Image to JPG' },
      { id: 'jpg-to-png', name: 'JPG to PNG / WebP' },
    ],
  },
];

const popularTaskShortcuts = [
  { id: 'resize', name: 'Resize Image' },
  { id: 'compress', name: 'Compress Image' },
  { id: 'passport-photo-maker', name: 'Passport Photo' },
  { id: 'signature-maker', name: 'Signature Maker' },
  { id: 'crop', name: 'Crop Image' },
];

const popularSearches = [
  { id: 'resize', label: 'Resize' },
  { id: 'compress', label: 'Compress' },
  { id: 'compress-to-kb', label: 'Compress to KB' },
  { id: 'passport-photo-maker', label: 'Passport Photo' },
  { id: 'signature-maker', label: 'Signature Maker' },
  { id: 'crop', label: 'Crop' },
  { id: 'photo-size-converter', label: 'Photo Size' },
  { id: 'text-on-image', label: 'Text on Image' },
];

const popular = ['resize','compress','compress-to-kb','passport-photo-maker','signature-maker','crop','photo-size-converter','text-on-image'];

const homeGraph = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'AJN BUZZ IMAGE tools',
  itemListElement: IMAGE_TOOLS.map((tool, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: tool.name,
    url: `${SITE_URL}/${tool.id}`,
  })),
};

export default function Home() {
  return (
    <Page>
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homeGraph) }}
        />

        {/* MOBILE-FIRST IMMEDIATE TOOLS CATALOG & SEARCH */}
        <section className="section tools-home-section" style={{ paddingTop: '28px' }}>
          <div className="container">
            <div className="home-mobile-intro" style={{ marginBottom: '22px', textAlign: 'center' }}>
              <div className="eyebrow"><Sparkles size={13} /> AJN BUZZ IMAGE · 30 ONLINE TOOLS</div>
              <h1 style={{ fontSize: 'clamp(28px, 5.2vw, 46px)', margin: '8px 0 10px', letterSpacing: '-0.045em' }}>
                Resize, compress &amp; edit images instantly.
              </h1>
              <p className="lead" style={{ fontSize: '14px', maxWidth: '680px', margin: '0 auto', lineHeight: '1.6' }}>
                Browser-local image tools for photos, signatures, applications, and everyday files. No upload or sign-in required.
              </p>
            </div>
            <div className="sectionhead" style={{ marginBottom: '16px' }}>
              <div>
                <div className="eyebrow">IMAGE TOOLS</div>
                <h2>Every tool, clearly listed</h2>
                <p>Search by exact task, format, or common phrase.</p>
              </div>
            </div>
            <ToolCatalog />
          </div>
        </section>

        {/* POPULAR TOOLS SECTION */}
        <section className="section popular-section" style={{ padding: '20px 0' }}>
          <div className="container">
            <div className="sectionhead">
              <div>
                <div className="eyebrow">START HERE</div>
                <h2>Popular image tools</h2>
                <p>Direct links to common image tasks.</p>
              </div>
            </div>
          </div>
        </section>

        {/* PHASE 5: HERO & OVERVIEW SECTION BELOW THE TOOLS */}
        <section className="hero home-hero" style={{ paddingTop: '20px', paddingBottom: '40px' }}>
          <div className="container home-hero-grid">
            <div className="home-hero-copy">
              <div className="eyebrow">
                <Sparkles size={13} /> SECURE BROWSER PROCESSING
              </div>
              <h2>
                Why choose <span>AJN BUZZ IMAGE?</span>
              </h2>
              <p className="lead">
                AJN BUZZ keeps each workflow direct, with a dedicated page and focused controls for each task. Selected source images are decoded and transformed locally using browser Canvas APIs.
              </p>

              {/* POPULAR SEARCH TAGS */}
              <div className="popular-searches" style={{ marginTop: '20px' }}>
                <span>Popular searches</span>
                {popularSearches.map((item) => (
                  <Link key={item.id} href={`/${item.id}`}>
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* TRUST & CONVENIENCE POINTS */}
              <div className="hero-checks" style={{ marginTop: '20px' }}>
                <span>
                  <Check size={15} /> 30 focused tools
                </span>
                <span>
                  <Check size={15} /> No sign-in required
                </span>
                <span>
                  <Check size={15} /> Clear download flow
                </span>
              </div>
            </div>

            {/* PHASE 6: HERO PREVIEW VISUAL */}
            <div className="hero-visual" aria-label="AJN BUZZ IMAGE tool preview">
              <div className="visual-window">
                <div className="visual-window-top">
                  <span></span>
                  <span></span>
                  <span></span>
                  <b>AJN BUZZ IMAGE</b>
                </div>
                <div className="visual-workspace">
                  <div className="visual-image-stage">
                    <div className="visual-photo"></div>
                    <div className="crop-frame"></div>
                    <span className="dimension-tag">1024 × 1024 px</span>
                  </div>
                  <div className="visual-side">
                    <div className="visual-side-title">Quick tools</div>
                    {[
                      ['Resize', Maximize2],
                      ['Compress', Minimize2],
                      ['Crop', Wand2],
                      ['Signature', PenLine],
                      ['Convert', FileImage],
                    ].map(([name, Icon]) => {
                      const I = Icon as any;
                      return (
                        <div className="visual-side-row" key={String(name)}>
                          <I size={15} />
                          <span>{String(name)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="visual-bottom">
                  <span>Example output</span>
                  <b>JPG · 1024 × 1024 · 248 KB</b>
                  <span className="visual-ready">Ready status</span>
                </div>
              </div>
              <div className="visual-badge badge-one">
                <b>PX</b>
                <span>CM · MM · IN</span>
              </div>
              <div className="visual-badge badge-two">
                <b>30+</b>
                <span>Image tools</span>
              </div>
            </div>
          </div>
        </section>

        {/* PHASE 8: TOOL CATEGORIES SECTION */}
        <section className="section category-section" style={{ paddingTop: '20px' }}>
          <div className="container">
            <div className="sectionhead">
              <div>
                <div className="eyebrow">TOOL CATEGORIES</div>
                <h2>Explore all 30 image tools</h2>
                <p>Choose a task, open the dedicated tool, and start with your image.</p>
              </div>
              <Link className="text-link" href="/tools">
                Browse every tool <ArrowRight size={16} />
              </Link>
            </div>
            <div className="category-grid">
              {categoryCards.map((c) => {
                const Icon = c.icon;
                return (
                  <article className="category-card" key={c.key}>
                    <div className="category-icon">
                      <Icon size={22} />
                    </div>
                    <div className="category-card-head">
                      <h3>{c.title}</h3>
                      <span>{c.countLabel}</span>
                    </div>
                    <p>{c.copy}</p>
                    <div className="category-links">
                      {c.links.map((link) => (
                        <Link key={link.id} href={`/${link.id}`}>
                          {link.name}
                          <ArrowRight size={13} />
                        </Link>
                      ))}
                    </div>
                    <Link
                      className="category-more"
                      href={`/tools?category=${encodeURIComponent(c.key)}`}
                    >
                      View category <ArrowRight size={13} />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* AJN PDF PROMO BANNER */}
        <section className="section ajnpdf-promo-section">
          <div className="container">
            <div className="ajnpdf-promo">
              <div className="ajnpdf-promo-copy">
                <div className="ajnpdf-brandline">
                  <span className="ajnpdf-mark">
                    <FileText size={23} />
                  </span>
                  <div>
                    <b>AJN PDF</b>
                    <small>Online PDF tools</small>
                  </div>
                </div>
                <div className="eyebrow">Need to work with a PDF?</div>
                <h2>Edit, merge, compress, split and sign PDFs.</h2>
                <p>
                  AJN PDF is the separate PDF workspace from the same AJN product family. Open the
                  PDF tool you need without mixing PDF functions into your image workflow.
                </p>
                <div className="ajnpdf-actions">
                  <a
                    className="btn pdf-primary"
                    href="https://ajnpdf.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open AJN PDF <ExternalLink size={15} />
                  </a>
                  <span>Edit · Merge · Compress · Split · Sign</span>
                </div>
              </div>
              <div className="ajnpdf-preview">
                <div className="pdf-preview-window">
                  <div className="pdf-mini-row active">
                    <FileText size={14} /> Edit PDF
                  </div>
                  <div className="pdf-mini-row">
                    <FileText size={14} /> Merge PDF
                  </div>
                  <div className="pdf-mini-row">
                    <FileText size={14} /> Compress PDF
                  </div>
                  <div className="pdf-mini-row">
                    <FileText size={14} /> Split PDF
                  </div>
                  <div className="pdf-mini-row">
                    <FileText size={14} /> Sign PDF
                  </div>
                </div>
                <div className="pdf-paper">
                  <FileText size={35} />
                  <b>PDF</b>
                  <span>Tools</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <AdSlot slot="home" />

        {/* POPULAR TOOLS */}
        <section className="section popular-section">
          <div className="container">
            <div className="sectionhead">
              <div>
                <div className="eyebrow">START HERE</div>
                <h2>Popular image tools</h2>
                <p>Direct links to common image tasks.</p>
              </div>
            </div>
            <div className="popular-grid">
              {popular.map((id) => {
                const t = IMAGE_TOOLS.find((x) => x.id === id)!;
                return (
                  <Link className="popular-card" href={`/${id}`} key={id}>
                    <div className="popular-icon">
                      <ToolIconShim name={t.icon} />
                    </div>
                    <div>
                      <b>{t.name}</b>
                      <span>{t.summary}</span>
                    </div>
                    <ArrowRight size={16} />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section how-section">
          <div className="container">
            <div className="sectionhead">
              <div>
                <div className="eyebrow">SIMPLE WORKFLOW</div>
                <h2>Three steps from image to result</h2>
              </div>
            </div>
            <div className="how-grid">
              <article>
                <span>01</span>
                <h3>Choose the exact task</h3>
                <p>Open the dedicated resize, compression, photo, signature, editing or conversion workflow.</p>
              </article>
              <article>
                <span>02</span>
                <h3>Set the details</h3>
                <p>Enter pixels, CM, MM, inches, DPI, KB targets, crop ratios or the editing controls the task needs.</p>
              </article>
              <article>
                <span>03</span>
                <h3>Download the result</h3>
                <p>Review the output, then use the visible download action to save your finished image.</p>
              </article>
            </div>
          </div>
        </section>

        {/* TRUST & VALUE PANEL */}
        <section className="section trust-section">
          <div className="container">
            <div className="trust-panel">
              <div>
                <ShieldCheck size={24} />
                <b>Focused tools</b>
                <span>Each card maps to a specific image task.</span>
              </div>
              <div>
                <Maximize2 size={24} />
                <b>Exact sizing</b>
                <span>PX, CM, MM, inches and DPI workflows.</span>
              </div>
              <div>
                <Minimize2 size={24} />
                <b>Target compression</b>
                <span>Use KB/MB targets where the workflow supports them.</span>
              </div>
              <div>
                <FileImage size={24} />
                <b>Clear output</b>
                <span>Preview and download the processed image.</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section faq-home">
          <div className="container narrow">
            <div className="sectionhead">
              <div>
                <div className="eyebrow">QUESTIONS</div>
                <h2>About AJN BUZZ IMAGE</h2>
              </div>
            </div>
            <div className="home-faq">
              <details open>
                <summary>How many image tools are available?</summary>
                <p>AJN BUZZ IMAGE currently lists 30 focused public image tools across compression, resizing, photo sizing, signatures, editing and conversion.</p>
              </details>
              <details>
                <summary>Can I resize a photo in CM, MM or inches?</summary>
                <p>Yes. The physical-size workflows calculate output pixels from the selected unit and DPI.</p>
              </details>
              <details>
                <summary>Can I compress an image to a KB target?</summary>
                <p>Yes. The target compression workflows let you enter a KB or MB target and attempt an at-or-below output.</p>
              </details>
              <details>
                <summary>Is AJN PDF part of the image editor?</summary>
                <p>No. AJN PDF is a separate product. The AJN PDF card on this page is a cross-link for users who need PDF tools.</p>
              </details>
            </div>
          </div>
        </section>

        {/* EXPLORE AJN PRODUCTS SECTION */}
        <AjnProductsSection />
      </main>
    </Page>
  );
}

function ToolIconShim({ name }: { name: string }) {
  return <ToolIcon name={name} size={20} />;
}
