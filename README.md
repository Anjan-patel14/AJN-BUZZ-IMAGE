# AJN BUZZ IMAGE V5.2.1 — SEO + WORKFLOW + FORMAT FIX

Professional, focused image tools for `https://www.ajn.buzz`.

## Public image tools

Exactly 11 explicit workflows:

- Compress Image
- Resize Image
- Crop Image
- Convert Image
- Photo Editor
- Watermark Image
- Remove Background (plain / near-flat backgrounds)
- Upscale Image
- Rotate & Flip Image
- Image to JPG
- JPG to PNG / WebP

## V5.2.1 production changes

- Concise AJN PDF-style homepage copy: one short hero line, popular tools, full tool directory.
- Strong unique search titles/descriptions for every image tool.
- Compress Image covers common intent: 20 KB, 50 KB, 100 KB, 200 KB, 500 KB, 1 MB and custom KB/MB.
- Compress target mode uses real iterative encoder-quality search and aspect-ratio-safe dimension fallback.
- Auto target output uses WebP by default; Keep original, JPG, WebP and PNG remain selectable.
- Resize, Crop, Convert and all other workflows remain explicit; unknown tool IDs fail closed.
- Rotate 0° / flip-only bug fixed.
- Watermark no longer silently inserts AJN Buzz text when the field is empty.
- Upscale checks safe output dimensions before allocating the canvas.
- Remove Background has a 12-megapixel browser safety guard and no expensive live preview.
- Compress, Remove Background and Upscale use process-time preview to reduce browser hangs.
- Route-level error recovery, global error recovery and a professional 404 page added.
- Popular tools + related tools create stronger internal links to Compress, Resize, Crop and Convert.
- WebApplication, Organization, WebSite, Breadcrumb, HowTo and FAQ structured data included.
- Canonical host stays `https://www.ajn.buzz`.
- `sitemap.xml` is registry-driven and includes all 11 canonical tool URLs.
- `robots.txt` points to the canonical sitemap and excludes API/private local-state pages.
- Permanent SEO redirects added for common paths such as `/compress-image`, `/resize-image`, `/crop-image`, `/image-converter`, `/image-to-jpg` and `/jpg-to-png`.
- Google seller line remains in `/ads.txt` and `/app-ads.txt`.
- Login, Billing, Premium, Workspace, Firebase and Razorpay remain removed.

## Google indexing note

Technical SEO can make AJN Buzz crawlable and competitive, but no code can guarantee the #1 Google position. After deployment, submit `https://www.ajn.buzz/sitemap.xml` in Google Search Console and request indexing first for `/`, `/tools/compress`, `/tools/resize`, `/tools/crop` and `/tools/convert`.

## Local production gate

Run:

```powershell
.\START_LOCAL.ps1
```

The launcher performs source verification, TypeScript, optimized Next.js build, localhost startup and route/SEO acceptance checks.

## Important URLs

- Home: `https://www.ajn.buzz/`
- Tools: `https://www.ajn.buzz/tools`
- Compress: `https://www.ajn.buzz/tools/compress`
- Resize: `https://www.ajn.buzz/tools/resize`
- Crop: `https://www.ajn.buzz/tools/crop`
- Convert: `https://www.ajn.buzz/tools/convert`
- Sitemap: `https://www.ajn.buzz/sitemap.xml`
- Robots: `https://www.ajn.buzz/robots.txt`
- Ads: `https://www.ajn.buzz/ads.txt`

## V5.2.1 build-gate fix

- Adds deterministic Prettier configuration.
- Production verifier is now quote/whitespace-format independent.
- Repair workflow formats TS/TSX/MJS before verification and Next build.
- Fixes the V5.2 local production gate that stopped on `prettier/prettier` errors.
- Keeps the V5.2 SEO, sitemap, image-workflow and runtime bug fixes unchanged.
