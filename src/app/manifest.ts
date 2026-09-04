import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AJN Buzz Image Tools",
    short_name: "AJN Buzz",
    description:
      "Focused browser image tools for compression, resize, crop, conversion and editing.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9fd",
    theme_color: "#1a56db",
    icons: [
      { src: "/brand/ajn-buzz-logo.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
