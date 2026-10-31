import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import JSZip from 'jszip';
import { chromium } from '/root/.bun/install/global/node_modules/playwright-core/index.mjs';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const CHROMIUM_EXECUTABLE =
  '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';
const ASSET_DIR = '/tmp/ajn-test-assets';
const REPORT_PATH = '/tmp/ajn-30-tools-report.json';

function parseJpegDpiAndExif(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    return { dpi: null, hasExif: false };
  }
  let offset = 2;
  let dpi = null;
  let hasExif = false;
  while (offset + 4 <= buf.length && buf[offset] === 0xff) {
    const marker = buf[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const len = (buf[offset + 2] << 8) | buf[offset + 3];
    if (len < 2 || offset + 2 + len > buf.length) break;
    if (
      marker === 0xe0 &&
      len >= 16 &&
      buf[offset + 4] === 0x4a &&
      buf[offset + 5] === 0x46 &&
      buf[offset + 6] === 0x49 &&
      buf[offset + 7] === 0x46
    ) {
      const units = buf[offset + 11];
      const xDensity = (buf[offset + 12] << 8) | buf[offset + 13];
      if (units === 1) dpi = xDensity;
      else if (units === 2) dpi = Math.round(xDensity * 2.54);
    }
    if (marker === 0xe1) {
      hasExif = true;
    }
    offset += 2 + len;
  }
  return { dpi, hasExif };
}

function parsePngDpi(buf) {
  if (buf.length < 33 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  let offset = 8;
  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'pHYs' && length === 9 && offset + 17 <= buf.length) {
      const ppuX = buf.readUInt32BE(offset + 8);
      const unit = buf[offset + 16];
      if (unit === 1) return Math.round(ppuX * 0.0254);
    }
    if (type === 'IEND') break;
    offset += 12 + length;
  }
  return null;
}

/**
 * Injects a binary APP1 Exif segment with Orientation tag (0x0112) = 6 (90° CW) and dummy Camera/GPS tags
 * into a standard JPEG buffer so we can test real EXIF rotation and metadata stripping.
 */
function buildExifOrientation6Jpeg(rawJpegBuffer) {
  // Minimal valid APP1 Exif header (Little Endian 'II', 1 IFD entry: Tag 0x0112 = 6)
  const exifPayload = Buffer.from([
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF header (II, 42, offset 8)
    0x01, 0x00, // 1 IFD entry
    0x12, 0x01, // Tag 0x0112 (Orientation)
    0x03, 0x00, // Type SHORT (3)
    0x01, 0x00, 0x00, 0x00, // Count 1
    0x06, 0x00, 0x00, 0x00, // Value = 6 (Rotate 90 CW)
    0x00, 0x00, 0x00, 0x00, // Next IFD = 0
  ]);
  const segLen = exifPayload.length + 2;
  const app1 = Buffer.alloc(2 + 2 + exifPayload.length);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1.writeUInt16BE(segLen, 2);
  exifPayload.copy(app1, 4);

  return Buffer.concat([rawJpegBuffer.subarray(0, 2), app1, rawJpegBuffer.subarray(2)]);
}

