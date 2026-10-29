import { buildPageMetadata } from '@/lib/seo';
import { Page } from '@/components/Shell';

export const metadata = buildPageMetadata({
  title: 'Terms of Service — AJN BUZZ IMAGE',
  description: 'Terms and conditions for using AJN BUZZ IMAGE browser-based image utilities.',
  path: '/terms',
  index: true,
});

export default function Terms() {
  return (
    <Page>
      <main className="section page-top">
        <div className="container narrow">
          <div className="eyebrow">Terms of Service</div>
          <h1 className="page-title">Use images you are authorized to edit.</h1>
          <p className="lead">
            By accessing AJN BUZZ IMAGE (https://www.ajn.buzz/), you agree to be bound by these terms of service and all applicable laws and regulations.
          </p>

          <div className="help-stack" style={{ marginTop: 28 }}>
            <section className="help-card">
              <h2>1. Permitted Use</h2>
              <p>
                AJN BUZZ IMAGE provides online image-processing tools for students, job seekers, office workers, and professionals. You are responsible for ensuring you have the legal rights, permissions, or ownership for any images you process using our tools.
              </p>
            </section>

            <section className="help-card">
              <h2>2. Browser-First Processing Disclaimer</h2>
              <p>
                Our tools operate entirely client-side within your browser. While we strive for high accuracy and reliable performance across modern browsers, you should verify important output images (such as passport photos or compressed forms) before formal submission.
              </p>
            </section>

            <section className="help-card">
              <h2>3. Intellectual Property</h2>
              <p>
                The AJN BUZZ name, logo, interface design, tool registry, and frontend architecture are protected by applicable intellectual property rights. Processed output images remain entirely your property.
              </p>
            </section>

            <section className="help-card">
              <h2>4. Limitation of Liability</h2>
              <p>
                AJN BUZZ IMAGE is provided on an &quot;as is&quot; basis without warranties of any kind, whether express or implied. We shall not be liable for any indirect, incidental, or consequential damages arising from the use or inability to use our browser utilities.
              </p>
            </section>
          </div>
        </div>
      </main>
    </Page>
  );
}
