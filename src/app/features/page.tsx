import { buildPageMetadata } from "@/lib/seo";
export const metadata = buildPageMetadata({
  title: "Image Tool Features",
  description:
    "Explore AJN Buzz target-size compression, browser image processing, HTML to Image, Remove Watermark and AJN Network shortcuts.",
  path: "/features",
  index: true,
});
import Link from "next/link";
import {
  BadgeCheck,
  CloudOff,
  ExternalLink,
  Images,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { Page } from "@/components/Shell";
const features = [
  [
    SlidersHorizontal,
    "Target-size image compression",
    "Enter a numeric KB or MB target. AJN Buzz searches encoder quality and, when needed, scales dimensions to get under the requested size.",
  ],
  [
    CloudOff,
    "Browser-local image processing",
    "The included image tools transform source pixels in the browser instead of requiring an AJN server upload.",
  ],
  [
    Images,
    "Focused file handling",
    "Compress Image works on the current selected image. Other supported tools can process multiple selected images and create a ZIP.",
  ],
  [
    BadgeCheck,
    "Accurate capability claims",
    "Remove Watermark repairs only a selected area, HTML to Image is browser-rendered, and Upscale is described as high-quality resampling rather than fake AI.",
  ],
  [
    ExternalLink,
    "AJN Network shortcuts",
    "AJN PDF opens PDF workflows on ajnpdf.com and QR AJN opens QR creation tools on qrajn.online.",
  ],
  [
    Zap,
    "Professional AJN visual system",
    "Desktop and mobile surfaces use the same Manrope/Inter typography, premium cards, focused actions and responsive styling.",
  ],
] as const;
export default function Features() {
  return (
    <Page>
      <main className="section page-top">
        <div className="container">
          <div className="eyebrow">Product features</div>
          <h1 className="page-title">
            Focused image processing without account setup.
          </h1>
          <p className="lead">
            AJN Buzz keeps image processing direct: select the current file, use
            real controls, preview the result and download it.
          </p>
          <div className="feature-grid feature-page-grid">
            {features.map(([Icon, title, body]) => (
              <div className="feature-card" key={title}>
                <div className="feature-icon">
                  <Icon />
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
          <div className="center-actions">
            <Link className="btn primary" href="/tools/compress">
              Try Compress Image
            </Link>
            <a
              className="btn"
              href="https://ajnpdf.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open AJN PDF
            </a>
            <a
              className="btn"
              href="https://qrajn.online"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open QR AJN
            </a>
          </div>
        </div>
      </main>
    </Page>
  );
}
