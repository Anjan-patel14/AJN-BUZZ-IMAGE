// AJN BUZZ IMAGE v6.2.0 — Off-Main-Thread Image Processing Worker (OffscreenCanvas)
const MAX_CANVAS_PIXELS = 16_777_216; // iOS Safari / WebKit 16.77 MP safe canvas limit
const MAX_CANVAS_EDGE = 8192;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pixelsFromPhysical(value, unit, dpi = 300) {
  const safeDpi = clamp(Number.isFinite(dpi) ? dpi : 300, 36, 1200);
  const safeValue = Math.max(1, Number.isFinite(value) ? value : 1);
  if (unit === 'px') return Math.round(safeValue);
  const inches = unit === 'in' ? safeValue : unit === 'cm' ? safeValue / 2.54 : safeValue / 25.4;
  return Math.max(1, Math.round(inches * safeDpi));
}

function fitToSafeCanvas(width, height) {
  let w = Math.max(1, Math.round(width));
  let h = Math.max(1, Math.round(height));
  let capped = false;
  if (w > MAX_CANVAS_EDGE || h > MAX_CANVAS_EDGE) {
    const edgeScale = Math.min(MAX_CANVAS_EDGE / w, MAX_CANVAS_EDGE / h);
    w = Math.max(1, Math.floor(w * edgeScale));
    h = Math.max(1, Math.floor(h * edgeScale));
    capped = true;
  }
  if (w * h > MAX_CANVAS_PIXELS) {
    const areaScale = Math.sqrt(MAX_CANVAS_PIXELS / (w * h));
    w = Math.max(1, Math.floor(w * areaScale));
    h = Math.max(1, Math.floor(h * areaScale));
    capped = true;
  }
  return { width: w, height: h, capped };
}

function makeCanvas(width, height) {
  const safe = fitToSafeCanvas(width, height);
  return { canvas: new OffscreenCanvas(safe.width, safe.height), capped: safe.capped, width: safe.width, height: safe.height };
}

function releaseCanvas(canvas) {
  if (!canvas) return;
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch {}
}

async function canvasBlob(canvas, format, quality) {
  let target = canvas;
  let tempCreated = false;
  if (format === 'image/jpeg') {
    const temp = new OffscreenCanvas(canvas.width, canvas.height);
    const ctx = temp.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, temp.width, temp.height);
      ctx.drawImage(canvas, 0, 0);
      target = temp;
      tempCreated = true;
    }
  }
  try {
    const q = format === 'image/png' ? undefined : clamp(quality, 0.04, 0.98);
    return await target.convertToBlob({ type: format, quality: q });
  } finally {
    if (tempCreated) releaseCanvas(target);
  }
}

async function bestLossyAtSize(canvas, format, targetBytes, onStep) {
  let low = 0.04;
  let high = 0.96;
  let bestUnder = null;
  let smallest = null;
  for (let i = 0; i < 8; i++) {
    const q = Number(((low + high) / 2).toFixed(3));
    const blob = await canvasBlob(canvas, format, q);
    if (!smallest || blob.size < smallest.size) smallest = blob;
    if (blob.size <= targetBytes) {
      bestUnder = blob;
      low = q;
    } else {
      high = q;
    }
    if (onStep) onStep(i + 1, 8);
  }
  const lowBlob = await canvasBlob(canvas, format, 0.04);
  if (!smallest || lowBlob.size < smallest.size) smallest = lowBlob;
  if (lowBlob.size <= targetBytes && (!bestUnder || lowBlob.size > bestUnder.size)) {
    bestUnder = lowBlob;
  }
  return {
    blob: bestUnder || smallest,
    reached: Boolean(bestUnder && bestUnder.size <= targetBytes),
  };
}

