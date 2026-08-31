import type { ToolId } from './image-tools';

export type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';
export type CompressionMode = 'auto' | 'target';

export type ImageOptions = {
  width?: number;
  height?: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  angle?: number;
  flip?: 'none' | 'horizontal' | 'vertical';
  format?: OutputFormat;
  quality?: number;
  text?: string;
  opacity?: number;
  fontSize?: number;
  amount?: number;
  color?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
};

export type ImageProcessResult = {
  blob: Blob;
  width: number;
  height: number;
  type: OutputFormat;
  targetReached?: boolean;
  targetBytes?: number;
  note?: string;
  attempts?: number;
};

export type CompressionOptions = {
  mode: CompressionMode;
  targetBytes?: number;
  format?: OutputFormat;
};

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

const MAX_EDGE = 12000;
const MAX_PIXELS = 36_000_000;
const MIN_COMPRESS_EDGE = 64;

function validateDimensions(width: number, height: number) {
  if (!width || !height) throw new Error('The image has invalid dimensions.');
  if (width > MAX_EDGE || height > MAX_EDGE || width * height > MAX_PIXELS) {
    throw new Error('This image is too large for safe browser processing. Resize it first or choose a smaller image.');
  }
}

function supportedInput(file: File) {
  return file.type.startsWith('image/') || /\.svg$/i.test(file.name);
}

async function decode(file: File): Promise<Decoded> {
  if (!supportedInput(file)) throw new Error('Choose a supported image file.');

  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      validateDimensions(bitmap.width, bitmap.height);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // SVG and formats handled by the browser Image decoder continue below.
    }
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  try {
    await image.decode();
    validateDimensions(image.naturalWidth, image.naturalHeight);
    return { source: image, width: image.naturalWidth, height: image.naturalHeight };
  } catch {
    throw new Error('This image format could not be decoded by your browser.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function makeCanvas(width: number, height: number) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  validateDimensions(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function context2d(canvas: HTMLCanvasElement, readFrequently = false) {
  const ctx = canvas.getContext('2d', readFrequently ? { willReadFrequently: true } : undefined);
  if (!ctx) throw new Error('Canvas processing is unavailable in this browser.');
  return ctx;
}

function drawHighQuality(ctx: CanvasRenderingContext2D, source: CanvasImageSource, width: number, height: number) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
}

function drawDecoded(decoded: Decoded, width = decoded.width, height = decoded.height) {
  const canvas = makeCanvas(width, height);
  const ctx = context2d(canvas);
  drawHighQuality(ctx, decoded.source, canvas.width, canvas.height);
  return canvas;
}

function canvasBlob(canvas: HTMLCanvasElement, type: OutputFormat, quality = .9) {
  return new Promise<Blob>((resolve, reject) => {
    const encode = (target: HTMLCanvasElement) => target.toBlob(
      value => value ? resolve(value) : reject(new Error(`Browser could not encode ${type.replace('image/', '').toUpperCase()}.`)),
      type,
      Math.min(1, Math.max(.05, quality)),
    );

    if (type !== 'image/jpeg') {
      encode(canvas);
      return;
    }

    const flattened = makeCanvas(canvas.width, canvas.height);
    const ctx = context2d(flattened);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, flattened.width, flattened.height);
    ctx.drawImage(canvas, 0, 0);
    encode(flattened);
  });
}

