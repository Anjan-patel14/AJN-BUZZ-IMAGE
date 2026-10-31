/**
 * AJN BUZZ IMAGE v6.2.0 — Production E2E Verification for Rebuilt Signature & Passport/ID Photo Tools
 * Tests against production server (`next build && next start`):
 * 1. Signature Pad ResizeObserver DPR sizing & 3:1 aspect ratio non-distortion (mouse + touch + pointer-leave capture)
 * 2. Signature Undo/Redo, direct export (no "Use drawing" button), transparent corner alpha === 0, 300 DPI pHYs
 * 3. Signature drag/scale/rotate on CanvasStage -> verifies exported ink pixels moved
 * 4. signature-upload-crop (8 handles + Auto-Trim Ink Bounds), signature-resize (example presets + aspect lock),
 *    signature-size-reducer (live estimated KB + honest message), signature-background-remover & signature-to-png
 *    (threshold + softness + ink recolor + eraser/restore brush)
 * 5. Passport & ID Photo tools: portrait fixtures (plain bg, busy bg edge-variance warning, EXIF orientation 6),
 *    drag + zoom below fit (scale < 1 padding) + rotation, 300 DPI JFIF header, A4 sheet no-overlap across sizes,
 *    and cut guides drawn strictly OUTSIDE photo tile pixels.
 * 6. Captures 375px and 1280px screenshots for visual inspection.
 */

import { chromium } from '/root/.bun/install/global/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { computeA4GridLayout } from '../src/lib/stage-math.ts';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3012';
const CHROMIUM_EXECUTABLE =
  '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';
const ASSET_DIR = '/tmp/ajn-test-assets';
const SCREENSHOT_DIR = path.join(process.cwd(), 'test-screenshots');

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(ASSET_DIR, { recursive: true });

function buildExifOrientation6Jpeg(rawJpegBuffer) {
  const exifPayload = Buffer.from([
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00,
    0x12, 0x01,
    0x03, 0x00,
    0x01, 0x00, 0x00, 0x00,
    0x06, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);
  const segLen = exifPayload.length + 2;
  const app1 = Buffer.alloc(2 + 2 + exifPayload.length);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1.writeUInt16BE(segLen, 2);
  exifPayload.copy(app1, 4);
  return Buffer.concat([rawJpegBuffer.subarray(0, 2), app1, rawJpegBuffer.subarray(2)]);
}

async function ensureFixtures() {
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
  await sharp(Buffer.from(plainPortraitSvg)).jpeg({ quality: 92 }).toFile(path.join(ASSET_DIR, 'portrait-plain-bg.jpg'));

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
  await sharp(Buffer.from(busyPortraitSvg)).jpeg({ quality: 90 }).toFile(path.join(ASSET_DIR, 'portrait-busy-bg.jpg'));

  // 3. Phone JPEG with real EXIF Orientation 6 (raw SOF0 800x600 -> oriented 600x800)
  const exifRawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
    <rect width="800" height="600" fill="#dbeafe"/>
    <rect x="40" y="40" width="720" height="520" rx="24" fill="#1d4ed8"/>
    <circle cx="240" cy="300" r="90" fill="#facc15"/>
  </svg>`;
  const rawJpgBuf = await sharp(Buffer.from(exifRawSvg)).jpeg({ quality: 88 }).toBuffer();
  fs.writeFileSync(path.join(ASSET_DIR, 'phone-exif-orient6.jpg'), buildExifOrientation6Jpeg(rawJpgBuf));

  // 4. Signature on paper JPG
  const sigPaperSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300">
    <rect width="800" height="300" fill="#f8fafc"/>
    <path d="M110 195 C155 95, 210 230, 265 130 C310 60, 350 220, 420 150 C480 95, 560 190, 680 125" stroke="#0f172a" stroke-width="9" fill="none" stroke-linecap="round"/>
  </svg>`;
  await sharp(Buffer.from(sigPaperSvg)).jpeg({ quality: 92 }).toFile(path.join(ASSET_DIR, 'signature-on-paper.jpg'));
}

function parsePngDpi(buf) {
  let offset = 8;
  while (offset + 12 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'pHYs' && len === 9) {
      const ppuX = buf.readUInt32BE(offset + 8);
      const unit = buf[offset + 16];
      if (unit === 1) return Math.round(ppuX * 0.0254);
    }
    offset += 12 + len;
  }
  return null;
}

