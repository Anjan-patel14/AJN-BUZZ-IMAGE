import type { ImageTool, PhysicalUnit } from './image-tools';
import {
  computeA4GridLayout,
  drawTransformedImage,
  isDefaultTransform,
  type A4LayoutResult,
  type BrushStroke,
  type CropBox,
  type StageTransform,
} from './stage-math';

export type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';
export type CompressionMode = 'auto' | 'target';

export type ImageOptions = {
  stageTransform?: StageTransform;
  width?: number;
  height?: number;
  unit?: PhysicalUnit;
  physicalWidth?: number;
  physicalHeight?: number;
  dpi?: number;
  quality?: number;
  format?: OutputFormat;
  angle?: number;
  flip?: 'none' | 'horizontal' | 'vertical';
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  ratioWidth?: number;
  ratioHeight?: number;
  anchorX?: number;
  anchorY?: number;
  zoom?: number;
  text?: string;
  opacity?: number;
  fontSize?: number;
  color?: string;
  position?: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  amount?: number;
  softness?: number;
  recolorInk?: boolean;
  inkColor?: string;
  transparentBackground?: boolean;
  autoTrim?: boolean;
  useCustomSize?: boolean;
  brushStrokes?: BrushStroke[];
  backgroundColor?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  replaceBackground?: boolean;
  trimMargin?: number;
  a4Sheet?: boolean;
  a4Count?: number;
  a4MarginMm?: number;
  a4SpacingMm?: number;
  targetKb?: number;
  signal?: AbortSignal;
  onProgress?: (pct: number) => void;
};

export type ImageProcessResult = {
  blob: Blob;
  width: number;
  height: number;
  type: OutputFormat;
  targetBytes?: number;
  targetReached?: boolean;
  dpi?: number;
  note?: string;
};

export type CompressOptions = {
  mode: CompressionMode;
  targetBytes?: number;
  format?: OutputFormat;
  quality?: number;
  signal?: AbortSignal;
  onProgress?: (pct: number) => void;
};

// iOS Safari / WebKit hard canvas area limit is 16,777,216 pixels (4096 × 4096).
// Source decoding allows up to 50 MP camera photos; output canvases are safely capped to 16.77 MP.
export const MAX_CANVAS_PIXELS = 16_777_216;
export const MAX_CANVAS_EDGE = 8192;
const MAX_DECODE_PIXELS = 50_000_000;
const MAX_DECODE_EDGE = 12000;

type BitmapLike = { width: number; height: number; close: () => void; source: CanvasImageSource };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function releaseCanvas(canvas: HTMLCanvasElement | OffscreenCanvas | null | undefined) {
  if (!canvas) return;
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch {}
}

export function fitToSafeCanvas(width: number, height: number): { width: number; height: number; capped: boolean } {
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

function makeCanvas(width: number, height: number) {
  if (width < 1 || height < 1 || !Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error('Image dimensions must be greater than 0 px.');
  }
  if (width > 20000 || height > 20000) {
    throw new Error(`Requested dimensions (${Math.round(width)} × ${Math.round(height)} px) exceed the safe browser limit.`);
  }
  const safe = fitToSafeCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = safe.width;
  canvas.height = safe.height;
  return canvas;
}

/**
 * Inspects raw JPEG bytes for EXIF APP1 orientation tag (1..8), presence of APP1/APP2/APP13 metadata,
 * and raw SOF frame header width & height so we can verify EXIF orientation and metadata stripping.
 */
export function inspectJpegBinary(bytes: Uint8Array): {
  isJpeg: boolean;
  orientation: number;
  hasExifOrAppMeta: boolean;
  sofWidth: number;
  sofHeight: number;
} {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return { isJpeg: false, orientation: 1, hasExifOrAppMeta: false, sofWidth: 0, sofHeight: 0 };
  }
  let offset = 2;
  let orientation = 1;
  let hasExifOrAppMeta = false;
  let sofWidth = 0;
  let sofHeight = 0;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1]!;
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      offset += 2;
      continue;
    }
    const segLen = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    if (segLen < 2 || offset + 2 + segLen > bytes.length) break;

    if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) {
      hasExifOrAppMeta = true;
    }

    if (marker === 0xe1 && segLen >= 14) {
      const start = offset + 4;
      if (
        bytes[start] === 0x45 &&
        bytes[start + 1] === 0x78 &&
        bytes[start + 2] === 0x69 &&
        bytes[start + 3] === 0x66 &&
        bytes[start + 4] === 0x00 &&
        bytes[start + 5] === 0x00
      ) {
        const tiff = start + 6;
        const little = bytes[tiff] === 0x49 && bytes[tiff + 1] === 0x49;
        const readU16 = (pos: number) =>
          little
            ? (bytes[pos] ?? 0) | ((bytes[pos + 1] ?? 0) << 8)
            : ((bytes[pos] ?? 0) << 8) | (bytes[pos + 1] ?? 0);
        const readU32 = (pos: number) =>
          little
            ? ((bytes[pos] ?? 0) |
                ((bytes[pos + 1] ?? 0) << 8) |
                ((bytes[pos + 2] ?? 0) << 16) |
                ((bytes[pos + 3] ?? 0) << 24)) >>>
              0
            : (((bytes[pos] ?? 0) << 24) |
                ((bytes[pos + 1] ?? 0) << 16) |
                ((bytes[pos + 2] ?? 0) << 8) |
                (bytes[pos + 3] ?? 0)) >>>
              0;

        if (tiff + 8 <= bytes.length) {
          const ifdOffset = readU32(tiff + 4);
          const ifdStart = tiff + ifdOffset;
          if (ifdStart + 2 <= offset + 2 + segLen) {
            const entries = readU16(ifdStart);
            for (let i = 0; i < entries; i++) {
              const entryOffset = ifdStart + 2 + i * 12;
              if (entryOffset + 12 > offset + 2 + segLen) break;
              const tag = readU16(entryOffset);
              if (tag === 0x0112) {
                const val = readU16(entryOffset + 8);
                if (val >= 1 && val <= 8) orientation = val;
                break;
              }
            }
          }
        }
      }
    }

    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (offset + 9 < bytes.length) {
        sofHeight = ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0);
        sofWidth = ((bytes[offset + 7] ?? 0) << 8) | (bytes[offset + 8] ?? 0);
      }
    }

    offset += 2 + segLen;
  }

  return { isJpeg: true, orientation, hasExifOrAppMeta, sofWidth, sofHeight };
}

function orientCanvasIfNeeded(
  rawSource: CanvasImageSource,
  rawW: number,
  rawH: number,
  orientation: number,
  sofW: number,
  sofH: number
): BitmapLike | null {
  if (orientation <= 1 || orientation > 8) return null;
  const swapsAxes = orientation >= 5 && orientation <= 8;
  if (swapsAxes && sofW > 0 && sofH > 0 && sofW !== sofH && rawW === sofH && rawH === sofW) {
    return null;
  }
  if (!swapsAxes) return null;

  const targetW = rawH;
  const targetH = rawW;
  const safe = fitToSafeCanvas(targetW, targetH);
  const canvas = document.createElement('canvas');
  canvas.width = safe.width;
  canvas.height = safe.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.save();
  switch (orientation) {
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, safe.width, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, safe.width, safe.height);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, safe.height);
      break;
    default:
      break;
  }
  ctx.drawImage(rawSource, 0, 0, safe.height, safe.width);
  ctx.restore();

  return {
    width: safe.width,
    height: safe.height,
    source: canvas,
    close: () => releaseCanvas(canvas),
  };
}

