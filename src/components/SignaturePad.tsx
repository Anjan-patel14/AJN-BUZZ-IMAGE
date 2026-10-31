'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { PenLine, Trash2, Undo2, Redo2, Eye, EyeOff } from 'lucide-react';

export interface StrokePoint {
  x: number; // Logical 0..LOGICAL_W
  y: number; // Logical 0..LOGICAL_H
  pressure: number; // 0..1
  time: number;
  widthFactor: number;
}

export interface SignatureStroke {
  points: StrokePoint[];
  color: string;
  baseWidth: number;
}

export interface SignaturePadProps {
  penColor?: string;
  onPenColorChange?: (color: string) => void;
  penWidth?: number;
  onPenWidthChange?: (width: number) => void;
  onSignatureChange: (canvas: HTMLCanvasElement | null, hasStrokes: boolean) => void;
  clearTrigger?: number;
}

export const LOGICAL_PAD_WIDTH = 900;
export const LOGICAL_PAD_HEIGHT = 300;
export const PAD_ASPECT_RATIO = LOGICAL_PAD_WIDTH / LOGICAL_PAD_HEIGHT; // 3:1

const INK_PRESETS = [
  { label: 'Black', color: '#111111' },
  { label: 'Blue', color: '#1d4ed8' },
  { label: 'Navy', color: '#0f172a' },
  { label: 'Red', color: '#dc2626' },
];

/**
 * Renders a list of smoothed signature strokes onto a 2D context.
 * Uses quadratic / Catmull-Rom midpoint interpolation and variable width per segment
 * (from pen pressure or pointer velocity).
 */
export function renderSignatureStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: SignatureStroke[],
  scaleX: number,
  scaleY: number
) {
  const uniformScale = (scaleX + scaleY) / 2;

  for (const stroke of strokes) {
    const pts = stroke.points;
    if (!pts.length) continue;

    ctx.fillStyle = stroke.color;
    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (pts.length === 1) {
      const p0 = pts[0]!;
      const r = Math.max(0.75, (stroke.baseWidth * p0.widthFactor * uniformScale) / 2);
      ctx.beginPath();
      ctx.arc(p0.x * scaleX, p0.y * scaleY, r, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    if (pts.length === 2) {
      const p0 = pts[0]!;
      const p1 = pts[1]!;
      const w = Math.max(1, stroke.baseWidth * ((p0.widthFactor + p1.widthFactor) / 2) * uniformScale);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(p0.x * scaleX, p0.y * scaleY);
      ctx.lineTo(p1.x * scaleX, p1.y * scaleY);
      ctx.stroke();
      continue;
    }

    // Smooth quadratic midpoint spline with per-segment variable width
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]!;
      const curr = pts[i]!;
      const next = pts[i + 1] || curr;

      const startX = i === 1 ? prev.x : ( pts[i - 2]!.x + prev.x ) / 2;
      const startY = i === 1 ? prev.y : ( pts[i - 2]!.y + prev.y ) / 2;
      const ctrlX = prev.x;
      const ctrlY = prev.y;
      const endX = i === pts.length - 1 ? curr.x : (prev.x + curr.x) / 2;
      const endY = i === pts.length - 1 ? curr.y : (prev.y + curr.y) / 2;

      const wf = (prev.widthFactor + curr.widthFactor) / 2;
      ctx.lineWidth = Math.max(0.8, stroke.baseWidth * wf * uniformScale);

      ctx.beginPath();
      ctx.moveTo(startX * scaleX, startY * scaleY);
      ctx.quadraticCurveTo(ctrlX * scaleX, ctrlY * scaleY, endX * scaleX, endY * scaleY);
      ctx.stroke();

      // Connect final segment cleanly to the last point
      if (i === pts.length - 1 && next === curr) {
        ctx.beginPath();
        ctx.moveTo(endX * scaleX, endY * scaleY);
        ctx.lineTo(curr.x * scaleX, curr.y * scaleY);
        ctx.stroke();
      }
    }
  }
}