function parseHexRgb(hex) {
  const clean = String(hex || '#ffffff').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean.padEnd(6, 'f').slice(0, 6);
  const num = Number.parseInt(full, 16);
  if (!Number.isFinite(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function removeEdgeConnectedBackground(ctx, width, height, tolerance = 38, replacementHex = null, softness = 28) {
  const image = ctx.getImageData(0, 0, width, height);
  const d = image.data;
  const total = width * height;
  if (total <= 0) return { busyBackground: false, variance: 0 };

  const samples = [];
  const pushSample = (x, y) => {
    const idx = (clamp(Math.round(y), 0, height - 1) * width + clamp(Math.round(x), 0, width - 1)) * 4;
    if (d[idx + 3] > 16) samples.push([d[idx], d[idx + 1], d[idx + 2]]);
  };
  const steps = Math.min(24, Math.max(6, Math.floor(Math.min(width, height) / 12)));
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(1, steps - 1);
    pushSample(t * (width - 1), 0);
    pushSample(0, t * (height * 0.65));
    pushSample(width - 1, t * (height * 0.65));
  }

  let bgR = 255, bgG = 255, bgB = 255;
  let variance = 0;
  if (samples.length > 0) {
    const rs = samples.map(s => s[0]).sort((a, b) => a - b);
    const gs = samples.map(s => s[1]).sort((a, b) => a - b);
    const bs = samples.map(s => s[2]).sort((a, b) => a - b);
    const mid = Math.floor(samples.length / 2);
    bgR = rs[mid];
    bgG = gs[mid];
    bgB = bs[mid];
    for (const [r, g, b] of samples) {
      variance += Math.hypot(r - bgR, g - bgG, b - bgB);
    }
    variance /= samples.length;
  }

  const maxDist = clamp(tolerance, 5, 220) * 1.45;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0, tail = 0;

  const matchesBg = (pixelIdx) => {
    const i = pixelIdx * 4;
    if (d[i + 3] <= 12) return true;
    const dist = Math.hypot(d[i] - bgR, d[i + 1] - bgG, d[i + 2] - bgB);
    return dist <= maxDist;
  };

  const enqueue = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const p = y * width + x;
    if (visited[p] || !matchesBg(p)) return;
    visited[p] = 1;
    queue[tail++] = p;
  };

  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }

  const fillRgb = replacementHex ? parseHexRgb(replacementHex) : null;
  for (let p = 0; p < total; p++) {
    if (!visited[p]) continue;
    const i = p * 4;
    if (fillRgb) {
      d[i] = fillRgb[0];
      d[i + 1] = fillRgb[1];
      d[i + 2] = fillRgb[2];
      d[i + 3] = 255;
    } else {
      d[i + 3] = 0;
    }
  }

  // Soft boundary feathering controlled by softness (0..100)
  const softFactor = 1 + clamp(softness, 0, 100) / 120;
  const softDist = maxDist * softFactor;
  if (softness > 0) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = y * width + x;
        if (visited[p]) continue;
        const touchesBg = visited[p - 1] || visited[p + 1] || visited[p - width] || visited[p + width];
        if (!touchesBg) continue;
        const i = p * 4;
        const dist = Math.hypot(d[i] - bgR, d[i + 1] - bgG, d[i + 2] - bgB);
        if (dist < softDist) {
          const ratio = clamp((dist - maxDist * 0.55) / Math.max(1, softDist - maxDist * 0.55), 0.15, 0.95);
          if (fillRgb) {
            d[i] = Math.round(d[i] * ratio + fillRgb[0] * (1 - ratio));
            d[i + 1] = Math.round(d[i + 1] * ratio + fillRgb[1] * (1 - ratio));
            d[i + 2] = Math.round(d[i + 2] * ratio + fillRgb[2] * (1 - ratio));
          } else {
            d[i + 3] = Math.round(d[i + 3] * ratio);
          }
        }
      }
    }
  }

  ctx.putImageData(image, 0, 0);
  const replacedRatio = tail / Math.max(1, total);
  return { busyBackground: variance > 42 || replacedRatio < 0.04, variance };
}

function drawTransformedInWorker(ctx, image, sourceW, sourceH, targetW, targetH, transform, mode = 'cover') {
  const scaleX = targetW / Math.max(1, sourceW);
  const scaleY = targetH / Math.max(1, sourceH);
  const baseScale = mode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const totalScale = baseScale * clamp(transform.scale ?? 1, 0.25, 5);
  const cx = targetW / 2 + (transform.x ?? 0) * targetW;
  const cy = targetH / 2 + (transform.y ?? 0) * targetH;

  ctx.save();
  ctx.translate(cx, cy);
  if (transform.rotation) {
    ctx.rotate((transform.rotation * Math.PI) / 180);
  }
  ctx.scale(transform.flipX ? -totalScale : totalScale, totalScale);
  ctx.drawImage(image, -sourceW / 2, -sourceH / 2, sourceW, sourceH);
  ctx.restore();
}

