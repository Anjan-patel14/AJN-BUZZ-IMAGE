import './scripts/eslint-loader.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['*.run.app', 'localhost:3000', '127.0.0.1:3000'],
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'X-Frame-Options', value: 'ALLOWALL' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
    ];

    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/ads.txt',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600' }],
      },
      {
        source: '/app-ads.txt',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600' }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/tools/:slug',
        destination: '/:slug',
        permanent: true,
      },
      {
        source: '/watermark',
        destination: '/text-on-image',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