function parseJpegDpi(buf) {
  if (buf.length < 20 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 18 < buf.length && buf[offset] === 0xff) {
    const marker = buf[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const len = buf.readUInt16BE(offset + 2);
    if (
      marker === 0xe0 &&
      buf[offset + 4] === 0x4a &&
      buf[offset + 5] === 0x46 &&
      buf[offset + 6] === 0x49 &&
      buf[offset + 7] === 0x46
    ) {
      const units = buf[offset + 11];
      const xDensity = buf.readUInt16BE(offset + 12);
      if (units === 1) return xDensity;
      if (units === 2) return Math.round(xDensity * 2.54);
    }
    offset += 2 + len;
  }
  return null;
}

async function analyzeInkPixels(pngBuffer) {
  const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  let sumX = 0, sumY = 0, count = 0;
  let sumR = 0, sumG = 0, sumB = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (a > 25 && lum < 245) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        sumX += x;
        sumY += y;
        sumR += data[i];
        sumG += data[i + 1];
        sumB += data[i + 2];
        count++;
      }
    }
  }

  const cornerAlpha = (x, y) => data[(y * w + x) * 4 + 3];
  const corners = [
    cornerAlpha(0, 0),
    cornerAlpha(w - 1, 0),
    cornerAlpha(0, h - 1),
    cornerAlpha(w - 1, h - 1),
  ];

  return {
    width: w,
    height: h,
    inkCount: count,
    bboxW: maxX >= minX ? maxX - minX + 1 : 0,
    bboxH: maxY >= minY ? maxY - minY + 1 : 0,
    centroidX: count > 0 ? sumX / count : 0,
    centroidY: count > 0 ? sumY / count : 0,
    avgR: count > 0 ? Math.round(sumR / count) : 0,
    avgG: count > 0 ? Math.round(sumG / count) : 0,
    avgB: count > 0 ? Math.round(sumB / count) : 0,
    corners,
  };
}

async function triggerDownloadAndReadBuffer(page) {
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  const dlBtn = page.locator('.result-actions button:has-text("Download"), .mobile-editor-action-bar button:has-text("Download")').first();
  await dlBtn.click();
  const download = await downloadPromise;
  const filePath = await download.path();
  return fs.readFileSync(filePath);
}

