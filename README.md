# AJN Buzz Image V5.0

Focused production browser image tools with AJN PDF visual parity.

## Public image tools

1. Compress Image — Auto or numeric KB/MB target compression
2. Resize Image
3. Crop Image
4. Convert Image
5. Photo Editor
6. Watermark Image
7. Remove Background
8. Upscale Image
9. Rotate & Flip Image
10. Image to JPG
11. JPG to PNG / WebP

## V5.0 production updates

- Exact Google seller line published at `/ads.txt` and `/app-ads.txt`
- AdSense publisher `ca-pub-4495802176396975` wired into metadata/script configuration
- Real SEO metadata with canonical URLs, Open Graph, Twitter cards and JSON-LD
- Per-tool SEO keywords for all 11 image workflows
- `sitemap.xml` generated automatically from the actual image-tool registry and revalidated hourly
- `robots.txt` points at the production sitemap and excludes API/local-state pages
- Web app manifest and production icon metadata
- Source verifier rejects TODO/FIXME/placeholder markers in image source
- All 11 image tools are explicitly handled by the image processing engine
- Login, billing, Premium, workspace, Firebase and Razorpay remain removed

## Local production preview

Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force; .\START_LOCAL.ps1
```

The launcher runs source verification, TypeScript, optimized Next.js build, starts port 9010, validates all routes, validates the seller files and sitemap contents, then opens the browser.

Production canonical domain: `https://ajn.buzz`
