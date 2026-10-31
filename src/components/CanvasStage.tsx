'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Sliders,
  ScanFace,
  Grid3X3,
  RefreshCw,
  Eraser,
  Paintbrush,
  Move,
  Crop,
} from 'lucide-react';
import {
  DEFAULT_TRANSFORM,
  MIN_STAGE_SCALE,
  MAX_STAGE_SCALE,
  clampTransform,
  drawTransformedImage,
  getTransformedCorners,
  getTargetCenter,
  nudgeTransform,
  normalizeAngle,
  zoomTransform,
  targetPointToSource,
  type BrushStroke,
  type CropBox,
  type FitMode,
  type Point,
  type StageSize,
  type StageTransform,
} from '@/lib/stage-math';

export interface CanvasStageProps {
  imageSource: HTMLImageElement | HTMLCanvasElement | ImageBitmap | null;
  sourceWidth: number;
  sourceHeight: number;
  aspectRatio?: number; // e.g. 35/45 or width/height
  targetWidth?: number;
  targetHeight?: number;
  fitMode?: FitMode;
  transform: StageTransform;
  onChange: (next: StageTransform) => void;
  showGuides?: boolean;
  onToggleGuides?: (show: boolean) => void;
  guideType?: 'face' | 'grid' | 'none';
  backgroundColor?: string;
  checkerboard?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  onReset?: () => void;
  // 8-handle interactive crop mode (for signature-upload-crop & crop)
  cropMode?: boolean;
  cropBox?: CropBox;
  onCropChange?: (box: CropBox) => void;
  lockCropAspect?: boolean;
  onAutoTrim?: () => void;
  // Eraser / Restore brush mode (for signature-background-remover & signature-to-png)
  brushEnabled?: boolean;
  brushStrokes?: BrushStroke[];
  onBrushStrokesChange?: (strokes: BrushStroke[]) => void;
}

type DragMode =
  | 'none'
  | 'pan'
  | 'rotate'
  | 'scale-tl'
  | 'scale-tr'
  | 'scale-br'
  | 'scale-bl'
  | 'pinch'
  | 'crop-move'
  | 'crop-nw'
  | 'crop-n'
  | 'crop-ne'
  | 'crop-e'
  | 'crop-se'
  | 'crop-s'
  | 'crop-sw'
  | 'crop-w'
  | 'brush';

