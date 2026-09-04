import { buildPageMetadata } from "@/lib/seo";
export const metadata = buildPageMetadata({
  title: "Recent Image Tools",
  description:
    "Your recently opened AJN Buzz image tools stored in this browser.",
  path: "/recent",
  index: false,
});
import { Page } from "@/components/Shell";
import { ToolCatalog } from "@/components/ToolCatalog";
export default function RecentPage() {
  return (
    <Page>
      <main className="section page-top">
        <div className="container">
          <div className="eyebrow">Local activity</div>
          <h1 className="page-title">Recently used tools.</h1>
          <p className="lead">
            Only tool names are remembered locally. AJN Buzz does not store the
            images you processed.
          </p>
          <ToolCatalog mode="recent" />
        </div>
      </main>
    </Page>
  );
}
