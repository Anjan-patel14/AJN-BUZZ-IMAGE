import { buildPageMetadata } from '@/lib/seo';
export const metadata = buildPageMetadata({ title: 'AJN Buzz System Status', description: 'Local application and configuration status for AJN Buzz.', path: '/status', index: false });
import { Page } from '@/components/Shell';import { StatusPanel } from '@/components/StatusPanel';
export default function Status(){return <Page><main className="section page-top"><div className="container narrow"><div className="eyebrow">System status</div><h1 className="page-title">Simple runtime status.</h1><p className="lead">Checks the application and public configuration used by this image-only build.</p><StatusPanel/></div></main></Page>}
