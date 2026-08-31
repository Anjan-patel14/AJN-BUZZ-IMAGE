import Link from 'next/link';
import { ArrowRight, BadgeCheck, ExternalLink, LockKeyhole, SlidersHorizontal } from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import { Page } from '@/components/Shell';
import { AdSlot } from '@/components/AdSlot';
import { ToolCatalog } from '@/components/ToolCatalog';
import { IMAGE_TOOLS } from '@/lib/image-tools';
import { PDF_SHORTCUTS } from '@/lib/pdf-shortcuts';
import { ToolIcon } from '@/components/ToolIcon';
import { SITE_URL } from '@/lib/seo';

export const metadata = buildPageMetadata({ title: 'Online Image Tools — Compress to KB/MB, Resize, Crop & Convert', description: 'Production browser image tools with real target-size compression, resize, crop, conversion, editing and direct AJN PDF shortcuts.', path: '/', index: true });
const quick = IMAGE_TOOLS.slice(0,6);

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

export default function Home(){return <Page><main><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(toolListStructuredData)}}/>
  <section className="hero ajnpdf-hero"><div className="simple-hero-inner"><div className="eyebrow">AJN Buzz · Image Tools</div><h1>Image tools that do the actual work.</h1><p className="lead">Compress toward an exact KB/MB target, resize, crop, convert and edit images directly in focused browser tools.</p><div className="hero-actions"><Link className="btn primary" href="/tools/compress">Compress an image <ArrowRight size={16}/></Link><Link className="btn" href="/tools">Browse image tools</Link></div></div></section>

  <section className="quick-tools"><div className="quick-tools-inner">{quick.map(tool=><Link href={`/tools/${tool.id}`} key={tool.id}><span className={`quick-icon quick-${tool.category.toLowerCase()}`}><ToolIcon name={tool.icon} size={19}/></span><span>{tool.shortName}</span></Link>)}</div></section>

  <section className="section tools-home"><div className="container"><ToolCatalog/><div className="center-actions"><Link className="btn primary" href="/tools">Browse all image tools <ArrowRight size={16}/></Link></div><AdSlot slot="home"/></div></section>

  <section className="section pdf-shortcuts-section"><div className="container"><div className="pdf-section-head"><div><div className="eyebrow">AJN PDF shortcuts</div><h2>Need a PDF tool?</h2><p>These cards open the corresponding workflow on ajnpdf.com.</p></div><a className="btn" href="https://ajnpdf.com" target="_blank" rel="noopener noreferrer">Open AJN PDF <ExternalLink size={15}/></a></div><div className="pdf-shortcut-grid">{PDF_SHORTCUTS.map(({id,name,description,href,icon:Icon,tone})=><a className={`pdf-shortcut-card ajn-v4-card ajn-card-${tone==='amber'?'blue':tone}`} href={href} target="_blank" rel="noopener noreferrer" key={id}><span className={`pdf-shortcut-icon pdf-tone-${tone}`}><Icon size={21}/></span><span className="pdf-shortcut-copy"><b>{name}</b><small>{description}</small></span><ExternalLink className="pdf-external" size={16}/></a>)}</div></div></section>

  <section className="section value-section"><div className="container"><div className="value-heading"><div className="eyebrow">Production-focused image workflows</div><h2>Clear inputs. Real processing. Clear results.</h2></div><div className="feature-grid compact-feature-grid"><article className="feature-card ajn-v4-card ajn-card-blue"><div className="feature-icon ajn-icon-blue"><SlidersHorizontal/></div><h3>Real target-size compression</h3><p>Enter a number in KB or MB. AJN Buzz iterates encoder quality and, when required, dimensions to approach that target.</p><Link href="/tools/compress">Open Compress Image →</Link></article><article className="feature-card ajn-v4-card ajn-card-green"><div className="feature-icon ajn-icon-green"><BadgeCheck/></div><h3>Selected-image integrity</h3><p>Changing the selected file clears stale results, refreshes dimensions and processes the current file only.</p><Link href="/tools/photo-editor">Try Photo Editor →</Link></article><article className="feature-card ajn-v4-card ajn-card-red"><div className="feature-icon ajn-icon-red"><LockKeyhole/></div><h3>Browser-first processing</h3><p>The included transformations run with browser image and canvas APIs, with no account requirement.</p><Link href="/privacy">Read privacy →</Link></article></div></div></section>
</main></Page>}
