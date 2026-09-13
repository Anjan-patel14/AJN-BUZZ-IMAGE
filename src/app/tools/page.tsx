import Link from "next/link";
import { ArrowRight } from "lucide-react";
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

const workflows = [
  {
    title: "Prepare an image for an online form",
    steps: "Crop → Resize → Compress",
    body: "Fix the frame, set the required pixel dimensions, then reduce the final file to the upload limit.",
  },
  {
    title: "Prepare website images",
    steps: "Resize → Convert → Compress",
    body: "Set practical dimensions, choose a web-friendly format and then reduce transfer size.",
  },
  {
    title: "Polish a photo",
    steps: "Crop → Photo Editor → Compress",
    body: "Improve framing and basic appearance before creating a smaller sharing copy.",
  },
];

export default function Tools() {
  return (
    <Page>
      <main className="section page-top tools-index-page">
        <div className="container">
          <div className="eyebrow">Image tools</div>
          <h1 className="page-title">Choose what you need.</h1>
          <p className="lead tools-index-lead">
            Compress, resize, crop, convert and edit with focused browser image
            workflows.
          </p>
          <ToolCatalog />

          <section className="production-info-section tools-explainer">
            <div className="section-intro">
              <div className="eyebrow">Everyday image work</div>
              <h2>One focused place for common image tasks.</h2>
              <p>
                AJN Buzz separates each task into a clear workflow instead of
                hiding controls inside one complicated editor. Choose the job,
                select an image, adjust only the settings that matter and
                download the result.
              </p>
            </div>
            <div className="workflow-grid">
              {workflows.map((workflow) => (
                <article className="workflow-card" key={workflow.title}>
                  <small>{workflow.steps}</small>
                  <h3>{workflow.title}</h3>
                  <p>{workflow.body}</p>
                </article>
              ))}
            </div>
            <div className="inline-link-row">
              <Link href="/help">
                How the tools work <ArrowRight size={14} />
              </Link>
              <Link href="/privacy">
                Browser processing <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </Page>
  );
}
