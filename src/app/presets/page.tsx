import { buildPageMetadata } from '@/lib/seo';
export const metadata = buildPageMetadata({ title: 'Saved Image Presets', description: 'Your locally saved AJN Buzz image-tool settings.', path: '/presets', index: false });
import { Page } from '@/components/Shell';import { PresetsClient } from '@/components/PresetsClient';
export default function Presets(){return <Page><main className="section page-top"><div className="container narrow"><div className="eyebrow">Saved settings</div><h1 className="page-title">Reusable image presets.</h1><p className="lead">Presets stay in this browser and contain tool settings only—not your source images.</p><PresetsClient/></div></main></Page>}
