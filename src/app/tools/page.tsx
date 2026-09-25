import { buildPageMetadata } from '@/lib/seo';
import { Page } from '@/components/Shell';
import { ToolCatalog } from '@/components/ToolCatalog';

export const metadata = buildPageMetadata({
  title: 'Online Image Tools',
  description: 'Choose from 30 focused image tools for signatures, passport and ID photos, CM/MM/inch sizing, DPI, compression, crop, conversion, editing and background work.',
  path: '/tools',
  index: true,
});

export default function Tools(){
  return (
    <Page>
      <main className="section page-top tools-index-page">
        <div className="container">
          <div className="eyebrow">Image tools</div>
          <h1 className="page-title">Choose what you need.</h1>
          <p className="lead tools-index-lead">Photo size, signature and everyday image work without unnecessary steps.</p>
          <ToolCatalog/>
        </div>
      </main>
    </Page>
  );
}
