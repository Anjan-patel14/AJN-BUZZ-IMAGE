import { buildPageMetadata } from "@/lib/seo";
export const metadata = buildPageMetadata({
  title: "AJN Buzz Help",
  description:
    "Learn target-size compression, image selection, formats, previews and browser-local processing.",
  path: "/help",
  index: true,
});
import Link from "next/link";
import { Page } from "@/components/Shell";
const sections = [
  [
    "Compress to a target size",
    "Open Compress Image, select the current image, choose “Compress file to”, enter a number and choose KB or MB. JPG/WebP are best for aggressive photographic targets.",
  ],
  [
    "Selecting an image",
    "A newly selected image clears stale output and refreshes the source preview and dimensions. Compress Image handles one current image per run.",
  ],
  [
    "Other image tools",
    "Resize, crop, convert, Remove Watermark, watermark, photo edit, upscale and rotate/flip use explicit browser image logic. HTML to Image safely renders supplied markup to PNG, JPG or WebP.",
  ],
  [
    "Supported formats",
    "Core workflows target PNG, JPEG, WebP and browser-decodable SVG. Animated GIF preservation, RAW conversion and PSD editing are not claimed.",
  ],
  [
    "Privacy",
    "Selected source images for these tools are decoded and transformed with browser APIs. No account is required.",
  ],
  [
    "AJN Network",
    "AJN PDF shortcuts open ajnpdf.com for PDF workflows. QR AJN shortcuts open qrajn.online for QR creation and sharing.",
  ],
  [
    "Problems",
    "Run CHECK_LOCAL.ps1 for route health. For build errors, use the first TypeScript or runtime error rather than continuing with a stale server.",
  ],
];
export default function Help() {
  return (
    <Page>
      <main className="section page-top">
        <div className="container narrow">
          <div className="eyebrow">Help center</div>
          <h1 className="page-title">How AJN Buzz Image works.</h1>
          <div className="help-stack">
            {sections.map(([title, body]) => (
              <section className="help-card" key={title}>
                <h2>{title}</h2>
                <p>{body}</p>
              </section>
            ))}
          </div>
          <p className="notice">
            Need something specific?{" "}
            <Link href="/contact">
              <b>Contact AJN Buzz support</b>
            </Link>
            .
          </p>
        </div>
      </main>
    </Page>
  );
}
