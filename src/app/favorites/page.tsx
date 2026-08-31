import { buildPageMetadata } from '@/lib/seo';
export const metadata = buildPageMetadata({ title: 'Favorite Image Tools', description: 'Your locally saved AJN Buzz favorite image tools.', path: '/favorites', index: false });
import { Page } from '@/components/Shell';
import { ToolCatalog } from '@/components/ToolCatalog';
export default function FavoritesPage(){return <Page><main className="section page-top"><div className="container"><div className="eyebrow">Local shortcuts</div><h1 className="page-title">Favorite image tools.</h1><p className="lead">Favorites are stored only in this browser, so you can keep your everyday image tools one click away.</p><ToolCatalog mode="favorites"/></div></main></Page>}
