import Link from 'next/link';
import { ArrowRight, Bot, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { Page } from '@/components/Shell';
import { AdSlot } from '@/components/AdSlot';
import { ToolCatalog } from '@/components/ToolCatalog';
import { IMAGE_TOOLS } from '@/lib/image-tools';
import { PDF_SHORTCUTS } from '@/lib/pdf-shortcuts';

export const metadata = buildPageMetadata({
  title: 'Photo Size, Signature, Compress, Resize & Crop Image Online',
  description: 'Use 30 focused image tools for signatures, passport and ID photos, CM/MM/inch sizing, DPI, compression, crop, conversion and editing. Browser processing with no sign-in.',
  path: '/',
  index: true,
  keywords: [
    'online image tools',
    'compress image to 100kb',
    'compress image to 200kb',
    'compress image to 1mb',
    'photo size reducer',
    'signature resize online',
    'passport photo maker',
    'resize image in cm',
  ],
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

        <section className="hero ajnpdf-hero task-hero">
          <div className="simple-hero-inner">
            <div className="eyebrow">AJN Buzz · Image Tools</div>
            <h1>Image tools that get the job done.</h1>
            <p className="lead">Resize in PX, CM, MM or inches. Prepare photos, signatures, crop, compress and convert.</p>
            <div className="hero-actions">
              <Link className="btn primary" href="/tools/compress">
                Compress Image <ArrowRight size={16} />
              </Link>
              <Link className="btn" href="/tools">All Image Tools</Link><Link className="btn" href="/bot"><Bot size={16}/> AJN Bot</Link>
            </div>
            <div className="hero-proof" aria-label="AJN Buzz highlights">
              <span><Zap size={14}/> 30 focused tools</span>
              <span><ShieldCheck size={14}/> No sign-in</span>
            </div>
          </div>
        </section>

        <section className="section ajn-bot-promo"><div className="container"><div className="ajn-bot-promo-card"><div className="ajn-bot-avatar"><Bot size={24}/></div><div><div className="eyebrow">New · AJN Bot</div><h2>Describe the image task. AJN Bot picks the tool.</h2><p>Say “compress to 100 KB”, “make 35 × 45 mm”, or “resize my signature to 4 cm × 2 cm”. Attach your image and run the mapped workflow.</p></div><Link className="btn primary" href="/bot">Try AJN Bot <ArrowRight size={15}/></Link></div></div></section><section className="section tools-home">
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
                <p>Open the matching tool on AJN PDF.</p>
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
