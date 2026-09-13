import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";
import { Page } from "@/components/Shell";

export const metadata = buildPageMetadata({
  title: "Terms of Use",
  description:
    "Terms for responsible use of AJN Buzz browser-based online image tools.",
  path: "/terms",
  index: true,
});

export default function Terms() {
  return (
    <Page>
      <main className="section page-top">
        <article className="container narrow legal-document">
          <div className="eyebrow">Terms</div>
          <h1 className="page-title">Terms of Use.</h1>
          <p className="legal-updated">Last updated: 13 September 2026</p>
          <p className="lead">
            These terms describe responsible use of AJN Buzz and the limits of
            browser-based image processing.
          </p>

          <section>
            <h2>1. Acceptable use</h2>
            <p>
              Use AJN Buzz only for lawful image tasks and in a way that does
              not interfere with the service, other users, browsers or networks.
            </p>
          </section>
          <section>
            <h2>2. Your images and permissions</h2>
            <p>
              You are responsible for having the rights or permission needed to
              process the images you select. AJN Buzz does not grant rights to
              third-party photographs, logos, watermarks or other protected
              material.
            </p>
          </section>
          <section>
            <h2>3. Watermark and repair tools</h2>
            <p>
              Remove Watermark is intended for images you own or are authorized
              to edit, including your own marks, timestamps and overlays. Do not
              use it to defeat ownership, attribution or access restrictions.
            </p>
          </section>
          <section>
            <h2>4. Tool limitations</h2>
            <p>
              Browser encoders and image algorithms can change quality, file
              size, dimensions, color or metadata. A target compression size is
              a limit the tool works toward, not a promise of an exact byte
              count for every image. Upscale uses browser resampling and does
              not claim generative detail reconstruction.
            </p>
          </section>
          <section>
            <h2>5. Verify important results</h2>
            <p>
              Review processed images before using them for applications,
              printing, publishing, identity documents or any workflow where
              dimensions, file size or visual accuracy matter.
            </p>
          </section>
          <section>
            <h2>6. Service availability</h2>
            <p>
              AJN Buzz may change, improve, limit or discontinue a tool as
              browsers and product requirements change. Temporary interruption
              can also occur because of hosting, browser or third-party service
              issues.
            </p>
          </section>
          <section>
            <h2>7. Prohibited misuse</h2>
            <p>
              Do not attempt to exploit the website, bypass security controls,
              distribute malware, impersonate AJN Buzz, automate abusive traffic
              or use the tools in a way that violates applicable law or the
              rights of others.
            </p>
          </section>
          <section>
            <h2>8. External services</h2>
            <p>
              AJN Buzz can display Google advertising and links to AJN PDF, QR
              AJN and other external destinations. Those services can have
              separate terms and policies.
            </p>
          </section>
          <section>
            <h2>9. No warranty of a particular output</h2>
            <p>
              The tools are provided for practical image utility workflows.
              Results depend on the source image, browser and selected settings.
              AJN Buzz does not guarantee that every output will meet a specific
              third-party upload, printing or quality requirement.
            </p>
          </section>
          <section>
            <h2>10. Responsibility and liability</h2>
            <p>
              You remain responsible for your source material, settings,
              downloaded results and how you use them. To the extent permitted
              by applicable law, AJN Buzz is not responsible for indirect loss
              caused by relying on an output without checking it first.
            </p>
          </section>
          <section>
            <h2>11. Changes</h2>
            <p>
              These terms can be updated as AJN Buzz changes. The published
              date above identifies the current version.
            </p>
          </section>
          <section>
            <h2>12. Contact</h2>
            <p>
              Questions about these terms can be sent to{" "}
              <a href="mailto:ajnbuzz@gmail.com">ajnbuzz@gmail.com</a>.
            </p>
          </section>

          <div className="inline-link-row">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/help">Help</Link>
          </div>
        </article>
      </main>
    </Page>
  );
}