async function decode(file: File): Promise<BitmapLike> {
  const fileName = file.name || 'image';
  if (/\.hei[cf]$/i.test(fileName) || file.type === 'image/heic' || file.type === 'image/heif') {
    throw new Error(
      `"${fileName}" is in HEIC/HEIF format, which browsers cannot decode directly. Please convert or export it as JPG, PNG, or WebP on your device first.`
    );
  }

  let jpegMeta = { isJpeg: false, orientation: 1, hasExifOrAppMeta: false, sofWidth: 0, sofHeight: 0 };
  if (file.type === 'image/jpeg' || /\.jpe?g$/i.test(fileName)) {
    try {
      const headSlice = new Uint8Array(await file.slice(0, Math.min(file.size, 262_144)).arrayBuffer());
      jpegMeta = inspectJpegBinary(headSlice);
    } catch {}
  }

  if (typeof createImageBitmap === 'function' && !/\.svg$/i.test(fileName) && file.type !== 'image/svg+xml') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      if (
        bitmap.width < 1 ||
        bitmap.height < 1 ||
        bitmap.width > MAX_DECODE_EDGE ||
        bitmap.height > MAX_DECODE_EDGE ||
        bitmap.width * bitmap.height > MAX_DECODE_PIXELS
      ) {
        const w = bitmap.width;
        const h = bitmap.height;
        bitmap.close();
        throw new Error(
          `Source image dimensions (${w} × ${h} px) exceed the safe browser decode limit of ${Math.round(MAX_DECODE_PIXELS / 1_000_000)} MP.`
        );
      }
      const manualOrient = orientCanvasIfNeeded(
        bitmap,
        bitmap.width,
        bitmap.height,
        jpegMeta.orientation,
        jpegMeta.sofWidth,
        jpegMeta.sofHeight
      );
      if (manualOrient) {
        bitmap.close();
        return manualOrient;
      }
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        close: () => bitmap.close(),
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes('exceed the safe browser decode limit')) {
        throw err;
      }
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(
          new Error(
            `"${fileName}" could not be decoded. The file may be corrupted, truncated, or in an unsupported format.`
          )
        );
      element.src = url;
    });
    const width = img.naturalWidth || img.width || 800;
    const height = img.naturalHeight || img.height || 600;
    if (width < 1 || height < 1 || width > MAX_DECODE_EDGE || height > MAX_DECODE_EDGE || width * height > MAX_DECODE_PIXELS) {
      throw new Error(`Source image dimensions (${width} × ${height} px) exceed the safe browser decode limit.`);
    }
    const safe = fitToSafeCanvas(width, height);
    const canvas = makeCanvas(safe.width, safe.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      releaseCanvas(canvas);
      throw new Error('Browser canvas context is unavailable.');
    }
    ctx.drawImage(img, 0, 0, safe.width, safe.height);
    return { width: safe.width, height: safe.height, source: canvas, close: () => releaseCanvas(canvas) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  const decoded = await decode(file);
  try {
    return { width: decoded.width, height: decoded.height };
  } finally {
    decoded.close();
  }
}

export function pixelsFromPhysical(value: number, unit: PhysicalUnit, dpi = 300): number {
  const safeDpi = clamp(Number.isFinite(dpi) ? dpi : 300, 36, 1200);
  const safeValue = Math.max(1, Number.isFinite(value) ? value : 1);
  if (unit === 'px') return Math.round(safeValue);
  const inches = unit === 'in' ? safeValue : unit === 'cm' ? safeValue / 2.54 : safeValue / 25.4;
  return Math.max(1, Math.round(inches * safeDpi));
}

async function canvasBlob(canvas: HTMLCanvasElement, format: OutputFormat, quality = 0.86): Promise<Blob> {
  let target = canvas;
  let flattenedCreated = false;
  if (format === 'image/jpeg') {
    const flattened = makeCanvas(canvas.width, canvas.height);
    const ctx = flattened.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, flattened.width, flattened.height);
      ctx.drawImage(canvas, 0, 0);
      target = flattened;
      flattenedCreated = true;
    } else {
      releaseCanvas(flattened);
    }
  }
  try {
    const q = format === 'image/png' ? undefined : clamp(quality, 0.04, 0.98);
    return await new Promise<Blob>((resolve, reject) => {
      target.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Image export failed.'))), format, q);
    });
  } finally {
    if (flattenedCreated) releaseCanvas(target);
  }
}

async function bestLossyAtSize(canvas: HTMLCanvasElement, format: OutputFormat, targetBytes: number) {
  let low = 0.04;
  let high = 0.96;
  let bestUnder: Blob | null = null;
  let smallest: Blob | null = null;

  for (let index = 0; index < 8; index++) {
    const quality = Number(((low + high) / 2).toFixed(3));
    const blob = await canvasBlob(canvas, format, quality);
    if (!smallest || blob.size < smallest.size) smallest = blob;
    if (blob.size <= targetBytes) {
      bestUnder = blob;
      low = quality;
    } else {
      high = quality;
    }
  }
  const lowBlob = await canvasBlob(canvas, format, 0.04);
  if (!smallest || lowBlob.size < smallest.size) smallest = lowBlob;
  if (lowBlob.size <= targetBytes && (!bestUnder || lowBlob.size > bestUnder.size)) {
    bestUnder = lowBlob;
  }

  return {
    blob: bestUnder || smallest!,
    reached: Boolean(bestUnder && bestUnder.size <= targetBytes),
  };
}

// Manage a singleton Web Worker for off-main-thread processing with cancellation support.
let activeWorker: Worker | null = null;
let workerJobSeq = 0;

function getOrCreateWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return null;
  }
  if (!activeWorker) {
    try {
      activeWorker = new Worker('/workers/image-worker.js');
    } catch {
      return null;
    }
  }
  return activeWorker;
}

function terminateActiveWorker() {
  if (activeWorker) {
    try {
      activeWorker.terminate();
    } catch {}
    activeWorker = null;
  }
}

async function runWorkerTask<T>(
  action: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
  onProgress?: (pct: number) => void
): Promise<T | null> {
  const worker = getOrCreateWorker();
  if (!worker) return null;
  if (signal?.aborted) throw new Error('Processing cancelled.');

  const jobId = ++workerJobSeq;
  return new Promise<T | null>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      terminateActiveWorker();
      reject(new Error('Processing cancelled.'));
    };

    const onMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.id !== jobId) return;
      if (typeof data.progress === 'number') {
        onProgress?.(data.progress);
        return;
      }
      cleanup();
      if (data.ok) {
        resolve(data.result as T);
      } else {
        resolve(null);
      }
    };

    const onError = () => {
      cleanup();
      terminateActiveWorker();
      resolve(null);
    };

    function cleanup() {
      worker?.removeEventListener('message', onMessage);
      worker?.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
    }

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    signal?.addEventListener('abort', onAbort, { once: true });
    worker.postMessage({ id: jobId, action, payload });
  });
}

