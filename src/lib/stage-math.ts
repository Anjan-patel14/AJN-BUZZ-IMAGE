/**
 * AJN BUZZ IMAGE - Interactive Canvas Stage Math
 * Handles image-normalized coordinate transforms, matrix calculations,
 * round-trip coordinate projection, 8-handle crop box math, A4 sheet grid layout,
 * and rendering pipelines between the interactive preview canvas and high-resolution export canvases.
 */

export interface StageTransform {
  /** Normalized X offset (-2.0 .. 2.0). 0 is center. 1.0 is +100% of target width */
  x: number;
  /** Normalized Y offset (-2.0 .. 2.0). 0 is center. 1.0 is +100% of target height */
  y: number;
  /** Scale factor (0.25 .. 5.0). 1.0 = base fit/cover */
  scale: number;
  /** Rotation in degrees (-180 .. 180) */
  rotation: number;
  /** Horizontal mirror flip */
  flipX: boolean;
}

export interface StageSize {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BrushStroke {
  mode: 'erase' | 'restore';
  points: Point[];
  size: number;
}

export interface A4TileRect {
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
}

export interface A4LayoutResult {
  sheetW: number;
  sheetH: number;
  sheetDpi: number;
  tileW: number;
  tileH: number;
  marginPx: number;
  gapPx: number;
  maxCols: number;
  maxRows: number;
  maxFit: number;
  cols: number;
  rows: number;
  placed: number;
  tiles: A4TileRect[];
  hasOverlap: boolean;
  withinBounds: boolean;
}

export type FitMode = 'cover' | 'fit';

export const MIN_STAGE_SCALE = 0.25;
export const MAX_STAGE_SCALE = 5.0;

export const DEFAULT_TRANSFORM: Readonly<StageTransform> = Object.freeze({
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  flipX: false,
});

/**
 * Normalizes an angle into the -180..180 degree range.
 */
export function normalizeAngle(deg: number): number {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return Math.round(a * 100) / 100;
}

/**
 * Clamps and sanitizes a StageTransform object.
 */
export function clampTransform(t: Partial<StageTransform>): StageTransform {
  return {
    x: Math.max(-3, Math.min(3, Number.isFinite(t.x) ? (t.x as number) : 0)),
    y: Math.max(-3, Math.min(3, Number.isFinite(t.y) ? (t.y as number) : 0)),
    scale: Math.max(MIN_STAGE_SCALE, Math.min(MAX_STAGE_SCALE, Number.isFinite(t.scale) ? (t.scale as number) : 1)),
    rotation: normalizeAngle(Number.isFinite(t.rotation) ? (t.rotation as number) : 0),
    flipX: Boolean(t.flipX),
  };
}

/**
 * Checks whether a StageTransform has been modified from the default 1.0x centered state.
 */
export function isDefaultTransform(t?: StageTransform | null): boolean {
  if (!t) return true;
  return (
    Math.abs(t.x) < 0.001 &&
    Math.abs(t.y) < 0.001 &&
    Math.abs(t.scale - 1) < 0.001 &&
    Math.abs(t.rotation) < 0.05 &&
    !t.flipX
  );
}

/**
 * Calculates the base scale for placing an image into target dimensions.
 * In 'cover' mode, the image fills the target without empty bars.
 * In 'fit' mode, the entire image fits within the target.
 */
export function calculateBaseScale(source: StageSize, target: StageSize, mode: FitMode = 'cover'): number {
  if (source.width <= 0 || source.height <= 0 || target.width <= 0 || target.height <= 0) {
    return 1;
  }
  const scaleX = target.width / source.width;
  const scaleY = target.height / source.height;
  return mode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
}

/**
 * Calculates the center position in target pixels.
 */
export function getTargetCenter(target: StageSize, transform: StageTransform): Point {
  return {
    x: target.width / 2 + transform.x * target.width,
    y: target.height / 2 + transform.y * target.height,
  };
}

/**
 * Maps a point in source image coordinates (0..sourceW, 0..sourceH)
 * to target canvas coordinates (0..targetW, 0..targetH).
 */
export function sourcePointToTarget(
  sourcePt: Point,
  source: StageSize,
  target: StageSize,
  transform: StageTransform,
  mode: FitMode = 'cover'
): Point {
  const baseScale = calculateBaseScale(source, target, mode);
  const totalScale = baseScale * transform.scale;
  const center = getTargetCenter(target, transform);

  // Relative to source center
  const relX = (sourcePt.x - source.width / 2) * (transform.flipX ? -1 : 1);
  const relY = sourcePt.y - source.height / 2;

  // Apply scale
  const scaledX = relX * totalScale;
  const scaledY = relY * totalScale;

  // Apply rotation
  const rad = (transform.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rotX = scaledX * cos - scaledY * sin;
  const rotY = scaledX * sin + scaledY * cos;

  return {
    x: center.x + rotX,
    y: center.y + rotY,
  };
}

/**
 * Maps a point in target canvas coordinates (0..targetW, 0..targetH)
 * back to source image coordinates (0..sourceW, 0..sourceH).
 * Inverse matrix of sourcePointToTarget.
 */
export function targetPointToSource(
  targetPt: Point,
  source: StageSize,
  target: StageSize,
  transform: StageTransform,
  mode: FitMode = 'cover'
): Point {
  const baseScale = calculateBaseScale(source, target, mode);
  const totalScale = baseScale * transform.scale;
  if (totalScale === 0) return { x: source.width / 2, y: source.height / 2 };

  const center = getTargetCenter(target, transform);

  // Translate relative to target center
  const dx = targetPt.x - center.x;
  const dy = targetPt.y - center.y;

  // Invert rotation (-rad)
  const rad = (-transform.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const unrotX = dx * cos - dy * sin;
  const unrotY = dx * sin + dy * cos;

  // Invert scale
  const unscaledX = unrotX / totalScale;
  const unscaledY = unrotY / totalScale;

  // Invert flip & translate back to top-left
  const origX = unscaledX * (transform.flipX ? -1 : 1) + source.width / 2;
  const origY = unscaledY + source.height / 2;

  return { x: origX, y: origY };
}

/**
 * Projects a point from a preview stage to an export stage.
 * Because transform is normalized, coordinates are scale-invariant!
 */
export function projectPreviewToExport(
  previewPt: Point,
  previewSize: StageSize,
  exportSize: StageSize,
  source: StageSize,
  transform: StageTransform,
  mode: FitMode = 'cover'
): Point {
  const sourcePt = targetPointToSource(previewPt, source, previewSize, transform, mode);
  return sourcePointToTarget(sourcePt, source, exportSize, transform, mode);
}

/**
 * Applies the StageTransform to a canvas rendering context.
 * After calling this, the source image can be drawn centered at (-width/2, -height/2).
 */
export function applyTransformToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  target: StageSize,
  source: StageSize,
  transform: StageTransform,
  mode: FitMode = 'cover'
): void {
  const center = getTargetCenter(target, transform);
  const baseScale = calculateBaseScale(source, target, mode);
  const totalScale = baseScale * transform.scale;

  ctx.translate(center.x, center.y);
  if (transform.rotation !== 0) {
    ctx.rotate((transform.rotation * Math.PI) / 180);
  }
  ctx.scale(transform.flipX ? -totalScale : totalScale, totalScale);
}

/**
 * Draws the source image onto the target canvas context using the transform.
 */
export function drawTransformedImage(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  image: CanvasImageSource,
  source: StageSize,
  target: StageSize,
  transform: StageTransform,
  mode: FitMode = 'cover'
): void {
  ctx.save();
  applyTransformToContext(ctx, target, source, transform, mode);
  ctx.drawImage(image, -source.width / 2, -source.height / 2, source.width, source.height);
  ctx.restore();
}

/**
 * Nudges the transform position by normalized deltas.
 */
export function nudgeTransform(
  t: StageTransform,
  deltaNormX: number,
  deltaNormY: number
): StageTransform {
  return clampTransform({
    ...t,
    x: t.x + deltaNormX,
    y: t.y + deltaNormY,
  });
}

/**
 * Zooms the transform by factor, optionally keeping a pivot point invariant.
 */
export function zoomTransform(
  t: StageTransform,
  factor: number,
  pivotTargetPt?: Point,
  target?: StageSize,
  source?: StageSize,
  mode: FitMode = 'cover'
): StageTransform {
  const nextScale = Math.max(MIN_STAGE_SCALE, Math.min(MAX_STAGE_SCALE, t.scale * factor));
  if (!pivotTargetPt || !target || !source) {
    return clampTransform({ ...t, scale: nextScale });
  }

  const srcPt = targetPointToSource(pivotTargetPt, source, target, t, mode);
  const tentative: StageTransform = { ...t, scale: nextScale };
  const newTargetPt = sourcePointToTarget(srcPt, source, target, tentative, mode);

  const diffX = (pivotTargetPt.x - newTargetPt.x) / target.width;
  const diffY = (pivotTargetPt.y - newTargetPt.y) / target.height;

  return clampTransform({
    ...tentative,
    x: t.x + diffX,
    y: t.y + diffY,
  });
}

/**
 * Computes bounding corners of the transformed image in target coordinates.
 */
export function getTransformedCorners(
  source: StageSize,
  target: StageSize,
  transform: StageTransform,
  mode: FitMode = 'cover'
): { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point; rotateHandle: Point } {
  const tl = sourcePointToTarget({ x: 0, y: 0 }, source, target, transform, mode);
  const tr = sourcePointToTarget({ x: source.width, y: 0 }, source, target, transform, mode);
  const br = sourcePointToTarget({ x: source.width, y: source.height }, source, target, transform, mode);
  const bl = sourcePointToTarget({ x: 0, y: source.height }, source, target, transform, mode);

  const topCenter = { x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2 };
  const rad = (transform.rotation * Math.PI) / 180;
  const handleDistance = 32;
  const rotHandle: Point = {
    x: topCenter.x - Math.sin(rad) * handleDistance,
    y: topCenter.y - Math.cos(rad) * handleDistance,
  };

  return {
    topLeft: tl,
    topRight: tr,
    bottomRight: br,
    bottomLeft: bl,
    rotateHandle: rotHandle,
  };
}

/**
 * Computes the A4 (210 x 297 mm) print sheet layout and validates that no tiles overlap
 * and all tiles remain strictly inside printable bounds.
 */
export function computeA4GridLayout(
  tileWidthPx: number,
  tileHeightPx: number,
  dpi: number,
  requestedCount = 8,
  marginMm = 10,
  spacingMm = 4,
  maxCanvasPixels = 16_777_216
): A4LayoutResult {
  const maxSafeA4Dpi = Math.floor(Math.sqrt(maxCanvasPixels / ((210 / 25.4) * (297 / 25.4))));
  const sheetDpi = Math.max(72, Math.min(600, maxSafeA4Dpi, Math.round(dpi || 300)));
  const dpiScale = sheetDpi / Math.max(1, dpi || 300);

  const sheetW = Math.max(1, Math.round((210 / 25.4) * sheetDpi));
  const sheetH = Math.max(1, Math.round((297 / 25.4) * sheetDpi));
  const clampedMarginMm = Math.max(0, Math.min(40, Number.isFinite(marginMm) ? marginMm : 10));
  const clampedSpacingMm = Math.max(0, Math.min(30, Number.isFinite(spacingMm) ? spacingMm : 4));

  const marginPx = Math.max(0, Math.round((clampedMarginMm / 25.4) * sheetDpi));
  const gapPx = Math.max(0, Math.round((clampedSpacingMm / 25.4) * sheetDpi));

  const tileW = Math.max(1, Math.round(tileWidthPx * dpiScale));
  const tileH = Math.max(1, Math.round(tileHeightPx * dpiScale));

  const usableW = Math.max(1, sheetW - marginPx * 2);
  const usableH = Math.max(1, sheetH - marginPx * 2);

  if (tileW > usableW || tileH > usableH) {
    return {
      sheetW,
      sheetH,
      sheetDpi,
      tileW,
      tileH,
      marginPx,
      gapPx,
      maxCols: 0,
      maxRows: 0,
      maxFit: 0,
      cols: 0,
      rows: 0,
      placed: 0,
      tiles: [],
      hasOverlap: false,
      withinBounds: false,
    };
  }

  const maxCols = Math.floor((usableW + gapPx) / (tileW + gapPx));
  const maxRows = Math.floor((usableH + gapPx) / (tileH + gapPx));
  const maxFit = Math.max(0, maxCols * maxRows);

  const count = requestedCount <= 0 ? maxFit : Math.min(requestedCount, maxFit);
  const usedCols = count > 0 ? Math.min(maxCols, count) : 0;
  const usedRows = usedCols > 0 ? Math.ceil(count / usedCols) : 0;

  const totalGridW = usedCols * tileW + Math.max(0, usedCols - 1) * gapPx;
  const startX = Math.max(marginPx, Math.round((sheetW - totalGridW) / 2));
  const startY = marginPx;

  const tiles: A4TileRect[] = [];
  for (let r = 0; r < usedRows && tiles.length < count; r++) {
    for (let c = 0; c < usedCols && tiles.length < count; c++) {
      const x = startX + c * (tileW + gapPx);
      const y = startY + r * (tileH + gapPx);
      tiles.push({ x, y, width: tileW, height: tileH, row: r, col: c });
    }
  }

  // Validate no overlap and within bounds
  let hasOverlap = false;
  let withinBounds = tiles.length > 0;
  for (let i = 0; i < tiles.length; i++) {
    const a = tiles[i]!;
    if (a.x < marginPx || a.y < marginPx || a.x + a.width > sheetW - marginPx + 1 || a.y + a.height > sheetH - marginPx + 1) {
      withinBounds = false;
    }
    for (let j = i + 1; j < tiles.length; j++) {
      const b = tiles[j]!;
      const separated =
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y;
      if (!separated) {
        hasOverlap = true;
      }
    }
  }

  return {
    sheetW,
    sheetH,
    sheetDpi,
    tileW,
    tileH,
    marginPx,
    gapPx,
    maxCols,
    maxRows,
    maxFit,
    cols: usedCols,
    rows: usedRows,
    placed: tiles.length,
    tiles,
    hasOverlap,
    withinBounds,
  };
}