function drawCheckerboard(ctx: CanvasRenderingContext2D, width: number, height: number, cellSize = 12) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#e2e8f0';
  for (let y = 0; y < height; y += cellSize) {
    const row = Math.floor(y / cellSize);
    for (let x = (row % 2) * cellSize; x < width; x += cellSize * 2) {
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
}

export function CanvasStage({
  imageSource,
  sourceWidth,
  sourceHeight,
  aspectRatio = 1,
  fitMode = 'cover',
  transform,
  onChange,
  showGuides = true,
  onToggleGuides,
  guideType = 'face',
  backgroundColor = '#ffffff',
  checkerboard = false,
  disabled = false,
  className = '',
  ariaLabel = 'Interactive image stage',
  onReset,
  cropMode = false,
  cropBox,
  onCropChange,
  lockCropAspect = false,
  onAutoTrim,
  brushEnabled = false,
  brushStrokes = [],
  onBrushStrokesChange,
}: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const proxyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activeGuide, setActiveGuide] = useState<'face' | 'grid' | 'none'>(
    !showGuides ? 'none' : guideType === 'face' ? 'face' : guideType === 'grid' ? 'grid' : 'none'
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [isInteracting, setIsInteracting] = useState(false);

  // Brush tool state when brushEnabled is true
  const [interactionTool, setInteractionTool] = useState<'transform' | 'erase' | 'restore'>('transform');
  const [brushSize, setBrushSize] = useState<number>(22);
  const [brushRedoStack, setBrushRedoStack] = useState<BrushStroke[]>([]);
  const activeBrushStrokeRef = useRef<BrushStroke | null>(null);
  const brushCursorRef = useRef<Point | null>(null);

  useEffect(() => {
    setActiveGuide(!showGuides ? 'none' : guideType === 'face' ? 'face' : guideType === 'grid' ? 'grid' : 'none');
  }, [showGuides, guideType]);

  // Undo/Redo stack (>= 20 steps, configured up to 50)
  const historyRef = useRef<StageTransform[]>([transform]);
  const historyIndexRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Pointer tracking
  const activePointers = useRef<Map<number, Point>>(new Map());
  const dragModeRef = useRef<DragMode>('none');
  const dragStartPointRef = useRef<Point>({ x: 0, y: 0 });
  const dragStartTransformRef = useRef<StageTransform>(transform);
  const dragStartCropRef = useRef<CropBox>({ x: 0, y: 0, width: 100, height: 100 });
  const pinchStartDistanceRef = useRef<number>(0);
  const pinchStartScaleRef = useRef<number>(1);
  const rafId = useRef<number | null>(null);

  const updateHistoryState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const pushHistory = useCallback(
    (newTransform: StageTransform) => {
      const current = historyRef.current[historyIndexRef.current];
      if (
        current &&
        current.x === newTransform.x &&
        current.y === newTransform.y &&
        current.scale === newTransform.scale &&
        current.rotation === newTransform.rotation &&
        current.flipX === newTransform.flipX
      ) {
        return;
      }
      const updated = historyRef.current.slice(0, historyIndexRef.current + 1);
      updated.push({ ...newTransform });
      if (updated.length > 50) updated.shift();
      historyRef.current = updated;
      historyIndexRef.current = updated.length - 1;
      updateHistoryState();
    },
    [updateHistoryState]
  );

  const handleUndo = useCallback(() => {
    if (brushEnabled && interactionTool !== 'transform' && brushStrokes.length > 0 && onBrushStrokesChange) {
      const last = brushStrokes[brushStrokes.length - 1]!;
      setBrushRedoStack(prev => [...prev, last]);
      onBrushStrokesChange(brushStrokes.slice(0, -1));
      setAnnouncement('Undid brush stroke');
      return;
    }
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prev = historyRef.current[historyIndexRef.current]!;
      onChange({ ...prev });
      updateHistoryState();
      setAnnouncement(`Undo: Zoom ${Math.round(prev.scale * 100)}%, rotation ${prev.rotation}°`);
    }
  }, [brushEnabled, interactionTool, brushStrokes, onBrushStrokesChange, onChange, updateHistoryState]);

  const handleRedo = useCallback(() => {
    if (brushEnabled && interactionTool !== 'transform' && brushRedoStack.length > 0 && onBrushStrokesChange) {
      const nextStroke = brushRedoStack[brushRedoStack.length - 1]!;
      setBrushRedoStack(prev => prev.slice(0, -1));
      onBrushStrokesChange([...brushStrokes, nextStroke]);
      setAnnouncement('Redid brush stroke');
      return;
    }
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const next = historyRef.current[historyIndexRef.current]!;
      onChange({ ...next });
      updateHistoryState();
      setAnnouncement(`Redo: Zoom ${Math.round(next.scale * 100)}%, rotation ${next.rotation}°`);
    }
  }, [brushEnabled, interactionTool, brushRedoStack, brushStrokes, onBrushStrokesChange, onChange, updateHistoryState]);

  const getStageSize = useCallback((): StageSize => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
      }
    }
    const defaultW = 500;
    const defaultH = Math.round(defaultW / (aspectRatio || 1));
    return { width: defaultW, height: defaultH };
  }, [aspectRatio]);

  // Helper to compute image rect inside stage when in cropMode
  const getCropModeLayout = useCallback(
    (stageW: number, stageH: number) => {
      const pad = 20;
      const availW = Math.max(40, stageW - pad * 2);
      const availH = Math.max(40, stageH - pad * 2);
      const scale = Math.min(availW / Math.max(1, sourceWidth), availH / Math.max(1, sourceHeight));
      const drawW = sourceWidth * scale;
      const drawH = sourceHeight * scale;
      const offsetX = (stageW - drawW) / 2;
      const offsetY = (stageH - drawH) / 2;
      return { scale, drawW, drawH, offsetX, offsetY };
    },
    [sourceWidth, sourceHeight]
  );

  // Render on canvas
  const renderCanvas = useCallback(
    (highQuality = true) => {
      const canvas = canvasRef.current;
      if (
        !canvas ||
        !imageSource ||
        sourceWidth <= 0 ||
        sourceHeight <= 0 ||
        (imageSource instanceof HTMLCanvasElement && (imageSource.width === 0 || imageSource.height === 0))
      ) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const cssWidth = Math.max(1, Math.round(rect.width));
      const cssHeight = Math.max(1, Math.round(rect.height || cssWidth / (aspectRatio || 1)));

      const dpr = highQuality ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      const pixelWidth = Math.round(cssWidth * dpr);
      const pixelHeight = Math.round(cssHeight * dpr);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background: checkerboard or solid
      if (checkerboard) {
        drawCheckerboard(ctx, cssWidth, cssHeight, 12);
      } else {
        ctx.fillStyle = backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, cssWidth, cssHeight);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = highQuality ? 'high' : 'low';

      const sourceSize: StageSize = { width: sourceWidth, height: sourceHeight };
      const targetSize: StageSize = { width: cssWidth, height: cssHeight };

      if (cropMode && cropBox) {
        // 8-handle interactive crop box mode
        const { scale, drawW, drawH, offsetX, offsetY } = getCropModeLayout(cssWidth, cssHeight);
        ctx.drawImage(imageSource, offsetX, offsetY, drawW, drawH);

        const cx = offsetX + cropBox.x * scale;
        const cy = offsetY + cropBox.y * scale;
        const cw = Math.max(4, cropBox.width * scale);
        const ch = Math.max(4, cropBox.height * scale);

        // Dim outside crop box
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        ctx.fillRect(offsetX, offsetY, drawW, Math.max(0, cy - offsetY));
        ctx.fillRect(offsetX, cy + ch, drawW, Math.max(0, offsetY + drawH - (cy + ch)));
        ctx.fillRect(offsetX, cy, Math.max(0, cx - offsetX), ch);
        ctx.fillRect(cx + cw, cy, Math.max(0, offsetX + drawW - (cx + cw)), ch);

        // Rule of thirds inside crop box
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + cw / 3, cy);
        ctx.lineTo(cx + cw / 3, cy + ch);
        ctx.moveTo(cx + (cw * 2) / 3, cy);
        ctx.lineTo(cx + (cw * 2) / 3, cy + ch);
        ctx.moveTo(cx, cy + ch / 3);
        ctx.lineTo(cx + cw, cy + ch / 3);
        ctx.moveTo(cx, cy + (ch * 2) / 3);
        ctx.lineTo(cx + cw, cy + (ch * 2) / 3);
        ctx.stroke();

        // Crop box border
        ctx.strokeStyle = '#1769e8';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cw, ch);

        // 8 handles: NW, N, NE, E, SE, S, SW, W
        const handles: Point[] = [
          { x: cx, y: cy },
          { x: cx + cw / 2, y: cy },
          { x: cx + cw, y: cy },
          { x: cx + cw, y: cy + ch / 2 },
          { x: cx + cw, y: cy + ch },
          { x: cx + cw / 2, y: cy + ch },
          { x: cx, y: cy + ch },
          { x: cx, y: cy + ch / 2 },
        ];
        const hs = 9;
        for (const h of handles) {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#1769e8';
          ctx.lineWidth = 2;
          ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
          ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
        }

        // Crop dimensions readout pill
        const label = `${Math.round(cropBox.width)} × ${Math.round(cropBox.height)} px`;
        ctx.font = '700 11px Inter, system-ui, sans-serif';
        const textW = ctx.measureText(label).width + 14;
        const badgeY = cy > 28 ? cy - 24 : cy + 6;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
        ctx.beginPath();
        ctx.roundRect(cx, badgeY, textW, 20, 6);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, cx + 7, badgeY + 14);

        ctx.restore();
        return;
      }

      // Standard transform draw (proxy during fast drag, full source on settle)
      if (
        !highQuality &&
        proxyCanvasRef.current &&
        proxyCanvasRef.current.width > 0 &&
        proxyCanvasRef.current.height > 0
      ) {
        drawTransformedImage(ctx, proxyCanvasRef.current, sourceSize, targetSize, transform, fitMode);
      } else {
        drawTransformedImage(ctx, imageSource, sourceSize, targetSize, transform, fitMode);
      }

      // Draw active brush stroke preview & cursor when in brush mode
      if (brushEnabled && interactionTool !== 'transform' && brushCursorRef.current) {
        ctx.save();
        ctx.strokeStyle = interactionTool === 'erase' ? '#ef4444' : '#10b981';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(brushCursorRef.current.x, brushCursorRef.current.y, Math.max(4, brushSize / 2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw guide overlays ON THE FRAME (never baked into exported file)
      if (activeGuide !== 'none') {
        ctx.save();
        if (activeGuide === 'grid') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.lineWidth = 1;
          const thirdW = cssWidth / 3;
          const thirdH = cssHeight / 3;
          ctx.beginPath();
          ctx.moveTo(thirdW, 0);
          ctx.lineTo(thirdW, cssHeight);
          ctx.moveTo(thirdW * 2, 0);
          ctx.lineTo(thirdW * 2, cssHeight);
          ctx.moveTo(0, thirdH);
          ctx.lineTo(cssWidth, thirdH);
          ctx.moveTo(0, thirdH * 2);
          ctx.lineTo(cssWidth, thirdH * 2);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(18, 84, 199, 0.65)';
          ctx.setLineDash([4, 4]);
          ctx.stroke();
        } else if (activeGuide === 'face') {
          // Proportioned so a standard framed portrait head (62%–68% of frame height) fits naturally inside the oval
          const cx = cssWidth / 2;
          const crownY = cssHeight * 0.12;
          const chinY = cssHeight * 0.76;
          const headH = chinY - crownY; // 64% of frame height
          const headCenterY = (crownY + chinY) / 2; // 44% from top
          const headW = Math.min(cssWidth * 0.54, headH * 0.74);
          const eyeY = cssHeight * 0.43;

          // Vertical centre line
          ctx.strokeStyle = 'rgba(18, 84, 199, 0.55)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(cx, 0);
          ctx.lineTo(cx, cssHeight);
          ctx.stroke();

          // Head oval
          ctx.strokeStyle = 'rgba(18, 84, 199, 0.9)';
          ctx.lineWidth = 1.75;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.ellipse(cx, headCenterY, headW / 2, headH / 2, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Crown line
          ctx.lineWidth = 1.25;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(cx - headW * 0.65, crownY);
          ctx.lineTo(cx + headW * 0.65, crownY);
          ctx.stroke();

          // Chin line
          ctx.beginPath();
          ctx.moveTo(cx - headW * 0.65, chinY);
          ctx.lineTo(cx + headW * 0.65, chinY);
          ctx.stroke();

          // Eye line
          ctx.strokeStyle = 'rgba(8, 116, 81, 0.9)';
          ctx.beginPath();
          ctx.moveTo(cx - headW * 0.58, eyeY);
          ctx.lineTo(cx + headW * 0.58, eyeY);
          ctx.stroke();

          // Shoulders guide curve
          ctx.strokeStyle = 'rgba(18, 84, 199, 0.6)';
          ctx.beginPath();
          ctx.moveTo(cssWidth * 0.08, cssHeight * 0.96);
          ctx.quadraticCurveTo(cx, chinY + cssHeight * 0.05, cssWidth * 0.92, cssHeight * 0.96);
          ctx.stroke();

          // Labels for Crown, Eyes, Chin + "Visual aid only" badge
          ctx.setLineDash([]);
          ctx.font = '700 10px Inter, system-ui, sans-serif';
          const drawTag = (text: string, x: number, y: number, color: string) => {
            const tw = ctx.measureText(text).width + 8;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
            ctx.fillRect(x, y - 10, tw, 14);
            ctx.fillStyle = color;
            ctx.fillText(text, x + 4, y);
          };
          drawTag('Crown', cx + headW * 0.52, crownY + 3, '#1254c7');
          drawTag('Eyes', cx + headW * 0.48, eyeY + 3, '#087451');
          drawTag('Chin', cx + headW * 0.52, chinY + 3, '#1254c7');

          // "Visual aid only" badge at top-left of frame
          const badgeText = 'Visual aid only';
          const bw = ctx.measureText(badgeText).width + 12;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
          ctx.beginPath();
          ctx.roundRect(8, 8, bw, 18, 5);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillText(badgeText, 14, 20);
        }
        ctx.restore();
      }

      // Draw transform bounding box & interactive handles (when in transform mode)
      if (!disabled && interactionTool === 'transform') {
        ctx.save();
        const corners = getTransformedCorners(sourceSize, targetSize, transform, fitMode);

        ctx.strokeStyle = 'rgba(18, 84, 199, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);

        ctx.beginPath();
        ctx.moveTo(corners.topLeft.x, corners.topLeft.y);
        ctx.lineTo(corners.topRight.x, corners.topRight.y);
        ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
        ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
        ctx.closePath();
        ctx.stroke();

        ctx.setLineDash([]);

        // Rotation line and knob
        const topMidX = (corners.topLeft.x + corners.topRight.x) / 2;
        const topMidY = (corners.topLeft.y + corners.topRight.y) / 2;
        ctx.beginPath();
        ctx.moveTo(topMidX, topMidY);
        ctx.lineTo(corners.rotateHandle.x, corners.rotateHandle.y);
        ctx.strokeStyle = '#1254c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Rotate handle circle
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#1254c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(corners.rotateHandle.x, corners.rotateHandle.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Corner scale handles
        const handleSize = 9;
        const drawHandle = (p: Point) => {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#1254c7';
          ctx.lineWidth = 2;
          ctx.fillRect(p.x - handleSize / 2, p.y - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(p.x - handleSize / 2, p.y - handleSize / 2, handleSize, handleSize);
        };

        drawHandle(corners.topLeft);
        drawHandle(corners.topRight);
        drawHandle(corners.bottomRight);
        drawHandle(corners.bottomLeft);

        ctx.restore();
      }

      ctx.restore();
    },
    [
      imageSource,
      sourceWidth,
      sourceHeight,
      aspectRatio,
      backgroundColor,
      checkerboard,
      transform,
      fitMode,
      activeGuide,
      disabled,
      cropMode,
      cropBox,
      getCropModeLayout,
      brushEnabled,
      interactionTool,
      brushSize,
    ]
  );

  // Create reduced-resolution proxy bitmap when imageSource changes for fast dragging
  useEffect(() => {
    if (!imageSource || sourceWidth <= 0 || sourceHeight <= 0) return;
    try {
      const maxProxyEdge = 480;
      const scale = Math.min(1, maxProxyEdge / Math.max(sourceWidth, sourceHeight));
      const proxyW = Math.max(1, Math.round(sourceWidth * scale));
      const proxyH = Math.max(1, Math.round(sourceHeight * scale));

      const proxy = document.createElement('canvas');
      proxy.width = proxyW;
      proxy.height = proxyH;
      const ctx = proxy.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(imageSource, 0, 0, proxyW, proxyH);
        proxyCanvasRef.current = proxy;
      }
    } catch {}

    return () => {
      if (proxyCanvasRef.current) {
        proxyCanvasRef.current.width = 0;
        proxyCanvasRef.current.height = 0;
        proxyCanvasRef.current = null;
      }
    };
  }, [imageSource, sourceWidth, sourceHeight]);

  // Request Animation Frame loop when transform or crop changes
  useEffect(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      renderCanvas(!isInteracting);
    });
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [renderCanvas, isInteracting]);

  // Also re-render on viewport resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(() => {
      renderCanvas(true);
    });
    obs.observe(canvas);
    return () => obs.disconnect();
  }, [renderCanvas]);

  const getHitTarget = (pt: Point): DragMode => {
    const canvas = canvasRef.current;
    if (!canvas) return 'pan';
    const targetSize = getStageSize();

    if (cropMode && cropBox) {
      const { scale, offsetX, offsetY } = getCropModeLayout(targetSize.width, targetSize.height);
      const cx = offsetX + cropBox.x * scale;
      const cy = offsetY + cropBox.y * scale;
      const cw = cropBox.width * scale;
      const ch = cropBox.height * scale;
      const hitDist = 16;
      const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x1 - x2, y1 - y2);

      if (dist(pt.x, pt.y, cx, cy) <= hitDist) return 'crop-nw';
      if (dist(pt.x, pt.y, cx + cw / 2, cy) <= hitDist) return 'crop-n';
      if (dist(pt.x, pt.y, cx + cw, cy) <= hitDist) return 'crop-ne';
      if (dist(pt.x, pt.y, cx + cw, cy + ch / 2) <= hitDist) return 'crop-e';
      if (dist(pt.x, pt.y, cx + cw, cy + ch) <= hitDist) return 'crop-se';
      if (dist(pt.x, pt.y, cx + cw / 2, cy + ch) <= hitDist) return 'crop-s';
      if (dist(pt.x, pt.y, cx, cy + ch) <= hitDist) return 'crop-sw';
      if (dist(pt.x, pt.y, cx, cy + ch / 2) <= hitDist) return 'crop-w';
      return 'crop-move';
    }

    if (brushEnabled && interactionTool !== 'transform') {
      return 'brush';
    }

    const sourceSize = { width: sourceWidth, height: sourceHeight };
    const corners = getTransformedCorners(sourceSize, targetSize, transform, fitMode);

    const hitDist = 18;
    const dist = (p1: Point, p2: Point) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    if (dist(pt, corners.rotateHandle) <= hitDist) return 'rotate';
    if (dist(pt, corners.topLeft) <= hitDist) return 'scale-tl';
    if (dist(pt, corners.topRight) <= hitDist) return 'scale-tr';
    if (dist(pt, corners.bottomRight) <= hitDist) return 'scale-br';
    if (dist(pt, corners.bottomLeft) <= hitDist) return 'scale-bl';

    return 'pan';
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || !imageSource) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const rect = canvas.getBoundingClientRect();
    const pt: Point = { x: e.clientX - rect.x, y: e.clientY - rect.y };

    activePointers.current.set(e.pointerId, pt);

    if (activePointers.current.size === 2 && !cropMode && interactionTool === 'transform') {
      dragModeRef.current = 'pinch';
      const pts = Array.from(activePointers.current.values());
      pinchStartDistanceRef.current = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      pinchStartScaleRef.current = transform.scale;
    } else if (activePointers.current.size === 1) {
      const mode = getHitTarget(pt);
      dragModeRef.current = mode;
      dragStartPointRef.current = pt;
      dragStartTransformRef.current = { ...transform };
      if (cropBox) {
        dragStartCropRef.current = { ...cropBox };
      }
      if (mode === 'brush' && onBrushStrokesChange) {
        const stageSize = getStageSize();
        const srcPt = targetPointToSource(pt, { width: sourceWidth, height: sourceHeight }, stageSize, transform, fitMode);
        const newStroke: BrushStroke = {
          mode: interactionTool === 'erase' ? 'erase' : 'restore',
          points: [srcPt],
          size: brushSize,
        };
        activeBrushStrokeRef.current = newStroke;
        setBrushRedoStack([]);
        onBrushStrokesChange([...brushStrokes, newStroke]);
      }
    }

    setIsInteracting(true);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || !imageSource) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentPt: Point = { x: e.clientX - rect.x, y: e.clientY - rect.y };

    if (brushEnabled && interactionTool !== 'transform') {
      brushCursorRef.current = currentPt;
    }

    if (!activePointers.current.has(e.pointerId)) {
      if (brushEnabled && interactionTool !== 'transform') renderCanvas(false);
      return;
    }
    activePointers.current.set(e.pointerId, currentPt);

    const stageSize = getStageSize();

    if (dragModeRef.current === 'brush' && activeBrushStrokeRef.current && onBrushStrokesChange) {
      const srcPt = targetPointToSource(
        currentPt,
        { width: sourceWidth, height: sourceHeight },
        stageSize,
        transform,
        fitMode
      );
      activeBrushStrokeRef.current.points.push(srcPt);
      const updated = [...brushStrokes.slice(0, -1), { ...activeBrushStrokeRef.current }];
      onBrushStrokesChange(updated);
      return;
    }

    if (cropMode && cropBox && onCropChange && dragModeRef.current.startsWith('crop-')) {
      const { scale } = getCropModeLayout(stageSize.width, stageSize.height);
      const dxSrc = (currentPt.x - dragStartPointRef.current.x) / Math.max(0.01, scale);
      const dySrc = (currentPt.y - dragStartPointRef.current.y) / Math.max(0.01, scale);
      const start = dragStartCropRef.current;
      const minEdge = 16;
      const aspect = start.width / Math.max(1, start.height);

      let nx = start.x;
      let ny = start.y;
      let nw = start.width;
      let nh = start.height;

      const mode = dragModeRef.current;
      if (mode === 'crop-move') {
        nx = Math.max(0, Math.min(sourceWidth - nw, Math.round(start.x + dxSrc)));
        ny = Math.max(0, Math.min(sourceHeight - nh, Math.round(start.y + dySrc)));
      } else {
        if (mode.includes('e')) {
          nw = Math.max(minEdge, Math.min(sourceWidth - start.x, Math.round(start.width + dxSrc)));
        }
        if (mode.includes('s')) {
          nh = Math.max(minEdge, Math.min(sourceHeight - start.y, Math.round(start.height + dySrc)));
        }
        if (mode.includes('w')) {
          const maxDeltaX = start.width - minEdge;
          const clampedDx = Math.max(-start.x, Math.min(maxDeltaX, Math.round(dxSrc)));
          nx = start.x + clampedDx;
          nw = start.width - clampedDx;
        }
        if (mode.includes('n')) {
          const maxDeltaY = start.height - minEdge;
          const clampedDy = Math.max(-start.y, Math.min(maxDeltaY, Math.round(dySrc)));
          ny = start.y + clampedDy;
          nh = start.height - clampedDy;
        }
        if (lockCropAspect && aspect > 0) {
          if (mode === 'crop-n' || mode === 'crop-s') {
            nw = Math.min(sourceWidth - nx, Math.max(minEdge, Math.round(nh * aspect)));
          } else {
            nh = Math.min(sourceHeight - ny, Math.max(minEdge, Math.round(nw / aspect)));
          }
        }
      }
      onCropChange({ x: nx, y: ny, width: nw, height: nh });
      return;
    }

    if (dragModeRef.current === 'pinch' && activePointers.current.size >= 2) {
      const pts = Array.from(activePointers.current.values());
      const currentDist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      if (pinchStartDistanceRef.current > 5) {
        const factor = currentDist / pinchStartDistanceRef.current;
        const newScale = Math.max(MIN_STAGE_SCALE, Math.min(MAX_STAGE_SCALE, pinchStartScaleRef.current * factor));
        onChange({ ...transform, scale: Math.round(newScale * 100) / 100 });
      }
    } else if (dragModeRef.current === 'pan') {
      const dx = (currentPt.x - dragStartPointRef.current.x) / stageSize.width;
      const dy = (currentPt.y - dragStartPointRef.current.y) / stageSize.height;
      const nextT = clampTransform({
        ...dragStartTransformRef.current,
        x: dragStartTransformRef.current.x + dx,
        y: dragStartTransformRef.current.y + dy,
      });
      onChange(nextT);
    } else if (dragModeRef.current === 'rotate') {
      const center = getTargetCenter(stageSize, transform);
      const angleRad = Math.atan2(currentPt.y - center.y, currentPt.x - center.x);
      let deg = (angleRad * 180) / Math.PI + 90;
      deg = normalizeAngle(deg);
      onChange({ ...transform, rotation: deg });
    } else if (dragModeRef.current.startsWith('scale')) {
      const center = getTargetCenter(stageSize, transform);
      const initDist = Math.hypot(dragStartPointRef.current.x - center.x, dragStartPointRef.current.y - center.y);
      const currDist = Math.hypot(currentPt.x - center.x, currentPt.y - center.y);
      if (initDist > 10) {
        const scaleFactor = currDist / initDist;
        const nextScale = Math.max(
          MIN_STAGE_SCALE,
          Math.min(MAX_STAGE_SCALE, dragStartTransformRef.current.scale * scaleFactor)
        );
        onChange({ ...transform, scale: Math.round(nextScale * 100) / 100 });
      }
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    activePointers.current.delete(e.pointerId);
    activeBrushStrokeRef.current = null;

    if (activePointers.current.size === 0) {
      dragModeRef.current = 'none';
      setIsInteracting(false);
      if (!cropMode && interactionTool === 'transform') {
        pushHistory(transform);
        setAnnouncement(
          `Zoom ${Math.round(transform.scale * 100)}%, rotation ${transform.rotation}°, position (${Math.round(
            transform.x * 100
          )}%, ${Math.round(transform.y * 100)}%)`
        );
      }
    }
  };

  const handleWheel = (e: ReactWheelEvent<HTMLCanvasElement>) => {
    if (disabled || !imageSource || cropMode) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pivot: Point = { x: e.clientX - rect.x, y: e.clientY - rect.y };
    const stageSize = getStageSize();
    const sourceSize = { width: sourceWidth, height: sourceHeight };

    const zoomStep = e.deltaY < 0 ? 1.08 : 0.92;
    const nextTransform = zoomTransform(transform, zoomStep, pivot, stageSize, sourceSize, fitMode);

    onChange(nextTransform);
    pushHistory(nextTransform);
    setAnnouncement(`Zoom ${Math.round(nextTransform.scale * 100)}%`);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
      return;
    }

    if (cropMode) return;

    // Arrow keys nudge (Shift = 10x)
    const baseStep = 0.01;
    const step = e.shiftKey ? baseStep * 10 : baseStep;

    switch (e.key) {
      case 'ArrowLeft': {
        e.preventDefault();
        const next = nudgeTransform(transform, -step, 0);
        onChange(next);
        pushHistory(next);
        setAnnouncement(`Moved left ${Math.round(step * 100)}%`);
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        const next = nudgeTransform(transform, step, 0);
        onChange(next);
        pushHistory(next);
        setAnnouncement(`Moved right ${Math.round(step * 100)}%`);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const next = nudgeTransform(transform, 0, -step);
        onChange(next);
        pushHistory(next);
        setAnnouncement(`Moved up ${Math.round(step * 100)}%`);
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        const next = nudgeTransform(transform, 0, step);
        onChange(next);
        pushHistory(next);
        setAnnouncement(`Moved down ${Math.round(step * 100)}%`);
        break;
      }
      case '+':
      case '=': {
        e.preventDefault();
        const factor = e.shiftKey ? 1.2 : 1.05;
        const next = clampTransform({ ...transform, scale: transform.scale * factor });
        onChange(next);
        pushHistory(next);
        setAnnouncement(`Zoom in: ${Math.round(next.scale * 100)}%`);
        break;
      }
      case '-':
      case '_': {
        e.preventDefault();
        const factor = e.shiftKey ? 0.8 : 0.95;
        const next = clampTransform({ ...transform, scale: transform.scale * factor });
        onChange(next);
        pushHistory(next);
        setAnnouncement(`Zoom out: ${Math.round(next.scale * 100)}%`);
        break;
      }
      case '[': {
        e.preventDefault();
        const next = clampTransform({ ...transform, rotation: transform.rotation - 5 });
        onChange(next);
        pushHistory(next);
        setAnnouncement(`Rotated left: ${next.rotation}°`);
        break;
      }
      case ']': {
        e.preventDefault();
        const next = clampTransform({ ...transform, rotation: transform.rotation + 5 });
        onChange(next);
        pushHistory(next);
        setAnnouncement(`Rotated right: ${next.rotation}°`);
        break;
      }
      case 'f':
      case 'F': {
        e.preventDefault();
        const next = { ...transform, flipX: !transform.flipX };
        onChange(next);
        pushHistory(next);
        setAnnouncement(next.flipX ? 'Flipped horizontally' : 'Normal orientation');
        break;
      }
      case '0':
      case 'Escape': {
        e.preventDefault();
        handleReset();
        break;
      }
    }
  };

  const handleReset = () => {
    const next = { ...DEFAULT_TRANSFORM };
    onChange(next);
    pushHistory(next);
    if (onBrushStrokesChange && brushStrokes.length > 0) {
      onBrushStrokesChange([]);
      setBrushRedoStack([]);
    }
    if (onReset) onReset();
    setAnnouncement('Transform reset to default center');
  };

  const handleQuickRotate = (degrees: number) => {
    const next = clampTransform({
      ...transform,
      rotation: normalizeAngle(transform.rotation + degrees),
    });
    onChange(next);
    pushHistory(next);
    setAnnouncement(`Rotated to ${next.rotation}°`);
  };

  const handleFlip = () => {
    const next = { ...transform, flipX: !transform.flipX };
    onChange(next);
    pushHistory(next);
    setAnnouncement(next.flipX ? 'Flipped horizontally' : 'Unflipped');
  };

  return (
    <div
      ref={containerRef}
      className={`canvas-stage-wrapper ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Screen reader live announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {/* Optional Brush Mode Bar for Signature Background Remover / Signature to PNG */}
      {brushEnabled ? (
        <div
          className="stage-brush-bar"
          role="toolbar"
          aria-label="Eraser and restore brush controls"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '8px',
            padding: '6px 8px',
            borderRadius: '12px',
            background: '#ffffff',
            border: '1px solid #d9e4ef',
          }}
        >
          <button
            type="button"
            className={`btn compact ${interactionTool === 'transform' ? 'primary' : ''}`}
            onClick={() => setInteractionTool('transform')}
          >
            <Move size={14} /> Move / Scale
          </button>
          <button
            type="button"
            className={`btn compact ${interactionTool === 'erase' ? 'primary' : ''}`}
            onClick={() => setInteractionTool('erase')}
          >
            <Eraser size={14} /> Eraser Brush
          </button>
          <button
            type="button"
            className={`btn compact ${interactionTool === 'restore' ? 'primary' : ''}`}
            onClick={() => setInteractionTool('restore')}
          >
            <Paintbrush size={14} /> Restore Ink
          </button>

          {interactionTool !== 'transform' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
              <label htmlFor="stage-brush-size" style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                Size: {brushSize}px
              </label>
              <input
                id="stage-brush-size"
                aria-label="Brush size"
                type="range"
                min={4}
                max={80}
                value={brushSize}
                onChange={e => setBrushSize(Number(e.target.value))}
                style={{ width: '80px', accentColor: '#1769e8' }}
              />
            </div>
          ) : null}

          {brushStrokes.length > 0 || brushRedoStack.length > 0 ? (
            <div style={{ display: 'flex', gap: '4px', marginLeft: interactionTool === 'transform' ? 'auto' : '0' }}>
              <button
                type="button"
                className="btn compact"
                disabled={brushStrokes.length === 0}
                onClick={() => {
                  if (!onBrushStrokesChange || brushStrokes.length === 0) return;
                  const last = brushStrokes[brushStrokes.length - 1]!;
                  setBrushRedoStack(prev => [...prev, last]);
                  onBrushStrokesChange(brushStrokes.slice(0, -1));
                }}
                title="Undo brush stroke"
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                className="btn compact"
                disabled={brushRedoStack.length === 0}
                onClick={() => {
                  if (!onBrushStrokesChange || brushRedoStack.length === 0) return;
                  const restored = brushRedoStack[brushRedoStack.length - 1]!;
                  setBrushRedoStack(prev => prev.slice(0, -1));
                  onBrushStrokesChange([...brushStrokes, restored]);
                }}
                title="Redo brush stroke"
              >
                <Redo2 size={14} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Main Interactive Canvas */}
      <div
        className="canvas-stage-viewport"
        style={{
          aspectRatio: `${aspectRatio || 1}`,
          touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          className="canvas-stage-canvas"
          aria-label={ariaLabel}
          style={{
            touchAction: 'none',
            cursor:
              cropMode || interactionTool !== 'transform'
                ? 'crosshair'
                : undefined,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        />
      </div>

      {/* Stage Positioning Toolbar (docked cleanly below the canvas so it never obscures strokes or handles) */}
      <div className="canvas-stage-toolbar" role="toolbar" aria-label="Canvas positioning controls">
        {cropMode ? (
          <>
            {onAutoTrim ? (
              <button
                type="button"
                className="btn compact primary"
                onClick={onAutoTrim}
                title="Automatically trim blank whitespace around signature ink"
                style={{ minHeight: '32px', padding: '0 10px', fontSize: '11px', borderRadius: '999px' }}
              >
                <Crop size={14} /> Auto-Trim Ink
              </button>
            ) : null}
            <button
              type="button"
              className="stage-tool-btn"
              title="Reset crop box to full image"
              aria-label="Reset crop box"
              onClick={handleReset}
            >
              <RefreshCw size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="stage-tool-btn"
              title="Zoom out (-)"
              aria-label="Zoom out"
              onClick={() => {
                const next = clampTransform({ ...transform, scale: transform.scale * 0.9 });
                onChange(next);
                pushHistory(next);
              }}
            >
              <ZoomOut size={16} />
            </button>
            <span className="stage-zoom-badge" title="Current zoom scale">
              {Math.round(transform.scale * 100)}%
            </span>
            <button
              type="button"
              className="stage-tool-btn"
              title="Zoom in (+)"
              aria-label="Zoom in"
              onClick={() => {
                const next = clampTransform({ ...transform, scale: transform.scale * 1.1 });
                onChange(next);
                pushHistory(next);
              }}
            >
              <ZoomIn size={16} />
            </button>

            <span className="stage-toolbar-divider" />

            <button
              type="button"
              className="stage-tool-btn"
              title="Rotate 90° Counter-Clockwise"
              aria-label="Rotate 90 degrees counter-clockwise"
              onClick={() => handleQuickRotate(-90)}
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              className="stage-tool-btn"
              title="Rotate 90° Clockwise"
              aria-label="Rotate 90 degrees clockwise"
              onClick={() => handleQuickRotate(90)}
            >
              <RotateCw size={16} />
            </button>
            <button
              type="button"
              className={`stage-tool-btn ${transform.flipX ? 'active' : ''}`}
              title="Flip Horizontal (F)"
              aria-label="Flip horizontal"
              onClick={handleFlip}
            >
              <FlipHorizontal size={16} />
            </button>

            <span className="stage-toolbar-divider" />

            {/* Guide Selector */}
            <button
              type="button"
              className={`stage-tool-btn ${activeGuide === 'face' ? 'active' : ''}`}
              title="Head, eyes & shoulders alignment guide (visual aid only)"
              aria-label="Toggle head and shoulders alignment guide"
              onClick={() => {
                const next = activeGuide === 'face' ? 'none' : 'face';
                setActiveGuide(next);
                onToggleGuides?.(next !== 'none');
              }}
            >
              <ScanFace size={16} />
            </button>
            <button
              type="button"
              className={`stage-tool-btn ${activeGuide === 'grid' ? 'active' : ''}`}
              title="Rule-of-thirds grid"
              aria-label="Toggle rule of thirds grid guide"
              onClick={() => {
                const next = activeGuide === 'grid' ? 'none' : 'grid';
                setActiveGuide(next);
                onToggleGuides?.(next !== 'none');
              }}
            >
              <Grid3X3 size={16} />
            </button>

            <span className="stage-toolbar-divider" />

            {/* Undo / Redo */}
            <button
              type="button"
              className="stage-tool-btn"
              disabled={!canUndo && brushStrokes.length === 0}
              title="Undo (Ctrl+Z)"
              aria-label="Undo canvas change"
              onClick={handleUndo}
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              className="stage-tool-btn"
              disabled={!canRedo && brushRedoStack.length === 0}
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo canvas change"
              onClick={handleRedo}
            >
              <Redo2 size={16} />
            </button>
            <button
              type="button"
              className="stage-tool-btn"
              title="Reset position and zoom (0)"
              aria-label="Reset transform"
              onClick={handleReset}
            >
              <RefreshCw size={16} />
            </button>
          </>
        )}
      </div>

      {/* Fine Rotation Slider (-180..180) + Stage Helper Footer */}
      {!cropMode ? (
        <div
          className="stage-fine-rotate-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '8px',
            padding: '6px 10px',
            borderRadius: '10px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <label
            htmlFor="stage-fine-rotation"
            style={{ fontSize: '11px', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}
          >
            Fine Rotate: {Math.round(transform.rotation)}°
          </label>
          <input
            id="stage-fine-rotation"
            aria-label="Fine rotation angle"
            type="range"
            min={-180}
            max={180}
            step={1}
            value={Math.round(transform.rotation)}
            onChange={e => {
              const deg = Number(e.target.value);
              const next = clampTransform({ ...transform, rotation: deg });
              onChange(next);
            }}
            onPointerUp={() => pushHistory(transform)}
            style={{ flex: 1, accentColor: '#1769e8' }}
          />
          {transform.rotation !== 0 ? (
            <button
              type="button"
              className="btn compact"
              style={{ minHeight: '26px', padding: '0 8px', fontSize: '10px' }}
              onClick={() => {
                const next = clampTransform({ ...transform, rotation: 0 });
                onChange(next);
                pushHistory(next);
              }}
            >
              0°
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="canvas-stage-footer">
        <small className="muted">
          {cropMode
            ? 'Drag inside box to move crop · Drag any of the 8 handles to resize · Click Auto-Trim Ink for tight bounds'
            : 'Drag to move · Pinch or scroll to zoom (0.25×–5×) · Corner handles scale · Top knob rotates · Arrows nudge (Shift = 10×)'}
        </small>
        {!cropMode ? (
          <button
            type="button"
            className="stage-advanced-toggle"
            onClick={() => setShowAdvanced(s => !s)}
            aria-expanded={showAdvanced}
          >
            <Sliders size={14} />
            <span>{showAdvanced ? 'Hide manual inputs' : 'Advanced numeric controls'}</span>
          </button>
        ) : null}
      </div>

      {/* Advanced Two-Way Synced Numeric Inputs */}
      {!cropMode && showAdvanced ? (
        <div className="canvas-stage-advanced" role="group" aria-label="Precise transform inputs">
          <div className="advanced-field">
            <label htmlFor="stage-input-zoom">Zoom (%)</label>
            <input
              id="stage-input-zoom"
              type="number"
              min="25"
              max="500"
              step="5"
              value={Math.round(transform.scale * 100)}
              onChange={e => {
                const val = Number(e.target.value) / 100;
                if (Number.isFinite(val)) {
                  const next = clampTransform({ ...transform, scale: val });
                  onChange(next);
                  pushHistory(next);
                }
              }}
            />
          </div>

          <div className="advanced-field">
            <label htmlFor="stage-input-rot">Rotation (°)</label>
            <input
              id="stage-input-rot"
              type="number"
              min="-180"
              max="180"
              step="1"
              value={Math.round(transform.rotation)}
              onChange={e => {
                const deg = Number(e.target.value);
                if (Number.isFinite(deg)) {
                  const next = clampTransform({ ...transform, rotation: deg });
                  onChange(next);
                  pushHistory(next);
                }
              }}
            />
          </div>

          <div className="advanced-field">
            <label htmlFor="stage-input-x">Offset X (%)</label>
            <input
              id="stage-input-x"
              type="number"
              min="-150"
              max="150"
              step="1"
              value={Math.round(transform.x * 100)}
              onChange={e => {
                const norm = Number(e.target.value) / 100;
                if (Number.isFinite(norm)) {
                  const next = clampTransform({ ...transform, x: norm });
                  onChange(next);
                  pushHistory(next);
                }
              }}
            />
          </div>

          <div className="advanced-field">
            <label htmlFor="stage-input-y">Offset Y (%)</label>
            <input
              id="stage-input-y"
              type="number"
              min="-150"
              max="150"
              step="1"
              value={Math.round(transform.y * 100)}
              onChange={e => {
                const norm = Number(e.target.value) / 100;
                if (Number.isFinite(norm)) {
                  const next = clampTransform({ ...transform, y: norm });
                  onChange(next);
                  pushHistory(next);
                }
              }}
            />
          </div>

          <div className="advanced-field advanced-checkbox">
            <label>
              <input
                type="checkbox"
                checked={transform.flipX}
                onChange={e => {
                  const next = { ...transform, flipX: e.target.checked };
                  onChange(next);
                  pushHistory(next);
                }}
              />
              <span>Flip Horizontal</span>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