export async function compressImage(file: File, options: CompressOptions): Promise<ImageProcessResult> {
  if (options.signal?.aborted) throw new Error('Processing cancelled.');

  if (!/\.svg$/i.test(file.name) && file.type !== 'image/svg+xml') {
    const workerRes = await runWorkerTask<ImageProcessResult>(
      'compress',
      {
        file,
        options: {
          mode: options.mode,
          targetBytes: options.targetBytes,
          format: options.format,
          quality: options.quality,
        },
      },
      options.signal,
      options.onProgress
    );
    if (workerRes && workerRes.blob) {
      return workerRes;
    }
  }

  const source = await decode(file);
  try {
    const format: OutputFormat =
      options.format ||
      (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp'
        ? file.type
        : 'image/webp');
    const safe = fitToSafeCanvas(source.width, source.height);
    const capNote = safe.capped
      ? ` Capped to ${safe.width} × ${safe.height} px (16.7 MP browser canvas safety limit).`
      : '';

    if (options.mode === 'auto' || !options.targetBytes) {
      const canvas = makeCanvas(safe.width, safe.height);
      try {
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(source.source, 0, 0, canvas.width, canvas.height);
        const blob = await canvasBlob(canvas, format, options.quality ?? 0.8);
        return {
          blob,
          width: canvas.width,
          height: canvas.height,
          type: format,
          note: capNote.trim() || undefined,
        };
      } finally {
        releaseCanvas(canvas);
      }
    }

    const target = Math.max(1024, Math.round(options.targetBytes));
    let scale = 1;
    let smallest: { blob: Blob; width: number; height: number } | null = null;

    for (let pass = 0; pass < 11; pass++) {
      if (options.signal?.aborted) throw new Error('Processing cancelled.');
      const width = Math.max(16, Math.round(safe.width * scale));
      const height = Math.max(16, Math.round(safe.height * scale));
      const canvas = makeCanvas(width, height);
      try {
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(source.source, 0, 0, width, height);

        if (format === 'image/png') {
          const single = await canvasBlob(canvas, format, 1);
          const reached = single.size <= target;
          return {
            blob: single,
            width,
            height,
            type: format,
            targetBytes: target,
            targetReached: reached,
            note: reached
              ? `Target reached: ${Math.max(1, Math.round(single.size / 1024))} KB.${capNote}`
              : `PNG is lossless (${Math.max(1, Math.round(single.size / 1024))} KB vs ${Math.round(target / 1024)} KB target). Switch Output format to JPG or WebP to reach smaller KB limits.${capNote}`,
          };
        }

        const candidate = await bestLossyAtSize(canvas, format, target);
        if (!smallest || candidate.blob.size < smallest.blob.size) {
          smallest = { blob: candidate.blob, width, height };
        }
        if (candidate.reached && candidate.blob.size <= target) {
          const scaleNote = scale < 0.999 ? ` Scaled to ${width} × ${height} px to meet target.` : '';
          return {
            blob: candidate.blob,
            width,
            height,
            type: format,
            targetBytes: target,
            targetReached: true,
            note: `Target reached: ${Math.max(1, Math.round(candidate.blob.size / 1024))} KB (limit: ${Math.max(1, Math.round(target / 1024))} KB).${scaleNote}${capNote}`,
          };
        }

        const ratio = Math.sqrt(target / Math.max(target + 1, candidate.blob.size));
        scale *= clamp(ratio * 0.88, 0.52, 0.86);
        if (width <= 32 || height <= 32) break;
      } finally {
        releaseCanvas(canvas);
      }
    }

    const fallback = smallest!;
    const reached = fallback.blob.size <= target;
    return {
      blob: fallback.blob,
      width: fallback.width,
      height: fallback.height,
      type: format,
      targetBytes: target,
      targetReached: reached,
      note: reached
        ? `Target reached: ${Math.max(1, Math.round(fallback.blob.size / 1024))} KB.${capNote}`
        : `Closest achievable size is ${Math.max(1, Math.round(fallback.blob.size / 1024))} KB (target ${Math.max(1, Math.round(target / 1024))} KB could not be met even at minimum resolution and quality).${capNote}`,
    };
  } finally {
    source.close();
  }
}

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map(ch => ch + ch)
          .join('')
      : clean.padEnd(6, 'f').slice(0, 6);
  const num = Number.parseInt(full, 16);
  if (!Number.isFinite(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Measures background edge color variance around the upper/side perimeter of a photo.
 * Used by Passport & ID Photo tools to warn the user when the source background is busy or uneven.
 */
export function measureEdgeVariance(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number
): { variance: number; highVariance: boolean } {
  const sampleW = Math.min(240, Math.max(32, Math.round(sourceWidth)));
  const sampleH = Math.min(240, Math.max(32, Math.round(sourceHeight)));
  const canvas = makeCanvas(sampleW, sampleH);
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { variance: 0, highVariance: false };
    ctx.drawImage(source, 0, 0, sampleW, sampleH);
    const d = ctx.getImageData(0, 0, sampleW, sampleH).data;
    const samples: Array<[number, number, number]> = [];
    const pushSample = (x: number, y: number) => {
      const idx = (clamp(Math.round(y), 0, sampleH - 1) * sampleW + clamp(Math.round(x), 0, sampleW - 1)) * 4;
      if (d[idx + 3]! > 16) samples.push([d[idx]!, d[idx + 1]!, d[idx + 2]!]);
    };
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      pushSample(t * (sampleW - 1), 1);
      pushSample(1, t * (sampleH * 0.65));
      pushSample(sampleW - 2, t * (sampleH * 0.65));
    }
    if (samples.length === 0) return { variance: 0, highVariance: false };
    const rs = samples.map(s => s[0]).sort((a, b) => a - b);
    const gs = samples.map(s => s[1]).sort((a, b) => a - b);
    const bs = samples.map(s => s[2]).sort((a, b) => a - b);
    const mid = Math.floor(samples.length / 2);
    const bgR = rs[mid]!;
    const bgG = gs[mid]!;
    const bgB = bs[mid]!;
    let variance = 0;
    for (const [r, g, b] of samples) {
      variance += Math.hypot(r - bgR, g - bgG, b - bgB);
    }
    variance /= samples.length;
    return {
      variance: Math.round(variance * 10) / 10,
      highVariance: variance > 38,
    };
  } finally {
    releaseCanvas(canvas);
  }
}

/**
 * Detects the bounding box of signature ink strokes in source image coordinates.
 * Used by the "Auto-Trim Ink" button in signature-upload-crop.
 */
export function detectSignatureInkBounds(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  threshold = 42,
  margin = 12
): CropBox {
  const safe = fitToSafeCanvas(sourceWidth, sourceHeight);
  const canvas = makeCanvas(safe.width, safe.height);
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
    ctx.drawImage(source, 0, 0, safe.width, safe.height);
    removeEdgeConnectedPaperBackground(ctx, safe.width, safe.height, threshold, undefined, 25, true);
    const d = ctx.getImageData(0, 0, safe.width, safe.height).data;
    let minX = safe.width;
    let minY = safe.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < safe.height; y++) {
      for (let x = 0; x < safe.width; x++) {
        const i = (y * safe.width + x) * 4;
        const alpha = d[i + 3]!;
        const lum = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
        if (alpha > 20 && lum < 245) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) {
      return { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
    }
    const scaleX = sourceWidth / safe.width;
    const scaleY = sourceHeight / safe.height;
    const pad = clamp(Math.round(margin), 0, 200);
    const x = Math.max(0, Math.round(minX * scaleX) - pad);
    const y = Math.max(0, Math.round(minY * scaleY) - pad);
    const right = Math.min(sourceWidth, Math.round((maxX + 1) * scaleX) + pad);
    const bottom = Math.min(sourceHeight, Math.round((maxY + 1) * scaleY) + pad);
    return {
      x,
      y,
      width: Math.max(16, right - x),
      height: Math.max(16, bottom - y),
    };
  } finally {
    releaseCanvas(canvas);
  }
}

function removeEdgeConnectedPaperBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tolerance = 38,
  replacementHex?: string,
  softness = 28,
  removeInteriorPaper = false
): { busyBackground: boolean; variance: number } {
  const image = ctx.getImageData(0, 0, width, height);
  const d = image.data;
  const total = width * height;
  if (total <= 0) return { busyBackground: false, variance: 0 };

  const samples: Array<[number, number, number]> = [];
  const pushSample = (x: number, y: number) => {
    const idx = (clamp(Math.round(y), 0, height - 1) * width + clamp(Math.round(x), 0, width - 1)) * 4;
    if (d[idx + 3]! > 16) samples.push([d[idx]!, d[idx + 1]!, d[idx + 2]!]);
  };
  const steps = Math.min(24, Math.max(6, Math.floor(Math.min(width, height) / 12)));
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(1, steps - 1);
    pushSample(t * (width - 1), 0);
    pushSample(0, t * (height * 0.65));
    pushSample(width - 1, t * (height * 0.65));
  }

  let bgR = 255;
  let bgG = 255;
  let bgB = 255;
  let variance = 0;
  if (samples.length > 0) {
    const rs = samples.map(s => s[0]).sort((a, b) => a - b);
    const gs = samples.map(s => s[1]).sort((a, b) => a - b);
    const bs = samples.map(s => s[2]).sort((a, b) => a - b);
    const mid = Math.floor(samples.length / 2);
    bgR = rs[mid]!;
    bgG = gs[mid]!;
    bgB = bs[mid]!;
    for (const [r, g, b] of samples) {
      variance += Math.hypot(r - bgR, g - bgG, b - bgB);
    }
    variance /= samples.length;
  }

  const maxDist = clamp(tolerance, 5, 220) * 1.45;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const matchesBg = (pixelIdx: number) => {
    const i = pixelIdx * 4;
    if (d[i + 3]! <= 12) return true;
    const dist = Math.hypot(d[i]! - bgR, d[i + 1]! - bgG, d[i + 2]! - bgB);
    return dist <= maxDist;
  };

  if (removeInteriorPaper) {
    // For signatures, also clear paper inside closed letter loops (e.g. O, A, B, e)
    for (let p = 0; p < total; p++) {
      if (matchesBg(p)) {
        visited[p] = 1;
        tail++;
      }
    }
  } else {
    const enqueue = (x: number, y: number) => {
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
      const p = queue[head++]!;
      const x = p % width;
      const y = (p - x) / width;
      if (x > 0) enqueue(x - 1, y);
      if (x + 1 < width) enqueue(x + 1, y);
      if (y > 0) enqueue(x, y - 1);
      if (y + 1 < height) enqueue(x, y + 1);
    }
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

  // Boundary feathering controlled by softness (0..100)
  const softVal = clamp(softness, 0, 100);
  if (softVal > 0) {
    const softDist = maxDist * (1 + softVal / 110);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = y * width + x;
        if (visited[p]) continue;
        const touchesBg = visited[p - 1] || visited[p + 1] || visited[p - width] || visited[p + width];
        if (!touchesBg) continue;
        const i = p * 4;
        const dist = Math.hypot(d[i]! - bgR, d[i + 1]! - bgG, d[i + 2]! - bgB);
        if (dist < softDist) {
          const ratio = clamp((dist - maxDist * 0.55) / Math.max(1, softDist - maxDist * 0.55), 0.12, 0.95);
          if (fillRgb) {
            d[i] = Math.round(d[i]! * ratio + fillRgb[0] * (1 - ratio));
            d[i + 1] = Math.round(d[i + 1]! * ratio + fillRgb[1] * (1 - ratio));
            d[i + 2] = Math.round(d[i + 2]! * ratio + fillRgb[2] * (1 - ratio));
          } else {
            d[i + 3] = Math.round(d[i + 3]! * ratio);
          }
        }
      }
    }
  }

  ctx.putImageData(image, 0, 0);
  const replacedRatio = tail / Math.max(1, total);
  return { busyBackground: variance > 42 || replacedRatio < 0.04, variance };
}

function applySignatureInkRecolor(ctx: CanvasRenderingContext2D, width: number, height: number, inkHex: string) {
  const [inkR, inkG, inkB] = parseHexRgb(inkHex);
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]!;
    if (a > 0) {
      d[i] = inkR;
      d[i + 1] = inkG;
      d[i + 2] = inkB;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function applyBrushStrokesToCanvas(
  ctx: CanvasRenderingContext2D,
  originalSource: CanvasImageSource,
  width: number,
  height: number,
  strokes: BrushStroke[],
  recolorHex?: string
) {
  if (!strokes || strokes.length === 0) return;

  // Prepare a clean copy of original source for 'restore' strokes
  const restoreCanvas = makeCanvas(width, height);
  try {
    const rCtx = restoreCanvas.getContext('2d')!;
    rCtx.drawImage(originalSource, 0, 0, width, height);
    if (recolorHex) {
      applySignatureInkRecolor(rCtx, width, height, recolorHex);
    }

    for (const stroke of strokes) {
      if (!stroke.points || stroke.points.length === 0) continue;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = clamp(stroke.size, 2, 160);

      if (stroke.mode === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.fillStyle = 'rgba(0,0,0,1)';
      } else {
        // Restore ink along brush path
        ctx.globalCompositeOperation = 'source-over';
        const color = recolorHex || '#0f172a';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
      }

      if (stroke.points.length === 1) {
        const pt = stroke.points[0]!;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, stroke.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i]!.x, stroke.points[i]!.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  } finally {
    releaseCanvas(restoreCanvas);
  }
}

function trimSignatureCanvas(canvas: HTMLCanvasElement, margin = 12): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3]!;
      const lum = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
      if (alpha > 20 && lum < 245) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return canvas;
  const pad = clamp(Math.round(margin), 0, 200);
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(width - sx, maxX - minX + 1 + pad * 2);
  const sh = Math.min(height - sy, maxY - minY + 1 + pad * 2);
  const out = makeCanvas(sw, sh);
  out.getContext('2d')!.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  releaseCanvas(canvas);
  return out;
}

/**
 * Draws the source image onto the target canvas with cover scaling, supporting zoom below 1
 * (down to 0.25x, padded with backgroundColor), free rotation (-180..180 deg), and horizontal flip.
 */
