import { buildPageMetadata } from "@/lib/seo";
export const metadata = buildPageMetadata({
  title: "AJN Buzz FAQ",
  description:
    "Answers about target-size image compression, formats, browser privacy, Remove Watermark, HTML to Image and AJN Network shortcuts.",
  path: "/faq",
  index: true,
});
import { Page } from "@/components/Shell";
const items = [
  [
    "Can I enter an exact compression size?",
    "Yes. Choose Compress file to, enter a number and select KB or MB. AJN Buzz searches lossy quality first and can reduce dimensions when required to get under the target.",
  ],
  [
    "Will every image land on the exact byte value?",
    "Not always. Browser encoders output discrete file sizes. AJN Buzz targets at-or-below the requested limit and reports when only a closest safe result is possible. JPG/WebP usually reach aggressive targets better than PNG.",
  ],
  [
    "Does Compress Image use the image I just selected?",
    "Yes. A new selection clears stale results and the compressor runs on the current selected image only. The input is reset so the same file can be selected again later.",
  ],
  [
    "Do my images upload to AJN Buzz?",
    "Not for the included browser processing tools. Selected source images are decoded and transformed locally by browser APIs.",
  ],
  [
    "Do I need an account?",
    "No. Open any of the 11 image tools and use it directly.",
  ],
  [
    "Is Upscale Image AI?",
    "No. This release uses high-quality browser resampling and labels it accurately.",
  ],
  [
    "How does Remove Watermark work?",
    "Select only the watermark, timestamp or logo rectangle. AJN Buzz reconstructs that area from surrounding pixels with local inpainting and edge blending. It works best on small overlays and does not pretend to perfectly rebuild every complex texture.",
  ],
  [
    "How does HTML to Image work?",
    "Paste or write HTML, choose the canvas size and output format, and AJN Buzz sanitizes the markup before rendering it locally through SVG and Canvas. Scripts, event handlers and remote source URLs are removed.",
  ],
  [
    "Why are AJN PDF and QR AJN shown here?",
    "They are AJN Network shortcuts. PDF actions open ajnpdf.com, while QR AJN opens qrajn.online for QR creation and sharing.",
  ],
];
export default function FAQ() {
  return (
    <Page>
      <main className="section page-top">
        <div className="container narrow">
          <div className="eyebrow">FAQ</div>
          <h1 className="page-title">Clear answers about image processing.</h1>
          <div className="faq-list">
            {items.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </main>
    </Page>
  );
}
