'use client';

import {
  ArrowLeftRight, BadgeCheck, Blend, Circle, CircleDotDashed, CircleOff, Code2, Coffee, Contrast, Crop, Eraser,
  FileImage, FlipHorizontal2, Frame, Gauge, Grid3X3, Images, Maximize2, Minimize2, Palette,
  PenLine, Pipette, RefreshCw, RotateCw, Ruler, Scaling, ScanFace, ShieldCheck, SlidersHorizontal,
  SmilePlus, SquareRoundCorner, Stamp, Sun, type LucideIcon,
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  ArrowLeftRight, BadgeCheck, Blend, Circle, CircleDotDashed, CircleOff, Code2, Coffee, Contrast, Crop, Eraser,
  FileImage, FlipHorizontal2, Frame, Gauge, Grid3X3, Images, Maximize2, Minimize2, Palette,
  PenLine, Pipette, RefreshCw, RotateCw, Ruler, Scaling, ScanFace, ShieldCheck, SlidersHorizontal,
  SmilePlus, SquareRoundCorner, Stamp, Sun,
};

export function ToolIcon({ name, size = 23 }: { name: string; size?: number }) {
  const Icon = icons[name] || FileImage;
  return <Icon size={size} strokeWidth={2.1} aria-hidden="true" />;
}