export function drawCoverCrop(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  anchorX = 0.5,
  anchorY = 0.45,
  zoom = 1,
  rotation = 0,
  backgroundColor = '#ffffff',
  flipX = false
) {
  const safeZoom = clamp(zoom || 1, 0.25, 5);
  if (safeZoom < 1 || rotation !== 0) {
    ctx.save();
    ctx.fillStyle = backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.restore();
  }

  const baseScale = Math.max(targetWidth / Math.max(1, sourceWidth), targetHeight / Math.max(1, sourceHeight));
  const coveredW = sourceWidth * baseScale * safeZoom;
  const coveredH = sourceHeight * baseScale * safeZoom;
  const slackX = Math.max(0, coveredW - targetWidth);
  const slackY = Math.max(0, coveredH - targetHeight);

  const normX = ((0.5 - clamp(anchorX, 0, 1)) * slackX) / Math.max(1, targetWidth);
  const normY = ((0.5 - clamp(anchorY, 0, 1)) * slackY) / Math.max(1, targetHeight);

  drawTransformedImage(
    ctx,
    source,
    { width: sourceWidth, height: sourceHeight },
    { width: targetWidth, height: targetHeight },
    {
      x: normX,
      y: normY,
      scale: safeZoom,
      rotation,
      flipX,
    },
    'cover'
  );
}

/**
 * Builds an A4 (210 × 297 mm) print sheet from a processed single photo tile.
 * Cut guides are drawn strictly OUTSIDE the photo edge so photo pixels are never painted over.
 */
export function buildA4PassportSheet(
  tile: HTMLCanvasElement,
  dpi: number,
  requestedCount: number,
  marginMm: number,
  spacingMm: number
): { sheet: HTMLCanvasElement; placed: number; cols: number; rows: number; sheetDpi: number; layout: A4LayoutResult } {
  const layout = computeA4GridLayout(
    tile.width,
    tile.height,
    dpi,
    requestedCount,
    marginMm,
    spacingMm,
    MAX_CANVAS_PIXELS
  );

  if (layout.placed < 1 || !layout.withinBounds) {
    throw new Error(
      'Single photo dimensions exceed the printable A4 area. Reduce the photo dimensions or sheet margin.'
    );
  }

  const sheet = makeCanvas(layout.sheetW, layout.sheetH);
  const ctx = sheet.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, layout.sheetW, layout.sheetH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const strokeWidth = Math.max(1, Math.round(layout.sheetDpi / 300));
  const halfStroke = strokeWidth / 2;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = strokeWidth;

  for (const rect of layout.tiles) {
    // Draw cut guides OUTSIDE the photo edge before drawing the photo tile
    ctx.strokeRect(
      rect.x - halfStroke,
      rect.y - halfStroke,
      rect.width + strokeWidth,
      rect.height + strokeWidth
    );
    ctx.drawImage(tile, 0, 0, tile.width, tile.height, rect.x, rect.y, rect.width, rect.height);
  }

  return {
    sheet,
    placed: layout.placed,
    cols: layout.cols,
    rows: layout.rows,
    sheetDpi: layout.sheetDpi,
    layout,
  };
}

