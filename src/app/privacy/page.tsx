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
            At AJN BUZZ IMAGE (https://www.ajn.buzz/), accessible from our website, protecting your privacy is a top priority. This Privacy Policy document contains types of information that is collected and recorded by AJN BUZZ IMAGE and how we use it.
          </p>

          <div className="help-stack" style={{ marginTop: 28 }}>
            <section className="help-card">
              <h2>1. Browser-First Image Processing</h2>
              <p>
                All image transformation tools (such as resizing, compression, cropping, signature making, and format conversion) run entirely client-side inside your browser using HTML5 Canvas and local JavaScript APIs. <strong>Your selected source images are never uploaded to AJN Buzz servers or stored on remote cloud databases.</strong>
              </p>
            </section>

            <section className="help-card">
              <h2>2. Google AdSense &amp; Advertising Cookies</h2>
              <p>
                AJN BUZZ IMAGE may display advertisements served by Google AdSense. Google uses cookies to serve ads based on a user&apos;s prior visits to our website or other websites. Google&apos;s use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet.
              </p>
              <p style={{ marginTop: 10 }}>
                Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer"><b>Google Ads Settings</b></a>. (Alternatively, you can opt out of a third-party vendor&apos;s use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer"><b>www.aboutads.info</b></a>).
              </p>
            </section>

            <section className="help-card">
              <h2>3. Local Storage &amp; Preferences</h2>
              <p>
                We use browser local storage solely to remember user-convenience features such as your favorite tools, recently accessed tool history, and interface preferences. This data remains on your device and is never transmitted to us.
              </p>
            </section>

            <section className="help-card">
              <h2>4. Log Files &amp; Analytics</h2>
              <p>
                Like standard website operators, AJN BUZZ IMAGE follows a standard procedure of using log files. These files log visitors when they visit websites. The information collected includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable.
              </p>
            </section>

            <section className="help-card">
              <h2>5. Consent</h2>
              <p>
                By using our website, you hereby consent to our Privacy Policy and agree to its terms.
              </p>
            </section>
          </div>
        </div>
      </main>
    </Page>
  );
}
