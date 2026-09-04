import { buildPageMetadata } from "@/lib/seo";
export const metadata = buildPageMetadata({
  title: "Privacy",
  description:
    "How AJN Buzz handles browser-first image processing and local productivity settings.",
  path: "/privacy",
  index: true,
});
import { Page } from "@/components/Shell";
export default function Privacy() {
  return (
    <Page>
      <main className="section">
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="eyebrow">Privacy</div>
          <h1 className="page-title">Browser-first image processing.</h1>
          <p className="lead">
            Image transformation tools use browser APIs and do not need to
            upload source images to AJN Buzz servers. Optional favorites, recent
            tools and presets are stored locally in your browser.
          </p>
        </div>
      </main>
    </Page>
  );
}
