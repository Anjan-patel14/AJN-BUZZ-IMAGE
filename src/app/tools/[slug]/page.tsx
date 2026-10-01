import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, Image as ImageIcon } from 'lucide-react';
import { Page } from '@/components/Shell';
import { AdSlot } from '@/components/AdSlot';
import { ImageEditor } from '@/components/ImageEditor';
import { IMAGE_TOOLS, TOOL_MAP, type ToolId } from '@/lib/image-tools';
import { ToolIcon } from '@/components/ToolIcon';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';

export function generateStaticParams() { return IMAGE_TOOLS.map(tool => ({ slug: tool.id })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const tool = TOOL_MAP.get(slug as ToolId);
  if (!tool) return { title: 'Tool Not Found', robots: { index:false, follow:false } };
  return buildPageMetadata({ title:tool.seoTitle, description:tool.seoDescription, path:`/tools/${tool.id}`, index:true, keywords:[tool.name,tool.shortName,tool.category,tool.formats,...tool.seoKeywords], image:`/seo-tools/${tool.id}.svg` });
}

export default async function ToolPage({ params }: { params: Promise<{ slug:string }> }) {
 const {slug}=await params; const tool=TOOL_MAP.get(slug as ToolId); if(!tool) return notFound();
 const related=IMAGE_TOOLS.filter(t=>t.id!==tool.id && (t.category===tool.category || t.seoKeywords.some(k=>tool.seoKeywords.includes(k)))).slice(0,6);
 const graph:any={ '@context':'https://schema.org','@graph':[
  {'@type':'WebApplication','@id':`${SITE_URL}/tools/${tool.id}#app`,name:tool.name,description:tool.seoDescription,url:`${SITE_URL}/tools/${tool.id}`,applicationCategory:'MultimediaApplication',operatingSystem:'Any',browserRequirements:'Requires a modern browser with File and Canvas APIs',featureList:[tool.description,tool.formats]},
  {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'AJN BUZZ IMAGE',item:SITE_URL},{'@type':'ListItem',position:2,name:'Image Tools',item:`${SITE_URL}/tools`},{'@type':'ListItem',position:3,name:tool.name,item:`${SITE_URL}/tools/${tool.id}`}]},
  {'@type':'ImageObject',contentUrl:`${SITE_URL}/seo-tools/${tool.id}.svg`,url:`${SITE_URL}/seo-tools/${tool.id}.svg`,caption:`${tool.name} — AJN BUZZ IMAGE`}
 ]};
 if(tool.faq.length) graph['@graph'].push({'@type':'FAQPage',mainEntity:tool.faq.map(item=>({'@type':'Question',name:item.question,acceptedAnswer:{'@type':'Answer',text:item.answer}}))});
 return <Page><main className="section tool-page"><div className="container">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(graph)}}/>
  <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">AJN BUZZ IMAGE</Link><span>/</span><Link href="/tools">Image Tools</Link><span>/</span><b>{tool.name}</b></nav>
  <div className="tool-hero compact-tool-hero"><div className={`tool-icon tool-icon-${tool.category.toLowerCase().replaceAll(' ','-')} large`}><ToolIcon name={tool.icon} size={28}/></div><div><div className="eyebrow">{tool.category} · {tool.formats}</div><h1 className="tool-title">{tool.name}</h1><p className="tool-summary">{tool.summary}</p></div></div>
  <div className="tool-image-seo"><div className="tool-image-seo-copy"><div className="eyebrow">{tool.name}</div><h2>{tool.seoTitle}</h2><p>{tool.description}</p><div className="tool-points"><span><Check size={14}/> Focused workflow</span><span><Check size={14}/> Clear controls</span><span><Check size={14}/> Download result</span></div></div><div className="tool-image-preview"><img src={`/seo-tools/${tool.id}.svg`} alt={`${tool.name} online tool preview`} width="1200" height="675" loading="eager"/><span><ImageIcon size={14}/> Tool preview</span></div></div>
  <ImageEditor tool={tool}/>
  <AdSlot slot={`tool-${tool.id}`}/>
  <section className="tool-seo-card" aria-labelledby={`${tool.id}-details`}><div className="tool-seo-copy"><div className="eyebrow">How to use</div><h2 id={`${tool.id}-details`}>{tool.seoTitle}</h2><p>{tool.description}</p><ol><li>Choose or upload your image.</li><li>Set the options required for this workflow.</li><li>Process the image and review the output.</li><li>Use the Download button to save the result.</li></ol></div>{tool.faq.length?<div className="tool-faq-mini">{tool.faq.map(item=><details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>:null}</section>
  {related.length?<section className="related-tools"><div className="sectionhead"><div><div className="eyebrow">Related tools</div><h2>More {tool.category} tools</h2></div></div><div className="related-grid">{related.map(t=><Link className="related-card" href={`/tools/${t.id}`} key={t.id}><span className="tool-icon small"><ToolIcon name={t.icon} size={18}/></span><div><b>{t.name}</b><small>{t.summary}</small></div><ArrowRight size={15}/></Link>)}</div></section>:null}
 </div></main></Page>
}