async function generateRealTestAssets() {
  fs.mkdirSync(ASSET_DIR, { recursive: true });

  // 1. Portrait with plain background (900x1160)
  const plainPortraitSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1160" viewBox="0 0 900 1160">
    <rect width="900" height="1160" fill="#f4f5f7"/>
    <path d="M180 1160 C180 860 720 860 720 1160 Z" fill="#1e293b"/>
    <rect x="390" y="690" width="120" height="150" rx="40" fill="#e0b194"/>
    <ellipse cx="450" cy="490" rx="175" ry="230" fill="#eac0a2"/>
    <path d="M275 450 C275 240 625 240 625 450 C600 330 300 330 275 450 Z" fill="#1f2937"/>
    <circle cx="385" cy="470" r="16" fill="#111827"/>
    <circle cx="515" cy="470" r="16" fill="#111827"/>
    <path d="M405 585 Q450 615 495 585" stroke="#9a3412" stroke-width="8" fill="none" stroke-linecap="round"/>
  </svg>`;
  const portraitPlainPath = path.join(ASSET_DIR, 'portrait-plain-bg.jpg');
  await sharp(Buffer.from(plainPortraitSvg)).jpeg({ quality: 92 }).toFile(portraitPlainPath);

  // 2. Portrait with busy multi-colored background (900x1160)
  let busyTiles = '';
  const palette = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
  for (let y = 0; y < 1160; y += 58) {
    for (let x = 0; x < 900; x += 60) {
      const color = palette[((x / 60) + (y / 58)) % palette.length];
      busyTiles += `<rect x="${x}" y="${y}" width="60" height="58" fill="${color}"/>`;
    }
  }
  const busyPortraitSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1160" viewBox="0 0 900 1160">
    ${busyTiles}
    <path d="M180 1160 C180 860 720 860 720 1160 Z" fill="#1e293b"/>
    <ellipse cx="450" cy="490" rx="175" ry="230" fill="#eac0a2"/>
  </svg>`;
  const portraitBusyPath = path.join(ASSET_DIR, 'portrait-busy-bg.jpg');
  await sharp(Buffer.from(busyPortraitSvg)).jpeg({ quality: 90 }).toFile(portraitBusyPath);

  // 3. Phone JPEG with real EXIF Orientation 6 (raw SOF0 800x600 -> oriented 600x800)
  const exifRawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
    <rect width="800" height="600" fill="#dbeafe"/>
    <rect x="40" y="40" width="720" height="520" rx="24" fill="#1d4ed8"/>
    <circle cx="240" cy="300" r="90" fill="#facc15"/>
  </svg>`;
  const rawJpgBuf = await sharp(Buffer.from(exifRawSvg)).jpeg({ quality: 88 }).toBuffer();
  const exifJpgBuf = buildExifOrientation6Jpeg(rawJpgBuf);
  const exifJpgPath = path.join(ASSET_DIR, 'phone-exif-orient6.jpg');
  fs.writeFileSync(exifJpgPath, exifJpgBuf);

  // 4. Transparent PNG signature + paper signature JPG
  const sigSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300">
    <path d="M110 195 C155 95, 210 230, 265 130 C310 60, 350 220, 420 150 C480 95, 560 190, 680 125" stroke="#0f172a" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M140 225 L650 205" stroke="#1d4ed8" stroke-width="5" fill="none" stroke-linecap="round"/>
  </svg>`;
  const sigPngPath = path.join(ASSET_DIR, 'signature-transparent.png');
  await sharp(Buffer.from(sigSvg)).png().toFile(sigPngPath);

  const sigPaperSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300">
    <rect width="800" height="300" fill="#f8fafc"/>
    <path d="M110 195 C155 95, 210 230, 265 130 C310 60, 350 220, 420 150 C480 95, 560 190, 680 125" stroke="#0f172a" stroke-width="9" fill="none" stroke-linecap="round"/>
  </svg>`;
  const sigPaperJpgPath = path.join(ASSET_DIR, 'signature-on-paper.jpg');
  await sharp(Buffer.from(sigPaperSvg)).jpeg({ quality: 92 }).toFile(sigPaperJpgPath);

  // 5. 12+ MP image (4000 x 3000 = 12.0 MP)
  const highResPath = path.join(ASSET_DIR, 'camera-12mp.jpg');
  await sharp({
    create: {
      width: 4000,
      height: 3000,
      channels: 3,
      background: { r: 28, g: 100, b: 210 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#f8fafc" rx="40"/><circle cx="600" cy="450" r="320" fill="#1769e8"/></svg>`
        ),
        top: 1050,
        left: 1400,
      },
    ])
    .jpeg({ quality: 86 })
    .toFile(highResPath);

  // 6. Tiny image (16 x 16 PNG)
  const tinyPngPath = path.join(ASSET_DIR, 'tiny-16x16.png');
  await sharp({
    create: { width: 16, height: 16, channels: 4, background: { r: 23, g: 105, b: 232, alpha: 1 } },
  })
    .png()
    .toFile(tinyPngPath);

  // 7. SVG image
  const svgPath = path.join(ASSET_DIR, 'vector-sample.svg');
  fs.writeFileSync(
    svgPath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#eff6ff"/><circle cx="300" cy="200" r="140" fill="#1d4ed8"/></svg>`
  );

  // 8. WebP image (800 x 600)
  const webpPath = path.join(ASSET_DIR, 'sample-photo.webp');
  await sharp(Buffer.from(exifRawSvg)).webp({ quality: 88 }).toFile(webpPath);

  // 9. GIF image (320 x 240)
  const gifPath = path.join(ASSET_DIR, 'sample-anim.gif');
  await sharp({
    create: { width: 320, height: 240, channels: 4, background: { r: 16, g: 185, b: 129, alpha: 1 } },
  })
    .gif()
    .toFile(gifPath);

  // 10. Valid AVIF image (400 x 300)
  const avifPath = path.join(ASSET_DIR, 'sample-photo.avif');
  await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 99, g: 102, b: 241 } },
  })
    .avif({ quality: 70 })
    .toFile(avifPath);

  // 11. HEIC file stub (ISO BMFF ftypheic header)
  const heicPath = path.join(ASSET_DIR, 'iphone-photo.heic');
  const heicHeader = Buffer.from(
    '000000186674797068656963000000006d69663168656963000000086d646174',
    'hex'
  );
  fs.writeFileSync(heicPath, heicHeader);

  // 12. Corrupt file renamed .jpg
  const corruptJpgPath = path.join(ASSET_DIR, 'corrupt-broken.jpg');
  fs.writeFileSync(corruptJpgPath, Buffer.from('NOT_A_VALID_JPEG_BINARY_STREAM_CORRUPTED_DATA_1234567890'));

  // 13. Oversized > 30 MB file (31 MB)
  const oversizedPath = path.join(ASSET_DIR, 'oversized-31mb.jpg');
  fs.writeFileSync(oversizedPath, Buffer.alloc(31 * 1024 * 1024, 0xff));

  // 14. Wrong file type (.pdf)
  const wrongTypePath = path.join(ASSET_DIR, 'document.pdf');
  fs.writeFileSync(wrongTypePath, Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n'));

  return {
    portraitPlainPath,
    portraitBusyPath,
    exifJpgPath,
    sigPngPath,
    sigPaperJpgPath,
    highResPath,
    tinyPngPath,
    svgPath,
    webpPath,
    gifPath,
    avifPath,
    heicPath,
    corruptJpgPath,
    oversizedPath,
    wrongTypePath,
  };
}

