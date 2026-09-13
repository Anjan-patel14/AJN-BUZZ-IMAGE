import Link from "next/link";
import { Mail, MessageSquareText, ShieldCheck, Wrench } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";
import { Page } from "@/components/Shell";

export const metadata = buildPageMetadata({
  title: "Contact AJN Buzz",
  description:
    "Contact AJN Buzz for image-tool support, feedback, privacy questions or business enquiries.",
  path: "/contact",
  index: true,
});

const supportTopics = [
  {
    icon: Wrench,
    title: "Tool support",
    body: "Report an upload, processing, preview or download problem. Include the tool name, browser and what happened, but do not email private source images unless you intentionally choose to share them.",
  },
  {
    icon: MessageSquareText,
    title: "Feedback",
    body: "Share a workflow suggestion, accessibility issue or idea that could make AJN Buzz clearer and easier to use.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy",
    body: "Ask how browser processing, local preferences, advertising or privacy choices work on AJN Buzz.",
  },
];

export default function Contact() {
  return (
    <Page>
      <main className="section page-top">
        <div className="container narrow">
          <div className="eyebrow">Contact</div>
          <h1 className="page-title">Contact AJN Buzz.</h1>
          <p className="lead">
            Need help with an image tool, want to report a problem, or have
            feedback about AJN Buzz? Email our public support address.
          </p>

          <a className="support-email-card" href="mailto:ajnbuzz@gmail.com">
            <span className="support-email-icon">
              <Mail size={22} />
            </span>
            <span>
              <small>Email AJN Buzz</small>
              <strong>ajnbuzz@gmail.com</strong>
            </span>
          </a>

          <div className="support-topic-grid">
            {supportTopics.map(({ icon: Icon, title, body }) => (
              <section className="help-card" key={title}>
                <span className="support-topic-icon">
                  <Icon size={19} />
                </span>
                <h2>{title}</h2>
                <p>{body}</p>
              </section>
            ))}
          </div>

          <section className="policy-callout">
            <h2>Before contacting support</h2>
            <p>
              Try the Help Center for common upload, processing and download
              fixes. For privacy details, read the Privacy Policy. AJN Buzz does
              not ask for passwords or payment credentials by email.
            </p>
            <div className="inline-link-row">
              <Link href="/help">Help Center</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </div>
          </section>
        </div>
      </main>
    </Page>
  );
}
