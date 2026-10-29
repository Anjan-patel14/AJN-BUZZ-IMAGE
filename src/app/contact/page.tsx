import { buildPageMetadata } from '@/lib/seo';
import { Page } from '@/components/Shell';
import Link from 'next/link';

export const metadata = buildPageMetadata({
  title: 'Contact Us — AJN BUZZ IMAGE',
  description: 'Get in touch with AJN BUZZ IMAGE support for questions, feedback, or tool assistance.',
  path: '/contact',
  index: true,
});

export default function Contact() {
  return (
    <Page>
      <main className="section page-top">
        <div className="container narrow">
          <div className="eyebrow">Contact Support</div>
          <h1 className="page-title">We are here to help.</h1>
          <p className="lead">
            Have questions about a specific image tool, file size compression, or passport photo formatting? Reach out to the AJN BUZZ support team.
          </p>

          <div className="help-stack" style={{ marginTop: 28 }}>
            <section className="help-card">
              <h2>Support Email</h2>
              <p>
                For technical inquiries, bug reports, or feature requests, contact us directly at: <br />
                <a href="mailto:support@ajn.buzz" style={{ color: 'var(--brand)', fontWeight: 700 }}><b>support@ajn.buzz</b></a>
              </p>
            </section>

            <section className="help-card">
              <h2>Frequently Asked Questions</h2>
              <p>
                Many common questions about target file-size compression, browser-local privacy, and supported formats are answered in our <Link href="/faq"><b>FAQ center</b></Link> and <Link href="/help"><b>Help guide</b></Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </Page>
  );
}
