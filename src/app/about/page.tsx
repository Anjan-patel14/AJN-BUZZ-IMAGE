import { buildPageMetadata } from "@/lib/seo";
export const metadata = buildPageMetadata({
  title: "About AJN Buzz",
  description:
    "AJN Buzz is a focused image utility product built around simple browser-first image processing and clear capability boundaries.",
  path: "/about",
  index: true,
});
import { Page } from "@/components/Shell";
export default function About() {
  return (
    <Page>
      <main className="section page-top">
        <div className="container narrow">
          <div className="eyebrow">About AJN Buzz Image</div>
          <h1 className="page-title">A focused image utility product.</h1>
          <p className="lead">
            AJN Buzz Image is designed around one principle: image work should
            stay image work. The core catalog stays focused on image work, while
            AJN PDF and QR AJN are promoted as clearly separated external AJN
            Network products.
          </p>
          <div className="help-stack">
            <section className="help-card">
              <h2>Product philosophy</h2>
              <p>
                Make frequent image tasks fast, understandable and
                privacy-conscious without requiring account setup.
              </p>
            </section>
            <section className="help-card">
              <h2>Processing model</h2>
              <p>
                The included transformations use browser Canvas and ImageBitmap
                APIs. Source images stay in the browser for these workflows.
              </p>
            </section>
            <section className="help-card">
              <h2>Capability honesty</h2>
              <p>
                Tools are named after what they actually do. Upscale uses
                high-quality resampling, Remove Watermark repairs only a
                selected area, and HTML to Image sanitizes markup before local
                rendering.
              </p>
            </section>
          </div>
        </div>
      </main>
    </Page>
  );
}