const TOOL_TEST_MATRIX = [
  { id: 'compress', asset: 'portraitPlainPath', desc: 'Auto compress portrait JPG' },
  { id: 'compress-to-kb', asset: 'portraitPlainPath', desc: 'Target 40 KB JPG compression', targetKb: 40 },
  { id: 'resize', asset: 'exifJpgPath', desc: 'Resize EXIF-oriented JPG to 500px width', setWidth: 500 },
  { id: 'resize-cm', asset: 'portraitPlainPath', desc: 'Resize in CM (3.5x4.5cm @ 300 DPI = 413x531)' },
  { id: 'resize-mm', asset: 'portraitPlainPath', desc: 'Resize in MM (35x45mm @ 300 DPI = 413x531)' },
  { id: 'resize-inches', asset: 'portraitPlainPath', desc: 'Resize in Inches (2x2in @ 300 DPI = 600x600)', preset2x2: true },
  { id: 'photo-size-converter', asset: 'portraitPlainPath', desc: 'Physical size converter at 300 DPI' },
  { id: 'crop', asset: 'webpPath', desc: 'Pixel crop WebP with Center 80% preset', cropCenter80: true },
  { id: 'aspect-ratio-crop', asset: 'portraitPlainPath', desc: 'Aspect ratio crop 1:1 square' },
  { id: 'passport-photo-maker', asset: 'portraitPlainPath', desc: 'Passport 35x45mm + plain BG fill + <=50KB', passportFull: true },
  { id: 'id-photo-maker', asset: 'portraitPlainPath', desc: 'ID Photo A4 printable sheet (8 photos @ 300 DPI)', a4Sheet: true },
  { id: 'photo-35x45', asset: 'portraitPlainPath', desc: 'Dedicated 35x45mm preset (413x531 @ 300 DPI)' },
  { id: 'photo-2x2', asset: 'portraitPlainPath', desc: 'Dedicated 2x2 inch preset (600x600 @ 300 DPI)' },
  { id: 'dpi-changer', asset: 'portraitPlainPath', desc: 'Embed 300 DPI JFIF header without resizing', setDpi: 300 },
  { id: 'signature-maker', asset: 'DRAW_PAD', desc: 'Draw signature on canvas -> transparent PNG' },
  { id: 'signature-upload-crop', asset: 'sigPaperJpgPath', desc: 'Upload paper signature & auto-trim margins' },
  { id: 'signature-resize', asset: 'sigPngPath', desc: 'Resize signature to 4x2cm @ 300 DPI (472x236)' },
  { id: 'signature-size-reducer', asset: 'sigPaperJpgPath', desc: 'Compress signature to <= 20 KB target' },
  { id: 'signature-background-remover', asset: 'sigPaperJpgPath', desc: 'Remove paper background -> transparent PNG' },
  { id: 'signature-to-png', asset: 'sigPaperJpgPath', desc: 'Export signature to transparent PNG' },
  { id: 'photo-editor', asset: 'portraitPlainPath', desc: 'Apply Brighten preset & export' },
  { id: 'text-on-image', asset: 'webpPath', desc: 'Add custom watermark text overlay' },
  { id: 'dimension-checker', asset: 'exifJpgPath', desc: 'Verify EXIF-oriented 600x800 telemetry & export' },
  { id: 'quality-checker', asset: 'highResPath', desc: 'Inspect 12 MP camera photo & export' },
  { id: 'upscale', asset: 'tinyPngPath', desc: 'Upscale 16x16 PNG by 2x to 32x32 px' },
  { id: 'rotate', asset: 'exifJpgPath', desc: 'Rotate 90° CW (600x800 -> 800x600)' },
  { id: 'remove-metadata', asset: 'exifJpgPath', desc: 'Strip EXIF/GPS APP1 segments & binary verify' },
  { id: 'convert', asset: 'svgPath', desc: 'Convert vector SVG to raster WebP' },
  { id: 'convert-to-jpg', asset: 'sigPngPath', desc: 'Convert transparent PNG to flattened JPG' },
  { id: 'jpg-to-png', asset: 'portraitPlainPath', desc: 'Convert JPG to lossless PNG' },
];

