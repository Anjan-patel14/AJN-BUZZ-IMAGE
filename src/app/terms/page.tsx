import { buildPageMetadata } from "@/lib/seo";
export const metadata = buildPageMetadata({
  title: "Terms",
  description: "Terms for using AJN Buzz image tools.",
  path: "/terms",
  index: true,
});
import { Page } from "@/components/Shell";
export default function Terms() {
  return (
    <Page>
      <main className="section">
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="eyebrow">Terms</div>
          <h1 className="page-title">Use images you are allowed to edit.</h1>
          <p className="lead">
            You are responsible for having the rights or permission needed to
            process the images you select. Use the tools responsibly and verify
            important outputs before relying on them.
          </p>
        </div>
      </main>
    </Page>
  );
}