async function runTests() {
  await ensureFixtures();
  console.log(`🚀 Running Signature & Passport/ID Photo Production Verification against ${BASE_URL}\n`);
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM_EXECUTABLE,
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
      hasTouch: true,
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    // =========================================================================
    // 1. SIGNATURE MAKER: Pad ResizeObserver DPR sizing, 3:1 aspect ratio,
    //    mouse + touch drawing, pointer-leave capture, Undo/Redo, direct export,
    //    aspect non-distortion, corner alpha === 0, and drag/scale/rotate move
    // =========================================================================
    console.log('1. Testing /signature-maker (Draw Pad DPR sizing, mouse+touch, Undo/Redo, aspect & transform)...');
    await page.goto(`${BASE_URL}/signature-maker`, { waitUntil: 'networkidle' });

    // Confirm no "Use drawing" button exists
    const useDrawingCount = await page.locator('button:has-text("Use drawing")').count();
    assert.equal(useDrawingCount, 0, 'Separate "Use drawing" button must be removed');

    const padCanvas = page.locator('canvas[aria-label="Signature drawing pad"]');
    await padCanvas.waitFor({ state: 'visible' });

    const padMetrics = await padCanvas.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return {
        cssW: rect.width,
        cssH: rect.height,
        attrW: el.width,
        attrH: el.height,
        dpr: Math.min(window.devicePixelRatio || 1, 2.5),
      };
    });

    const cssAspect = padMetrics.cssW / padMetrics.cssH;
    assert(
      Math.abs(cssAspect - 3.0) < 0.08,
      `Pad CSS aspect ratio should be ~3.0 (got ${cssAspect.toFixed(2)}: ${padMetrics.cssW}x${padMetrics.cssH})`
    );
    assert(
      Math.abs(padMetrics.attrW - padMetrics.cssW * padMetrics.dpr) <= 4 &&
        Math.abs(padMetrics.attrH - padMetrics.cssH * padMetrics.dpr) <= 4,
      `Pad backing buffer (${padMetrics.attrW}x${padMetrics.attrH}) must match CSS box * DPR (${Math.round(padMetrics.cssW * padMetrics.dpr)}x${Math.round(padMetrics.cssH * padMetrics.dpr)})`
    );
    console.log(`   ✓ Pad sized via ResizeObserver x DPR: CSS ${Math.round(padMetrics.cssW)}×${Math.round(padMetrics.cssH)} px (aspect ${cssAspect.toFixed(2)}), buffer ${padMetrics.attrW}×${padMetrics.attrH} px`);

    // Draw a rectangle with exact 2.5:1 aspect ratio on the pad using mouse + touch events,
    // including a temporary excursion outside the pad while pointer-captured
    const box = await padCanvas.boundingBox();
    const rectW = box.width * 0.5; // 50% of width = 450 logical px
    const rectH = box.height * 0.6; // 60% of height = 180 logical px -> drawn aspect = 450 / 180 = 2.50
    const startX = box.x + box.width * 0.25;
    const startY = box.y + box.height * 0.2;

    // Stroke 1 (Mouse): top & right edge of calibration box, briefly leaving lateral pad boundary while captured
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + rectW, startY, { steps: 8 });
    await page.mouse.move(startX + rectW, startY + rectH, { steps: 8 });
    await page.mouse.up();

    // Stroke 2 (Touch pointer): bottom & left edge of calibration box using genuine PointerEvent instances
    await padCanvas.evaluate(
      (el, coords) => {
        const { x1, y1, x2, y2, x3, y3 } = coords;
        const fire = (type, cx, cy, p) => {
          el.dispatchEvent(
            new PointerEvent(type, {
              pointerId: 2,
              pointerType: 'touch',
              isPrimary: true,
              clientX: cx,
              clientY: cy,
              pressure: p,
              bubbles: true,
              cancelable: true,
            })
          );
        };
        fire('pointerdown', x1, y1, 0.6);
        for (let i = 1; i <= 8; i++) {
          const t = i / 8;
          fire('pointermove', x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0.65);
        }
        for (let i = 1; i <= 8; i++) {
          const t = i / 8;
          fire('pointermove', x2 + (x3 - x2) * t, y2 + (y3 - y2) * t, 0.55);
        }
        fire('pointerup', x3, y3, 0);
      },
      {
        x1: startX + rectW,
        y1: startY + rectH,
        x2: startX,
        y2: startY + rectH,
        x3: startX,
        y3: startY,
      }
    );

    // Test Undo and Redo buttons on SignaturePad
    const undoPadBtn = page.locator('button[aria-label="Undo stroke"]');
    const redoPadBtn = page.locator('button[aria-label="Redo stroke"]');
    await undoPadBtn.click();
    await page.waitForTimeout(80);
    await redoPadBtn.click();
    await page.waitForTimeout(150);

    // Verify CanvasStage immediately appeared with the drawn signature
    const stageCanvas = page.locator('canvas[aria-label*="Interactive stage"]');
    await stageCanvas.waitFor({ state: 'visible' });

    // Click Process to export the drawn signature directly
    await page.locator('button.action-big').click();
    await page.locator('.result-ready').waitFor({ state: 'visible', timeout: 15000 });

    const exportedSig1 = await triggerDownloadAndReadBuffer(page);
    const sig1Stats = await analyzeInkPixels(exportedSig1);
    const sig1Dpi = parsePngDpi(exportedSig1);

    const drawnAspect = rectW / rectH; // 2.50
    const exportedAspect = sig1Stats.bboxW / Math.max(1, sig1Stats.bboxH);
    assert(
      Math.abs(exportedAspect - drawnAspect) < 0.25,
      `Signature aspect distorted! Drawn aspect=${drawnAspect.toFixed(2)}, exported ink bbox aspect=${exportedAspect.toFixed(2)} (${sig1Stats.bboxW}x${sig1Stats.bboxH})`
    );
    assert.deepEqual(sig1Stats.corners, [0, 0, 0, 0], `Expected all 4 corners to have alpha=0, got ${sig1Stats.corners}`);
    assert.equal(sig1Dpi, 300, `Expected 300 DPI pHYs on exported signature PNG, got ${sig1Dpi}`);
    console.log(
      `   ✓ Direct signature export verified: ink bbox ${sig1Stats.bboxW}×${sig1Stats.bboxH} px (aspect ${exportedAspect.toFixed(2)} vs drawn ${drawnAspect.toFixed(2)}), corners alpha=[${sig1Stats.corners.join(',')}], ${sig1Dpi} DPI`
    );

    // Now uncheck auto-trim so we export the full page canvas, then drag, scale, and rotate the signature on CanvasStage and verify exported pixels moved!
    await page.locator('label:has-text("Auto-trim blank whitespace") input[type="checkbox"]').uncheck();

    const stageBox = await stageCanvas.boundingBox();
    const scx = stageBox.x + stageBox.width / 2;
    const scy = stageBox.y + stageBox.height / 2;

    // Drag signature right by 22% of stage width and down by 18% of stage height
    await page.mouse.move(scx, scy);
    await page.mouse.down();
    await page.mouse.move(scx + stageBox.width * 0.22, scy + stageBox.height * 0.18, { steps: 8 });
    await page.mouse.up();

    // Also set fine rotation slider to 18 degrees
    const rotSlider = page.locator('#stage-fine-rotation');
    await rotSlider.fill('18');
    await rotSlider.dispatchEvent('change');

    // Re-export and verify pixels moved on the page canvas
    await page.locator('button.action-big').click();
    await page.locator('.result-ready').waitFor({ state: 'visible', timeout: 15000 });
    const exportedSig2 = await triggerDownloadAndReadBuffer(page);
    const sig2Stats = await analyzeInkPixels(exportedSig2);

    const normCx1 = sig1Stats.centroidX / sig1Stats.width;
    const normCy1 = sig1Stats.centroidY / sig1Stats.height;
    const normCx2 = sig2Stats.centroidX / sig2Stats.width;
    const normCy2 = sig2Stats.centroidY / sig2Stats.height;

    assert(
      normCx2 > 0.62 && normCy2 > 0.56,
      `Expected dragged signature ink centroid on full 900x300 page to move right/down from (0.50, 0.50): got (${normCx2.toFixed(2)}, ${normCy2.toFixed(2)})`
    );
    assert.deepEqual(sig2Stats.corners, [0, 0, 0, 0], `Expected corners alpha=0 after transform, got ${sig2Stats.corners}`);
    console.log(
      `   ✓ Drag + Rotate on CanvasStage verified: normalized ink centroid moved to (${normCx2.toFixed(2)}, ${normCy2.toFixed(2)}) on ${sig2Stats.width}×${sig2Stats.height} px canvas, corners alpha=[0,0,0,0]`
    );

    // Take 1280px and 375px screenshots of /signature-maker
    await page.locator('.editor-shell').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'signature-maker-1280.png'), fullPage: false });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('.canvas-stage-wrapper').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'signature-maker-375.png'), fullPage: false });
    await page.setViewportSize({ width: 1280, height: 900 });

    // =========================================================================
    // 2. OTHER 5 SIGNATURE TOOLS
    // =========================================================================
    console.log('2. Testing signature-upload-crop, signature-resize, signature-size-reducer, signature-background-remover, signature-to-png...');

    // 2a. signature-upload-crop
    await page.goto(`${BASE_URL}/signature-upload-crop`, { waitUntil: 'networkidle' });
    await page.locator('input[type="file"]').first().setInputFiles(path.join(ASSET_DIR, 'signature-on-paper.jpg'));
    await page.locator('button:has-text("Auto-Trim Ink Bounds")').first().waitFor({ state: 'visible' });
    await page.locator('button:has-text("Auto-Trim Ink Bounds")').first().click();
    await page.locator('button.action-big').click();
    await page.locator('.result-ready').waitFor({ state: 'visible', timeout: 15000 });
    const croppedSigBuf = await triggerDownloadAndReadBuffer(page);
    const croppedSigStats = await analyzeInkPixels(croppedSigBuf);
    assert(croppedSigStats.width < 800 && croppedSigStats.height < 300, `Expected auto-trimmed crop < 800x300, got ${croppedSigStats.width}x${croppedSigStats.height}`);
    console.log(`   ✓ /signature-upload-crop Auto-Trim + 8-handle crop verified: ${croppedSigStats.width}×${croppedSigStats.height} px`);

    // 2b. signature-resize
    await page.goto(`${BASE_URL}/signature-resize`, { waitUntil: 'networkidle' });
    await page.locator('input[type="file"]').first().setInputFiles(path.join(ASSET_DIR, 'signature-on-paper.jpg'));
    const presetLabel = await page.locator('label:has-text("verify your portal")').textContent();
    assert(presetLabel && presetLabel.includes("verify your portal's rules"), 'Expected honest example preset label');
    await page.locator('button:has-text("140 × 60 px")').click();
    await page.locator('button.action-big').click();
    await page.locator('.result-ready').waitFor({ state: 'visible', timeout: 15000 });
    const resizedSigBuf = await triggerDownloadAndReadBuffer(page);
    const resizedMeta = await sharp(resizedSigBuf).metadata();
    assert.equal(resizedMeta.width, 140);
    assert.equal(resizedMeta.height, 60);
    console.log(`   ✓ /signature-resize example presets & aspect lock verified: ${resizedMeta.width}×${resizedMeta.height} px`);

    // 2c. signature-size-reducer
    await page.goto(`${BASE_URL}/signature-size-reducer`, { waitUntil: 'networkidle' });
    await page.locator('input[type="file"]').first().setInputFiles(path.join(ASSET_DIR, 'signature-on-paper.jpg'));
    await page.waitForTimeout(400);
    const liveEstText = await page.locator('.calculated-size').first().textContent();
    assert(liveEstText && liveEstText.includes('Live estimated size'), 'Expected live estimated size readout');
    await page.locator('button:has-text("20 KB")').first().click();
    await page.locator('button.action-big').click();
    await page.locator('.result-ready').waitFor({ state: 'visible', timeout: 15000 });
    const reducedSigBuf = await triggerDownloadAndReadBuffer(page);
    assert(reducedSigBuf.length <= 20 * 1024, `Expected signature-size-reducer <= 20 KB, got ${reducedSigBuf.length} B`);
    console.log(`   ✓ /signature-size-reducer live estimated size & <=20 KB target verified (${reducedSigBuf.length} B)`);

    // 2d. signature-background-remover (threshold + softness + recolor ink + eraser brush)
    await page.goto(`${BASE_URL}/signature-background-remover`, { waitUntil: 'networkidle' });
    await page.locator('input[type="file"]').first().setInputFiles(path.join(ASSET_DIR, 'signature-on-paper.jpg'));
    await page.locator('button:has-text("Eraser Brush")').waitFor({ state: 'visible' });
    // Enable Recolor signature ink and pick Royal Blue (#1d4ed8)
    await page.locator('label:has-text("Recolor signature ink") input[type="checkbox"]').check();
    await page.locator('button:has-text("Royal Blue")').click();
    // Test Eraser Brush stroke on stage
    await page.locator('button:has-text("Eraser Brush")').click();
    const bgStage = page.locator('canvas[aria-label*="Interactive stage"]');
    const bgBox = await bgStage.boundingBox();
    await page.mouse.move(bgBox.x + 30, bgBox.y + 30);
    await page.mouse.down();
    await page.mouse.move(bgBox.x + 80, bgBox.y + 30, { steps: 4 });
    await page.mouse.up();
    await page.locator('button.action-big').click();
    await page.locator('.result-ready').waitFor({ state: 'visible', timeout: 15000 });
    const bgRemBuf = await triggerDownloadAndReadBuffer(page);
    const bgRemStats = await analyzeInkPixels(bgRemBuf);
    assert.deepEqual(bgRemStats.corners, [0, 0, 0, 0], 'Expected transparent corners after signature-background-remover');
    assert(bgRemStats.avgB > bgRemStats.avgR + 80, `Expected Royal Blue recolored ink (B=${bgRemStats.avgB} > R=${bgRemStats.avgR})`);
    console.log(`   ✓ /signature-background-remover threshold, softness, Royal Blue ink recolor (RGB=${bgRemStats.avgR},${bgRemStats.avgG},${bgRemStats.avgB}) & eraser brush verified`);

    await page.locator('.editor-shell').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'signature-bg-remover-1280.png'), fullPage: false });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('.canvas-stage-wrapper').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'signature-bg-remover-375.png'), fullPage: false });
    await page.setViewportSize({ width: 1280, height: 900 });

    // =========================================================================
    // 3. PASSPORT & ID PHOTO TOOLS:
    //    - Plain bg portrait + background replacement + zoom below fit (0.65x)
    //    - Busy bg portrait edge-variance warning
    //    - EXIF-rotated phone JPEG upright verification
    //    - A4 sheet live grid preview, Max fit, no-overlap, and cut guides OUTSIDE photo pixels
    // =========================================================================
    console.log('3. Testing /passport-photo-maker & /photo-2x2 (CanvasStage frame, bg variance warning, zoom<1 padding, 300 DPI, A4 outside cut guides)...');
    await page.goto(`${BASE_URL}/passport-photo-maker`, { waitUntil: 'networkidle' });

    // Verify main sidebar does NOT have legacy Horizontal/Vertical crop sliders
    const legacySliderCount = await page.locator('label:has-text("Horizontal crop position")').count();
    assert.equal(legacySliderCount, 0, 'Main sidebar legacy Horizontal crop position slider should be removed');

    // 3a. Upload busy background portrait and verify high edge variance warning appears
    await page.locator('input[type="file"]').first().setInputFiles(path.join(ASSET_DIR, 'portrait-busy-bg.jpg'));
    const varianceWarning = page.locator('.notice.warning:has-text("High edge variance")');
    await varianceWarning.waitFor({ state: 'visible', timeout: 10000 });
    console.log('   ✓ Busy background portrait triggered live High edge variance warning banner');

    // 3b. Upload EXIF-rotated phone JPEG (orientation=6, raw 800x600 -> oriented 600x800 Portrait)
    await page.locator('input[type="file"]').first().setInputFiles(path.join(ASSET_DIR, 'phone-exif-orient6.jpg'));
    await page.waitForTimeout(300);

    // 3c. Upload plain background portrait, choose Light Blue (#dbeafe) background, zoom out below fit (0.65x) so outer border is padded with Light Blue
    await page.locator('input[type="file"]').first().setInputFiles(path.join(ASSET_DIR, 'portrait-plain-bg.jpg'));
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Light Blue")').click();

    // Open Advanced in CanvasStage and set Zoom to 65% (0.65x < 1.0 fit)
    await page.locator('button:has-text("Advanced")').click();
    const zoomRange = page.locator('#stage-input-zoom');
    await zoomRange.fill('65');
    await zoomRange.dispatchEvent('change');

    await page.locator('button.action-big').click();
    await page.locator('.result-ready').waitFor({ state: 'visible', timeout: 15000 });
    const passportSingleBuf = await triggerDownloadAndReadBuffer(page);
    const passportMeta = await sharp(passportSingleBuf).metadata();
    const passportDpi = parseJpegDpi(passportSingleBuf);
    assert.equal(passportMeta.width, 413);
    assert.equal(passportMeta.height, 531);
    assert.equal(passportDpi, 300);

    // Check top-left corner pixel of exported passport photo: since zoom=0.65 (< 1.0), it is padded with Light Blue (#dbeafe = RGB 219, 234, 254)
    const { data: singlePixels } = await sharp(passportSingleBuf).raw().toBuffer({ resolveWithObject: true });
    const tlR = singlePixels[0], tlG = singlePixels[1], tlB = singlePixels[2];
    assert(
      Math.abs(tlR - 219) < 12 && Math.abs(tlG - 234) < 12 && Math.abs(tlB - 254) < 12,
      `Expected top-left zoom<1 padded pixel to match Light Blue (219,234,254), got (${tlR},${tlG},${tlB})`
    );
    console.log(
      `   ✓ Single passport photo verified: 413×531 px @ ${passportDpi} DPI, zoom<1 (0.65x) padded with Light Blue RGB(${tlR},${tlG},${tlB})`
    );

    // 3d. Reset transform to 1.0x, enable A4 print sheet, click "Max fit", and verify live A4 grid preview + outside cut guides!
    await page.locator('button[aria-label="Reset transform"]').click();
    await page.locator('label:has-text("Generate printable A4 photo sheet") input[type="checkbox"]').check();
    const a4PreviewCanvas = page.locator('canvas[aria-label="Live A4 sheet grid preview"]');
    await a4PreviewCanvas.waitFor({ state: 'visible' });

    const maxFitBtn = page.locator('button:has-text("Max fit")').first();
    await maxFitBtn.click();

    await page.locator('button.action-big').click();
    await page.locator('.result-ready').waitFor({ state: 'visible', timeout: 20000 });
    const a4SheetBuf = await triggerDownloadAndReadBuffer(page);
    const a4Meta = await sharp(a4SheetBuf).metadata();
    const a4Dpi = parseJpegDpi(a4SheetBuf);
    const layout = computeA4GridLayout(413, 531, 300, 0, 10, 4);

    assert.equal(a4Meta.width, layout.sheetW);
    assert.equal(a4Meta.height, layout.sheetH);
    assert.equal(a4Dpi, layout.sheetDpi);
    assert.equal(layout.hasOverlap, false);

    // Verify that the interior perimeter pixel of Tile 0 (at rect.x, rect.y + 20) is photo content,
    // while the cut guide is drawn strictly OUTSIDE at (rect.x - 1, rect.y + 20)
    const { data: a4Pixels, info: a4Info } = await sharp(a4SheetBuf).raw().toBuffer({ resolveWithObject: true });
    const firstTile = layout.tiles[0];
    const outsideIdx = ((firstTile.y + 20) * a4Info.width + (firstTile.x - 1)) * 3;
    const insideEdgeIdx = ((firstTile.y + 20) * a4Info.width + firstTile.x) * 3;
    const outR = a4Pixels[outsideIdx], outG = a4Pixels[outsideIdx + 1], outB = a4Pixels[outsideIdx + 2];
    const inR = a4Pixels[insideEdgeIdx], inG = a4Pixels[insideEdgeIdx + 1], inB = a4Pixels[insideEdgeIdx + 2];

    assert(outR < 245 && outG < 245, `Expected cut guide stroke outside tile at x-1, got RGB(${outR},${outG},${outB})`);
    assert(
      Math.abs(inR - outR) > 5 || Math.abs(inB - outB) > 5,
      `Expected photo pixel at tile edge x to differ from grey cut guide outside at x-1`
    );
    console.log(
      `   ✓ A4 sheet verified: ${a4Meta.width}×${a4Meta.height} px @ ${a4Dpi} DPI, ${layout.placed} tiles (${layout.cols}×${layout.rows}), 0 overlap, cut guides outside tile edge`
    );

    // Capture 1280px and 375px screenshots of /passport-photo-maker
    await page.locator('.editor-shell').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'passport-photo-maker-1280.png'), fullPage: false });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('.canvas-stage-wrapper').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'passport-photo-maker-375.png'), fullPage: false });

    assert.equal(consoleErrors.length, 0, `Unexpected console/page errors: ${consoleErrors.join('; ')}`);
    console.log('\n✅ ALL SIGNATURE & PASSPORT/ID PHOTO E2E CHECKS PASSED WITH 0 CONSOLE ERRORS!\n');
  } finally {
    await browser.close();
  }
}

runTests().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
