import { buildPageMetadata } from '@/lib/seo';
import { Page } from '@/components/Shell';
import { ToolCatalog } from '@/components/ToolCatalog';

export const metadata = buildPageMetadata({
  title: 'Online Image Tools',
  description: 'Browse 11 focused AJN Buzz image tools for compression, resizing, cropping, conversion, editing, watermarking and more.',
  path: '/tools',
  index: true,
});

export default function Tools(){
  return (
    <Page>
      <main className="section page-top" style={{ paddingTop: 26 }}>
        <div className="container">
          <div className="eyebrow">Image tools</div>
          <h1 className="page-title" style={{ marginBottom: 20 }}>Choose an image tool.</h1>
          <ToolCatalog/>
        </div>
      </main>
    </Page>
  );
}