import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";
import { Page } from "@/components/Shell";

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "AJN Buzz privacy information for browser image processing, local storage, cookies, Google advertising and user choices.",
  path: "/privacy",
  index: true,
});

const updated = "13 September 2026";

export default function Privacy() {
  return (
    <Page>
      <main className="section page-top">
        <article className="container narrow legal-document">
          <div className="eyebrow">Privacy</div>
          <h1 className="page-title">Privacy Policy.</h1>
          <p className="legal-updated">Last updated: {updated}</p>
          <p className="lead">
            AJN Buzz is a focused online image-tool website. This policy
            explains how image processing, browser storage, optional advertising
            and third-party services are handled.
          </p>

          <section>
            <h2>1. About AJN Buzz</h2>
            <p>
              AJN Buzz provides browser-based tools for image compression,
              resizing, cropping, conversion and editing. No account is required
              to use the public image tools.
            </p>
          </section>

          <section>
            <h2>2. Image processing</h2>
            <p>
              The public AJN Buzz image transformations are designed to decode
              and process selected source images with browser APIs on your
              device. The application does not need to upload those source
              images to an AJN Buzz processing server to perform these
              workflows.
            </p>
            <p>
              Your browser, operating system, extensions, advertising services
              and external links can still make network requests that are
              separate from the image-processing operation.
            </p>
          </section>

          <section>
            <h2>3. Files and output</h2>
            <p>
              AJN Buzz does not provide cloud storage for source images or
              processed outputs. Results are made available to your browser for
              preview or download. You control files you save to your device.
            </p>
          </section>

          <section>
            <h2>4. Local browser storage</h2>
            <p>
              AJN Buzz can store product preferences such as favorite tools,
              recent tool names, presets and cookie choices in browser storage.
              These settings stay with that browser profile unless you clear
              them. They are not the source image itself.
            </p>
          </section>

          <section>
            <h2>5. Advertising</h2>
            <p>
              AJN Buzz may use Google AdSense to display advertisements on
              eligible pages. When advertising is enabled, Google and its
              partners may use cookies, local storage or similar technologies to
              deliver, measure and protect advertising, subject to applicable
              consent and Google policies.
            </p>
            <p>
              AJN Buzz does not position advertisements as image-tool controls
              and does not intentionally send the image you selected to AdSense
              as part of the image-processing workflow.
            </p>
          </section>

          <section>
            <h2>6. Cookies and similar technologies</h2>
            <p>
              Essential browser storage supports product preferences. Optional
              advertising is gated by the AJN Buzz privacy choice shown in the
              interface when the advertising configuration is enabled.
              Region-specific Google consent messages can also apply where
              required.
            </p>
          </section>

          <section>
            <h2>7. Personalized advertising choices</h2>
            <p>
              Google provides controls for how ads are personalized. You can
              review Google advertising choices at{" "}
              <a
                href="https://myadcenter.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                My Ad Center
              </a>
              . Depending on your location, a Google-certified consent message
              may provide additional choices before personalized advertising is
              used.
            </p>
          </section>

          <section>
            <h2>8. Analytics</h2>
            <p>
              This policy does not claim that a separate analytics product is
              active unless one is actually configured. If analytics is added,
              this policy will be updated before relying on new data collection
              for that purpose.
            </p>
          </section>

          <section>
            <h2>9. Third-party services and external sites</h2>
            <p>
              Advertising can involve Google services. AJN Buzz also links to
              separate AJN Network products such as AJN PDF and QR AJN. External
              sites have their own privacy practices and are not controlled by
              this page.
            </p>
          </section>

          <section>
            <h2>10. Retention</h2>
            <p>
              Browser preferences remain until you clear site data or replace
              them. AJN Buzz does not operate a user account database for the
              public image-tool site. Advertising providers can have their own
              retention periods under their policies.
            </p>
          </section>

          <section>
            <h2>11. International visitors</h2>
            <p>
              Privacy and consent requirements vary by region. AJN Buzz uses
              consent-aware advertising controls and should be configured with
              the appropriate Google-certified consent management experience
              where Google policy or applicable law requires it.
            </p>
          </section>

          <section>
            <h2>12. Your choices</h2>
            <p>
              You can choose essential-only storage in the AJN Buzz privacy
              controls, clear AJN Buzz site data in your browser, use Google ad
              controls and avoid external links you do not want to visit.
            </p>
          </section>

          <section>
            <h2>13. Children</h2>
            <p>
              AJN Buzz is a general-purpose image utility and is not designed to
              collect personal information from children through accounts or
              profile creation. If you believe a privacy issue involves a
              child, contact us so it can be reviewed.
            </p>
          </section>

          <section>
            <h2>14. Contact</h2>
            <p>
              Privacy questions can be sent to{" "}
              <a href="mailto:ajnbuzz@gmail.com">ajnbuzz@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2>15. Changes to this policy</h2>
            <p>
              This page can be updated when AJN Buzz changes its products,
              advertising or privacy practices. The date above identifies the
              current published version.
            </p>
          </section>

          <div className="inline-link-row">
            <Link href="/contact">Contact</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/help">Help</Link>
          </div>
        </article>
      </main>
    </Page>
  );
}
