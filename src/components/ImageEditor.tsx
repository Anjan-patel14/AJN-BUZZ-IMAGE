'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  Check,
  Columns2,
  Download,
  Eye,
  FileArchive,
  Grid,
  Lightbulb,
  Play,
  RefreshCcw,
  RotateCcw,
  ScanFace,
  Scissors,
  Share2,
  Sparkles,
  Trash2,
  UploadCloud,
  WifiOff,
  X,
} from 'lucide-react';
import {
  compressImage,
  detectSignatureInkBounds,
  imageDimensions,
  measureEdgeVariance,
  pixelsFromPhysical,
  processImage,
  releaseCanvas,
  type CompressionMode,
  type ImageOptions,
  type ImageProcessResult,
  type OutputFormat,
} from '@/lib/image-engine';
import type { ImageTool, PhysicalUnit } from '@/lib/image-tools';
import { markRecentTool, savePreset } from '@/lib/tool-state';
import { CanvasStage } from './CanvasStage';
import { SignaturePad } from './SignaturePad';
import {
  computeA4GridLayout,
  DEFAULT_TRANSFORM,
  type BrushStroke,
  type CropBox,
  type StageTransform,
} from '@/lib/stage-math';

function outputExt(type: string) {
  return type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png';
}

function safeName(name: string) {
  const base = name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base || 'image';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function sourceFormat(file: File): OutputFormat | null {
  return file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp'
    ? file.type
    : null;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function getProTip(tool: ImageTool): { title: string; tip: string } {
  switch (tool.workflow) {
    case 'compress':
    case 'compress-target':
      return {
        title: 'Pro Tip · Target KB & Format Selection',
        tip: 'Switch Output format to JPG or WebP when aiming for strict portal limits (such as 20 KB or 50 KB). PNG is lossless and cannot shrink as aggressively as JPG or WebP.',
      };
    case 'signature-compress':
      return {
        title: 'Pro Tip · Crisp Small Signatures',
        tip: 'For 10 KB–20 KB government portal signature limits, crop blank margins first or choose JPG/WebP output so strokes stay sharp at smaller byte sizes.',
      };
    case 'resize-px':
      return {
        title: 'Pro Tip · Prevent Stretching',
        tip: 'Keep "Lock aspect ratio" enabled while typing either width or height so your image scales proportionally without distortion.',
      };
    case 'resize-physical':
    case 'photo-size':
    case 'signature-resize':
      return {
        title: 'Pro Tip · Physical Size Formula',
        tip: 'Pixels are calculated using (Millimetres ÷ 25.4) × DPI. Use 300 DPI for crisp print quality or 96–150 DPI for lightweight online portal uploads.',
      };
    case 'photo-preset':
      return {
        title: 'Pro Tip · Passport & ID Framing',
        tip: 'Drag, pinch, or scroll directly on the photo stage to position your head inside the visual aid oval, enable A4 Print Sheet for multi-copy printing, and always verify your portal’s official photo specs.',
      };
    case 'crop':
    case 'aspect-crop':
      return {
        title: 'Pro Tip · Composition & Framing',
        tip: 'Use 1:1 for profile avatars, 3:4 for portrait ID cards, or 16:9 for widescreen banners, then drag or zoom directly on the stage.',
      };
    case 'dpi':
      return {
        title: 'Pro Tip · Density Metadata vs Pixels',
        tip: 'Changing DPI updates the embedded print density header (JFIF/pHYs) to 300 DPI without altering visual pixel dimensions.',
      };
    case 'signature-maker':
    case 'signature-trim':
    case 'signature-remove-bg':
    case 'signature-png':
      return {
        title: 'Pro Tip · High-Contrast Signatures',
        tip: 'Sign on plain white paper under even lighting (avoid shadows) so automatic background removal, edge softness, and margin trimming produce clean edges.',
      };
    case 'photo-editor':
      return {
        title: 'Pro Tip · Balanced Adjustments',
        tip: 'Subtle 5%–15% boosts in brightness and contrast brighten indoor portraits naturally without clipping highlights.',
      };
    case 'text-overlay':
      return {
        title: 'Pro Tip · Readable Watermarks',
        tip: 'Lower opacity to 40%–65% and place text in a corner for non-intrusive watermarks, or center at 90% opacity for bold titles.',
      };
    case 'dimension-check':
    case 'quality-check':
      return {
        title: 'Pro Tip · Instant Local Telemetry',
        tip: 'Drop any image to inspect exact pixel width, height, aspect ratio, megapixels, and byte size immediately—files never leave your browser.',
      };
    case 'upscale':
      return {
        title: 'Pro Tip · Smooth High-Resolution Scaling',
        tip: '2× upscaling doubles width and height using high-quality bicubic browser resampling, safely capped at 16.7 MP for cross-device browser stability.',
      };
    case 'rotate':
      return {
        title: 'Pro Tip · Orientation Fix',
        tip: 'Use 90° or 270° rotation to fix sideways mobile scans, or combine 0° rotation with horizontal flip to mirror selfies.',
      };
    case 'remove-metadata':
      return {
        title: 'Pro Tip · Complete EXIF & GPS Stripping',
        tip: 'Re-encoding from decoded canvas pixels guarantees camera serial numbers, timestamps, and GPS coordinates are excluded from the new file.',
      };
    default:
      return {
        title: 'Pro Tip · Format Choice',
        tip: 'Choose JPG for photographs and form uploads, PNG for transparent graphics or signatures, and WebP for maximum web compression.',
      };
  }
}

type CompressOutput = 'keep' | OutputFormat;
type TargetUnit = 'KB' | 'MB';
type ProcessedItem = ImageProcessResult & { name: string; url: string; originalSize: number };
type PreviewTelemetry = { width: number; height: number; size: number; type: OutputFormat };
type SourceTelemetry = {
  width: number;
  height: number;
  size: number;
  type: string;
  aspectRatio: string;
  aspectDecimal: string;
  megapixels: string;
  orientation: 'Landscape' | 'Portrait' | 'Square';
  bitsPerPixel: string;
};

function baseOptions(tool: ImageTool): ImageOptions {
  return {
    quality: 0.9,
    format:
      tool.workflow === 'photo-preset' || tool.workflow === 'dpi' || tool.workflow === 'to-jpg'
        ? 'image/jpeg'
        : tool.category === 'Signature' || tool.workflow === 'jpg-to-png'
        ? 'image/png'
        : 'image/webp',
    angle: tool.workflow === 'rotate' ? 90 : 0,
    flip: 'none',
    amount: tool.workflow === 'upscale' ? 2 : 42,
    softness: 28,
    recolorInk: false,
    inkColor: '#0f172a',
    transparentBackground: true,
    autoTrim: tool.workflow === 'signature-maker' || tool.workflow === 'signature-remove-bg',
    useCustomSize: false,
    brushStrokes: [],
    text: tool.workflow === 'text-overlay' ? 'Sample Text' : undefined,
    opacity: 0.85,
    fontSize: 48,
    color: '#ffffff',
    backgroundColor: '#ffffff',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    position: 'center',
    width: tool.workflow === 'signature-maker' ? 600 : 1200,
    height: tool.workflow === 'signature-maker' ? 200 : 630,
    unit: tool.defaultUnit || tool.preset?.unit || (tool.workflow === 'signature-maker' ? 'px' : 'cm'),
    physicalWidth:
      tool.preset?.width || (tool.defaultUnit === 'mm' ? 35 : tool.category === 'Signature' ? 5 : 3.5),
    physicalHeight:
      tool.preset?.height || (tool.defaultUnit === 'mm' ? 45 : tool.category === 'Signature' ? 2 : 4.5),
    dpi: tool.preset?.dpi || 300,
    ratioWidth: 1,
    ratioHeight: 1,
    anchorX: 0.5,
    anchorY: 0.42,
    zoom: 1,
    replaceBackground: false,
    trimMargin: 12,
    a4Sheet: false,
    a4Count: 8,
    a4MarginMm: 10,
    a4SpacingMm: 4,
    targetKb: 0,
  };
}

const PHOTO_BG_PRESETS = [
  { label: 'White', hex: '#ffffff' },
  { label: 'Light Blue', hex: '#dbeafe' },
  { label: 'Soft Grey', hex: '#f1f5f9' },
  { label: 'Sky Blue', hex: '#bae6fd' },
  { label: 'Cream', hex: '#fef9c3' },
];

const SIGNATURE_INK_PRESETS = [
  { label: 'Black', hex: '#0f172a' },
  { label: 'Royal Blue', hex: '#1d4ed8' },
  { label: 'Navy', hex: '#1e3a8a' },
  { label: 'Crimson', hex: '#dc2626' },
];

export function ImageEditor({ tool }: { tool: ImageTool }) {
  const [files, setFiles] = useState<File[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewMeta, setPreviewMeta] = useState<PreviewTelemetry | null>(null);
  const [showOriginalPreview, setShowOriginalPreview] = useState(false);
  const [splitCompare, setSplitCompare] = useState(false);
  const [comparePosition, setComparePosition] = useState(50);
  const [showFaceGuide, setShowFaceGuide] = useState(tool.workflow === 'photo-preset');
  const [isOffline, setIsOffline] = useState(false);
  const [sourceMeta, setSourceMeta] = useState<SourceTelemetry | null>(null);
  const [results, setResults] = useState<ProcessedItem[]>([]);
  const [batchBlob, setBatchBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const [previewWorking, setPreviewWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [livePreview, setLivePreview] = useState(
    !['compress', 'compress-target'].includes(tool.workflow)
  );
  const [lockAspect, setLockAspect] = useState(
    !['resize-physical', 'photo-size'].includes(tool.workflow)
  );
  const [ratio, setRatio] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [options, setOptions] = useState<ImageOptions>(() => baseOptions(tool));
  const [compressMode, setCompressMode] = useState<CompressionMode>(
    tool.workflow === 'compress' ? 'auto' : 'target'
  );
  const [targetValue, setTargetValue] = useState(tool.workflow === 'signature-compress' ? 20 : 100);
  const [targetUnit, setTargetUnit] = useState<TargetUnit>('KB');
  const [compressOutput, setCompressOutput] = useState<CompressOutput>(
    tool.workflow === 'signature-compress' ? 'image/jpeg' : 'keep'
  );

  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [padCanvasSource, setPadCanvasSource] = useState<HTMLCanvasElement | null>(null);
  const [isPadActive, setIsPadActive] = useState(false);
  const [processedSigCanvas, setProcessedSigCanvas] = useState<HTMLCanvasElement | null>(null);
  const [edgeVarianceInfo, setEdgeVarianceInfo] = useState<{ variance: number; highVariance: boolean } | null>(null);

  const [stageTransform, setStageTransform] = useState<StageTransform>(() => ({
    ...DEFAULT_TRANSFORM,
    rotation: tool.workflow === 'rotate' ? 90 : 0,
  }));
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [mobileControlTab, setMobileControlTab] = useState<'options' | 'info'>('options');

  const isInteractiveStageTool = [
    'photo-preset',
    'crop',
    'aspect-crop',
    'rotate',
    'photo-editor',
    'text-overlay',
    'signature-maker',
    'signature-trim',
    'signature-resize',
    'signature-remove-bg',
    'signature-png',
    'resize-physical',
    'photo-size',
  ].includes(tool.workflow);

  const inputRef = useRef<HTMLInputElement>(null);
  const a4PreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragDepth = useRef(0);
  const previewRun = useRef(0);
  const runSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const objectUrls = useRef<Set<string>>(new Set());
  const padBlobTimerRef = useRef<number | null>(null);

  const maxMb = Number(process.env.NEXT_PUBLIC_IMAGE_MAX_INPUT_MB || 30);
  const configuredBatch = Number(process.env.NEXT_PUBLIC_IMAGE_BATCH_LIMIT || 20);
  const singleRun = [
    'compress',
    'compress-target',
    'signature-compress',
    'signature-maker',
    'passport-photo-maker',
    'id-photo-maker',
    'photo-35x45',
    'photo-2x2',
  ].includes(tool.id);
  const runLimit = singleRun ? 1 : configuredBatch;

  const forcedType: OutputFormat | null =
    tool.workflow === 'to-jpg'
      ? 'image/jpeg'
      : ['remove-bg', 'signature-maker', 'signature-trim', 'signature-remove-bg', 'signature-png'].includes(
          tool.workflow
        )
      ? 'image/png'
      : null;

  const photoPreset = tool.workflow === 'photo-preset';
  const dedicatedPreset = tool.id === 'photo-35x45' || tool.id === 'photo-2x2';
  const physicalWorkflow = ['resize-physical', 'photo-size', 'signature-resize'].includes(tool.workflow);
  const isSignatureBgTool = tool.workflow === 'signature-remove-bg' || tool.workflow === 'signature-png';

  useEffect(() => {
    markRecentTool(tool.id);
  }, [tool.id]);

  useEffect(() => {
    const syncOnline = () => setIsOffline(typeof navigator !== 'undefined' && navigator.onLine === false);
    syncOnline();
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    return () => {
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
    };
  }, []);

  useEffect(() => {
    if (!sourceUrl) {
      setLoadedImage(null);
      setEdgeVarianceInfo(null);
      return;
    }
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      setLoadedImage(img);
      if (photoPreset) {
        const info = measureEdgeVariance(
          img,
          img.naturalWidth || img.width || 800,
          img.naturalHeight || img.height || 600
        );
        setEdgeVarianceInfo(info);
      }
    };
    img.src = sourceUrl;
    return () => {
      active = false;
    };
  }, [sourceUrl, photoPreset]);

  // Live processed canvas for signature-remove-bg and signature-png so user sees real-time threshold, softness, recolor, and brush strokes on checkerboard
  useEffect(() => {
    if (!isSignatureBgTool || !loadedImage) {
      setProcessedSigCanvas(prev => {
        if (prev) releaseCanvas(prev);
        return null;
      });
      return;
    }

    const srcW = loadedImage.naturalWidth || loadedImage.width || 800;
    const srcH = loadedImage.naturalHeight || loadedImage.height || 400;
    const maxEdge = 1200;
    const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(loadedImage, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    // Sample perimeter background color
    let bgR = 255, bgG = 255, bgB = 255;
    const samples: Array<[number, number, number]> = [];
    for (let i = 0; i < 16; i++) {
      const x = Math.round((i / 15) * (w - 1));
      const idx = x * 4;
      if (d[idx + 3]! > 16) samples.push([d[idx]!, d[idx + 1]!, d[idx + 2]!]);
    }
    if (samples.length > 0) {
      const mid = Math.floor(samples.length / 2);
      bgR = samples.map(s => s[0]).sort((a, b) => a - b)[mid]!;
      bgG = samples.map(s => s[1]).sort((a, b) => a - b)[mid]!;
      bgB = samples.map(s => s[2]).sort((a, b) => a - b)[mid]!;
    }

    const tol = Math.max(5, Math.min(220, options.amount ?? 42)) * 1.45;
    const soft = Math.max(0, Math.min(100, options.softness ?? 28));
    const softDist = tol * (1 + soft / 110);

    let recolorRgb: [number, number, number] | null = null;
    if (options.recolorInk && options.inkColor) {
      const hex = options.inkColor.replace('#', '').trim();
      const num = Number.parseInt(hex.padEnd(6, '0').slice(0, 6), 16);
      if (Number.isFinite(num)) {
        recolorRgb = [(num >> 16) & 255, (num >> 8) & 255, num & 255];
      }
    }

    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3]! <= 12) {
        d[i + 3] = 0;
        continue;
      }
      const dist = Math.hypot(d[i]! - bgR, d[i + 1]! - bgG, d[i + 2]! - bgB);
      if (dist <= tol) {
        d[i + 3] = 0;
      } else if (soft > 0 && dist < softDist) {
        const ratio = Math.max(0.1, Math.min(0.95, (dist - tol * 0.55) / Math.max(1, softDist - tol * 0.55)));
        d[i + 3] = Math.round(d[i + 3]! * ratio);
      }
      if (d[i + 3]! > 0 && recolorRgb) {
        d[i] = recolorRgb[0];
        d[i + 1] = recolorRgb[1];
        d[i + 2] = recolorRgb[2];
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Apply brush strokes scaled to proxy canvas
    const strokes = options.brushStrokes || [];
    for (const stroke of strokes) {
      if (!stroke.points.length) continue;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, stroke.size * scale);
      if (stroke.mode === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.fillStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        const color = options.recolorInk && options.inkColor ? options.inkColor : '#0f172a';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
      }
      if (stroke.points.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke.points[0]!.x * scale, stroke.points[0]!.y * scale, (stroke.size * scale) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0]!.x * scale, stroke.points[0]!.y * scale);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i]!.x * scale, stroke.points[i]!.y * scale);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

      setProcessedSigCanvas(prev => {
        if (prev && prev !== canvas) {
          window.setTimeout(() => releaseCanvas(prev), 200);
        }
        return canvas;
      });
  }, [
    isSignatureBgTool,
    loadedImage,
    options.amount,
    options.softness,
    options.recolorInk,
    options.inkColor,
    options.brushStrokes,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handleResize = () => {
      if (window.innerHeight - vv.height > 120) {
        setKeyboardOpen(true);
      } else {
        setKeyboardOpen(false);
      }
    };
    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, []);

  const handleStageTransformChange = useCallback((next: StageTransform) => {
    setStageTransform(next);
    setOptions(prev => ({
      ...prev,
      zoom: next.scale,
      angle: next.rotation,
      flip: next.flipX ? 'horizontal' : 'none',
      anchorX: 0.5 - next.x,
      anchorY: 0.42 - next.y,
      stageTransform: next,
    }));
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (padBlobTimerRef.current) window.clearTimeout(padBlobTimerRef.current);
      objectUrls.current.forEach(url => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    },
    []
  );

  function makeObjectUrl(blob: Blob) {
    const url = URL.createObjectURL(blob);
    objectUrls.current.add(url);
    return url;
  }

  const revokeObjectUrl = useCallback((url: string) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    objectUrls.current.delete(url);
  }, []);

  function cancelActiveJob(showCancelNote = false) {
    previewRun.current += 1;
    runSeqRef.current += 1;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setWorking(false);
    setPreviewWorking(false);
    if (showCancelNote) {
      setMessage('Processing cancelled.');
      setProgress(0);
    }
  }

  const clearResults = useCallback(() => {
    previewRun.current += 1;
    setPreviewUrl(current => {
      if (current) revokeObjectUrl(current);
      return '';
    });
    setPreviewMeta(null);
    setBatchBlob(null);
    setResults(current => {
      current.forEach(item => revokeObjectUrl(item.url));
      return [];
    });
  }, [revokeObjectUrl]);

  function clearSelection() {
    cancelActiveJob(false);
    setFiles([]);
    setSourceMeta(null);
    setPadCanvasSource(null);
    setIsPadActive(false);
    setEdgeVarianceInfo(null);
    setShowOriginalPreview(false);
    setSplitCompare(false);
    setIsDragging(false);
    dragDepth.current = 0;
    setSourceUrl(current => {
      if (current) revokeObjectUrl(current);
      return '';
    });
    clearResults();
  }

  // Handle direct drawing updates from SignaturePad (no separate "Use drawing" step needed)
  const handleSignaturePadChange = useCallback(
    (cleanCanvas: HTMLCanvasElement | null, hasContent: boolean) => {
      if (padBlobTimerRef.current) {
        window.clearTimeout(padBlobTimerRef.current);
        padBlobTimerRef.current = null;
      }

      if (!hasContent || !cleanCanvas) {
        setPadCanvasSource(prev => {
          if (prev) window.setTimeout(() => releaseCanvas(prev), 200);
          return null;
        });
        setIsPadActive(false);
        setFiles([]);
        setSourceMeta(null);
        clearResults();
        return;
      }

      // Create an immediate snapshot canvas for CanvasStage so dragging/scaling/rotating works immediately
      const snap = document.createElement('canvas');
      snap.width = cleanCanvas.width;
      snap.height = cleanCanvas.height;
      snap.getContext('2d')?.drawImage(cleanCanvas, 0, 0);

      setPadCanvasSource(prev => {
        if (prev) window.setTimeout(() => releaseCanvas(prev), 200);
        return snap;
      });
      setIsPadActive(true);
      setRatio(cleanCanvas.width / cleanCanvas.height);

      // Update File in background (debounced slightly) so live preview & direct export work seamlessly
      padBlobTimerRef.current = window.setTimeout(() => {
        cleanCanvas.toBlob(blob => {
          if (!blob) return;
          const drawnFile = new File([blob], 'drawn-signature.png', { type: 'image/png' });
          setFiles([drawnFile]);
          setSourceMeta({
            width: cleanCanvas.width,
            height: cleanCanvas.height,
            size: drawnFile.size,
            type: 'PNG',
            aspectRatio: '3:1',
            aspectDecimal: '3.00',
            megapixels: ((cleanCanvas.width * cleanCanvas.height) / 1_000_000).toFixed(2),
            orientation: 'Landscape',
            bitsPerPixel: ((drawnFile.size * 8) / (cleanCanvas.width * cleanCanvas.height)).toFixed(2),
          });
        }, 'image/png');
      }, 40);
    },
    [clearResults]
  );

  const effectiveOptions = useMemo<ImageOptions>(
    () => ({
      ...options,
      format: forcedType || options.format,
    }),
    [options, forcedType]
  );

  const targetBytes = useMemo(
    () => Math.round(Math.max(0, targetValue) * (targetUnit === 'MB' ? 1024 * 1024 : 1024)),
    [targetUnit, targetValue]
  );

  const calculatedPixels = useMemo(() => {
    const unit = options.unit || 'cm';
    const dpi = Number(options.dpi || 300);
    if (tool.workflow === 'signature-maker' && options.useCustomSize && unit === 'px') {
      return {
        width: Math.max(16, Math.round(Number(options.width || 600))),
        height: Math.max(16, Math.round(Number(options.height || 200))),
      };
    }
    return {
      width: pixelsFromPhysical(Number(options.physicalWidth || 0), unit, dpi),
      height: pixelsFromPhysical(Number(options.physicalHeight || 0), unit, dpi),
    };
  }, [
    options.unit,
    options.dpi,
    options.physicalWidth,
    options.physicalHeight,
    options.useCustomSize,
    options.width,
    options.height,
    tool.workflow,
  ]);

  const physicalReadout = useMemo(() => {
    const dpi = Math.max(36, Number(options.dpi || 300));
    const wPx = calculatedPixels.width;
    const hPx = calculatedPixels.height;
    const wMm = ((wPx / dpi) * 25.4).toFixed(1);
    const hMm = ((hPx / dpi) * 25.4).toFixed(1);
    const wIn = (wPx / dpi).toFixed(2);
    const hIn = (hPx / dpi).toFixed(2);
    return { wMm, hMm, wIn, hIn, dpi };
  }, [calculatedPixels.width, calculatedPixels.height, options.dpi]);

  const a4Layout = useMemo(() => {
    if (!photoPreset) return null;
    return computeA4GridLayout(
      calculatedPixels.width,
      calculatedPixels.height,
      Number(options.dpi || 300),
      options.a4Count ?? 8,
      options.a4MarginMm ?? 10,
      options.a4SpacingMm ?? 4
    );
  }, [
    photoPreset,
    calculatedPixels.width,
    calculatedPixels.height,
    options.dpi,
    options.a4Count,
    options.a4MarginMm,
    options.a4SpacingMm,
  ]);

  // Draw live A4 sheet miniature layout preview when a4Sheet is enabled
  useEffect(() => {
    if (!photoPreset || !options.a4Sheet || !a4Layout || !a4PreviewCanvasRef.current) return;
    const canvas = a4PreviewCanvasRef.current;
    const previewW = 210;
    const previewH = 297;
    canvas.width = previewW;
    canvas.height = previewH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, previewW, previewH);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, previewW - 1, previewH - 1);

    const scaleX = previewW / Math.max(1, a4Layout.sheetW);
    const scaleY = previewH / Math.max(1, a4Layout.sheetH);

    // Draw printable margin guide
    const mX = a4Layout.marginPx * scaleX;
    const mY = a4Layout.marginPx * scaleY;
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(mX, mY, previewW - mX * 2, previewH - mY * 2);
    ctx.restore();

    for (const tile of a4Layout.tiles) {
      const tx = tile.x * scaleX;
      const ty = tile.y * scaleY;
      const tw = tile.width * scaleX;
      const th = tile.height * scaleY;

      // Cut guide outside tile
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx - 0.5, ty - 0.5, tw + 1, th + 1);

      // Tile fill
      ctx.fillStyle = options.backgroundColor || '#dbeafe';
      ctx.fillRect(tx, ty, tw, th);

      if (loadedImage) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(tx, ty, tw, th);
        ctx.clip();
        ctx.drawImage(loadedImage, tx, ty, tw, th);
        ctx.restore();
      }
    }
  }, [photoPreset, options.a4Sheet, options.backgroundColor, a4Layout, loadedImage]);

  const proTip = useMemo(() => getProTip(tool), [tool]);

  const processOne = useCallback(
    async (
      file: File,
      signal?: AbortSignal,
      onProgress?: (pct: number) => void,
      isLivePreviewProxy = false
    ): Promise<ImageProcessResult> => {
      if (
        tool.workflow === 'compress' ||
        tool.workflow === 'compress-target' ||
        tool.workflow === 'signature-compress'
      ) {
        const mode: CompressionMode = tool.workflow === 'compress' ? compressMode : 'target';
        if (mode === 'target' && (!Number.isFinite(targetValue) || targetValue <= 0)) {
          throw new Error('Enter a target size greater than 0.');
        }
        const format = compressOutput === 'keep' ? sourceFormat(file) || 'image/webp' : compressOutput;
        return compressImage(file, {
          mode,
          targetBytes: mode === 'target' ? targetBytes : undefined,
          format,
          signal,
          onProgress,
        });
      }
      // During live preview of photo-preset, skip full-resolution A4 build and binary search so preview stays instant
      const runOpts: ImageOptions = isLivePreviewProxy && photoPreset
        ? {
            ...effectiveOptions,
            a4Sheet: false,
            targetKb: 0,
            signal,
            onProgress,
          }
        : {
            ...effectiveOptions,
            signal,
            onProgress,
          };
      return processImage(file, tool, runOpts);
    },
    [tool, compressMode, targetValue, targetBytes, compressOutput, effectiveOptions, photoPreset]
  );

  async function choose(selectedFiles: File[]) {
    clearSelection();
    setError('');
    setMessage('');
    setProgress(0);

    if (!selectedFiles.length) return;

    const firstCandidate = selectedFiles[0]!;
    if (firstCandidate.size === 0) {
      setError(`"${firstCandidate.name}" is empty (0 bytes). Please choose a valid image file.`);
      return;
    }

    const oversized = selectedFiles.find(file => file.size > maxMb * 1024 * 1024);
    if (oversized && selectedFiles.length === 1) {
      setError(
        `"${oversized.name}" (${formatBytes(oversized.size)}) exceeds the ${maxMb} MB browser limit. Please choose an image up to ${maxMb} MB.`
      );
      return;
    }

    const heicFile = selectedFiles.find(
      file => /\.hei[cf]$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif'
    );
    if (heicFile && selectedFiles.length === 1) {
      setError(
        `"${heicFile.name}" is in HEIC/HEIF format, which browsers cannot decode directly. Please convert or export it as JPG, PNG, or WebP first.`
      );
      return;
    }

    const isSupportedImage = (file: File) =>
      file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|bmp|avif)$/i.test(file.name);

    let valid = selectedFiles.filter(
      file => isSupportedImage(file) && file.size > 0 && file.size <= maxMb * 1024 * 1024
    );

    if (!valid.length) {
      if (oversized) {
        setError(`Selected file exceeds the ${maxMb} MB limit. Please choose an image up to ${maxMb} MB.`);
      } else {
        setError(
          `"${firstCandidate.name}" is not a supported image format. Please choose a JPG, PNG, WebP, GIF, or SVG file.`
        );
      }
      return;
    }

    if (tool.workflow === 'jpg-to-png') {
      valid = valid.filter(file => file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name));
      if (!valid.length) {
        setError('JPG to PNG / WebP requires a JPG or JPEG source image.');
        return;
      }
    }

    if (singleRun && valid.length > 1) {
      setMessage('This workflow processes one image at a time; the first selected image was loaded.');
    }
    valid = valid.slice(0, runLimit);
    const first = valid[0]!;

    try {
      const dimensions = await imageDimensions(first);
      setRatio(dimensions.width / dimensions.height);
      const divisor = gcd(dimensions.width, dimensions.height);
      const orientation =
        dimensions.width > dimensions.height
          ? 'Landscape'
          : dimensions.width < dimensions.height
          ? 'Portrait'
          : 'Square';
      const totalPixels = Math.max(1, dimensions.width * dimensions.height);
      setSourceMeta({
        width: dimensions.width,
        height: dimensions.height,
        size: first.size,
        type: (first.type || 'image/unknown').replace('image/', '').toUpperCase(),
        aspectRatio: `${Math.round(dimensions.width / divisor)}:${Math.round(dimensions.height / divisor)}`,
        aspectDecimal: (dimensions.width / dimensions.height).toFixed(2),
        megapixels: (totalPixels / 1_000_000).toFixed(2),
        orientation,
        bitsPerPixel: ((first.size * 8) / totalPixels).toFixed(2),
      });
      setOptions(current => {
        const srcFmt = sourceFormat(first);
        const preserve = ![
          'convert',
          'to-jpg',
          'jpg-to-png',
          'signature-maker',
          'signature-trim',
          'signature-remove-bg',
          'signature-png',
          'photo-preset',
        ].includes(tool.workflow);
        const nextFormat =
          tool.workflow === 'dpi'
            ? srcFmt === 'image/png'
              ? 'image/png'
              : 'image/jpeg'
            : preserve
            ? srcFmt || current.format
            : current.format;
        return {
          ...current,
          brushStrokes: [],
          ...(nextFormat ? { format: nextFormat } : {}),
          ...(tool.workflow === 'resize-px' ? { width: dimensions.width, height: dimensions.height } : {}),
          ...(tool.workflow === 'crop' || tool.workflow === 'signature-trim'
            ? { cropX: 0, cropY: 0, cropWidth: dimensions.width, cropHeight: dimensions.height }
            : {}),
          ...(tool.workflow === 'text-overlay'
            ? { fontSize: Math.min(220, Math.max(24, Math.round(dimensions.width / 18))) }
            : {}),
        };
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : `"${first.name}" could not be decoded. The file may be corrupted or invalid.`
      );
      return;
    }

    setSourceUrl(current => {
      if (current) revokeObjectUrl(current);
      return makeObjectUrl(first);
    });
    setFiles(valid);
  }

  // Debounced (~250 ms) live preview for lightweight adjustments and signature-size-reducer estimated KB
  useEffect(() => {
    if (!livePreview || working || !files[0]) return;
    const runId = ++previewRun.current;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        setPreviewWorking(true);
        try {
          const processed = await processOne(files[0]!, controller.signal, undefined, true);
          if (runId !== previewRun.current || controller.signal.aborted) return;
          const nextUrl = makeObjectUrl(processed.blob);
          setPreviewUrl(current => {
            if (current) revokeObjectUrl(current);
            return nextUrl;
          });
          setPreviewMeta({
            width: processed.width,
            height: processed.height,
            size: processed.blob.size,
            type: processed.type,
          });
        } catch {
          // Ignore transient preview errors while typing
        } finally {
          if (runId === previewRun.current) setPreviewWorking(false);
        }
      })();
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [files, livePreview, processOne, working, revokeObjectUrl]);

  async function run() {
    if (working) return;
    let activeFiles = files;

    // If user drew on SignaturePad and clicked Process immediately before the 60ms debounce completed:
    if (!activeFiles.length && tool.workflow === 'signature-maker' && padCanvasSource) {
      const blob = await new Promise<Blob | null>(resolve => padCanvasSource.toBlob(resolve, 'image/png'));
      if (blob) {
        const drawnFile = new File([blob], 'drawn-signature.png', { type: 'image/png' });
        setFiles([drawnFile]);
        activeFiles = [drawnFile];
      }
    }

    if (!activeFiles.length) {
      setError(
        tool.workflow === 'signature-maker'
          ? 'Please draw a signature on the pad or upload a signature image first.'
          : 'Please select or drop an image file first before processing.'
      );
      return;
    }

    cancelActiveJob(false);
    const currentSeq = ++runSeqRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    setWorking(true);
    setError('');
    setMessage('');
    setProgress(5);
    clearResults();

    try {
      const selected = activeFiles.slice(0, runLimit);
      const processedItems: ProcessedItem[] = [];

      for (let index = 0; index < selected.length; index++) {
        if (controller.signal.aborted || currentSeq !== runSeqRef.current) {
          throw new Error('Processing cancelled.');
        }
        const file = selected[index]!;
        const processed = await processOne(
          file,
          controller.signal,
          pct => {
            if (currentSeq === runSeqRef.current && selected.length === 1) {
              setProgress(Math.max(10, Math.min(95, pct)));
            }
          },
          false
        );
        if (controller.signal.aborted || currentSeq !== runSeqRef.current) {
          throw new Error('Processing cancelled.');
        }
        const ext = outputExt(processed.type);
        const suffix = options.a4Sheet ? `${tool.id}-a4-sheet` : tool.id;
        const name = `${safeName(file.name)}-${suffix}.${ext}`;
        const url = makeObjectUrl(processed.blob);
        const item = { ...processed, name, url, originalSize: file.size };
        processedItems.push(item);
        setResults(current => [...current, item]);
        setMessage(
          `${index + 1} of ${selected.length} result${selected.length === 1 ? '' : 's'} ready.`
        );
        setProgress(Math.round(((index + 1) / selected.length) * 100));
        if (selected.length > 1) {
          await new Promise(resolve => window.setTimeout(resolve, 0));
        }
      }

      if (processedItems.length > 1) {
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        const usedNames = new Set<string>();
        for (const item of processedItems) {
          let fileName = item.name;
          let dup = 2;
          while (usedNames.has(fileName)) {
            const dot = item.name.lastIndexOf('.');
            fileName =
              dot > 0 ? `${item.name.slice(0, dot)}-${dup}${item.name.slice(dot)}` : `${item.name}-${dup}`;
            dup++;
          }
          usedNames.add(fileName);
          zip.file(fileName, item.blob);
        }
        const blob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });
        if (controller.signal.aborted || currentSeq !== runSeqRef.current) {
          throw new Error('Processing cancelled.');
        }
        setBatchBlob(blob);
      }

      const notes = processedItems.map(item => item.note).filter(Boolean);
      setMessage(
        notes[0] || `${processedItems.length} result${processedItems.length === 1 ? '' : 's'} ready.`
      );
    } catch (reason) {
      if (currentSeq !== runSeqRef.current) return;
      const msg = reason instanceof Error ? reason.message : 'Image processing failed.';
      if (msg === 'Processing cancelled.') {
        setMessage('Processing cancelled.');
      } else {
        setError(msg);
      }
    } finally {
      if (currentSeq === runSeqRef.current) {
        setWorking(false);
        setProgress(100);
      }
    }
  }

  function resetSettings() {
    cancelActiveJob(false);
    const base = baseOptions(tool);
    if (sourceMeta && (tool.workflow === 'crop' || tool.workflow === 'signature-trim')) {
      base.cropX = 0;
      base.cropY = 0;
      base.cropWidth = sourceMeta.width;
      base.cropHeight = sourceMeta.height;
    }
    setOptions(base);
    setStageTransform({
      ...DEFAULT_TRANSFORM,
      rotation: tool.workflow === 'rotate' ? 90 : 0,
    });
    setCompressMode(tool.workflow === 'compress' ? 'auto' : 'target');
    setTargetValue(tool.workflow === 'signature-compress' ? 20 : 100);
    setTargetUnit('KB');
    setCompressOutput(tool.workflow === 'signature-compress' ? 'image/jpeg' : 'keep');
    setError('');
    setMessage('');
    clearResults();
  }

  function processAnother() {
    clearSelection();
    setError('');
    setMessage('');
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  }

  function resizeWidth(value: number) {
    setOptions(current => ({
      ...current,
      width: value,
      ...(lockAspect && ratio > 0 ? { height: Math.max(1, Math.round(value / ratio)) } : {}),
    }));
  }

  function resizeHeight(value: number) {
    setOptions(current => ({
      ...current,
      height: value,
      ...(lockAspect && ratio > 0 ? { width: Math.max(1, Math.round(value * ratio)) } : {}),
    }));
  }

  function resizePhysicalWidth(value: number) {
    setOptions(current => ({
      ...current,
      physicalWidth: value,
      ...(lockAspect && ratio > 0
        ? {
            physicalHeight:
              (current.unit || 'cm') === 'px'
                ? Math.max(1, Math.round(value / ratio))
                : Math.max(0.1, Number((value / ratio).toFixed(2))),
          }
        : {}),
    }));
  }

  function resizePhysicalHeight(value: number) {
    setOptions(current => ({
      ...current,
      physicalHeight: value,
      ...(lockAspect && ratio > 0
        ? {
            physicalWidth:
              (current.unit || 'cm') === 'px'
                ? Math.max(1, Math.round(value * ratio))
                : Math.max(0.1, Number((value * ratio).toFixed(2))),
          }
        : {}),
    }));
  }

  const handleAutoTrimSignature = useCallback(() => {
    const src = loadedImage || padCanvasSource;
    if (!src) return;
    const w = sourceMeta?.width || (src instanceof HTMLCanvasElement ? src.width : src.naturalWidth) || 800;
    const h = sourceMeta?.height || (src instanceof HTMLCanvasElement ? src.height : src.naturalHeight) || 300;
    const box = detectSignatureInkBounds(src, w, h, options.amount ?? 42, options.trimMargin ?? 12);
    setOptions(current => ({
      ...current,
      cropX: box.x,
      cropY: box.y,
      cropWidth: box.width,
      cropHeight: box.height,
    }));
    setMessage(`Auto-trimmed to ink bounds: ${box.width} × ${box.height} px.`);
  }, [loadedImage, padCanvasSource, sourceMeta, options.amount, options.trimMargin]);

  function numberField(key: keyof ImageOptions, label: string, min = 0, max = 12000, step = 1) {
    const id = `field-${tool.id}-${String(key)}`;
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          aria-label={label}
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(options[key] ?? 0)}
          onChange={event => setOptions(current => ({ ...current, [key]: Number(event.target.value) }))}
        />
      </div>
    );
  }

  function rangeField(key: keyof ImageOptions, label: string, min: number, max: number, step = 1) {
    const id = `range-${tool.id}-${String(key)}`;
    return (
      <div className="field">
        <div className="label-row">
          <label htmlFor={id}>{label}</label>
          <span>{Number(options[key] ?? 0)}</span>
        </div>
        <input
          id={id}
          aria-label={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number(options[key] ?? 0)}
          onChange={event => setOptions(current => ({ ...current, [key]: Number(event.target.value) }))}
        />
      </div>
    );
  }

  function applyCropPreset(presetRatio: number | 'full' | 'center80') {
    const w = sourceMeta?.width || Number(options.cropWidth || 800);
    const h = sourceMeta?.height || Number(options.cropHeight || 600);
    if (presetRatio === 'full') {
      setOptions(c => ({ ...c, cropX: 0, cropY: 0, cropWidth: w, cropHeight: h }));
      return;
    }
    if (presetRatio === 'center80') {
      const cw = Math.max(1, Math.round(w * 0.8));
      const ch = Math.max(1, Math.round(h * 0.8));
      setOptions(c => ({
        ...c,
        cropX: Math.round((w - cw) / 2),
        cropY: Math.round((h - ch) / 2),
        cropWidth: cw,
        cropHeight: ch,
      }));
      return;
    }
    let cw = w;
    let ch = h;
    if (w / h > presetRatio) cw = Math.max(1, Math.round(h * presetRatio));
    else ch = Math.max(1, Math.round(w / presetRatio));
    setOptions(c => ({
      ...c,
      cropX: Math.round((w - cw) / 2),
      cropY: Math.round((h - ch) / 2),
      cropWidth: cw,
      cropHeight: ch,
    }));
  }

  function handleSavePreset() {
    savePreset(`${tool.shortName} preset`, tool.id, options as unknown as Record<string, unknown>);
    setMessage('Settings saved to your local Presets list.');
  }

  async function shareResult(item: ProcessedItem) {
    try {
      const file = new File([item.blob], item.name, { type: item.type });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: tool.name, files: [file] });
      } else {
        downloadBlob(item.blob, item.name);
        setMessage('Direct file sharing is unavailable in this browser, so the result was downloaded.');
      }
    } catch (reason) {
      if ((reason as Error)?.name !== 'AbortError') setError('Sharing is not available for this result.');
    }
  }

  function extractDroppedFiles(dataTransfer: DataTransfer | null): File[] {
    if (!dataTransfer) return [];
    if (dataTransfer.files && dataTransfer.files.length > 0) {
      return Array.from(dataTransfer.files);
    }
    if (dataTransfer.items && dataTransfer.items.length > 0) {
      const collected: File[] = [];
      for (let i = 0; i < dataTransfer.items.length; i++) {
        const item = dataTransfer.items[i];
        if (item && item.kind === 'file') {
          const file = item.getAsFile();
          if (file) collected.push(file);
        }
      }
      return collected;
    }
    return [];
  }

  function handleDragEnter(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    if (event.dataTransfer?.types?.includes('Files')) {
      setIsDragging(true);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    if (!isDragging) setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    const droppedFiles = extractDroppedFiles(event.dataTransfer);
    if (droppedFiles.length > 0) {
      void choose(droppedFiles);
    }
  }

  const firstResult = results[0];
  const activeResultUrl = firstResult?.url || previewUrl;
  const savings = firstResult
    ? Math.round((1 - firstResult.blob.size / Math.max(1, firstResult.originalSize)) * 100)
    : null;
  const actionLabel =
    tool.workflow === 'compress' ||
    tool.workflow === 'compress-target' ||
    tool.workflow === 'signature-compress'
      ? 'Compress'
      : tool.workflow === 'convert' || tool.workflow === 'to-jpg' || tool.workflow === 'jpg-to-png'
      ? 'Convert'
      : tool.workflow === 'dpi'
      ? 'Set DPI'
      : tool.workflow === 'dimension-check' || tool.workflow === 'quality-check'
      ? 'Analyze & Export'
      : 'Process';
  const showQuality =
    !['signature-maker', 'signature-trim', 'signature-remove-bg', 'signature-png', 'dpi'].includes(
      tool.workflow
    ) &&
    (effectiveOptions.format === 'image/jpeg' || effectiveOptions.format === 'image/webp');

  const activeStageSource: CanvasImageSource | null =
    isSignatureBgTool && processedSigCanvas
      ? processedSigCanvas
      : tool.workflow === 'signature-maker' && isPadActive && padCanvasSource
      ? padCanvasSource
      : loadedImage;

  const activeStageSourceW =
    isSignatureBgTool && processedSigCanvas
      ? processedSigCanvas.width
      : tool.workflow === 'signature-maker' && isPadActive && padCanvasSource
      ? padCanvasSource.width
      : sourceMeta?.width || loadedImage?.naturalWidth || 800;

  const activeStageSourceH =
    isSignatureBgTool && processedSigCanvas
      ? processedSigCanvas.height
      : tool.workflow === 'signature-maker' && isPadActive && padCanvasSource
      ? padCanvasSource.height
      : sourceMeta?.height || loadedImage?.naturalHeight || 600;

  const activeCropBox: CropBox = {
    x: options.cropX ?? 0,
    y: options.cropY ?? 0,
    width: options.cropWidth || activeStageSourceW,
    height: options.cropHeight || activeStageSourceH,
  };

  return (
    <div className="image-editor editor-shell">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {working
          ? `Processing image (${progress}%)...`
          : firstResult
          ? `Processed ${firstResult.name}, ${firstResult.width} by ${firstResult.height} pixels`
          : error || message || ''}
      </div>
      <section className="editor-preview panel">
        {isOffline ? (
          <div
            className="notice"
            role="status"
            aria-live="polite"
            style={{ marginTop: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <WifiOff size={15} />
            <span>Offline mode active — local browser image processing continues to work normally.</span>
          </div>
        ) : null}

        {tool.workflow === 'signature-maker' ? (
          <SignaturePad onSignatureChange={handleSignaturePadChange} />
        ) : null}

        {/* Compact file bar once loaded, or full dropzone if empty */}
        {files.length > 0 || sourceUrl ? (
          <div className="compact-file-bar" role="status" aria-label="Loaded image file">
            <div className="compact-file-info">
              <UploadCloud size={16} className="compact-file-icon" />
              <span className="compact-file-name" title={files[0]?.name || 'image'}>
                {files[0]?.name || 'Loaded image'}
              </span>
              <span className="compact-file-size">
                ({files[0] ? formatBytes(files[0].size) : sourceMeta ? formatBytes(sourceMeta.size) : ''})
              </span>
            </div>
            <div className="compact-file-actions">
              <button
                type="button"
                className="btn compact"
                onClick={() => inputRef.current?.click()}
                title="Change image file"
              >
                Change image
              </button>
              <button
                type="button"
                className="icon-button compact danger"
                onClick={clearSelection}
                title="Clear selected image"
                aria-label="Clear selected image"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.svg"
              multiple={!singleRun}
              hidden
              aria-label="Upload image file"
              onChange={event => {
                const chosen = Array.from(event.currentTarget.files || []);
                event.currentTarget.value = '';
                void choose(chosen);
              }}
            />
          </div>
        ) : (
          <div
            className={`dropzone ${isDragging ? 'drag-active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <UploadCloud size={28} />
            <div>
              <b>
                {isDragging
                  ? 'Drop image here to upload'
                  : tool.workflow === 'signature-maker'
                  ? 'Or drag & drop an existing signature image'
                  : 'Drag & drop image here, or click to choose'}
              </b>
              <span>
                JPG, PNG, WebP, GIF or SVG · up to {maxMb} MB
                {!singleRun ? ` · up to ${runLimit} files` : ''}
              </span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.svg"
              multiple={!singleRun}
              hidden
              aria-label="Upload image file"
              onChange={event => {
                const chosen = Array.from(event.currentTarget.files || []);
                event.currentTarget.value = '';
                void choose(chosen);
              }}
            />
          </div>
        )}

        <div className="preview-toolbar">
          <div>
            <span className="eyebrow">Input &amp; preview</span>
            <div className="small muted preview-subtitle">
              {files.length
                ? files[0]!.name
                : isPadActive
                ? 'Live drawn signature on page preview'
                : 'Choose an image to begin editing'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {sourceUrl && activeResultUrl ? (
              <>
                <button
                  type="button"
                  className="btn compact"
                  onClick={() => {
                    setSplitCompare(false);
                    setShowOriginalPreview(v => !v);
                  }}
                >
                  {showOriginalPreview ? 'Show result' : 'Compare original'}
                </button>
                <button
                  type="button"
                  className={`btn compact ${splitCompare ? 'primary' : ''}`}
                  onClick={() => {
                    setShowOriginalPreview(false);
                    setSplitCompare(v => !v);
                  }}
                >
                  <Columns2 size={14} /> {splitCompare ? 'Single view' : 'Before / After'}
                </button>
              </>
            ) : null}
            {photoPreset && (sourceUrl || activeStageSource) ? (
              <button
                type="button"
                className={`btn compact ${showFaceGuide ? 'primary' : ''}`}
                onClick={() => setShowFaceGuide(v => !v)}
                title="Toggle head and shoulders visual framing aid"
              >
                <ScanFace size={14} /> Visual aid guides
              </button>
            ) : null}
            <label className="preview-toggle">
              <input
                type="checkbox"
                checked={livePreview}
                onChange={event => setLivePreview(event.target.checked)}
              />
              Live preview
            </label>
          </div>
        </div>

        {/* Interactive CanvasStage for photo-preset, signature tools, crop, and resize */}
        {isInteractiveStageTool && activeStageSource && !splitCompare && !showOriginalPreview ? (
          <CanvasStage
            imageSource={activeStageSource}
            sourceWidth={activeStageSourceW}
            sourceHeight={activeStageSourceH}
            aspectRatio={
              photoPreset
                ? calculatedPixels.width / Math.max(1, calculatedPixels.height)
                : tool.workflow === 'aspect-crop'
                ? (options.ratioWidth || 1) / (options.ratioHeight || 1)
                : tool.workflow === 'signature-maker'
                ? options.useCustomSize
                  ? calculatedPixels.width / Math.max(1, calculatedPixels.height)
                  : 3
                : tool.workflow === 'signature-resize' || physicalWorkflow
                ? calculatedPixels.width / Math.max(1, calculatedPixels.height)
                : activeStageSourceW / Math.max(1, activeStageSourceH)
            }
            fitMode={photoPreset || tool.workflow === 'aspect-crop' ? 'cover' : 'fit'}
            transform={stageTransform}
            onChange={handleStageTransformChange}
            showGuides={photoPreset ? showFaceGuide : true}
            guideType={photoPreset ? 'face' : tool.workflow === 'signature-trim' || tool.workflow === 'crop' ? 'none' : 'grid'}
            backgroundColor={
              tool.workflow === 'signature-maker' && options.transparentBackground === false
                ? '#ffffff'
                : options.backgroundColor || '#ffffff'
            }
            checkerboard={
              (tool.workflow === 'signature-maker' && options.transparentBackground !== false) ||
              tool.workflow === 'signature-trim' ||
              tool.workflow === 'signature-remove-bg' ||
              tool.workflow === 'signature-png'
            }
            cropMode={tool.workflow === 'signature-trim' || tool.workflow === 'crop'}
            cropBox={activeCropBox}
            onCropChange={box =>
              setOptions(c => ({
                ...c,
                cropX: box.x,
                cropY: box.y,
                cropWidth: box.width,
                cropHeight: box.height,
              }))
            }
            lockCropAspect={tool.workflow === 'signature-trim' ? lockAspect : false}
            onAutoTrim={tool.workflow === 'signature-trim' ? handleAutoTrimSignature : undefined}
            brushEnabled={isSignatureBgTool}
            brushStrokes={options.brushStrokes || []}
            onBrushStrokesChange={(strokes: BrushStroke[]) =>
              setOptions(c => ({ ...c, brushStrokes: strokes }))
            }
            ariaLabel={`Interactive stage for ${tool.name}`}
            onReset={resetSettings}
          />
        ) : (
          <div
            className={`preview-stage ${isDragging ? 'drag-active' : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {sourceUrl ? (
              splitCompare && activeResultUrl ? (
                <div className="before-after-container">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeResultUrl} alt="Processed result preview" className="ba-after-img" />
                  <div className="ba-before-clip" style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sourceUrl} alt="Original source preview" className="ba-before-img" />
                  </div>
                  <div className="ba-divider" style={{ left: `${comparePosition}%` }} aria-hidden="true" />
                  <div className="preview-badge">Before ({comparePosition}%) / After</div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={comparePosition}
                    aria-label="Before and after comparison slider"
                    className="ba-slider"
                    onChange={e => setComparePosition(Number(e.target.value))}
                  />
                </div>
              ) : (
                <div className="preview-stage-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={showOriginalPreview ? sourceUrl : activeResultUrl || sourceUrl}
                    alt="Selected image preview"
                  />
                  <div className="preview-badge">
                    {previewWorking
                      ? 'Updating live preview…'
                      : showOriginalPreview
                      ? 'Original source'
                      : firstResult
                      ? 'Processed result'
                      : previewUrl
                      ? 'Live result preview'
                      : 'Source preview'}
                  </div>
                </div>
              )
            ) : (
              <div
                className="preview-empty large"
                onClick={() => inputRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                <UploadCloud size={34} />
                <b>
                  {isDragging
                    ? 'Drop image file now'
                    : tool.workflow === 'signature-maker'
                    ? 'Draw on the pad above or upload a signature'
                    : 'Drag & drop or choose an image'}
                </b>
                <span>Preview and instant dimensions appear here immediately.</span>
              </div>
            )}
          </div>
        )}

        {photoPreset && (sourceUrl || activeStageSource) && showFaceGuide ? (
          <small className="muted" style={{ display: 'block', marginTop: 6, fontSize: 11 }}>
            Visual aid only: head oval, eye line, crown/chin, and centre lines help frame your portrait (not an official biometric compliance check).
          </small>
        ) : null}

        {/* LiveCroppedPreview for signature-upload-crop */}
        {tool.workflow === 'signature-trim' && previewUrl ? (
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <span className="eyebrow">Live Cropped Signature Preview</span>
              <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
                {previewMeta ? `${previewMeta.width} × ${previewMeta.height} px · ~${formatBytes(previewMeta.size)}` : ''}
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Live cropped signature preview"
              style={{
                maxHeight: 54,
                maxWidth: 220,
                objectFit: 'contain',
                background: 'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 12px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                padding: 4,
              }}
            />
          </div>
        ) : null}

        {/* Live Readout Bar for Passport / ID Photo Preset Tools */}
        {photoPreset ? (
          <div
            className="result-summary"
            role="status"
            aria-live="polite"
            aria-label="Live photo dimensions and size readout"
            style={{ marginTop: 10 }}
          >
            <div>
              <span>Pixel size</span>
              <b>
                {calculatedPixels.width} × {calculatedPixels.height} px
              </b>
            </div>
            <div>
              <span>Physical size</span>
              <b>
                {physicalReadout.wMm} × {physicalReadout.hMm} mm ({physicalReadout.wIn} × {physicalReadout.hIn} in)
              </b>
            </div>
            <div>
              <span>Print density</span>
              <b>{physicalReadout.dpi} DPI</b>
            </div>
            <div>
              <span>Estimated KB</span>
              <b className="positive">
                {firstResult
                  ? formatBytes(firstResult.blob.size)
                  : previewMeta
                  ? `~${formatBytes(previewMeta.size)}`
                  : Number(options.targetKb || 0) > 0
                  ? `≤ ${options.targetKb} KB target`
                  : 'Upload photo'}
              </b>
            </div>
          </div>
        ) : null}

        {sourceMeta && !firstResult && !photoPreset ? (
          <div className="result-summary" role="status" aria-live="polite" aria-label="Source image details">
            <div>
              <span>Source dimensions</span>
              <b>
                {sourceMeta.width} × {sourceMeta.height} px
              </b>
            </div>
            <div>
              <span>File size</span>
              <b>{formatBytes(sourceMeta.size)}</b>
            </div>
            <div>
              <span>Aspect ratio</span>
              <b>
                {sourceMeta.aspectRatio} ({sourceMeta.aspectDecimal})
              </b>
            </div>
            <div>
              <span>Format &amp; layout</span>
              <b>
                {sourceMeta.type} · {sourceMeta.orientation}
              </b>
            </div>
            <div>
              <span>Megapixels</span>
              <b>{sourceMeta.megapixels} MP</b>
            </div>
            {previewMeta ? (
              <div>
                <span>Live estimated size</span>
                <b className="positive">
                  {previewMeta.width} × {previewMeta.height} px · ~{formatBytes(previewMeta.size)}
                </b>
              </div>
            ) : null}
          </div>
        ) : null}

        {firstResult ? (
          <div className="result-summary" role="status" aria-live="polite" aria-label="Processed output summary">
            <div>
              <span>Original size</span>
              <b>{formatBytes(firstResult.originalSize)}</b>
            </div>
            <div>
              <span>Result size</span>
              <b>{formatBytes(firstResult.blob.size)}</b>
            </div>
            <div>
              <span>Output</span>
              <b>
                {firstResult.width} × {firstResult.height} px
              </b>
            </div>
            <div>
              <span>Format</span>
              <b>{outputExt(firstResult.type).toUpperCase()}</b>
            </div>
            {savings !== null ? (
              <div>
                <span>Size change</span>
                <b className={savings >= 0 ? 'positive' : ''}>
                  {savings >= 0 ? `${savings}% smaller` : `${Math.abs(savings)}% larger`}
                </b>
              </div>
            ) : null}
            {['compress', 'compress-target', 'signature-compress'].includes(tool.workflow) ||
            (photoPreset && Number(options.targetKb || 0) > 0) ? (
              <div>
                <span>Target</span>
                <b className={firstResult.targetReached ? 'positive' : 'target-miss'}>
                  {firstResult.targetReached === undefined
                    ? 'Automatic'
                    : firstResult.targetReached
                    ? 'Reached'
                    : 'Closest achievable'}
                </b>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <aside className="editor-controls panel editor-panel">
        <div className="controls-head">
          <div>
            <span className="eyebrow">{tool.category}</span>
            <h2>{tool.name}</h2>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn compact"
              type="button"
              title="Save settings as preset"
              onClick={handleSavePreset}
            >
              Save preset
            </button>
            <button
              className="icon-button"
              type="button"
              title="Reset settings"
              aria-label="Reset settings"
              onClick={resetSettings}
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
        <p className="muted small tool-control-summary">{tool.summary}</p>

        {/* Mobile section tabs so controls are compact on smaller viewports */}
        <div className="mobile-control-tabs" role="tablist" aria-label="Editor controls navigation">
          <button
            type="button"
            role="tab"
            aria-selected={mobileControlTab === 'options'}
            className={`mobile-control-tab ${mobileControlTab === 'options' ? 'active' : ''}`}
            onClick={() => setMobileControlTab('options')}
          >
            Adjust &amp; Controls
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileControlTab === 'info'}
            className={`mobile-control-tab ${mobileControlTab === 'info' ? 'active' : ''}`}
            onClick={() => setMobileControlTab('info')}
          >
            Tips &amp; Info
          </button>
        </div>

        {tool.workflow === 'compress' ? (
          <div className="compress-controls">
            <div className="field">
              <label>Select compression method</label>
              <div className="compression-methods">
                <label className={`compression-method ${compressMode === 'auto' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name={`compress-mode-${tool.id}`}
                    checked={compressMode === 'auto'}
                    onChange={() => setCompressMode('auto')}
                  />
                  <span>
                    <b>Auto</b>
                    <small>Smaller file with strong visual quality.</small>
                  </span>
                </label>
                <label className={`compression-method ${compressMode === 'target' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name={`compress-mode-${tool.id}`}
                    checked={compressMode === 'target'}
                    onChange={() => setCompressMode('target')}
                  />
                  <span>
                    <b>Compress file to</b>
                    <small>Enter the KB or MB limit you need.</small>
                  </span>
                </label>
              </div>
            </div>
          </div>
        ) : null}

        {tool.workflow === 'compress-target' ||
        tool.workflow === 'signature-compress' ||
        (tool.workflow === 'compress' && compressMode === 'target') ? (
          <>
            <div className="target-size-row">
              <div className="field">
                <label htmlFor={`target-size-${tool.id}`}>Target size</label>
                <input
                  id={`target-size-${tool.id}`}
                  aria-label="Target size"
                  type="number"
                  min="1"
                  max={targetUnit === 'MB' ? 50 : 51200}
                  value={targetValue}
                  onChange={event => setTargetValue(Number(event.target.value))}
                />
              </div>
              <div className="field unit-field">
                <label htmlFor={`target-unit-${tool.id}`}>Unit</label>
                <select
                  id={`target-unit-${tool.id}`}
                  aria-label="Target size unit"
                  value={targetUnit}
                  onChange={event => setTargetUnit(event.target.value as TargetUnit)}
                >
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                </select>
              </div>
            </div>
            <div className="target-preset-row">
              {(tool.workflow === 'signature-compress'
                ? [
                    [10, 'KB'],
                    [20, 'KB'],
                    [50, 'KB'],
                    [100, 'KB'],
                  ]
                : [
                    [20, 'KB'],
                    [50, 'KB'],
                    [100, 'KB'],
                    [200, 'KB'],
                    [500, 'KB'],
                  ]
              ).map(([value, unit]) => (
                <button
                  type="button"
                  key={`${value}${unit}`}
                  onClick={() => {
                    setTargetValue(Number(value));
                    setTargetUnit(unit as TargetUnit);
                  }}
                >
                  {value} {unit}
                </button>
              ))}
            </div>
            {tool.workflow === 'signature-compress' ? (
              <div
                className="calculated-size"
                role="status"
                aria-live="polite"
                style={{ marginTop: 6, marginBottom: 8 }}
              >
                <span>Live estimated size</span>
                <b className={previewMeta && previewMeta.size <= targetBytes ? 'positive' : ''}>
                  {previewWorking
                    ? 'Estimating…'
                    : firstResult
                    ? `${formatBytes(firstResult.blob.size)} (final)`
                    : previewMeta
                    ? `~${formatBytes(previewMeta.size)} (target ≤ ${targetValue} ${targetUnit})`
                    : `Target ≤ ${targetValue} ${targetUnit}`}
                </b>
              </div>
            ) : null}
          </>
        ) : null}

        {['compress', 'compress-target', 'signature-compress'].includes(tool.workflow) ? (
          <div className="field">
            <label htmlFor={`compress-format-${tool.id}`}>Output format</label>
            <select
              id={`compress-format-${tool.id}`}
              aria-label="Output format"
              value={compressOutput}
              onChange={event => setCompressOutput(event.target.value as CompressOutput)}
            >
              <option value="keep">Keep original format</option>
              <option value="image/jpeg">JPG</option>
              <option value="image/webp">WebP</option>
              <option value="image/png">PNG</option>
            </select>
          </div>
        ) : null}

        {tool.workflow === 'resize-px' ? (
          <>
            <label className="check">
              <input
                type="checkbox"
                checked={lockAspect}
                onChange={event => setLockAspect(event.target.checked)}
              />
              Lock aspect ratio
            </label>
            <div className="row">
              <div className="field">
                <label htmlFor={`resize-w-${tool.id}`}>Width px</label>
                <input
                  id={`resize-w-${tool.id}`}
                  aria-label="Width px"
                  type="number"
                  min="1"
                  max="8192"
                  value={options.width || ''}
                  onChange={event => resizeWidth(Number(event.target.value))}
                />
              </div>
              <div className="field">
                <label htmlFor={`resize-h-${tool.id}`}>Height px</label>
                <input
                  id={`resize-h-${tool.id}`}
                  aria-label="Height px"
                  type="number"
                  min="1"
                  max="8192"
                  value={options.height || ''}
                  onChange={event => resizeHeight(Number(event.target.value))}
                />
              </div>
            </div>
          </>
        ) : null}

        {physicalWorkflow ? (
          <>
            {tool.workflow === 'signature-resize' ? (
              <div className="field">
                <label>Example portal presets (examples, verify your portal&apos;s rules)</label>
                <div className="target-preset-row" style={{ marginBottom: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setRatio(6 / 2);
                      setOptions(c => ({ ...c, unit: 'cm', physicalWidth: 6, physicalHeight: 2, dpi: 300 }));
                    }}
                  >
                    6 × 2 cm (300 DPI)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRatio(3.5 / 1.5);
                      setOptions(c => ({ ...c, unit: 'cm', physicalWidth: 3.5, physicalHeight: 1.5, dpi: 200 }));
                    }}
                  >
                    3.5 × 1.5 cm (200 DPI)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRatio(140 / 60);
                      setOptions(c => ({ ...c, unit: 'px', physicalWidth: 140, physicalHeight: 60 }));
                    }}
                  >
                    140 × 60 px
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRatio(300 / 100);
                      setOptions(c => ({ ...c, unit: 'px', physicalWidth: 300, physicalHeight: 100 }));
                    }}
                  >
                    300 × 100 px
                  </button>
                </div>
                <small className="muted">
                  These presets are examples only — always verify your specific portal&apos;s rules before uploading.
                </small>
              </div>
            ) : null}
            <label className="check">
              <input
                type="checkbox"
                checked={lockAspect}
                onChange={event => setLockAspect(event.target.checked)}
              />
              Lock aspect ratio
            </label>
            <div className="field">
              <label htmlFor={`phys-unit-${tool.id}`}>Unit</label>
              {tool.workflow === 'resize-physical' ? (
                <div className="locked-format">
                  <Check size={16} />
                  <span>{(tool.defaultUnit || 'cm').toUpperCase()}</span>
                </div>
              ) : (
                <select
                  id={`phys-unit-${tool.id}`}
                  aria-label="Measurement unit"
                  value={options.unit || 'cm'}
                  onChange={event =>
                    setOptions(current => ({ ...current, unit: event.target.value as PhysicalUnit }))
                  }
                >
                  <option value="px">Pixels</option>
                  <option value="cm">CM</option>
                  <option value="mm">MM</option>
                  <option value="in">Inches</option>
                </select>
              )}
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor={`field-${tool.id}-physicalWidth`}>Width</label>
                <input
                  id={`field-${tool.id}-physicalWidth`}
                  aria-label="Width"
                  type="number"
                  min={0.01}
                  max={10000}
                  step={0.01}
                  value={Number(options.physicalWidth ?? 0)}
                  onChange={event => resizePhysicalWidth(Number(event.target.value))}
                />
              </div>
              <div className="field">
                <label htmlFor={`field-${tool.id}-physicalHeight`}>Height</label>
                <input
                  id={`field-${tool.id}-physicalHeight`}
                  aria-label="Height"
                  type="number"
                  min={0.01}
                  max={10000}
                  step={0.01}
                  value={Number(options.physicalHeight ?? 0)}
                  onChange={event => resizePhysicalHeight(Number(event.target.value))}
                />
              </div>
            </div>
            {(options.unit || 'cm') !== 'px' ? numberField('dpi', 'DPI', 36, 1200, 1) : null}
            <div className="calculated-size" role="status" aria-live="polite">
              <span>Live pixel readout</span>
              <b>
                {calculatedPixels.width} × {calculatedPixels.height} px
                {(options.unit || 'cm') !== 'px' ? ` (${options.dpi || 300} DPI)` : ''}
              </b>
            </div>
          </>
        ) : null}

        {tool.workflow === 'crop' || tool.workflow === 'signature-trim' ? (
          <>
            {tool.workflow === 'signature-trim' ? (
              <>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={lockAspect}
                    onChange={event => setLockAspect(event.target.checked)}
                  />
                  Lock crop aspect ratio
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    type="button"
                    className="btn compact primary"
                    onClick={handleAutoTrimSignature}
                    disabled={!loadedImage && !padCanvasSource}
                  >
                    <Scissors size={14} /> Auto-Trim Ink Bounds
                  </button>
                  <button
                    type="button"
                    className="btn compact"
                    onClick={() => applyCropPreset('full')}
                  >
                    Full Image
                  </button>
                </div>
              </>
            ) : (
              <div className="field">
                <label>Quick crop presets</label>
                <div className="target-preset-row">
                  <button type="button" onClick={() => applyCropPreset('full')}>
                    Full
                  </button>
                  <button type="button" onClick={() => applyCropPreset('center80')}>
                    Center 80%
                  </button>
                  <button type="button" onClick={() => applyCropPreset(1)}>
                    1:1 Square
                  </button>
                  <button type="button" onClick={() => applyCropPreset(3 / 4)}>
                    3:4 Portrait
                  </button>
                  <button type="button" onClick={() => applyCropPreset(35 / 45)}>
                    35:45 ID
                  </button>
                  <button type="button" onClick={() => applyCropPreset(16 / 9)}>
                    16:9 Wide
                  </button>
                </div>
              </div>
            )}
            <div className="row">
              {numberField('cropX', 'X (px)', 0)}
              {numberField('cropY', 'Y (px)', 0)}
            </div>
            <div className="row">
              {numberField('cropWidth', 'Width (px)', 1)}
              {numberField('cropHeight', 'Height (px)', 1)}
            </div>
            {tool.workflow === 'signature-trim' ? (
              <>
                {rangeField('trimMargin', 'Auto-trim padding (px)', 0, 100, 1)}
                <small className="muted">
                  Drag any of the 8 crop handles on the stage or click Auto-Trim Ink Bounds to snap tightly around your signature.
                </small>
              </>
            ) : null}
          </>
        ) : null}

        {tool.workflow === 'aspect-crop' ? (
          <>
            <div className="field">
              <label htmlFor={`aspect-ratio-${tool.id}`}>Aspect ratio</label>
              <select
                id={`aspect-ratio-${tool.id}`}
                aria-label="Aspect ratio"
                value={`${options.ratioWidth || 1}:${options.ratioHeight || 1}`}
                onChange={event => {
                  const [w, h] = event.target.value.split(':').map(Number);
                  setOptions(current => ({ ...current, ratioWidth: w, ratioHeight: h }));
                }}
              >
                <option value="1:1">1:1 Square</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4 Portrait</option>
                <option value="16:9">16:9 Wide</option>
                <option value="9:16">9:16 Vertical</option>
                <option value="5:4">5:4</option>
              </select>
            </div>
            {rangeField('zoom', 'Zoom level', 0.25, 2.5, 0.05)}
            {rangeField('anchorX', 'Horizontal position', 0, 1, 0.05)}
            {rangeField('anchorY', 'Vertical position', 0, 1, 0.05)}
          </>
        ) : null}

        {photoPreset ? (
          <>
            <div className="field">
              <label>Physical size preset &amp; dimensions</label>
              {dedicatedPreset ? (
                <div className="locked-format">
                  <Check size={16} />
                  <span>
                    {tool.preset?.width} × {tool.preset?.height} {tool.preset?.unit}
                  </span>
                </div>
              ) : (
                <>
                  <div className="target-preset-row" style={{ marginBottom: '8px' }}>
                    <button
                      type="button"
                      onClick={() =>
                        setOptions(c => ({ ...c, physicalWidth: 35, physicalHeight: 45, unit: 'mm' }))
                      }
                    >
                      35×45 mm
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOptions(c => ({ ...c, physicalWidth: 2, physicalHeight: 2, unit: 'in' }))
                      }
                    >
                      2×2 in
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOptions(c => ({ ...c, physicalWidth: 3.5, physicalHeight: 4.5, unit: 'cm' }))
                      }
                    >
                      3.5×4.5 cm
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOptions(c => ({ ...c, physicalWidth: 25, physicalHeight: 35, unit: 'mm' }))
                      }
                    >
                      25×35 mm
                    </button>
                  </div>
                  <div className="row">
                    {numberField('physicalWidth', 'Width', 0.1, 500, 0.1)}
                    {numberField('physicalHeight', 'Height', 0.1, 500, 0.1)}
                  </div>
                  <div className="field">
                    <label htmlFor={`preset-unit-${tool.id}`}>Measurement unit</label>
                    <select
                      id={`preset-unit-${tool.id}`}
                      aria-label="Measurement unit"
                      value={options.unit || tool.preset?.unit || 'mm'}
                      onChange={event =>
                        setOptions(current => ({ ...current, unit: event.target.value as PhysicalUnit }))
                      }
                    >
                      <option value="mm">MM</option>
                      <option value="cm">CM</option>
                      <option value="in">Inches</option>
                      <option value="px">Pixels</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            {numberField('dpi', 'DPI (Print & Portal Density)', 72, 1200, 1)}
            <div className="calculated-size">
              <span>Single photo output</span>
              <b>
                {calculatedPixels.width} × {calculatedPixels.height} px · {physicalReadout.wMm} × {physicalReadout.hMm} mm
              </b>
            </div>

            {numberField('targetKb', 'Target KB (0 = none)', 0, 2048, 5)}
            <div className="target-preset-row" style={{ marginBottom: '8px' }}>
              <button type="button" onClick={() => setOptions(c => ({ ...c, targetKb: 0 }))}>
                No limit
              </button>
              <button type="button" onClick={() => setOptions(c => ({ ...c, targetKb: 20 }))}>
                20 KB
              </button>
              <button type="button" onClick={() => setOptions(c => ({ ...c, targetKb: 50 }))}>
                50 KB
              </button>
              <button type="button" onClick={() => setOptions(c => ({ ...c, targetKb: 100 }))}>
                100 KB
              </button>
              <button type="button" onClick={() => setOptions(c => ({ ...c, targetKb: 200 }))}>
                200 KB
              </button>
            </div>

            {rangeField('brightness', 'Brightness (%)', 50, 150, 1)}
            {rangeField('contrast', 'Contrast (%)', 50, 150, 1)}

            <div className="field">
              <label htmlFor={`bg-color-${tool.id}`}>Background / Padding colour</label>
              <div className="target-preset-row" style={{ marginBottom: '6px' }}>
                {PHOTO_BG_PRESETS.map(p => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setOptions(c => ({ ...c, backgroundColor: p.hex }))}
                    style={{
                      borderColor: (options.backgroundColor || '#ffffff').toLowerCase() === p.hex ? '#1769e8' : undefined,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: p.hex,
                        border: '1px solid #94a3b8',
                        display: 'inline-block',
                      }}
                    />
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                id={`bg-color-${tool.id}`}
                aria-label="Background colour"
                type="color"
                value={options.backgroundColor || '#ffffff'}
                onChange={event => setOptions(current => ({ ...current, backgroundColor: event.target.value }))}
              />
            </div>

            <label className="check">
              <input
                type="checkbox"
                checked={Boolean(options.replaceBackground)}
                onChange={event =>
                  setOptions(current => ({ ...current, replaceBackground: event.target.checked }))
                }
              />
              Replace plain edge-connected background (plain backgrounds only)
            </label>
            {edgeVarianceInfo?.highVariance ? (
              <div
                className="notice warning"
                role="alert"
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 4, marginBottom: 8 }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  High edge variance ({edgeVarianceInfo.variance}) detected on this photo&apos;s border. Background fill works cleanly on plain, evenly lit walls only.
                </span>
              </div>
            ) : null}
            {options.replaceBackground ? (
              <>
                {rangeField('amount', 'Background tolerance', 5, 220, 1)}
                <small className="muted">
                  Plain backgrounds only: works best when photographed against a solid, evenly lit wall.
                </small>
              </>
            ) : null}

            <label className="check">
              <input
                type="checkbox"
                checked={Boolean(options.a4Sheet)}
                onChange={event => setOptions(current => ({ ...current, a4Sheet: event.target.checked }))}
              />
              Generate printable A4 photo sheet (with outside cut guides)
            </label>
            {options.a4Sheet ? (
              <>
                <div className="field">
                  <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor={`a4-count-${tool.id}`}>Photos on sheet</label>
                    {a4Layout && a4Layout.maxFit > 0 ? (
                      <button
                        type="button"
                        className="btn compact"
                        onClick={() => setOptions(current => ({ ...current, a4Count: 0 }))}
                        title={`Set count to maximum printable fit (${a4Layout.maxFit} photos)`}
                      >
                        <Grid size={13} /> Max fit ({a4Layout.maxFit})
                      </button>
                    ) : null}
                  </div>
                  <select
                    id={`a4-count-${tool.id}`}
                    aria-label="Photos on sheet"
                    value={options.a4Count ?? 8}
                    onChange={event => setOptions(current => ({ ...current, a4Count: Number(event.target.value) }))}
                  >
                    <option value="4">4 photos</option>
                    <option value="6">6 photos</option>
                    <option value="8">8 photos</option>
                    <option value="12">12 photos</option>
                    <option value="16">16 photos</option>
                    <option value="24">24 photos</option>
                    <option value="30">30 photos</option>
                    <option value="36">36 photos</option>
                    <option value="0">Max fit ({a4Layout?.maxFit || 'auto'} photos)</option>
                  </select>
                </div>
                <div className="row">
                  {numberField('a4MarginMm', 'Margin (mm)', 2, 30, 1)}
                  {numberField('a4SpacingMm', 'Gap / Spacing (mm)', 1, 20, 1)}
                </div>

                {/* Live A4 Sheet Grid Preview */}
                {a4Layout ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      padding: 10,
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      marginBottom: 8,
                    }}
                  >
                    <canvas
                      ref={a4PreviewCanvasRef}
                      aria-label="Live A4 sheet grid preview"
                      style={{
                        width: 70,
                        height: 99,
                        borderRadius: 4,
                        boxShadow: '0 1px 4px rgba(15,23,42,0.12)',
                        flexShrink: 0,
                        background: '#ffffff',
                      }}
                    />
                    <div style={{ fontSize: 12, lineHeight: 1.45, color: '#334155' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                        A4 Sheet Live Layout ({a4Layout.placed} photos)
                      </div>
                      <div>
                        Grid: <b>{a4Layout.cols} × {a4Layout.rows}</b> (Max fit: {a4Layout.maxFit})
                      </div>
                      <div>
                        Margin: <b>{options.a4MarginMm ?? 10} mm</b> · Gap: <b>{options.a4SpacingMm ?? 4} mm</b>
                      </div>
                      <div style={{ color: !a4Layout.hasOverlap && a4Layout.withinBounds ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
                        {!a4Layout.hasOverlap && a4Layout.withinBounds
                          ? '✓ No tile overlap · Cut guides outside photo edges'
                          : '⚠ Adjust photo size or margins to fit A4 sheet'}
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
            <small className="muted">
              Presets are editable. Always verify the official photo specifications of your specific application portal before submission.
            </small>
          </>
        ) : null}

        {tool.workflow === 'dpi' ? (
          <>
            {numberField('dpi', 'DPI', 36, 1200, 1)}
            <small className="muted">Changes density metadata only; pixel dimensions remain unchanged.</small>
          </>
        ) : null}

        {tool.workflow === 'signature-maker' ? (
          <>
            <div className="field">
              <label>Export background</label>
              <div className="target-preset-row">
                <button
                  type="button"
                  onClick={() => setOptions(c => ({ ...c, transparentBackground: true }))}
                  style={{ borderColor: options.transparentBackground !== false ? '#1769e8' : undefined }}
                >
                  Transparent PNG
                </button>
                <button
                  type="button"
                  onClick={() => setOptions(c => ({ ...c, transparentBackground: false }))}
                  style={{ borderColor: options.transparentBackground === false ? '#1769e8' : undefined }}
                >
                  White background
                </button>
              </div>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={options.autoTrim !== false}
                onChange={event => setOptions(current => ({ ...current, autoTrim: event.target.checked }))}
              />
              Auto-trim blank whitespace around signature
            </label>
            {options.autoTrim !== false ? (
              rangeField('trimMargin', 'Trim padding (px)', 0, 120, 1)
            ) : null}
            <label className="check">
              <input
                type="checkbox"
                checked={Boolean(options.useCustomSize)}
                onChange={event => setOptions(current => ({ ...current, useCustomSize: event.target.checked }))}
              />
              Set custom export size (px / cm / mm / in + DPI)
            </label>
            {options.useCustomSize ? (
              <>
                <div className="field">
                  <label htmlFor={`sig-unit-${tool.id}`}>Unit</label>
                  <select
                    id={`sig-unit-${tool.id}`}
                    aria-label="Signature size unit"
                    value={options.unit || 'px'}
                    onChange={event =>
                      setOptions(current => ({ ...current, unit: event.target.value as PhysicalUnit }))
                    }
                  >
                    <option value="px">Pixels (px)</option>
                    <option value="cm">Centimetres (cm)</option>
                    <option value="mm">Millimetres (mm)</option>
                    <option value="in">Inches (in)</option>
                  </select>
                </div>
                {(options.unit || 'px') === 'px' ? (
                  <div className="row">
                    {numberField('width', 'Width (px)', 16, 4096, 1)}
                    {numberField('height', 'Height (px)', 16, 4096, 1)}
                  </div>
                ) : (
                  <div className="row">
                    {numberField('physicalWidth', `Width (${options.unit})`, 0.1, 500, 0.1)}
                    {numberField('physicalHeight', `Height (${options.unit})`, 0.1, 500, 0.1)}
                  </div>
                )}
                <div className="calculated-size">
                  <span>Export dimensions</span>
                  <b>
                    {calculatedPixels.width} × {calculatedPixels.height} px ({options.dpi || 300} DPI)
                  </b>
                </div>
              </>
            ) : null}
            {numberField('dpi', 'DPI metadata', 72, 1200, 1)}
          </>
        ) : null}

        {isSignatureBgTool ? (
          <>
            {rangeField('amount', 'Paper threshold', 5, 220, 1)}
            {rangeField('softness', 'Edge softness', 0, 100, 1)}
            <label className="check">
              <input
                type="checkbox"
                checked={Boolean(options.recolorInk)}
                onChange={event => setOptions(current => ({ ...current, recolorInk: event.target.checked }))}
              />
              Recolor signature ink
            </label>
            {options.recolorInk ? (
              <div className="field">
                <label htmlFor={`sig-ink-color-${tool.id}`}>Target ink color</label>
                <div className="target-preset-row" style={{ marginBottom: 6 }}>
                  {SIGNATURE_INK_PRESETS.map(p => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setOptions(c => ({ ...c, inkColor: p.hex }))}
                      style={{
                        borderColor: (options.inkColor || '#0f172a').toLowerCase() === p.hex ? '#1769e8' : undefined,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  id={`sig-ink-color-${tool.id}`}
                  aria-label="Target ink color"
                  type="color"
                  value={options.inkColor || '#0f172a'}
                  onChange={event => setOptions(current => ({ ...current, inkColor: event.target.value }))}
                />
              </div>
            ) : null}
            <label className="check">
              <input
                type="checkbox"
                checked={options.autoTrim !== false}
                onChange={event => setOptions(current => ({ ...current, autoTrim: event.target.checked }))}
              />
              Auto-trim blank margins
            </label>
            {options.autoTrim !== false ? rangeField('trimMargin', 'Trim margin (px)', 0, 150, 1) : null}
            <small className="muted">
              Use the Eraser Brush or Restore Ink buttons on the stage toolbar above to touch up stamps, lines, or faint strokes with full Undo/Redo.
            </small>
          </>
        ) : null}

        {tool.workflow === 'rotate' ? (
          <>
            <div className="field">
              <label htmlFor={`rotate-angle-${tool.id}`}>Rotate</label>
              <select
                id={`rotate-angle-${tool.id}`}
                aria-label="Rotate"
                value={options.angle}
                onChange={event => setOptions(current => ({ ...current, angle: Number(event.target.value) }))}
              >
                <option value="0">0° (flip only)</option>
                <option value="90">90° clockwise</option>
                <option value="180">180°</option>
                <option value="270">270° clockwise</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor={`rotate-flip-${tool.id}`}>Flip after rotation</label>
              <select
                id={`rotate-flip-${tool.id}`}
                aria-label="Flip after rotation"
                value={options.flip || 'none'}
                onChange={event =>
                  setOptions(current => ({ ...current, flip: event.target.value as ImageOptions['flip'] }))
                }
              >
                <option value="none">No flip</option>
                <option value="horizontal">Flip horizontally</option>
                <option value="vertical">Flip vertically</option>
              </select>
            </div>
          </>
        ) : null}
        {tool.workflow === 'upscale' ? (
          <div className="field">
            <label htmlFor={`upscale-scale-${tool.id}`}>Scale</label>
            <select
              id={`upscale-scale-${tool.id}`}
              aria-label="Scale"
              value={options.amount}
              onChange={event => setOptions(current => ({ ...current, amount: Number(event.target.value) }))}
            >
              <option value="2">2×</option>
              <option value="3">3×</option>
              <option value="4">4×</option>
            </select>
          </div>
        ) : null}
        {tool.workflow === 'text-overlay' ? (
          <>
            <div className="field">
              <label htmlFor={`overlay-text-${tool.id}`}>Overlay text</label>
              <input
                id={`overlay-text-${tool.id}`}
                aria-label="Overlay text"
                maxLength={250}
                value={options.text || ''}
                onChange={event => setOptions(current => ({ ...current, text: event.target.value }))}
                placeholder="Enter your text here..."
              />
            </div>
            <div className="field">
              <label htmlFor={`overlay-pos-${tool.id}`}>Position</label>
              <select
                id={`overlay-pos-${tool.id}`}
                aria-label="Text position"
                value={options.position || 'center'}
                onChange={event =>
                  setOptions(current => ({
                    ...current,
                    position: event.target.value as ImageOptions['position'],
                  }))
                }
              >
                <option value="center">Center</option>
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
              </select>
            </div>
            <div className="row">
              {numberField('fontSize', 'Font size', 12, 500)}
              <div className="field">
                <label htmlFor={`overlay-color-${tool.id}`}>Text colour</label>
                <input
                  id={`overlay-color-${tool.id}`}
                  aria-label="Text colour"
                  type="color"
                  value={options.color || '#ffffff'}
                  onChange={event => setOptions(current => ({ ...current, color: event.target.value }))}
                />
              </div>
            </div>
            {rangeField('opacity', 'Opacity', 0.05, 1, 0.05)}
          </>
        ) : null}
        {tool.workflow === 'photo-editor' ? (
          <>
            <div className="field">
              <label>Quick adjustments</label>
              <div className="target-preset-row">
                <button
                  type="button"
                  onClick={() =>
                    setOptions(c => ({ ...c, brightness: 100, contrast: 100, saturation: 100, blur: 0 }))
                  }
                >
                  Reset 100%
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setOptions(c => ({ ...c, brightness: 112, contrast: 108, saturation: 105, blur: 0 }))
                  }
                >
                  Brighten
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setOptions(c => ({ ...c, brightness: 102, contrast: 122, saturation: 108, blur: 0 }))
                  }
                >
                  Crisp Contrast
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setOptions(c => ({ ...c, brightness: 105, contrast: 110, saturation: 0, blur: 0 }))
                  }
                >
                  B&amp;W
                </button>
              </div>
            </div>
            {rangeField('brightness', 'Brightness', 0, 200)}
            {rangeField('contrast', 'Contrast', 0, 200)}
            {rangeField('saturation', 'Saturation', 0, 200)}
            {rangeField('blur', 'Blur', 0, 30)}
          </>
        ) : null}
        {tool.workflow === 'dimension-check' ? (
          <div className="notice" role="status" aria-live="polite">
            {sourceMeta
              ? `Detected: ${sourceMeta.width} × ${sourceMeta.height} px · ${sourceMeta.aspectRatio} (${sourceMeta.orientation}) · ${sourceMeta.megapixels} MP · ${formatBytes(sourceMeta.size)}`
              : 'Upload an image to inspect actual dimensions, aspect ratio, orientation, and file metadata.'}
          </div>
        ) : null}
        {tool.workflow === 'quality-check' ? (
          <div className="notice" role="status" aria-live="polite">
            {sourceMeta
              ? `Source: ${formatBytes(sourceMeta.size)} (${sourceMeta.type}) · ${sourceMeta.bitsPerPixel} bits/px. Adjust quality below and click Analyze & Export to compare.`
              : 'Upload an image to analyze file size, format, dimensions, and test quick browser compression reduction.'}
          </div>
        ) : null}
        {tool.workflow === 'remove-metadata' ? (
          <div className="notice">
            The output is freshly encoded from visible pixels, so source EXIF/GPS metadata is stripped and verified clean.
          </div>
        ) : null}

        {!['compress', 'compress-target', 'signature-compress'].includes(tool.workflow) ? (
          tool.workflow === 'jpg-to-png' ? (
            <div className="field">
              <label htmlFor={`out-fmt-${tool.id}`}>Output format</label>
              <select
                id={`out-fmt-${tool.id}`}
                aria-label="Output format"
                value={options.format === 'image/webp' ? 'image/webp' : 'image/png'}
                onChange={event =>
                  setOptions(current => ({ ...current, format: event.target.value as OutputFormat }))
                }
              >
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
              </select>
            </div>
          ) : tool.workflow === 'dpi' || photoPreset ? (
            <div className="field">
              <label htmlFor={`out-fmt-${tool.id}`}>Output format</label>
              <select
                id={`out-fmt-${tool.id}`}
                aria-label="Output format"
                value={options.format === 'image/png' ? 'image/png' : 'image/jpeg'}
                onChange={event =>
                  setOptions(current => ({ ...current, format: event.target.value as OutputFormat }))
                }
              >
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
              </select>
            </div>
          ) : !forcedType ? (
            <div className="field">
              <label htmlFor={`out-fmt-${tool.id}`}>Output format</label>
              <select
                id={`out-fmt-${tool.id}`}
                aria-label="Output format"
                value={options.format}
                onChange={event =>
                  setOptions(current => ({ ...current, format: event.target.value as OutputFormat }))
                }
              >
                <option value="image/webp">WebP</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
              </select>
            </div>
          ) : (
            <div className="locked-format">
              <Check size={16} />
              <span>Output fixed to {outputExt(forcedType).toUpperCase()}</span>
            </div>
          )
        ) : null}

        {showQuality ? (
          <div className="field">
            <div className="label-row">
              <label htmlFor={`out-quality-${tool.id}`}>Output quality</label>
              <span>{Math.round(Number(options.quality || 0.9) * 100)}%</span>
            </div>
            <input
              id={`out-quality-${tool.id}`}
              aria-label="Output quality"
              type="range"
              min="10"
              max="100"
              value={Math.round(Number(options.quality || 0.9) * 100)}
              onChange={event =>
                setOptions(current => ({ ...current, quality: Number(event.target.value) / 100 }))
              }
            />
          </div>
        ) : null}

        {working ? (
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Processing ${progress}%`}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        ) : null}

        <button className="btn primary action-big" type="button" disabled={working} onClick={() => void run()}>
          {working ? (
            <>
              <Sparkles size={18} /> Processing {progress}%
            </>
          ) : (
            <>
              <Play size={18} />
              {actionLabel}
            </>
          )}
        </button>

        {working ? (
          <button className="btn" type="button" onClick={() => cancelActiveJob(true)}>
            <X size={17} /> Cancel
          </button>
        ) : null}

        {error ? (
          <div className="error" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}
        {message ? (
          <div
            className={`notice ${firstResult?.targetReached === false ? 'warning' : ''}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        ) : null}

        {firstResult ? (
          <div className="result-ready" role="region" aria-live="polite" aria-label="Processed result download">
            <div>
              <Check size={16} />
              <div>
                <b>{results.length > 1 ? 'Results ready' : 'Result ready'}</b>
                <span>
                  {results.length > 1
                    ? `${results.length} files processed`
                    : `${formatBytes(firstResult.blob.size)} · ${firstResult.width} × ${firstResult.height} px · ${outputExt(firstResult.type).toUpperCase()}`}
                </span>
              </div>
            </div>
            <div className="result-actions">
              {results.length === 1 ? (
                <>
                  <button
                    type="button"
                    className="btn success desktop-only-action"
                    onClick={() => downloadBlob(firstResult.blob, firstResult.name)}
                  >
                    <Download size={18} /> Download
                  </button>
                  <a className="btn" href={firstResult.url} target="_blank" rel="noopener noreferrer">
                    <Eye size={18} /> Preview
                  </a>
                  <button type="button" className="btn" onClick={() => void shareResult(firstResult)}>
                    <Share2 size={18} /> Share
                  </button>
                </>
              ) : batchBlob ? (
                <button
                  type="button"
                  className="btn success desktop-only-action"
                  onClick={() => downloadBlob(batchBlob, `ajn-buzz-${tool.id}-${Date.now()}.zip`)}
                >
                  <FileArchive size={18} /> Download {results.length} results
                </button>
              ) : null}
              <button type="button" className="btn" onClick={processAnother}>
                <RefreshCcw size={18} /> Process another
              </button>
            </div>
          </div>
        ) : null}

        <div className="pro-tip-box" role="note" aria-label={proTip.title}>
          <div className="pro-tip-head">
            <Lightbulb size={15} />
            <b>{proTip.title}</b>
          </div>
          <p>{proTip.tip}</p>
        </div>

        <div className="privacy-note">
          <ShieldMini />
          <div>
            <b>Browser processing</b>
            <span>No sign-in required.</span>
          </div>
        </div>
      </aside>

      {/* Sticky mobile bottom action bar: ONE primary action, single-line label, positioned above bottom nav */}
      <div
        className="mobile-editor-action-bar"
        role="region"
        aria-label="Primary tool action"
        style={{ display: keyboardOpen ? 'none' : undefined }}
      >
        {firstResult ? (
          results.length === 1 ? (
            <>
              <button
                type="button"
                className="btn success primary-action-btn"
                onClick={() => downloadBlob(firstResult.blob, firstResult.name)}
                title={`Download ${firstResult.name}`}
              >
                <Download size={17} />
                <span className="single-line-label">Download · {formatBytes(firstResult.blob.size)}</span>
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={processAnother}
                title="Process another image"
                aria-label="Process another image"
              >
                <RefreshCcw size={16} />
              </button>
            </>
          ) : batchBlob ? (
            <>
              <button
                type="button"
                className="btn success primary-action-btn"
                onClick={() => downloadBlob(batchBlob, `ajn-buzz-${tool.id}-${Date.now()}.zip`)}
              >
                <FileArchive size={17} />
                <span className="single-line-label">Download ZIP ({results.length})</span>
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={processAnother}
                title="Process another image"
                aria-label="Process another image"
              >
                <RefreshCcw size={16} />
              </button>
            </>
          ) : null
        ) : working ? (
          <button type="button" className="btn primary-action-btn" onClick={() => cancelActiveJob(true)}>
            <X size={17} />
            <span className="single-line-label">Cancel ({progress}%)</span>
          </button>
        ) : (
          <button type="button" className="btn primary primary-action-btn" onClick={() => void run()}>
            <Play size={17} />
            <span className="single-line-label">{actionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function ShieldMini() {
  return <span className="shield-mini">✓</span>;
}