export function SignaturePad({
  penColor: controlledColor,
  onPenColorChange: controlledOnColorChange,
  penWidth: controlledWidth,
  onPenWidthChange: controlledOnWidthChange,
  onSignatureChange,
  clearTrigger = 0,
}: SignaturePadProps) {
  const [internalColor, setInternalColor] = useState('#111111');
  const [internalWidth, setInternalWidth] = useState(5);
  const penColor = controlledColor ?? internalColor;
  const onPenColorChange = controlledOnColorChange ?? setInternalColor;
  const penWidth = controlledWidth ?? internalWidth;
  const onPenWidthChange = controlledOnWidthChange ?? setInternalWidth;

  const padCanvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<SignatureStroke[]>([]);
  const redoRef = useRef<SignatureStroke[]>([]);
  const currentStrokeRef = useRef<SignatureStroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const [showBaseline, setShowBaseline] = useState(true);
  const [strokeCount, setStrokeCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  // Render the interactive pad (includes optional baseline guide + all strokes)
  const renderPad = useCallback(() => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(rect.width));
    const cssHeight = Math.max(1, Math.round(rect.height || cssWidth / PAD_ASPECT_RATIO));
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2.5);

    const targetW = Math.max(1, Math.round(cssWidth * dpr));
    const targetH = Math.max(1, Math.round(cssHeight * dpr));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, targetW, targetH);

    const scaleX = targetW / LOGICAL_PAD_WIDTH;
    const scaleY = targetH / LOGICAL_PAD_HEIGHT;

    // Optional baseline guide (visual only — never exported)
    if (showBaseline) {
      ctx.save();
      const baseY = Math.round(LOGICAL_PAD_HEIGHT * 0.74 * scaleY) + 0.5;
      const marginX = Math.round(LOGICAL_PAD_WIDTH * 0.06 * scaleX);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = Math.max(1, Math.round(dpr));
      ctx.setLineDash([6 * dpr, 5 * dpr]);
      ctx.beginPath();
      ctx.moveTo(marginX, baseY);
      ctx.lineTo(targetW - marginX, baseY);
      ctx.stroke();

      // Subtle '×' signing mark on the left of baseline
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
      ctx.font = `700 ${Math.round(13 * dpr)}px Inter, system-ui, sans-serif`;
      ctx.fillText('×', marginX + 2 * dpr, baseY - 6 * dpr);
      ctx.restore();
    }

    const allStrokes = currentStrokeRef.current
      ? [...strokesRef.current, currentStrokeRef.current]
      : strokesRef.current;

    renderSignatureStrokes(ctx, allStrokes, scaleX, scaleY);
    ctx.restore();
  }, [showBaseline]);

  const onSignatureChangeRef = useRef(onSignatureChange);
  useEffect(() => {
    onSignatureChangeRef.current = onSignatureChange;
  }, [onSignatureChange]);

  // Export clean signature bitmap (without baseline guide) at fixed 3:1 logical aspect ratio
  const emitExportCanvas = useCallback(() => {
    const strokes = strokesRef.current;
    if (strokes.length === 0) {
      onSignatureChangeRef.current(null, false);
      return;
    }
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = LOGICAL_PAD_WIDTH;
    exportCanvas.height = LOGICAL_PAD_HEIGHT;
    const ctx = exportCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, LOGICAL_PAD_WIDTH, LOGICAL_PAD_HEIGHT);
      renderSignatureStrokes(ctx, strokes, 1, 1);
    }
    onSignatureChangeRef.current(exportCanvas, true);
  }, []);

  // Observe CSS box size and keep canvas buffer matched to CSS box x devicePixelRatio
  useEffect(() => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    renderPad();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      renderPad();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [renderPad]);

  // Clear when parent triggers reset
  useEffect(() => {
    if (clearTrigger > 0) {
      strokesRef.current = [];
      redoRef.current = [];
      currentStrokeRef.current = null;
      setStrokeCount(0);
      setRedoCount(0);
      renderPad();
    }
  }, [clearTrigger, renderPad]);

  const mapPointerToLogical = (clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = padCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    // Map CSS coordinates to fixed 3:1 logical coordinate space
    const x = ((clientX - rect.left) / w) * LOGICAL_PAD_WIDTH;
    const y = ((clientY - rect.top) / h) * LOGICAL_PAD_HEIGHT;
    return { x, y };
  };

  const computeWidthFactor = (
    pointerType: string,
    pressure: number,
    distLogical: number,
    dtMs: number,
    prevFactor: number
  ): number => {
    // Real pen/stylus pressure
    if (pointerType === 'pen' || (pressure > 0 && pressure !== 0.5)) {
      const target = Math.max(0.35, Math.min(1.55, 0.4 + pressure * 1.1));
      return prevFactor * 0.55 + target * 0.45;
    }
    // Velocity-based width modulation for mouse/touch
    const velocity = distLogical / Math.max(1, dtMs); // logical px per ms
    const target = Math.max(0.55, Math.min(1.22, 1.16 - velocity * 0.12));
    return prevFactor * 0.65 + target * 0.35;
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const canvas = padCanvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}

    activePointerIdRef.current = e.pointerId;
    const pt = mapPointerToLogical(e.clientX, e.clientY);
    const now = performance.now();
    const initialPressure = e.pressure > 0 ? e.pressure : 0.5;
    const initialFactor =
      e.pointerType === 'pen' ? Math.max(0.4, Math.min(1.4, 0.45 + initialPressure * 0.95)) : 1.0;

    currentStrokeRef.current = {
      color: penColor,
      baseWidth: penWidth,
      points: [
        {
          x: pt.x,
          y: pt.y,
          pressure: initialPressure,
          time: now,
          widthFactor: initialFactor,
        },
      ],
    };

    renderPad();
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId || !currentStrokeRef.current) return;

    // Use getCoalescedEvents for high-precision curves when available
    const nativeEvt = e.nativeEvent as PointerEvent;
    const coalesced: PointerEvent[] =
      typeof nativeEvt.getCoalescedEvents === 'function'
        ? nativeEvt.getCoalescedEvents()
        : [nativeEvt];
    const eventsToProcess = coalesced.length > 0 ? coalesced : [nativeEvt];

    const pts = currentStrokeRef.current.points;

    for (const ev of eventsToProcess) {
      const logical = mapPointerToLogical(ev.clientX, ev.clientY);
      const last = pts[pts.length - 1]!;
      const dist = Math.hypot(logical.x - last.x, logical.y - last.y);

      // Skip sub-pixel jitter
      if (dist < 0.6) continue;

      const now = ev.timeStamp > 0 ? ev.timeStamp : performance.now();
      const dt = Math.max(1, now - last.time);
      const pressure = ev.pressure > 0 ? ev.pressure : 0.5;
      const wf = computeWidthFactor(ev.pointerType || e.pointerType, pressure, dist, dt, last.widthFactor);

      pts.push({
        x: logical.x,
        y: logical.y,
        pressure,
        time: now,
        widthFactor: wf,
      });
    }

    renderPad();
  };

  const finishStroke = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    activePointerIdRef.current = null;
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      strokesRef.current = [...strokesRef.current, currentStrokeRef.current];
      if (strokesRef.current.length > 50) {
        strokesRef.current.shift();
      }
      redoRef.current = [];
      currentStrokeRef.current = null;
      setStrokeCount(strokesRef.current.length);
      setRedoCount(0);
      renderPad();
      emitExportCanvas();
    }
  };

  const handleUndo = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    const popped = strokesRef.current[strokesRef.current.length - 1]!;
    strokesRef.current = strokesRef.current.slice(0, -1);
    redoRef.current = [...redoRef.current, popped];
    setStrokeCount(strokesRef.current.length);
    setRedoCount(redoRef.current.length);
    renderPad();
    emitExportCanvas();
  }, [renderPad, emitExportCanvas]);

  const handleRedo = useCallback(() => {
    if (redoRef.current.length === 0) return;
    const restored = redoRef.current[redoRef.current.length - 1]!;
    redoRef.current = redoRef.current.slice(0, -1);
    strokesRef.current = [...strokesRef.current, restored];
    setStrokeCount(strokesRef.current.length);
    setRedoCount(redoRef.current.length);
    renderPad();
    emitExportCanvas();
  }, [renderPad, emitExportCanvas]);

  const handleClear = useCallback(() => {
    strokesRef.current = [];
    redoRef.current = [];
    currentStrokeRef.current = null;
    setStrokeCount(0);
    setRedoCount(0);
    renderPad();
    onSignatureChange(null, false);
  }, [renderPad, onSignatureChange]);

  return (
    <div
      className="signature-draw-card"
      style={{ maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}
      onKeyDown={e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) handleRedo();
          else handleUndo();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }}
    >
      <div className="signature-draw-head">
        <div>
          <b>Draw signature</b>
          <span>
            Smooth pressure &amp; velocity strokes · Syncs directly to the live stage preview below
          </span>
        </div>
        <PenLine size={20} />
      </div>

      {/* Ink color presets + custom picker + stroke width slider */}
      <div
        className="signature-controls-bar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        <div className="target-preset-row" style={{ margin: 0 }}>
          {INK_PRESETS.map(preset => (
            <button
              key={preset.color}
              type="button"
              onClick={() => onPenColorChange(preset.color)}
              style={{
                borderColor: penColor.toLowerCase() === preset.color ? '#1769e8' : undefined,
                background: penColor.toLowerCase() === preset.color ? '#edf5ff' : undefined,
                color: penColor.toLowerCase() === preset.color ? '#1769e8' : undefined,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: preset.color,
                  display: 'inline-block',
                }}
              />
              {preset.label} ink
            </button>
          ))}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '10px',
              fontWeight: 800,
              color: '#475569',
              padding: '0 6px',
              border: '1px solid #cbd7ea',
              borderRadius: '9px',
              background: '#fff',
              minHeight: '30px',
              cursor: 'pointer',
            }}
          >
            <span>Custom</span>
            <input
              type="color"
              aria-label="Custom ink color"
              value={penColor}
              onChange={e => onPenColorChange(e.target.value)}
              style={{ width: 20, height: 20, border: 0, padding: 0, background: 'transparent', cursor: 'pointer' }}
            />
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: 'auto',
            flexWrap: 'wrap',
          }}
        >
          <label
            htmlFor="signature-stroke-width"
            style={{ fontSize: '10.5px', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}
          >
            Width: {penWidth} px
          </label>
          <input
            id="signature-stroke-width"
            aria-label="Stroke width"
            type="range"
            min={1}
            max={20}
            step={1}
            value={penWidth}
            onChange={e => onPenWidthChange(Number(e.target.value))}
            style={{ width: '96px', accentColor: '#1769e8' }}
          />
          <div className="target-preset-row" style={{ margin: 0 }}>
            <button
              type="button"
              onClick={() => onPenWidthChange(2)}
              style={{ borderColor: penWidth === 2 ? '#1769e8' : undefined }}
            >
              Thin
            </button>
            <button
              type="button"
              onClick={() => onPenWidthChange(5)}
              style={{ borderColor: penWidth === 5 ? '#1769e8' : undefined }}
            >
              Medium
            </button>
            <button
              type="button"
              onClick={() => onPenWidthChange(10)}
              style={{ borderColor: penWidth === 10 ? '#1769e8' : undefined }}
            >
              Bold
            </button>
          </div>
        </div>
      </div>

      {/* Fixed 3:1 aspect-ratio pad container sized dynamically via ResizeObserver x devicePixelRatio */}
      <div
        className="signature-pad-viewport"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '100%',
          aspectRatio: '3 / 1',
          borderRadius: '12px',
          border: '1px dashed #93b4f2',
          background: '#ffffff',
          overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        <canvas
          ref={padCanvasRef}
          role="img"
          aria-label="Signature drawing pad"
          className="signature-canvas"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            touchAction: 'none',
            cursor: 'crosshair',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
        />
      </div>

      <div className="signature-draw-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className="btn"
            type="button"
            disabled={strokeCount === 0}
            onClick={handleUndo}
            title="Undo stroke (Ctrl+Z)"
            aria-label="Undo stroke"
          >
            <Undo2 size={15} /> Undo
          </button>
          <button
            className="btn"
            type="button"
            disabled={redoCount === 0}
            onClick={handleRedo}
            title="Redo stroke (Ctrl+Shift+Z)"
            aria-label="Redo stroke"
          >
            <Redo2 size={15} /> Redo
          </button>
          <button
            className="btn"
            type="button"
            disabled={strokeCount === 0}
            onClick={handleClear}
            title="Clear signature pad"
          >
            <Trash2 size={15} /> Clear
          </button>
        </div>

        <button
          className="btn"
          type="button"
          onClick={() => setShowBaseline(b => !b)}
          aria-pressed={showBaseline}
          title="Toggle signing baseline guide (visual only)"
        >
          {showBaseline ? <EyeOff size={15} /> : <Eye size={15} />}
          <span>{showBaseline ? 'Hide baseline' : 'Show baseline'}</span>
        </button>
      </div>
    </div>
  );
}
