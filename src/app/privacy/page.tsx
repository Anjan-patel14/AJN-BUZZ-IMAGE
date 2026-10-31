import { buildPageMetadata } from '@/lib/seo';
import { Page } from '@/components/Shell';

export const metadata = buildPageMetadata({
  title: 'Privacy Policy — AJN BUZZ IMAGE',
  description: 'Learn how AJN BUZZ IMAGE handles browser-first image processing, cookies, Google AdSense ads, and local preferences.',
  path: '/privacy',
  index: true,
});

export default function Privacy() {
  return (
    <Page>
      <main className="section page-top">
        <div className="container narrow">
          <div className="eyebrow">Privacy Policy</div>
          <h1 className="page-title">Transparent data handling &amp; browser-first processing.</h1>
          <p className="lead">
            At AJN BUZZ IMAGE (https://www.ajn.buzz/), protecting your privacy is a core engineering requirement. This Privacy Policy explains what stays on your device, how local storage is used, and how Google AdSense operates on our site.
          </p>

          <div className="help-stack" style={{ marginTop: 28 }}>
            <section className="help-card">
              <h2>1. Browser-First Image Processing</h2>
              <p>
                All 30 image transformation tools (including resizing, target-KB compression, cropping, passport photo preparation, signature creation, and format conversion) run 100% client-side inside your web browser using HTML5 Canvas, OffscreenCanvas Web Workers, and local Blob APIs. <strong>Your selected source images and exported files are never uploaded to AJN BUZZ servers or stored in remote cloud databases.</strong>
              </p>
            </section>

            <section className="help-card">
              <h2>2. Google AdSense &amp; Advertising Cookies</h2>
              <p>
                AJN BUZZ IMAGE includes the official Google AdSense publisher script (<code>ca-pub-4495802176396975</code>) in the HTML <code>&lt;head&gt;</code> across pages as required by Google for site ownership verification and automated ad delivery. In addition, optional manual in-page ad slots (<code>AdSlot</code>) are gated by your cookie banner choice (<code>ajn_buzz_cookie_consent</code>) and only activate when you choose &ldquo;Allow optional ads&rdquo; and manual ad slots are enabled in production configuration.
              </p>
              <p style={{ marginTop: 10 }}>
                Third-party vendors, including Google, use cookies to serve ads based on a user&apos;s prior visits to this website or other websites. If you visit from the EEA, the UK, or Switzerland, Google&apos;s Certified Consent Management Platform (CMP) configured in the publisher&apos;s AdSense account governs regional ad personalization consent. Users may manage or opt out of personalized advertising at any time by visiting{' '}
                <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
                  <b>Google Ads Settings</b>
                </a>{' '}
                or{' '}
                <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer">
                  <b>www.aboutads.info</b>
                </a>
                .
              </p>
            </section>

            <section className="help-card">
              <h2>3. Local Storage &amp; Preferences</h2>
              <p>
                We use browser <code>localStorage</code> strictly on your device to save optional convenience settings: favorite tools (<code>ajn-buzz-image:favorites:v1</code>), recently opened tools capped at the 10 most recent items (<code>ajn-buzz-image:recent:v1</code>), saved custom presets (<code>ajn-buzz-image:presets:v1</code>), and your cookie banner preference (<code>ajn_buzz_cookie_consent</code>). You can clear this data at any time through your browser settings; it is never transmitted to AJN BUZZ servers.
              </p>
            </section>

            <section className="help-card">
              <h2>4. Standard Server Log Files</h2>
              <p>
                Like standard web hosting providers, our web server records routine HTTP access logs when pages or static assets are requested. These logs may include IP addresses, browser user-agent strings, timestamps, and requested page paths for security and reliability monitoring, and are never linked to your local image files.
              </p>
            </section>

            <section className="help-card">
              <h2>5. Contact &amp; Updates</h2>
              <p>
                If you have questions regarding this Privacy Policy or data handling practices on AJN BUZZ IMAGE, please contact us at{' '}
                <a href="mailto:support@ajn.buzz">
                  <b>support@ajn.buzz</b>
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </Page>
  );
}
