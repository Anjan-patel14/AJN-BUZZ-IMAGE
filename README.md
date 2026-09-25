# AJN BUZZ IMAGE V6.1 — PHOTO + SIGNATURE STUDIO

AJN BUZZ V6.1 is a focused browser-first image utility site. It contains **30 public tools** with no login, billing, Premium gate, Firebase or Razorpay requirement. Standard image work happens locally in the browser.

## Public tools

### Optimize
- Compress Image
- Compress Image to KB
- Resize Image (pixels)
- Upscale Image

### Photo Size
- Resize Image in CM
- Resize Image in MM
- Resize Image in Inches
- Photo Size Converter (PX / CM / MM / Inches + DPI)
- Passport Photo Maker
- ID Photo Maker
- 35 × 45 mm Photo
- 2 × 2 Inch Photo
- DPI Changer

### Signature
- Signature Maker (draw or upload)
- Upload Signature & Crop
- Signature Resize
- Signature Size Reducer
- Signature Background Remover
- Signature to PNG

### Edit
- Crop Image
- Aspect Ratio Crop
- Photo Editor
- Watermark Image
- Remove Background
- Change Photo Background
- Rotate / Flip Image
- Remove Image Metadata

### Convert
- Convert Image Format
- Convert to JPG
- JPG to PNG / WebP

## V6 implementation notes

- Physical sizing supports **PX, CM, MM and inches**, with DPI-aware pixel calculation.
- Passport/ID workflows use exact physical dimensions, crop-to-fit positioning and optional plain-background replacement. They do **not** claim guaranteed acceptance; users must verify the issuing authority's current rules.
- Signature tools share a real browser processor for drawing, upload, auto-trim, background cleanup, resize, target-KB compression and transparent PNG export.
- Compress-to-KB uses the real target-size search already present in AJN Buzz.
- Crop is no longer a fixed centre-square operation; exact coordinates and separate aspect-ratio crop controls are provided.
- DPI metadata is written into supported PNG/JPEG results without changing visible pixel dimensions for the DPI Changer tool.
- Remove Metadata re-encodes visible pixels so source EXIF/GPS metadata is not copied.
- Background replacement/removal is designed for flat or near-flat backgrounds. It is intentionally not labelled universal AI segmentation.
- Batch processing is available for normal file-based workflows; signature drawing is single-output.

## Run locally

From PowerShell inside this folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\START_LOCAL.ps1
```

The script installs pinned dependencies when needed, verifies the source, type-checks it, builds the optimized Next.js app, starts localhost on port **9010**, and runs local route acceptance.

## Verification

```powershell
npm.cmd run check
```

The verifier checks all 30 registry tools, required processors/UI markers, removed account/billing surfaces, seller files, sitemap/SEO contracts, TypeScript and the production Next.js build.

## AJN Bot

AJN Bot is available at `/bot`. It accepts plain-English image tasks, maps them to the registered AJN Buzz tool catalog, and can execute supported image operations in the browser. PDF requests are recognized and routed to AJN PDF instead of being falsely processed here.

### Gemini setup

1. Run `SET_GEMINI_KEY.ps1`.
2. Paste the Gemini API key when PowerShell asks.
3. Start AJN Buzz with `START_LOCAL.ps1`.

The Gemini key is server-side only and must never be prefixed with `NEXT_PUBLIC_`. The release ZIP intentionally does not contain a real key.
