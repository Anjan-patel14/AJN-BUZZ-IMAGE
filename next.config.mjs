/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/compress-image",
        destination: "/tools/compress",
        permanent: true,
      },
      {
        source: "/resize-image",
        destination: "/tools/resize",
        permanent: true,
      },
      { source: "/crop-image", destination: "/tools/crop", permanent: true },
      {
        source: "/image-converter",
        destination: "/tools/convert",
        permanent: true,
      },
      {
        source: "/photo-editor-online",
        destination: "/tools/photo-editor",
        permanent: true,
      },
      {
        source: "/watermark-image",
        destination: "/tools/watermark",
        permanent: true,
      },
      {
        source: "/remove-watermark",
        destination: "/tools/remove-watermark",
        permanent: true,
      },
      {
        source: "/remove-background",
        destination: "/tools/remove-watermark",
        permanent: true,
      },
      {
        source: "/tools/background-remover",
        destination: "/tools/remove-watermark",
        permanent: true,
      },
      {
        source: "/upscale-image",
        destination: "/tools/upscale",
        permanent: true,
      },
      {
        source: "/rotate-image",
        destination: "/tools/rotate",
        permanent: true,
      },
      {
        source: "/image-to-jpg",
        destination: "/tools/convert",
        permanent: true,
      },
      {
        source: "/html-to-image",
        destination: "/tools/html-to-image",
        permanent: true,
      },
      {
        source: "/jpg-to-png",
        destination: "/tools/jpg-to-png",
        permanent: true,
      },
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    ];

    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }

    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/ads.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600",
          },
        ],
      },
      {
        source: "/app-ads.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600",
          },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