export async function processImage(
  file: File,
  tool: ImageTool,
  options: ImageOptions
): Promise<ImageProcessResult> {
  if (options.signal?.aborted) throw new Error('Processing cancelled.');

  // Offload heavy photo-preset export (background replacement, A4 sheet build, or target-KB search) to Web Worker
  if (
    tool.workflow === 'photo-preset' &&
    !/\.svg$/i.test(file.name) &&
    file.type !== 'image/svg+xml'
  ) {
    const preset = tool.preset || { width: 35, height: 45, unit: 'mm' as PhysicalUnit, dpi: 300 };
    const workerRes = await runWorkerTask<{
      blob: Blob;
      width: number;
      height: number;
      type: OutputFormat;
      dpi: number;
      note?: string;
      targetBytes?: number;
      targetReached?: boolean;
      busyBgWarning?: string;
      pWidth?: number;
      pHeight?: number;
      unit?: PhysicalUnit;
    }>(
      'photo-preset',
      {
        file,
        preset,
        options: {
          ...options,
          signal: undefined,
          onProgress: undefined,
        },
      },
      options.signal,
      options.onProgress
    );

    if (workerRes && workerRes.blob) {
      const dpi = workerRes.dpi || clamp(Math.round(options.dpi || preset.dpi || 300), 36, 1200);
      const format = workerRes.type || options.format || 'image/jpeg';
      const withDpi =
        format === 'image/jpeg' || format === 'image/png'
          ? await setBlobDpi(workerRes.blob, dpi)
          : workerRes.blob;

      if (workerRes.targetBytes) {
        const strictReached = withDpi.size <= workerRes.targetBytes;
        const targetKb = Math.round(workerRes.targetBytes / 1024);
        const warn = workerRes.busyBgWarning || '';
        return {
          blob: withDpi,
          width: workerRes.width,
          height: workerRes.height,
          type: format,
          dpi,
          targetBytes: workerRes.targetBytes,
          targetReached: strictReached,
          note: strictReached
            ? `${workerRes.pWidth} × ${workerRes.pHeight} ${workerRes.unit} (${workerRes.width} × ${workerRes.height} px at ${dpi} DPI) · Target ≤ ${targetKb} KB reached (${Math.max(1, Math.round(withDpi.size / 1024))} KB).${warn}`
            : `${workerRes.pWidth} × ${workerRes.pHeight} ${workerRes.unit} (${workerRes.width} × ${workerRes.height} px at ${dpi} DPI) · Closest size at full resolution is ${Math.max(1, Math.round(withDpi.size / 1024))} KB (target ${targetKb} KB).${warn}`,
        };
      }

      return {
        blob: withDpi,
        width: workerRes.width,
        height: workerRes.height,
        type: format,
        dpi,
        note: workerRes.note,
      };
    }
  }

  const source = await decode(file);
  try {
    const format: OutputFormat =
      tool.workflow === 'to-jpg'
        ? 'image/jpeg'
        : ['remove-bg', 'signature-maker', 'signature-trim', 'signature-remove-bg', 'signature-png'].includes(
            tool.workflow
          )
        ? 'image/png'
        : options.format || 'image/webp';
    const quality = options.quality ?? 0.9;
    const dpi = clamp(Math.round(options.dpi || tool.preset?.dpi || 300), 36, 1200);

    if (tool.workflow === 'dpi') {
      const safe = fitToSafeCanvas(source.width, source.height);
      const canvas = makeCanvas(safe.width, safe.height);
      try {
        canvas.getContext('2d')!.drawImage(source.source, 0, 0, safe.width, safe.height);
        const outFormat: OutputFormat = format === 'image/png' ? 'image/png' : 'image/jpeg';
        const raw = await canvasBlob(canvas, outFormat, quality);
        const withDpi = await setBlobDpi(raw, dpi);
        return {
          blob: withDpi,
          width: canvas.width,
          height: canvas.height,
          type: outFormat,
          dpi,
          note: `DPI metadata set to ${dpi} DPI.`,
        };
      } finally {
        releaseCanvas(canvas);
      }
    }

    if (tool.workflow === 'resize-px') {
      const requestedW = Math.round(options.width || source.width);
      const requestedH = Math.round(options.height || source.height);
      const safe = fitToSafeCanvas(requestedW, requestedH);
      const canvas = makeCanvas(safe.width, safe.height);
      try {
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(source.source, 0, 0, safe.width, safe.height);
        return {
          blob: await canvasBlob(canvas, format, quality),
          width: safe.width,
          height: safe.height,
          type: format,
          note: safe.capped
            ? `Capped from ${requestedW} × ${requestedH} px to ${safe.width} × ${safe.height} px (16.7 MP browser canvas safety limit).`
            : undefined,
        };
      } finally {
        releaseCanvas(canvas);
      }
    }

    if (
      tool.workflow === 'resize-physical' ||
      tool.workflow === 'photo-size' ||
      tool.workflow === 'signature-resize'
    ) {
      const unit: PhysicalUnit = options.unit || tool.defaultUnit || 'cm';
      const requestedW = pixelsFromPhysical(options.physicalWidth || 3.5, unit, dpi);
      const requestedH = pixelsFromPhysical(options.physicalHeight || 4.5, unit, dpi);
      const safe = fitToSafeCanvas(requestedW, requestedH);
      const canvas = makeCanvas(safe.width, safe.height);
      try {
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, safe.width, safe.height);
        }
        if (options.stageTransform && !isDefaultTransform(options.stageTransform)) {
          drawTransformedImage(
            ctx,
            source.source,
            { width: source.width, height: source.height },
            { width: safe.width, height: safe.height },
            options.stageTransform,
            'fit'
          );
        } else {
          ctx.drawImage(source.source, 0, 0, safe.width, safe.height);
        }
        const raw = await canvasBlob(canvas, format, quality);
        const withDpi = format === 'image/jpeg' || format === 'image/png' ? await setBlobDpi(raw, dpi) : raw;
        return {
          blob: withDpi,
          width: safe.width,
          height: safe.height,
          type: format,
          dpi,
          note: safe.capped
            ? `${safe.width} × ${safe.height} px (capped to 16.7 MP safe canvas limit at ${dpi} DPI).`
            : `${safe.width} × ${safe.height} px at ${dpi} DPI.`,
        };
      } finally {
        releaseCanvas(canvas);
      }
    }

    if (tool.workflow === 'photo-preset') {
      const preset = tool.preset || { width: 35, height: 45, unit: 'mm' as PhysicalUnit, dpi: 300 };
      const unit: PhysicalUnit = options.unit || preset.unit;
      const pWidth = Number(options.physicalWidth || preset.width);
      const pHeight = Number(options.physicalHeight || preset.height);
      const requestedW = pixelsFromPhysical(pWidth, unit, dpi);
      const requestedH = pixelsFromPhysical(pHeight, unit, dpi);
      const safeTile = fitToSafeCanvas(requestedW, requestedH);
      const width = safeTile.width;
      const height = safeTile.height;

      let workSource: CanvasImageSource = source.source;
      let workW = source.width;
      let workH = source.height;
      let bgCanvas: HTMLCanvasElement | null = null;
      let canvas: HTMLCanvasElement | null = null;

      try {
        let busyBgWarning = '';
        if (options.replaceBackground) {
          const bgSafe = fitToSafeCanvas(workW, workH);
          bgCanvas = makeCanvas(bgSafe.width, bgSafe.height);
          const bgCtx = bgCanvas.getContext('2d')!;
          bgCtx.drawImage(workSource, 0, 0, bgSafe.width, bgSafe.height);
          const { busyBackground } = removeEdgeConnectedPaperBackground(
            bgCtx,
            bgSafe.width,
            bgSafe.height,
            options.amount ?? 38,
            options.backgroundColor || '#ffffff',
            options.softness ?? 28
          );
          if (busyBackground) {
            busyBgWarning =
              ' Note: Original background looks busy or uneven; background fill works best on plain, evenly lit walls.';
          }
          workSource = bgCanvas;
          workW = bgSafe.width;
          workH = bgSafe.height;
        }

        canvas = makeCanvas(width, height);
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = options.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const b = options.brightness ?? 100;
        const c = options.contrast ?? 100;
        if (b !== 100 || c !== 100) {
          ctx.filter = `brightness(${b}%) contrast(${c}%)`;
        }
        if (options.stageTransform) {
          drawTransformedImage(
            ctx,
            workSource,
            { width: workW, height: workH },
            { width, height },
            options.stageTransform,
            'cover'
          );
        } else {
          drawCoverCrop(
            ctx,
            workSource,
            workW,
            workH,
            width,
            height,
            options.anchorX ?? 0.5,
            options.anchorY ?? 0.42,
            options.zoom ?? 1,
            options.angle ?? 0,
            options.backgroundColor || '#ffffff',
            options.flip === 'horizontal'
          );
        }
        ctx.filter = 'none';

        if (options.a4Sheet) {
          const { sheet, placed, cols, rows, sheetDpi } = buildA4PassportSheet(
            canvas,
            dpi,
            options.a4Count ?? 8,
            options.a4MarginMm ?? 10,
            options.a4SpacingMm ?? 4
          );
          try {
            const rawSheet = await canvasBlob(sheet, format, quality);
            const withDpi =
              format === 'image/jpeg' || format === 'image/png' ? await setBlobDpi(rawSheet, sheetDpi) : rawSheet;
            return {
              blob: withDpi,
              width: sheet.width,
              height: sheet.height,
              type: format,
              dpi: sheetDpi,
              note: `A4 print sheet ready: ${placed} photos (${cols} × ${rows} grid, each ${pWidth} × ${pHeight} ${unit}) on 210 × 297 mm at ${sheetDpi} DPI.${busyBgWarning}`,
            };
          } finally {
            releaseCanvas(sheet);
          }
        }

        const targetKb = Number(options.targetKb || 0);
        if (targetKb > 0 && format !== 'image/png') {
          const targetBytes = Math.max(2048, Math.round(targetKb * 1024));
          const searchBudget = Math.max(1024, targetBytes - 32);
          const candidate = await bestLossyAtSize(canvas, format, searchBudget);
          const withDpi = format === 'image/jpeg' ? await setBlobDpi(candidate.blob, dpi) : candidate.blob;
          const strictReached = withDpi.size <= targetBytes;
          return {
            blob: withDpi,
            width,
            height,
            type: format,
            dpi,
            targetBytes,
            targetReached: strictReached,
            note: strictReached
              ? `${pWidth} × ${pHeight} ${unit} (${width} × ${height} px at ${dpi} DPI) · Target ≤ ${targetKb} KB reached (${Math.max(1, Math.round(withDpi.size / 1024))} KB).${busyBgWarning}`
              : `${pWidth} × ${pHeight} ${unit} (${width} × ${height} px at ${dpi} DPI) · Closest size at full resolution is ${Math.max(1, Math.round(withDpi.size / 1024))} KB (target ${targetKb} KB).${busyBgWarning}`,
          };
        }

        const raw = await canvasBlob(canvas, format, quality);
        const withDpi = format === 'image/jpeg' || format === 'image/png' ? await setBlobDpi(raw, dpi) : raw;
        return {
          blob: withDpi,
          width,
          height,
          type: format,
          dpi,
          note: `${pWidth} × ${pHeight} ${unit} (${width} × ${height} px at ${dpi} DPI).${busyBgWarning}`,
        };
      } finally {
        releaseCanvas(bgCanvas);
        releaseCanvas(canvas);
      }
    }

    if (tool.workflow === 'crop' || tool.workflow === 'signature-trim') {
      const hasExplicitCrop =
        typeof options.cropWidth === 'number' &&
        options.cropWidth > 0 &&
        typeof options.cropHeight === 'number' &&
        options.cropHeight > 0;

      let x = clamp(Math.round(options.cropX ?? 0), 0, Math.max(0, source.width - 1));
      let y = clamp(Math.round(options.cropY ?? 0), 0, Math.max(0, source.height - 1));
      let width = clamp(Math.round(options.cropWidth || source.width - x), 1, source.width - x);
      let height = clamp(Math.round(options.cropHeight || source.height - y), 1, source.height - y);

      if (tool.workflow === 'signature-trim' && !hasExplicitCrop) {
        const autoBox = detectSignatureInkBounds(
          source.source,
          source.width,
          source.height,
          options.amount ?? 42,
          options.trimMargin ?? 12
        );
        x = autoBox.x;
        y = autoBox.y;
        width = autoBox.width;
        height = autoBox.height;
      }

      const safe = fitToSafeCanvas(width, height);
      let canvas = makeCanvas(safe.width, safe.height);
      try {
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(source.source, x, y, width, height, 0, 0, safe.width, safe.height);
        if (tool.workflow === 'signature-trim') {
          removeEdgeConnectedPaperBackground(
            ctx,
             canvas.width,
            canvas.height,
            options.amount ?? 42,
            undefined,
            options.softness ?? 28,
            true
          );
          if (options.autoTrim) {
            canvas = trimSignatureCanvas(canvas, options.trimMargin ?? 12);
          }
        }
        return {
          blob: await canvasBlob(canvas, format, quality),
          width: canvas.width,
          height: canvas.height,
          type: format,
          note:
            tool.workflow === 'signature-trim'
              ? `Cropped signature: ${canvas.width} × ${canvas.height} px transparent PNG.`
              : undefined,
        };
      } finally {
        releaseCanvas(canvas);
      }
    }

    if (tool.workflow === 'aspect-crop') {
      const rw = Math.max(1, options.ratioWidth || 1);
      const rh = Math.max(1, options.ratioHeight || 1);
      const ratio = rw / rh;
      const sourceRatio = source.width / source.height;
      const rawW = sourceRatio > ratio ? Math.round(source.height * ratio) : source.width;
      const rawH = sourceRatio > ratio ? source.height : Math.round(source.width / ratio);
      const safe = fitToSafeCanvas(rawW, rawH);
      const canvas = makeCanvas(safe.width, safe.height);
      try {
        const ctx = canvas.getContext('2d')!;
        drawCoverCrop(
          ctx,
          source.source,
          source.width,
          source.height,
          safe.width,
          safe.height,
          options.anchorX ?? 0.5,
          options.anchorY ?? 0.5,
          options.zoom ?? 1
        );
        return {
          blob: await canvasBlob(canvas, format, quality),
          width: safe.width,
          height: safe.height,
          type: format,
        };
      } finally {
        releaseCanvas(canvas);
      }
    }

    if (tool.workflow === 'rotate') {
      const angle = (((options.angle ?? 90) % 360) + 360) % 360;
      const swap = angle === 90 || angle === 270;
      const safe = fitToSafeCanvas(swap ? source.height : source.width, swap ? source.width : source.height);
      const canvas = makeCanvas(safe.width, safe.height);
      try {
        const ctx = canvas.getContext('2d')!;
        ctx.save();
        ctx.translate(safe.width / 2, safe.height / 2);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.scale(options.flip === 'horizontal' ? -1 : 1, options.flip === 'vertical' ? -1 : 1);
        const drawW = swap ? safe.height : safe.width;
        const drawH = swap ? safe.width : safe.height;
        ctx.drawImage(source.source, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        return {
          blob: await canvasBlob(canvas, format, quality),
          width: safe.width,
          height: safe.height,
          type: format,
        };
      } finally {
        releaseCanvas(canvas);
      }
    }

    if (tool.workflow === 'upscale') {
      const scale = clamp(options.amount || 2, 2, 4);
      const requestedW = Math.round(source.width * scale);
      const requestedH = Math.round(source.height * scale);
      const safe = fitToSafeCanvas(requestedW, requestedH);
      const canvas = makeCanvas(safe.width, safe.height);
      try {
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(source.source, 0, 0, safe.width, safe.height);
        return {
          blob: await canvasBlob(canvas, format, quality),
          width: safe.width,
          height: safe.height,
          type: format,
          note: safe.capped
            ? `Upscaled to ${safe.width} × ${safe.height} px (capped from ${requestedW} × ${requestedH} px to stay within the 16.7 MP browser canvas safety limit).`
            : `Upscaled ${scale}× to ${safe.width} × ${safe.height} px.`,
        };
      } finally {
        releaseCanvas(canvas);
      }
    }

    const safeBase = fitToSafeCanvas(source.width, source.height);
    let canvas: HTMLCanvasElement | null = makeCanvas(safeBase.width, safeBase.height);
    try {
      const ctx = canvas.getContext('2d')!;

      if (tool.workflow === 'photo-editor') {
        const b = options.brightness ?? 100;
        const c = options.contrast ?? 100;
        const s = options.saturation ?? 100;
        const blur = options.blur ?? 0;
        ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) blur(${blur}px)`;
      }
      ctx.drawImage(source.source, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';

      if (tool.workflow === 'text-overlay') {
        const text = (options.text || 'Sample Text').trim().slice(0, 140);
        const fontSize = clamp(options.fontSize || Math.round(canvas.width / 18), 14, 220);
        const pad = Math.max(18, Math.round(fontSize * 0.75));
        ctx.save();
        ctx.globalAlpha = clamp(options.opacity ?? 0.85, 0.08, 1);
        ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = options.color || '#ffffff';
        ctx.strokeStyle = 'rgba(15,23,42,.55)';
        ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.08));
        const pos = options.position || 'center';
        let x = canvas.width / 2;
        let y = canvas.height / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (pos === 'bottom-right') {
          x = canvas.width - pad;
          y = canvas.height - pad;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
        } else if (pos === 'bottom-left') {
          x = pad;
          y = canvas.height - pad;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
        } else if (pos === 'top-right') {
          x = canvas.width - pad;
          y = pad;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
        } else if (pos === 'top-left') {
          x = pad;
          y = pad;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
        }
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        ctx.restore();
      }

      const workflowKey = String(tool.workflow);
      const isSigWorkflow =
        tool.workflow === 'signature-remove-bg' ||
        tool.workflow === 'signature-maker' ||
        tool.workflow === 'signature-png';

      if (workflowKey === 'remove-bg' || isSigWorkflow) {
        removeEdgeConnectedPaperBackground(
          ctx,
          canvas.width,
          canvas.height,
          options.amount ?? 42,
          undefined,
          options.softness ?? 28,
          isSigWorkflow
        );
      }

      if (workflowKey === 'change-bg') {
        removeEdgeConnectedPaperBackground(
          ctx,
          canvas.width,
          canvas.height,
          options.amount ?? 42,
          options.backgroundColor || '#ffffff',
          options.softness ?? 28,
          false
        );
      }

      // Recolor ink if requested in signature tools
      if (isSigWorkflow && options.recolorInk && options.inkColor) {
        applySignatureInkRecolor(ctx, canvas.width, canvas.height, options.inkColor);
      }

      // Replay Eraser / Restore brush strokes in source coordinates
      if (isSigWorkflow && options.brushStrokes && options.brushStrokes.length > 0) {
        applyBrushStrokesToCanvas(
          ctx,
          source.source,
          canvas.width,
          canvas.height,
          options.brushStrokes,
          options.recolorInk ? options.inkColor : undefined
        );
      }

      // Apply interactive stageTransform (drag / scale / rotate / flipX) if user modified it on CanvasStage
      const hasTransformOffset =
        options.stageTransform &&
        (Math.abs(options.stageTransform.x) > 0.001 || Math.abs(options.stageTransform.y) > 0.001);

      if (isSigWorkflow && options.stageTransform && !isDefaultTransform(options.stageTransform)) {
        const transformed = makeCanvas(canvas.width, canvas.height);
        const tCtx = transformed.getContext('2d')!;
        tCtx.imageSmoothingEnabled = true;
        tCtx.imageSmoothingQuality = 'high';
        drawTransformedImage(
          tCtx,
          canvas,
          { width: canvas.width, height: canvas.height },
          { width: transformed.width, height: transformed.height },
          options.stageTransform,
          'fit'
        );
        releaseCanvas(canvas);
        canvas = transformed;
      }

      // Auto-trim whitespace around signature ink (unless user explicitly dragged the signature on the page preview)
      const shouldAutoTrim =
        (tool.workflow === 'signature-maker' || tool.workflow === 'signature-remove-bg') &&
        options.autoTrim !== false &&
        !hasTransformOffset;

      if (shouldAutoTrim && canvas) {
        canvas = trimSignatureCanvas(canvas, options.trimMargin ?? 12);
      }

      // For signature-maker: apply custom output size (px/cm/mm/in + DPI) if requested
      if (tool.workflow === 'signature-maker' && options.useCustomSize && canvas) {
        const unit: PhysicalUnit = options.unit || 'px';
        const targetW =
          unit === 'px'
            ? clamp(Math.round(options.width || 600), 16, 4096)
            : pixelsFromPhysical(options.physicalWidth || 5, unit, dpi);
        const targetH =
          unit === 'px'
            ? clamp(Math.round(options.height || 200), 16, 4096)
            : pixelsFromPhysical(options.physicalHeight || 2, unit, dpi);
        const safeOut = fitToSafeCanvas(targetW, targetH);
        const sized = makeCanvas(safeOut.width, safeOut.height);
        const sCtx = sized.getContext('2d')!;
        sCtx.imageSmoothingEnabled = true;
        sCtx.imageSmoothingQuality = 'high';
        drawTransformedImage(
          sCtx,
          canvas,
          { width: canvas.width, height: canvas.height },
          { width: sized.width, height: sized.height },
          { x: 0, y: 0, scale: 1, rotation: 0, flipX: false },
          'fit'
        );
        releaseCanvas(canvas);
        canvas = sized;
      }

      // Optional white background fill for signature-maker
      if (tool.workflow === 'signature-maker' && options.transparentBackground === false && canvas) {
        const whiteCanvas = makeCanvas(canvas.width, canvas.height);
        const wCtx = whiteCanvas.getContext('2d')!;
        wCtx.fillStyle = '#ffffff';
        wCtx.fillRect(0, 0, whiteCanvas.width, whiteCanvas.height);
        wCtx.drawImage(canvas, 0, 0);
        releaseCanvas(canvas);
        canvas = whiteCanvas;
      }

      const rawBlob = await canvasBlob(canvas!, format, quality);
      const blob =
        isSigWorkflow && (format === 'image/png' || format === 'image/jpeg')
          ? await setBlobDpi(rawBlob, dpi)
          : rawBlob;

      if (tool.workflow === 'remove-metadata') {
        let verifiedClean = true;
        if (format === 'image/jpeg') {
          const outBytes = new Uint8Array(await blob.slice(0, Math.min(blob.size, 65536)).arrayBuffer());
          const check = inspectJpegBinary(outBytes);
          verifiedClean = !check.hasExifOrAppMeta;
        }
        return {
          blob,
          width: canvas!.width,
          height: canvas!.height,
          type: format,
          note: verifiedClean
            ? 'EXIF, camera, and GPS metadata stripped and binary-verified clean.'
            : 'Re-encoded from canvas pixels.',
        };
      }

      return {
        blob,
        width: canvas!.width,
        height: canvas!.height,
        type: format,
        dpi: isSigWorkflow ? dpi : undefined,
        note:
          tool.workflow === 'dimension-check' || tool.workflow === 'quality-check'
            ? `${canvas!.width} × ${canvas!.height} px · ${Math.max(1, Math.round(blob.size / 1024))} KB`
            : isSigWorkflow
            ? `${canvas!.width} × ${canvas!.height} px (${dpi} DPI) · ${
                options.transparentBackground === false ? 'White background' : 'Transparent PNG'
              }`
            : undefined,
      };
    } finally {
      releaseCanvas(canvas);
    }
  } finally {
    source.close();
  }
}

async function setBlobDpi(blob: Blob, dpi: number): Promise<Blob> {
  const safeDpi = clamp(Math.round(dpi), 36, 1200);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (blob.type === 'image/jpeg') return new Blob([setJpegDpi(bytes, safeDpi)], { type: blob.type });
  if (blob.type === 'image/png') return new Blob([setPngDpi(bytes, safeDpi)], { type: blob.type });
  return blob;
}

function setJpegDpi(bytes: Uint8Array, dpi: number) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  let offset = 2;
  while (offset + 18 < bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1]!;
    if (marker === 0xda || marker === 0xd9) break;
    const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (
      marker === 0xe0 &&
      bytes[offset + 4] === 0x4a &&
      bytes[offset + 5] === 0x46 &&
      bytes[offset + 6] === 0x49 &&
      bytes[offset + 7] === 0x46 &&
      bytes[offset + 8] === 0x00
    ) {
      const out = bytes.slice();
      out[offset + 11] = 1;
      out[offset + 12] = (dpi >> 8) & 0xff;
      out[offset + 13] = dpi & 0xff;
      out[offset + 14] = (dpi >> 8) & 0xff;
      out[offset + 15] = dpi & 0xff;
      return out;
    }
    offset += 2 + length;
  }
  const jfif = new Uint8Array([
    0xff,
    0xe0,
    0x00,
    0x10,
    0x4a,
    0x46,
    0x49,
    0x46,
    0x00,
    0x01,
    0x01,
    0x01,
    (dpi >> 8) & 0xff,
    dpi & 0xff,
    (dpi >> 8) & 0xff,
    dpi & 0xff,
    0x00,
    0x00,
  ]);
  const out = new Uint8Array(bytes.length + jfif.length);
  out.set(bytes.subarray(0, 2), 0);
  out.set(jfif, 2);
  out.set(bytes.subarray(2), 2 + jfif.length);
  return out;
}

function setPngDpi(bytes: Uint8Array, dpi: number) {
  if (bytes.length < 33 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return bytes;
  const ppm = Math.round(dpi / 0.0254);
  const data = new Uint8Array(9);
  writeUint32(data, 0, ppm);
  writeUint32(data, 4, ppm);
  data[8] = 1;
  const type = new Uint8Array([0x70, 0x48, 0x59, 0x73]); // pHYs
  const chunk = new Uint8Array(21);
  writeUint32(chunk, 0, 9);
  chunk.set(type, 4);
  chunk.set(data, 8);
  const crcInput = new Uint8Array(13);
  crcInput.set(type, 0);
  crcInput.set(data, 4);
  writeUint32(chunk, 17, crc32(crcInput));
  const ihdrEnd = 33;
  const out = new Uint8Array(bytes.length + chunk.length);
  out.set(bytes.subarray(0, ihdrEnd), 0);
  out.set(chunk, ihdrEnd);
  out.set(bytes.subarray(ihdrEnd), ihdrEnd + chunk.length);
  return out;
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i]!;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}
