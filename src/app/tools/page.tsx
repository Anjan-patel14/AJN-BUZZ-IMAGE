import { buildPageMetadata } from '@/lib/seo';
export const metadata = buildPageMetadata({ title: 'Online Image Tools', description: 'Browse 11 focused AJN Buzz image tools for compression, resizing, cropping, conversion, editing, watermarking and more.', path: '/tools', index: true });
import { Page } from '@/components/Shell';
import { ToolCatalog } from '@/components/ToolCatalog';
export default function Tools(){return <Page><main className="section page-top"><div className="container"><div className="eyebrow">Image tools</div><h1 className="page-title">Simple tools for everyday image work.</h1><p className="lead">Compress, resize, crop, convert, edit, watermark, upscale or remove a simple background. No account is required.</p><ToolCatalog/></div></main></Page>}
