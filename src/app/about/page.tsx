import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";
import { Page } from "@/components/Shell";

export const metadata = buildPageMetadata({
  title: "About AJN Buzz",
  description:
    "AJN Buzz is a focused online image utility product built around clear browser-first image workflows and honest capability boundaries.",
  path: "/about",
  index: true,
});

export default function About() {
  return (
    <Page>
      <main className="section page-top">
        <div className="container narrow">
          <div className="eyebrow">About AJN Buzz</div>
          <h1 className="page-title">Focused online image tools.</h1>
          <p className="lead">
            AJN Buzz is designed around one principle: common image work should
            be simple to understand and quick to complete. The public catalog
            stays focused on image tasks, while AJN PDF and QR AJN remain
            separate AJN Network products.
          </p>
          <div className="help-stack">
            <section className="help-card">
              <h2>Focused workflows</h2>
              <p>
                Compress, resize, crop, convert, edit, watermark, repair,
                upscale, rotate and create image output without turning the
                product into an unrelated all-purpose dashboard.
              </p>
            </section>
            <section className="help-card">
              <h2>Browser-first processing</h2>
              <p>
                The included public image transformations use browser APIs for
                their image work. That keeps the processing model simple and
                avoids requiring an AJN Buzz account.
              </p>
            </section>
            <section className="help-card">
              <h2>Capability honesty</h2>
              <p>
                Tools are described by what they actually do. Upscale uses
                high-quality resampling, Remove Watermark repairs a selected
                area, and HTML to Image sanitizes markup before local rendering.
              </p>
            </section>
          </div>
          <div className="inline-link-row">
            <Link href="/tools">Explore image tools</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </main>
    </Page>
  );
}
