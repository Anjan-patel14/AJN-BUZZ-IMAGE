import type { MetadataRoute } from "next";
import { IMAGE_TOOLS } from "@/lib/image-tools";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

const RELEASED_AT = new Date("2026-09-13T03:00:00.000Z");
const STATIC_INDEXABLE_ROUTES = [
  "/",
  "/tools",
  "/features",
  "/faq",
  "/about",
  "/help",
  "/privacy",
  "/terms",
  "/contact",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_INDEXABLE_ROUTES.map(
    (path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: RELEASED_AT,
      changeFrequency:
        path === "/" || path === "/tools"
          ? ("weekly" as const)
          : ("monthly" as const),
      priority: path === "/" ? 1 : path === "/tools" ? 0.95 : 0.6,
    }),
  );

  const toolEntries: MetadataRoute.Sitemap = IMAGE_TOOLS.map((tool) => ({
    url: `${SITE_URL}/tools/${tool.id}`,
    lastModified: RELEASED_AT,
    changeFrequency:
      tool.id === "compress" || tool.id === "resize"
        ? ("weekly" as const)
        : ("monthly" as const),
    priority:
      tool.id === "compress"
        ? 1
        : tool.id === "resize"
          ? 0.98
          : ["crop", "convert"].includes(tool.id)
            ? 0.95
            : 0.85,
  }));

  return [...staticEntries, ...toolEntries];
}