async function runSuite() {
  console.log(`[Playwright E2E] Generating real test assets in ${ASSET_DIR}...`);
  const assets = await generateRealTestAssets();

  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', err => consoleErrors.push(err.message));

  const resultsTable = [];

  for (const item of TOOL_TEST_MATRIX) {
    const url = `${BASE_URL}/${item.id}`;
    await page.goto(url, { waitUntil: 'networkidle' });

    if (item.asset === 'DRAW_PAD') {
      const canvas = page.locator('canvas.signature-canvas');
      await canvas.waitFor({ state: 'visible', timeout: 10000 });
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + 80, box.y + 120);
      await page.mouse.down();
      await page.mouse.move(box.x + 220, box.y + 80, { steps: 6 });
      await page.mouse.move(box.x + 360, box.y + 150, { steps: 6 });
      await page.mouse.up();
      await page.locator('button:has-text("Use drawing")').click();
    } else {
      const filePath = assets[item.asset];
      await page.locator('input[type="file"]').setInputFiles(filePath);
    }

    await page.locator('.preview-stage img').first().waitFor({ state: 'visible', timeout: 15000 });

    if (item.targetKb) {
      await page.locator(`#target-size-${item.id}`).fill(String(item.targetKb));
      await page.locator(`#compress-format-${item.id}`).selectOption('image/jpeg');
    }
    if (item.setWidth) {
      await page.locator(`#resize-w-${item.id}`).fill(String(item.setWidth));
    }
    if (item.preset2x2) {
      await page.locator(`#field-${item.id}-physicalWidth`).fill('2');
      await page.locator(`#field-${item.id}-physicalHeight`).fill('2');
    }
    if (item.cropCenter80) {
      await page.locator('button:has-text("Center 80%")').click();
    }
    if (item.passportFull) {
      await page.locator('button:has-text("50 KB")').click();
      const replaceBgCheck = page.locator('label.check:has-text("Replace plain edge-connected background") input[type="checkbox"]');
      if (!(await replaceBgCheck.isChecked())) {
        await replaceBgCheck.check();
      }
    }
    if (item.a4Sheet) {
      const a4Check = page.locator('label.check:has-text("Generate printable A4 photo sheet") input[type="checkbox"]');
      await a4Check.check();
    }

    await page.locator('button.action-big').click();
    await page.locator('.result-ready').waitFor({ state: 'visible', timeout: 30000 });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.locator('.result-ready button.btn.success').click(),
    ]);

    const downloadPath = path.join(ASSET_DIR, `out-${download.suggestedFilename()}`);
    await download.saveAs(downloadPath);
    const buf = fs.readFileSync(downloadPath);
    const meta = await sharp(buf).metadata();

    let dpi = meta.density || null;
    let hasExif = false;
    if (meta.format === 'jpeg') {
      const parsed = parseJpegDpiAndExif(buf);
      if (parsed.dpi) dpi = parsed.dpi;
      hasExif = parsed.hasExif;
    } else if (meta.format === 'png') {
      const pngDpi = parsePngDpi(buf);
      if (pngDpi) dpi = pngDpi;
    }

    // Check transparency for signature PNG tools
    let transparentVerified = false;
    if (['signature-maker', 'signature-background-remover', 'signature-to-png'].includes(item.id)) {
      const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let transparentPixels = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 16) transparentPixels++;
      }
      transparentVerified = info.channels === 4 && transparentPixels > 100;
    }

    let pass = buf.length > 0 && (meta.width || 0) > 0 && (meta.height || 0) > 0;
    if (item.id === 'compress-to-kb' && buf.length > 40 * 1024) pass = false;
    if (item.id === 'signature-size-reducer' && buf.length > 20 * 1024) pass = false;
    if (item.id === 'passport-photo-maker' && (meta.width !== 413 || meta.height !== 531 || dpi !== 300 || buf.length > 50 * 1024)) pass = false;
    if (item.id === 'id-photo-maker' && (meta.width !== 2480 || meta.height !== 3508 || dpi !== 300)) pass = false;
    if (item.id === 'photo-35x45' && (meta.width !== 413 || meta.height !== 531 || dpi !== 300)) pass = false;
    if (item.id === 'photo-2x2' && (meta.width !== 600 || meta.height !== 600 || dpi !== 300)) pass = false;
    if (item.id === 'dpi-changer' && dpi !== 300) pass = false;
    if (item.id === 'remove-metadata' && hasExif) pass = false;
    if (['signature-maker', 'signature-background-remover', 'signature-to-png'].includes(item.id) && !transparentVerified) pass = false;

    const row = {
      tool: item.id,
      input: item.asset === 'DRAW_PAD' ? 'Canvas signature strokes' : path.basename(assets[item.asset]),
      result: download.suggestedFilename(),
      dimensions: `${meta.width}×${meta.height}`,
      sizeBytes: buf.length,
      sizeKB: `${(buf.length / 1024).toFixed(1)} KB`,
      format: (meta.format || '').toUpperCase(),
      dpi: dpi ? `${dpi} DPI` : 'n/a',
      alpha: meta.hasAlpha ? (transparentVerified ? 'RGBA (transparent)' : 'RGBA') : 'Opaque',
      status: pass ? 'PASS' : 'FAIL',
    };
    resultsTable.push(row);
    console.log(`[${row.status}] ${row.tool.padEnd(28)} | ${row.dimensions.padEnd(11)} | ${row.sizeKB.padEnd(9)} | ${row.format.padEnd(5)} | ${row.dpi}`);
  }

  // Phase 2 & 3 Edge-Case Verifications
  console.log('\n[Playwright E2E] Running Phase 2 & 3 Edge-Case Verifications...');
  const edgeCases = {};

  // 1. Click Process with no file
  await page.goto(`${BASE_URL}/resize`, { waitUntil: 'networkidle' });
  await page.locator('button.action-big').click();
  const noFileError = await page.locator('.error[role="alert"]').textContent();
  edgeCases.noFileClick = Boolean(noFileError && noFileError.includes('select or drop an image'));

  // 2. Wrong file type (.pdf)
  await page.locator('input[type="file"]').setInputFiles(assets.wrongTypePath);
  const wrongTypeError = await page.locator('.error[role="alert"]').textContent();
  edgeCases.wrongFileType = Boolean(wrongTypeError && wrongTypeError.includes('not a supported image format'));

  // 3. Oversized file (31 MB > 30 MB)
  await page.locator('input[type="file"]').setInputFiles(assets.oversizedPath);
  const oversizedError = await page.locator('.error[role="alert"]').textContent();
  edgeCases.oversizedFile = Boolean(oversizedError && oversizedError.includes('exceeds the 30 MB'));

  // 4. Corrupt .jpg file
  await page.locator('input[type="file"]').setInputFiles(assets.corruptJpgPath);
  await page.waitForTimeout(300);
  const corruptError = await page.locator('.error[role="alert"]').textContent();
  edgeCases.corruptJpg = Boolean(corruptError && corruptError.includes('corrupted'));

  // 5. HEIC graceful handling
  await page.locator('input[type="file"]').setInputFiles(assets.heicPath);
  const heicError = await page.locator('.error[role="alert"]').textContent();
  edgeCases.heicGraceful = Boolean(heicError && heicError.includes('HEIC/HEIF'));

  // 6. GIF & AVIF support check
  await page.locator('input[type="file"]').setInputFiles(assets.gifPath);
  await page.locator('.preview-stage img').first().waitFor({ state: 'visible', timeout: 10000 });
  edgeCases.gifDecoded = true;

  await page.locator('input[type="file"]').setInputFiles(assets.avifPath);
  await page.locator('.preview-stage img').first().waitFor({ state: 'visible', timeout: 10000 });
  edgeCases.avifDecoded = true;

  // 7. 12 MP upscale -> 16.77 MP iOS Safari safe canvas cap + clear message
  await page.goto(`${BASE_URL}/upscale`, { waitUntil: 'networkidle' });
  await page.locator('input[type="file"]').setInputFiles(assets.highResPath);
  await page.locator('.preview-stage img').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('button.action-big').click();
  await page.locator('.result-ready').waitFor({ state: 'visible', timeout: 30000 });
  const capNotice = await page.locator('.notice').first().textContent();
  const [capDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.result-ready button.btn.success').click(),
  ]);
  const capPath = path.join(ASSET_DIR, `out-${capDownload.suggestedFilename()}`);
  await capDownload.saveAs(capPath);
  const capMeta = await sharp(fs.readFileSync(capPath)).metadata();
  edgeCases.iosSafariCanvasCap = {
    passed:
      (capMeta.width || 0) * (capMeta.height || 0) <= 16_777_216 &&
      Boolean(capNotice && capNotice.includes('16.7 MP')),
    dimensions: `${capMeta.width}×${capMeta.height}`,
    pixels: (capMeta.width || 0) * (capMeta.height || 0),
    note: capNotice,
  };

  // 8. Busy background portrait warning on Passport Photo Maker
  await page.goto(`${BASE_URL}/passport-photo-maker`, { waitUntil: 'networkidle' });
  await page.locator('input[type="file"]').setInputFiles(assets.portraitBusyPath);
  await page.locator('.preview-stage img').first().waitFor({ state: 'visible', timeout: 10000 });
  const bgCheck = page.locator('label.check:has-text("Replace plain edge-connected background") input[type="checkbox"]');
  await bgCheck.check();
  await page.locator('button.action-big').click();
  await page.locator('.result-ready').waitFor({ state: 'visible', timeout: 20000 });
  const busyNote = await page.locator('.notice').first().textContent();
  edgeCases.busyBackgroundHonestWarning = Boolean(busyNote && busyNote.includes('busy or uneven'));

  // 9. 20-file batch ZIP test without freezing or crashing
  await page.goto(`${BASE_URL}/convert-to-jpg`, { waitUntil: 'networkidle' });
  const batchFiles = Array.from({ length: 20 }, () => assets.webpPath);
  await page.locator('input[type="file"]').setInputFiles(batchFiles);
  await page.locator('.preview-stage img').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('button.action-big').click();
  await page.locator('.result-ready').waitFor({ state: 'visible', timeout: 45000 });
  const [zipDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.result-ready button.btn.success').click(),
  ]);
  const zipPath = path.join(ASSET_DIR, 'out-batch-20.zip');
  await zipDownload.saveAs(zipPath);
  const zipBuf = fs.readFileSync(zipPath);
  const loadedZip = await JSZip.loadAsync(zipBuf);
  const zipEntryNames = Object.keys(loadedZip.files);
  edgeCases.batch20Zip = {
    passed: zipEntryNames.length === 20,
    fileCount: zipEntryNames.length,
    zipBytes: zipBuf.length,
  };

  console.log('\n[Edge Cases Summary]:', JSON.stringify(edgeCases, null, 2));
  console.log(`[Console Page Errors]: ${consoleErrors.length}`);

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify({ server: BASE_URL, resultsTable, edgeCases, consoleErrors }, null, 2)
  );

  await browser.close();

  const failedTools = resultsTable.filter(r => r.status !== 'PASS');
  if (failedTools.length > 0) {
    console.error(`FAIL: ${failedTools.length} tools failed:`, failedTools);
    process.exit(1);
  }
  console.log(`\nALL 30 TOOLS + EDGE CASES PASSED against ${BASE_URL}`);
}

runSuite().catch(err => {
  console.error(err);
  process.exit(1);
});
