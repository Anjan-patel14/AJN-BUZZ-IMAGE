import Link from 'next/link';
import { ArrowRight, Check, ExternalLink, FileImage, FileText, Image as ImageIcon, Maximize2, Minimize2, PenLine, ScanFace, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { Page } from '@/components/Shell';
import { AdSlot } from '@/components/AdSlot';
import { ToolCatalog } from '@/components/ToolCatalog';
import { IMAGE_TOOLS, TOOL_CATEGORIES } from '@/lib/image-tools';

export const metadata = buildPageMetadata({
  title: 'Resize, Compress, Crop, Convert & Edit Images Online',
  description: 'Use 30 focused AJN BUZZ IMAGE tools for resizing, compression, KB targets, passport photos, signatures, cropping, conversion, background work and image editing.',
  path: '/', index: true,
  keywords: ['resize image online','compress image online','compress image to 100kb','passport photo maker','signature maker','image converter','photo size converter','remove background'],
});

const categoryCards = [
  {key:'Optimize',title:'Resize & Compress',icon:Maximize2,copy:'Resize pixels, reduce file size, target KB or MB limits and enlarge images.',links:['resize','compress','compress-to-kb','upscale']},
  {key:'Photo Size',title:'Photo Size & DPI',icon:ScanFace,copy:'Prepare passport, ID and application photos with PX, CM, MM, inches and DPI.',links:['photo-size-converter','passport-photo-maker','id-photo-maker','photo-35x45','photo-2x2','dpi-changer']},
  {key:'Signature',title:'Signature Tools',icon:PenLine,copy:'Draw or upload signatures, trim whitespace, resize, compress and export PNG.',links:['signature-maker','signature-upload-crop','signature-resize','signature-size-reducer','signature-background-remover','signature-to-png']},
  {key:'Edit',title:'Crop & Edit',icon:Wand2,copy:'Crop, adjust, watermark, rotate, remove plain backgrounds and clean metadata.',links:['crop','aspect-ratio-crop','photo-editor','watermark','background-remover','change-background','rotate','remove-metadata']},
  {key:'Convert',title:'Convert Images',icon:FileImage,copy:'Convert common browser-supported images to JPG, PNG or WebP.',links:['convert','convert-to-jpg','jpg-to-png']},
];

const popular = ['resize','compress','compress-to-kb','passport-photo-maker','signature-maker','crop','photo-size-converter','background-remover'];

const homeGraph = { '@context':'https://schema.org', '@type':'ItemList', name:'AJN BUZZ IMAGE tools', itemListElement:IMAGE_TOOLS.map((tool,index)=>({ '@type':'ListItem', position:index+1, name:tool.name, url:`${SITE_URL}/tools/${tool.id}` })) };

export default function Home(){
 return <Page><main>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(homeGraph)}}/>
  <section className="hero home-hero">
   <div className="container home-hero-grid">
    <div className="home-hero-copy">
      <div className="eyebrow"><Sparkles size={13}/> AJN BUZZ IMAGE · 30 ONLINE TOOLS</div>
      <h1>Resize, compress, crop and <span>finish your images.</span></h1>
      <p className="lead">Practical image tools for photos, signatures, applications and everyday files. Set exact pixels, physical sizes, DPI or target file size, then download your result.</p>
      <div className="home-search-panel"><div className="home-search-icon"><ImageIcon size={18}/></div><div><b>What do you need to do?</b><span>Resize image · Compress image · Passport photo · Signature maker · Crop image</span></div><Link href="/tools" aria-label="Open all image tools"><ArrowRight size={19}/></Link></div>
      <div className="popular-searches"><span>Popular searches</span>{popular.map(id=>{const t=IMAGE_TOOLS.find(x=>x.id===id)!;return <Link key={id} href={`/tools/${id}`}>{t.shortName}</Link>})}</div>
      <div className="hero-actions"><Link className="btn primary" href="/tools/resize">Start with Resize <ArrowRight size={16}/></Link><Link className="btn" href="/tools">View all 30 tools</Link></div>
      <div className="hero-checks"><span><Check size={15}/> 30 focused tools</span><span><Check size={15}/> No sign-in</span><span><Check size={15}/> Clear download flow</span></div>
    </div>
    <div className="hero-visual" aria-label="AJN BUZZ IMAGE tool preview">
      <div className="visual-window"><div className="visual-window-top"><span></span><span></span><span></span><b>AJN BUZZ IMAGE</b></div><div className="visual-workspace"><div className="visual-image-stage"><div className="visual-photo"></div><div className="crop-frame"></div><span className="dimension-tag">1024 × 1024 px</span></div><div className="visual-side"><div className="visual-side-title">Quick tools</div>{[['Resize',Maximize2],['Compress',Minimize2],['Crop',Wand2],['Signature',PenLine],['Convert',FileImage]].map(([name,Icon])=>{const I=Icon as any;return <div className="visual-side-row" key={String(name)}><I size={15}/><span>{String(name)}</span></div>})}</div></div><div className="visual-bottom"><span>Output</span><b>JPG · 1024×1024 · 248 KB</b><span className="visual-ready">Ready</span></div></div>
      <div className="visual-badge badge-one"><b>PX</b><span>CM · MM · IN</span></div><div className="visual-badge badge-two"><b>30+</b><span>Image tools</span></div>
    </div>
   </div>
  </section>

  <section className="section intro-strip"><div className="container intro-grid"><div><div className="eyebrow">One place for image work</div><h2>Built around the tasks people actually search for.</h2></div><p>From “resize image” to “compress image to 100KB”, AJN BUZZ keeps each workflow direct, with a dedicated page and a focused tool instead of a generic editor.</p></div></section>

  <section className="section category-section"><div className="container"><div className="sectionhead"><div><div className="eyebrow">Tool categories</div><h2>Explore all 30 image tools</h2><p>Choose a task, open the dedicated tool and start with your image.</p></div><Link className="text-link" href="/tools">Browse every tool <ArrowRight size={16}/></Link></div><div className="category-grid">{categoryCards.map(c=>{const Icon=c.icon;return <article className="category-card" key={c.key}><div className="category-icon"><Icon size={22}/></div><div className="category-card-head"><h3>{c.title}</h3><span>{c.links.length} tools</span></div><p>{c.copy}</p><div className="category-links">{c.links.slice(0,4).map(id=>{const t=IMAGE_TOOLS.find(x=>x.id===id)!;return <Link key={id} href={`/tools/${id}`}>{t.name}<ArrowRight size={13}/></Link>})}</div>{c.links.length>4?<Link className="category-more" href={`/tools?category=${encodeURIComponent(c.key)}`}>View all {c.links.length} <ArrowRight size={13}/></Link>:null}</article>})}</div></div></section>

  <section className="section tools-home-section"><div className="container"><div className="sectionhead"><div><div className="eyebrow">Complete catalog</div><h2>Every tool, clearly listed</h2><p>Search by tool name, task or format. Nothing hidden behind a generic “editor” card.</p></div></div><ToolCatalog/></div></section>

  <section className="section ajnpdf-promo-section"><div className="container"><div className="ajnpdf-promo"><div className="ajnpdf-promo-copy"><div className="ajnpdf-brandline"><span className="ajnpdf-mark"><FileText size={23}/></span><div><b>AJN PDF</b><small>Online PDF tools</small></div></div><div className="eyebrow">Need to work with a PDF?</div><h2>Edit, merge, compress, split and sign PDFs.</h2><p>AJN PDF is the separate PDF workspace from the same AJN product family. Open the PDF tool you need without mixing PDF functions into your image workflow.</p><div className="ajnpdf-actions"><a className="btn pdf-primary" href="https://ajnpdf.com" target="_blank" rel="noopener noreferrer">Open AJN PDF <ExternalLink size={15}/></a><span>Edit · Merge · Compress · Split · Sign</span></div></div><div className="ajnpdf-preview"><div className="pdf-preview-window"><div className="pdf-mini-row active"><FileText size={14}/> Edit PDF</div><div className="pdf-mini-row"><FileText size={14}/> Merge PDF</div><div className="pdf-mini-row"><FileText size={14}/> Compress PDF</div><div className="pdf-mini-row"><FileText size={14}/> Split PDF</div><div className="pdf-mini-row"><FileText size={14}/> Sign PDF</div></div><div className="pdf-paper"><FileText size={35}/><b>PDF</b><span>Tools</span></div></div></div></div></section>

  <AdSlot slot="home"/>

  <section className="section popular-section"><div className="container"><div className="sectionhead"><div><div className="eyebrow">Start here</div><h2>Popular image tools</h2><p>Direct links to common image tasks.</p></div></div><div className="popular-grid">{popular.map(id=>{const t=IMAGE_TOOLS.find(x=>x.id===id)!;return <Link className="popular-card" href={`/tools/${id}`} key={id}><div className="popular-icon"><ToolIconShim name={t.icon}/></div><div><b>{t.name}</b><span>{t.summary}</span></div><ArrowRight size={16}/></Link>})}</div></div></section>

  <section className="section how-section"><div className="container"><div className="sectionhead"><div><div className="eyebrow">Simple workflow</div><h2>Three steps from image to result</h2></div></div><div className="how-grid"><article><span>01</span><h3>Choose the exact task</h3><p>Open the dedicated resize, compression, photo, signature, editing or conversion workflow.</p></article><article><span>02</span><h3>Set the details</h3><p>Enter pixels, CM, MM, inches, DPI, KB targets, crop ratios or the editing controls the task needs.</p></article><article><span>03</span><h3>Download the result</h3><p>Review the output, then use the visible download action to save your finished image.</p></article></div></div></section>

  <section className="section trust-section"><div className="container"><div className="trust-panel"><div><ShieldCheck size={24}/><b>Focused tools</b><span>Each card maps to a specific image task.</span></div><div><Maximize2 size={24}/><b>Exact sizing</b><span>PX, CM, MM, inches and DPI workflows.</span></div><div><Minimize2 size={24}/><b>Target compression</b><span>Use KB/MB targets where the workflow supports them.</span></div><div><FileImage size={24}/><b>Clear output</b><span>Preview and download the processed image.</span></div></div></div></section>

  <section className="section faq-home"><div className="container narrow"><div className="sectionhead"><div><div className="eyebrow">Questions</div><h2>About AJN BUZZ IMAGE</h2></div></div><div className="home-faq"><details open><summary>How many image tools are available?</summary><p>AJN BUZZ IMAGE currently lists 30 focused public image tools across compression, resizing, photo sizing, signatures, editing and conversion.</p></details><details><summary>Can I resize a photo in CM, MM or inches?</summary><p>Yes. The physical-size workflows calculate output pixels from the selected unit and DPI.</p></details><details><summary>Can I compress an image to a KB target?</summary><p>Yes. The target compression workflows let you enter a KB or MB target and attempt an at-or-below output.</p></details><details><summary>Is AJN PDF part of the image editor?</summary><p>No. AJN PDF is a separate product. The AJN PDF card on this page is a cross-link for users who need PDF tools.</p></details></div></div></section>
 </main></Page>
}

function ToolIconShim({name}:{name:string}){
 const map:any={Minimize2,Maximize2,PenLine,ScanFace,Wand2,FileImage,ImageIcon}; const I=map[name]||Sparkles; return <I size={20}/>;
}