function sourceOutputFormat(file: File): OutputFormat | null {
  if (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp') return file.type;
  return null;
}

function safeOutputType(id: ToolId, requested: OutputFormat | undefined, inputType: string): OutputFormat {
  if (id === 'convert-to-jpg') return 'image/jpeg';
  if (id === 'jpg-to-png') return requested === 'image/webp' ? 'image/webp' : 'image/png';
  if (id === 'background-remover') return 'image/png';
  if (requested) return requested;
  if (inputType === 'image/jpeg' || inputType === 'image/png' || inputType === 'image/webp') return inputType;
  return 'image/png';
}

function hexToRgb(hex: string) {
  const clean = (hex || '#ffffff').replace('#', '').trim();
  const value = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean.padEnd(6, 'f').slice(0, 6);
  const number = Number.parseInt(value, 16);
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
}

export async function imageDimensions(file: File) {
  const decoded = await decode(file);
  try { return { width: decoded.width, height: decoded.height }; }
  finally { decoded.close?.(); }
}

async function bestLossyAtSize(canvas: HTMLCanvasElement, type: 'image/jpeg' | 'image/webp', targetBytes: number) {
  let low = .12;
  let high = .96;
  let best: { blob: Blob; quality: number } | null = null;
  let smallest: { blob: Blob; quality: number } | null = null;
  let attempts = 0;

  for (let i = 0; i < 10; i++) {
    const quality = (low + high) / 2;
    const blob = await canvasBlob(canvas, type, quality);
    attempts++;
    if (!smallest || blob.size < smallest.blob.size) smallest = { blob, quality };
    if (blob.size <= targetBytes) {
      best = { blob, quality };
      low = quality;
    } else {
      high = quality;
    }
  }

  if (best) return { ...best, attempts };
  const floor = await canvasBlob(canvas, type, .08);
  attempts++;
  if (!smallest || floor.size < smallest.blob.size) smallest = { blob: floor, quality: .08 };
  return { ...(smallest as { blob: Blob; quality: number }), attempts };
}

export async function compressImage(file: File, options: CompressionOptions): Promise<ImageProcessResult> {
  const rawTarget = Number(options.targetBytes ?? 0);
  if (options.mode === 'target' && (!Number.isFinite(rawTarget) || rawTarget <= 0)) {
    throw new Error('Enter a valid target file size greater than 0.');
  }
  const decoded = await decode(file);
  const requestedType = options.format || sourceOutputFormat(file) || 'image/webp';
  const target = Math.max(1, Math.round(rawTarget));

  try {
    if (options.mode === 'target' && target >= file.size && sourceOutputFormat(file) === requestedType) {
      return {
        blob: file,
        width: decoded.width,
        height: decoded.height,
        type: requestedType,
        targetReached: true,
        targetBytes: target,
        note: 'The selected image is already at or below the requested size, so the original file was kept.',
        attempts: 0,
      };
    }

    if (options.mode === 'auto') {
      const canvas = drawDecoded(decoded);
      const blob = await canvasBlob(canvas, requestedType, requestedType === 'image/png' ? 1 : .88);
      if (sourceOutputFormat(file) === requestedType && blob.size >= file.size) {
        return {
          blob: file,
          width: decoded.width,
          height: decoded.height,
          type: requestedType,
          note: 'The original was already smaller than the browser re-encode, so AJN Buzz kept the smaller original.',
          attempts: 1,
        };
      }
      return { blob, width: canvas.width, height: canvas.height, type: requestedType, attempts: 1 };
    }


    let scale = 1;
    let attempts = 0;
    let smallest: { blob: Blob; width: number; height: number } | null = null;

    for (let pass = 0; pass < 9; pass++) {
      const width = Math.max(MIN_COMPRESS_EDGE, Math.round(decoded.width * scale));
      const height = Math.max(MIN_COMPRESS_EDGE, Math.round(decoded.height * scale));
      const canvas = drawDecoded(decoded, width, height);

      let candidate: Blob;
      if (requestedType === 'image/png') {
        candidate = await canvasBlob(canvas, requestedType, 1);
        attempts++;
      } else {
        const result = await bestLossyAtSize(canvas, requestedType, target);
        candidate = result.blob;
        attempts += result.attempts;
      }

      if (!smallest || candidate.size < smallest.blob.size) smallest = { blob: candidate, width, height };
      if (candidate.size <= target) {
        return {
          blob: candidate,
          width,
          height,
          type: requestedType,
          targetReached: true,
          targetBytes: target,
          attempts,
          note: pass > 0 ? 'Target reached by balancing encoder quality and image dimensions.' : 'Target reached without reducing image dimensions.',
        };
      }

      if (width <= MIN_COMPRESS_EDGE || height <= MIN_COMPRESS_EDGE) break;
      const ratio = Math.sqrt(target / Math.max(1, candidate.size)) * .96;
      const shrink = Math.min(.88, Math.max(.55, ratio));
      scale *= shrink;
    }

    if (!smallest) throw new Error('The browser could not produce a compressed image.');
    return {
      blob: smallest.blob,
      width: smallest.width,
      height: smallest.height,
      type: requestedType,
      targetReached: smallest.blob.size <= target,
      targetBytes: target,
      attempts,
      note: `Closest safe browser result is ${Math.max(1, Math.round(smallest.blob.size / 1024))} KB. Choose JPG/WebP or a larger target if you need a closer result.`,
    };
  } finally {
    decoded.close?.();
  }
}

export async function processImage(file: File, id: ToolId, options: ImageOptions = {}): Promise<ImageProcessResult> {
  if (id === 'compress') {
    return compressImage(file, { mode: 'auto', format: safeOutputType(id, options.format, file.type) });
  }

  const decoded = await decode(file);
  const quality = Math.min(1, Math.max(.05, options.quality ?? .9));
  const type = safeOutputType(id, options.format, file.type);

  try {
    let canvas: HTMLCanvasElement;

    if (id === 'resize') {
      const requestedWidth = Number(options.width || 0);
      const requestedHeight = Number(options.height || 0);
      let width = decoded.width;
      let height = decoded.height;
      if (requestedWidth > 0 && requestedHeight > 0) { width = requestedWidth; height = requestedHeight; }
      else if (requestedWidth > 0) { width = requestedWidth; height = Math.round(decoded.height * requestedWidth / decoded.width); }
      else if (requestedHeight > 0) { height = requestedHeight; width = Math.round(decoded.width * requestedHeight / decoded.height); }
      canvas = drawDecoded(decoded, width, height);
    } else if (id === 'upscale') {
      const scale = Math.min(4, Math.max(2, Math.round(options.amount || 2)));
      canvas = drawDecoded(decoded, decoded.width * scale, decoded.height * scale);
    } else if (id === 'crop') {
      const x = Math.max(0, Math.min(decoded.width - 1, Number(options.cropX || 0)));
      const y = Math.max(0, Math.min(decoded.height - 1, Number(options.cropY || 0)));
      const width = Math.min(decoded.width - x, Math.max(1, Number(options.cropWidth || decoded.width - x)));
      const height = Math.min(decoded.height - y, Math.max(1, Number(options.cropHeight || decoded.height - y)));
      canvas = makeCanvas(width, height);
      context2d(canvas).drawImage(decoded.source, x, y, width, height, 0, 0, width, height);
    } else if (id === 'rotate') {
      const angle = ((Number(options.angle || 90) % 360) + 360) % 360;
      const swap = angle === 90 || angle === 270;
      const width = swap ? decoded.height : decoded.width;
      const height = swap ? decoded.width : decoded.height;
      const rotated = makeCanvas(width, height);
      const rotatedCtx = context2d(rotated);
      rotatedCtx.translate(width / 2, height / 2);
      rotatedCtx.rotate(angle * Math.PI / 180);
      rotatedCtx.drawImage(decoded.source, -decoded.width / 2, -decoded.height / 2);
      const flip = options.flip || 'none';
      if (flip === 'none') canvas = rotated;
      else {
        canvas = makeCanvas(width, height);
        const ctx = context2d(canvas);
        if (flip === 'horizontal') { ctx.translate(width, 0); ctx.scale(-1, 1); }
        else { ctx.translate(0, height); ctx.scale(1, -1); }
        ctx.drawImage(rotated, 0, 0);
      }
    } else if (id === 'background-remover') {
      canvas = drawDecoded(decoded);
      const ctx = context2d(canvas, true);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const sample = options.color ? hexToRgb(options.color) : (() => {
        const positions = [0, (canvas.width - 1) * 4, ((canvas.height - 1) * canvas.width) * 4, ((canvas.height * canvas.width) - 1) * 4];
        const sum = positions.reduce((a, p) => ({ r: a.r + pixels.data[p]!, g: a.g + pixels.data[p + 1]!, b: a.b + pixels.data[p + 2]! }), { r: 0, g: 0, b: 0 });
        return { r: Math.round(sum.r / 4), g: Math.round(sum.g / 4), b: Math.round(sum.b / 4) };
      })();
      const tolerance = Math.min(220, Math.max(5, Number(options.amount || 42)));
      for (let i = 0; i < pixels.data.length; i += 4) {
        const dr = pixels.data[i]! - sample.r;
        const dg = pixels.data[i + 1]! - sample.g;
        const db = pixels.data[i + 2]! - sample.b;
        const distance = Math.sqrt(dr * dr + dg * dg + db * db);
        if (distance <= tolerance) pixels.data[i + 3] = Math.round(255 * Math.max(0, Math.min(1, distance / tolerance)));
      }
      ctx.putImageData(pixels, 0, 0);
    } else if (id === 'photo-editor') {
      canvas = makeCanvas(decoded.width, decoded.height);
      const ctx = context2d(canvas);
      ctx.filter = [
        `brightness(${Math.max(0, Number(options.brightness ?? 100))}%)`,
        `contrast(${Math.max(0, Number(options.contrast ?? 100))}%)`,
        `saturate(${Math.max(0, Number(options.saturation ?? 100))}%)`,
        `blur(${Math.max(0, Number(options.blur ?? 0))}px)`,
      ].join(' ');
      drawHighQuality(ctx, decoded.source, decoded.width, decoded.height);
      ctx.filter = 'none';
    } else if (id === 'watermark') {
      canvas = drawDecoded(decoded);
      const ctx = context2d(canvas);
      const text = (options.text || 'AJN Buzz').slice(0, 120);
      const size = Math.max(12, Number(options.fontSize || Math.max(24, Math.round(decoded.width / 18))));
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(.05, Number(options.opacity ?? .55)));
      ctx.font = `800 ${size}px Inter, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = options.color || '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,.45)';
      ctx.shadowBlur = 6;
      ctx.translate(decoded.width / 2, decoded.height / 2);
      ctx.rotate(-Math.PI / 8);
      ctx.fillText(text, 0, 0, decoded.width * .9);
      ctx.restore();
    } else if (id === 'convert' || id === 'convert-to-jpg' || id === 'jpg-to-png') {
      canvas = drawDecoded(decoded);
    } else {
      throw new Error(`Unsupported image tool: ${id}`);
    }

    const blob = await canvasBlob(canvas, type, quality);
    return { blob, width: canvas.width, height: canvas.height, type };
  } finally {
    decoded.close?.();
  }
}
