import Link from 'next/link';
import { buildPageMetadata } from '@/lib/seo';
import { Page } from '@/components/Shell';

export const metadata = buildPageMetadata({
  title: 'About AJN BUZZ IMAGE — Browser-First Image Tools',
  description: 'AJN BUZZ IMAGE is a focused browser-local image utility suite with 30 tools for photo sizing, target-KB compression, passport photos, signatures, and conversion.',
  path: '/about',
  index: true,
});

export default function About() {
  return (
    <Page>
      <main className="section page-top">
        <div className="container narrow">
          <div className="eyebrow">About AJN BUZZ IMAGE</div>
          <h1 className="page-title">30 focused image tools that run in your browser.</h1>
          <p className="lead">
            AJN BUZZ IMAGE is built around one clear rule: everyday image work should be fast, accurate, private, and free of account walls or server upload queues.
          </p>

          <div className="help-stack" style={{ marginTop: 28 }}>
            <section className="help-card">
              <h2>1. Product Philosophy</h2>
              <p>
                Whether you are preparing a 35 × 45 mm passport photo at 300 DPI, shrinking a JPEG to under 50 KB for an exam portal, cleaning up a handwritten signature, or converting PNG files to WebP, each task has its own dedicated workspace with straightforward controls and instant dimension/byte telemetry.
              </p>
            </section>

            <section className="help-card">
              <h2>2. 100% Browser-Local Processing Architecture</h2>
              <p>
                Every tool in AJN BUZZ IMAGE decodes and transforms images directly on your device using HTML5 Canvas, ImageBitmap, and OffscreenCanvas Web Workers. Your personal portraits, ID photos, and signatures never leave your browser and are never uploaded to a remote server.
              </p>
            </section>

            <section className="help-card">
              <h2>3. Capability Honesty</h2>
              <p>
                Our tools are named and documented according to what they genuinely do. High-quality bicubic resampling is described honestly without false &ldquo;AI super-resolution&rdquo; claims, edge-connected background replacement clearly states that it is designed for plain, evenly lit walls, and passport photo guides are presented as visual framing aids rather than government biometric certification.
              </p>
            </section>

            <section className="help-card">
              <h2>4. Part of the AJN Ecosystem</h2>
              <p>
                AJN BUZZ IMAGE focuses exclusively on raster and vector image workflows. For document workflows, we maintain{' '}
                <a href="https://ajnpdf.com" target="_blank" rel="noopener noreferrer">
                  <b>AJN PDF</b>
                </a>
                ; for typing practice,{' '}
                <a href="https://unna.space" target="_blank" rel="noopener noreferrer">
                  <b>UNNA.space</b>
                </a>
                ; and for digital visiting cards,{' '}
                <a href="https://qrajn.online" target="_blank" rel="noopener noreferrer">
                  <b>QR AJN</b>
                </a>
                . Have feedback? Visit our <Link href="/contact"><b>Contact page</b></Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </Page>
  );
}