function buildA4SheetInWorker(tile, dpi, requestedCount, marginMm, spacingMm) {
  const maxSafeA4Dpi = Math.floor(Math.sqrt(MAX_CANVAS_PIXELS / ((210 / 25.4) * (297 / 25.4))));
  const sheetDpi = clamp(dpi, 72, Math.min(600, maxSafeA4Dpi));
  const dpiScale = sheetDpi / Math.max(1, dpi);

  const sheetW = pixelsFromPhysical(210, 'mm', sheetDpi);
  const sheetH = pixelsFromPhysical(297, 'mm', sheetDpi);
  const marginPx = Math.max(0, Math.round((clamp(marginMm, 0, 40) / 25.4) * sheetDpi));
  const gapPx = Math.max(0, Math.round((clamp(spacingMm, 0, 30) / 25.4) * sheetDpi));

  const tileW = Math.max(1, Math.round(tile.width * dpiScale));
  const tileH = Math.max(1, Math.round(tile.height * dpiScale));
  const usableW = Math.max(1, sheetW - marginPx * 2);
  const usableH = Math.max(1, sheetH - marginPx * 2);

  if (tileW > usableW || tileH > usableH) {
    throw new Error('Single photo dimensions exceed the printable A4 area. Reduce the photo dimensions or sheet margin.');
  }

  const cols = Math.floor((usableW + gapPx) / (tileW + gapPx));
  const rows = Math.floor((usableH + gapPx) / (tileH + gapPx));
  if (cols < 1 || rows < 1) {
    throw new Error('Photo dimensions are too large to fit on an A4 sheet with the current margin.');
  }

  const maxFit = cols * rows;
  const count = requestedCount <= 0 ? maxFit : Math.min(requestedCount, maxFit);

  const { canvas: sheet } = makeCanvas(sheetW, sheetH);
  const ctx = sheet.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sheetW, sheetH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const usedCols = Math.min(cols, count);
  const usedRows = Math.ceil(count / usedCols);
  const totalGridW = usedCols * tileW + Math.max(0, usedCols - 1) * gapPx;
  const startX = Math.max(marginPx, Math.round((sheetW - totalGridW) / 2));
  const startY = marginPx;

  let placed = 0;
  const strokeWidth = Math.max(1, Math.round(sheetDpi / 300));
  const halfStroke = strokeWidth / 2;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = strokeWidth;

  for (let r = 0; r < usedRows && placed < count; r++) {
    for (let c = 0; c < usedCols && placed < count; c++) {
      const x = startX + c * (tileW + gapPx);
      const y = startY + r * (tileH + gapPx);
      // Draw cut guides strictly OUTSIDE the photo edge so photo pixels are never painted over
      ctx.strokeRect(
        x - halfStroke,
        y - halfStroke,
        tileW + strokeWidth,
        tileH + strokeWidth
      );
      ctx.drawImage(tile, 0, 0, tile.width, tile.height, x, y, tileW, tileH);
      placed++;
    }
  }

  return { sheet, placed, cols: usedCols, rows: usedRows, sheetDpi };
}

