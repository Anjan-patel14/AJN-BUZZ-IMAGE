import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";
import { Page } from "@/components/Shell";

export const metadata = buildPageMetadata({
  title: "AJN Buzz Help",
  description:
    "Get help with AJN Buzz image uploads, processing, downloads, formats, browser memory and target-size compression.",
  path: "/help",
  index: true,
});

const sections = [
  [
    "Compress to a target size",
    "Open Compress Image, select an image, choose target-size mode, enter a number and select KB or MB. WebP or JPG normally work better than PNG for aggressive photographic file-size targets.",
  ],
  [
    "Selecting an image",
    "Choose a supported image from your device. Selecting a new source clears stale output so the next result belongs to the current image.",
  ],
  [
    "Image will not open",
    "Confirm the file is a supported browser-decodable image and is not damaged. Core workflows support JPG, JPEG, PNG and WebP; selected tools also support browser-decodable SVG.",
  ],
  [
    "Processing does not start",
    "Refresh the page, select the image again and retry. Close memory-heavy tabs if the browser is under pressure. AJN Buzz rejects unsafe canvas sizes instead of attempting an allocation that could freeze the page.",
  ],
  [
    "Large image failed",
    "The default input safety limit is 30 MB and additional pixel or canvas safety limits apply. Very large dimensions can exceed browser memory even when the file itself is small.",
  ],
  [
    "Download does not start",
    "Allow downloads for ajn.buzz in your browser, then process the image again. On mobile, also check the browser download or Files permission flow.",
  ],
  [
    "Result quality is different",
    "Compression, resizing and format conversion can change visual quality. Use a less aggressive size target, higher quality, or a lossless-friendly format when fine details matter.",
  ],
  [
    "Multiple images",
    "Batch support depends on the tool. Resize supports multiple selected images and can create a ZIP for multiple outputs. Other tools intentionally focus on one current image per run.",
  ],
  [
    "Privacy",
    "The public image transformations are designed to run with browser APIs. Advertising, consent and linked external AJN services can make their own network requests; see the Privacy Policy for details.",
  ],
  [
    "AJN Network",
    "AJN PDF opens ajnpdf.com for PDF workflows. QR AJN opens qrajn.online for QR creation and sharing. They are separate products and may have their own policies.",
  ],
];

export default function Help() {
  return (
    <Page>
      <main className="section page-top">
        <div className="container narrow">
          <div className="eyebrow">Help Center</div>
          <h1 className="page-title">Use AJN Buzz with confidence.</h1>
          <p className="lead">
            Practical help for selecting images, processing safely and getting a
            usable result without developer-only troubleshooting steps.
          </p>
          <div className="help-stack">
            {sections.map(([title, body]) => (
              <section className="help-card" key={title}>
                <h2>{title}</h2>
                <p>{body}</p>
              </section>
            ))}
          </div>
          <div className="policy-callout">
            <h2>Still need help?</h2>
            <p>
              Email AJN Buzz at{" "}
              <a href="mailto:ajnbuzz@gmail.com">ajnbuzz@gmail.com</a> or use
              the contact page.
            </p>
            <div className="inline-link-row">
              <Link href="/contact">Contact AJN Buzz</Link>
              <Link href="/faq">Read the FAQ</Link>
            </div>
          </div>
        </div>
      </main>
    </Page>
  );
}
