import { buildPageMetadata } from "@/lib/seo";
import { Page } from "@/components/Shell";
import { ToolCatalog } from "@/components/ToolCatalog";

export const metadata = buildPageMetadata({
  title: "Online Image Tools — Compress, Resize, Crop & Convert",
  description:
    "Choose focused online image tools for compression, resize, crop, conversion, photo editing, watermarking and more with AJN Buzz.",
  path: "/tools",
  index: true,
});

export default function Tools() {
  return (
    <Page>
      <main className="section page-top tools-index-page">
        <div className="container">
          <div className="eyebrow">Image tools</div>
          <h1 className="page-title">Choose what you need.</h1>
          <p className="lead tools-index-lead">
            Compress, resize, crop, convert and edit with focused image
            workflows.
          </p>
          <ToolCatalog />
        </div>
      </main>
    </Page>
  );
}