self.onmessage = async (event) => {
  const { id, action, payload } = event.data || {};
  try {
    if (action === 'compress') {
      const { file, options } = payload;
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      try {
        const format = options.format || (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/webp');
        const safe = fitToSafeCanvas(bitmap.width, bitmap.height);
        const capNote = safe.capped ? ` Capped to ${safe.width} × ${safe.height} px (16.7 MP browser canvas safety limit).` : '';
        if (options.mode === 'auto' || !options.targetBytes) {
          const { canvas, width, height } = makeCanvas(safe.width, safe.height);
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(bitmap, 0, 0, width, height);
          const blob = await canvasBlob(canvas, format, options.quality ?? 0.8);
          releaseCanvas(canvas);
          self.postMessage({ id, ok: true, result: { blob, width, height, type: format, note: capNote.trim() || undefined } });
          return;
        }

        const target = Math.max(1024, Math.round(options.targetBytes));
        let scale = 1;
        let smallest = null;
        for (let pass = 0; pass < 11; pass++) {
          const w = Math.max(16, Math.round(safe.width * scale));
          const h = Math.max(16, Math.round(safe.height * scale));
          const { canvas } = makeCanvas(w, h);
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(bitmap, 0, 0, w, h);

          if (format === 'image/png') {
            const single = await canvasBlob(canvas, format, 1);
            releaseCanvas(canvas);
            const reached = single.size <= target;
            self.postMessage({
              id,
              ok: true,
              result: {
                blob: single,
                width: w,
                height: h,
                type: format,
                targetBytes: target,
                targetReached: reached,
                note: reached
                  ? `Target reached: ${Math.max(1, Math.round(single.size / 1024))} KB.${capNote}`
                  : `PNG is lossless (${Math.max(1, Math.round(single.size / 1024))} KB vs ${Math.round(target / 1024)} KB target). Switch Output format to JPG or WebP to reach smaller KB limits.${capNote}`,
              },
            });
            return;
          }

          const candidate = await bestLossyAtSize(canvas, format, target, (step, totalSteps) => {
            const pct = Math.min(95, Math.round(((pass * totalSteps + step) / (4 * totalSteps)) * 100));
            self.postMessage({ id, progress: pct });
          });
          releaseCanvas(canvas);

          if (!smallest || candidate.blob.size < smallest.blob.size) {
            smallest = { blob: candidate.blob, width: w, height: h };
          }
          if (candidate.reached && candidate.blob.size <= target) {
            const scaleNote = scale < 0.999 ? ` Scaled to ${w} × ${h} px to meet target.` : '';
            self.postMessage({
              id,
              ok: true,
              result: {
                blob: candidate.blob,
                width: w,
                height: h,
                type: format,
                targetBytes: target,
                targetReached: true,
                note: `Target reached: ${Math.max(1, Math.round(candidate.blob.size / 1024))} KB (limit: ${Math.max(1, Math.round(target / 1024))} KB).${scaleNote}${capNote}`,
              },
            });
            return;
          }
          const ratio = Math.sqrt(target / Math.max(target + 1, candidate.blob.size));
          scale *= clamp(ratio * 0.88, 0.52, 0.86);
          if (w <= 32 || h <= 32) break;
        }

        const fallback = smallest;
        const reached = fallback.blob.size <= target;
        self.postMessage({
          id,
          ok: true,
          result: {
            blob: fallback.blob,
            width: fallback.width,
            height: fallback.height,
            type: format,
            targetBytes: target,
            targetReached: reached,
            note: reached
              ? `Target reached: ${Math.max(1, Math.round(fallback.blob.size / 1024))} KB.${capNote}`
              : `Closest achievable size is ${Math.max(1, Math.round(fallback.blob.size / 1024))} KB (target ${Math.max(1, Math.round(target / 1024))} KB could not be met even at minimum resolution and quality).${capNote}`,
          },
        });
      } finally {
        bitmap.close();
      }
      return;
    }

    if (action === 'photo-preset') {
      const { file, options, preset } = payload;
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      let bgCanvas = null;
      let tileCanvas = null;
      let sheetCanvas = null;
      try {
        self.postMessage({ id, progress: 15 });
        const dpi = clamp(Math.round(options.dpi || preset.dpi || 300), 36, 1200);
        const unit = options.unit || preset.unit || 'mm';
        const pWidth = Number(options.physicalWidth || preset.width || 35);
        const pHeight = Number(options.physicalHeight || preset.height || 45);
        const requestedW = pixelsFromPhysical(pWidth, unit, dpi);
        const requestedH = pixelsFromPhysical(pHeight, unit, dpi);
        const safeTile = fitToSafeCanvas(requestedW, requestedH);
        const width = safeTile.width;
        const height = safeTile.height;
        const format = options.format || 'image/jpeg';
        const quality = options.quality ?? 0.92;

        let workSource = bitmap;
        let workW = bitmap.width;
        let workH = bitmap.height;
        let busyBgWarning = '';

        if (options.replaceBackground) {
          self.postMessage({ id, progress: 35 });
          const bgSafe = fitToSafeCanvas(workW, workH);
          bgCanvas = new OffscreenCanvas(bgSafe.width, bgSafe.height);
          const bgCtx = bgCanvas.getContext('2d');
          bgCtx.drawImage(workSource, 0, 0, bgSafe.width, bgSafe.height);
          const { busyBackground } = removeEdgeConnectedBackground(
            bgCtx,
            bgSafe.width,
            bgSafe.height,
            options.amount ?? 38,
            options.backgroundColor || '#ffffff',
            28
          );
          if (busyBackground) {
            busyBgWarning = ' Note: Original background looks busy or uneven; background fill works best on plain, evenly lit walls.';
          }
          workSource = bgCanvas;
          workW = bgSafe.width;
          workH = bgSafe.height;
        }

        self.postMessage({ id, progress: 55 });
        tileCanvas = new OffscreenCanvas(width, height);
        const ctx = tileCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = options.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const b = options.brightness ?? 100;
        const c = options.contrast ?? 100;
        if (b !== 100 || c !== 100) {
          ctx.filter = `brightness(${b}%) contrast(${c}%)`;
        }

        const transform = options.stageTransform || {
          x: 0,
          y: 0,
          scale: clamp(options.zoom ?? 1, 0.25, 5),
          rotation: options.angle ?? 0,
          flipX: options.flip === 'horizontal',
        };
        drawTransformedInWorker(ctx, workSource, workW, workH, width, height, transform, 'cover');
        ctx.filter = 'none';

        if (options.a4Sheet) {
          self.postMessage({ id, progress: 75 });
          const { sheet, placed, cols, rows, sheetDpi } = buildA4SheetInWorker(
            tileCanvas,
            dpi,
            options.a4Count ?? 8,
            options.a4MarginMm ?? 10,
            options.a4SpacingMm ?? 4
          );
          sheetCanvas = sheet;
          const rawSheet = await canvasBlob(sheetCanvas, format, quality);
          self.postMessage({ id, progress: 95 });
          self.postMessage({
            id,
            ok: true,
            result: {
              blob: rawSheet,
              width: sheetCanvas.width,
              height: sheetCanvas.height,
              type: format,
              dpi: sheetDpi,
              note: `A4 print sheet ready: ${placed} photos (${cols} × ${rows} grid, each ${pWidth} × ${pHeight} ${unit}) on 210 × 297 mm at ${sheetDpi} DPI.${busyBgWarning}`,
            },
          });
          return;
        }

        const targetKb = Number(options.targetKb || 0);
        if (targetKb > 0 && format !== 'image/png') {
          const targetBytes = Math.max(2048, Math.round(targetKb * 1024));
          const searchBudget = Math.max(1024, targetBytes - 32);
          const candidate = await bestLossyAtSize(tileCanvas, format, searchBudget, (step, total) => {
            self.postMessage({ id, progress: 60 + Math.round((step / total) * 35) });
          });
          self.postMessage({
            id,
            ok: true,
            result: {
              blob: candidate.blob,
              width,
              height,
              type: format,
              dpi,
              targetBytes,
              targetReached: candidate.reached,
              busyBgWarning,
              pWidth,
              pHeight,
              unit,
            },
          });
          return;
        }

        const raw = await canvasBlob(tileCanvas, format, quality);
        self.postMessage({
          id,
          ok: true,
          result: {
            blob: raw,
            width,
            height,
            type: format,
            dpi,
            note: `${pWidth} × ${pHeight} ${unit} (${width} × ${height} px at ${dpi} DPI).${busyBgWarning}`,
          },
        });
      } finally {
        releaseCanvas(bgCanvas);
        releaseCanvas(tileCanvas);
        releaseCanvas(sheetCanvas);
        bitmap.close();
      }
      return;
    }

    if (action === 'remove-bg') {
      const { file, tolerance, replacementHex, softness } = payload;
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      try {
        const { canvas, width, height } = makeCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, width, height);
        const { busyBackground } = removeEdgeConnectedBackground(ctx, width, height, tolerance, replacementHex, softness ?? 28);
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        releaseCanvas(canvas);
        self.postMessage({ id, ok: true, result: { blob, width, height, busyBackground } });
      } finally {
        bitmap.close();
      }
      return;
    }

    self.postMessage({ id, ok: false, error: 'Unsupported worker action.' });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : 'Worker processing failed.' });
  }
};
