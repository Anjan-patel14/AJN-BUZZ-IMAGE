# AJN BUZZ IMAGE V5.3 — Logic + Output Reliability Release

Focused production browser image tools for `https://www.ajn.buzz`.

## Public tools

1. Compress Image
2. Resize Image
3. Crop Image
4. Convert Image
5. Photo Editor
6. Watermark Image
7. Remove Watermark
8. Upscale Image
9. Rotate & Flip Image
10. Image to JPG
11. JPG to PNG / WebP

## V5.3 processing changes

- Remove Background is replaced by Remove Watermark.
- Remove Watermark uses selected-area local inpainting: boundary sampling, inward blending, smoothing and edge feathering.
- Repair regions are clamped to image bounds and rejected when they cover more than 45% of the image.
- Compress Image keeps real KB/MB target compression with quality search and aspect-ratio-safe dimension fallback.
- Resize, Crop, Convert, Photo Editor, Watermark, Upscale, Rotate/Flip and dedicated JPG conversions remain explicit processors.
- Shared image validation protects browser memory with maximum pixel and edge limits.
- Encoded outputs are validated before they are exposed for preview/download.
- Selecting another image clears stale output URLs and previous results.
- Batch processing remains sequential to reduce browser memory spikes.
- JPEG outputs flatten transparency onto white.
- Unsupported tool IDs fail closed instead of using a generic processor.
- UI theme, layout, cards, colors and AJN PDF shortcuts remain unchanged.

## Remove Watermark scope

Use Remove Watermark only on images you own or are allowed to edit. It is intended for small watermark, timestamp or logo regions. Local inpainting can produce strong results on simple or moderately textured areas, but it cannot perfectly reconstruct large marks over faces, text, detailed objects or complex repeating patterns.

## Production gate

Before GitHub push:

```text
npm install
npm run verify
npm run test:logic
npm run lint
npm run typecheck
npm run build
CHECK_LOCAL.ps1
git diff --check
SSH push
```

The supplied PowerShell push script stops before commit/push if any required gate fails.
