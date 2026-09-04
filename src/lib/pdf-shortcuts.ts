import type { LucideIcon } from "lucide-react";
import {
  ArchiveRestore,
  Layout,
  PenTool,
  Scissors,
  ShieldCheck,
  Shrink,
  Stamp,
  Type,
} from "lucide-react";

export type PdfShortcut = {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "red" | "amber";
};

const AJN_PDF = "https://ajnpdf.com";

export const PDF_SHORTCUTS: PdfShortcut[] = [
  {
    id: "merge-pdf",
    name: "Merge PDF",
    description: "Combine PDF files in AJN PDF.",
    href: `${AJN_PDF}/merge-pdf`,
    icon: Layout,
    tone: "blue",
  },
  {
    id: "split-pdf",
    name: "Split PDF",
    description: "Extract or separate PDF pages.",
    href: `${AJN_PDF}/split-pdf`,
    icon: Scissors,
    tone: "red",
  },
  {
    id: "compress-pdf",
    name: "Compress PDF",
    description: "Reduce PDF file size in AJN PDF.",
    href: `${AJN_PDF}/compress-pdf`,
    icon: Shrink,
    tone: "green",
  },
  {
    id: "protect-pdf",
    name: "Protect PDF",
    description: "Password-protect a PDF.",
    href: `${AJN_PDF}/protect-pdf`,
    icon: ShieldCheck,
    tone: "blue",
  },
  {
    id: "unlock-pdf",
    name: "Unlock PDF",
    description: "Remove encryption with the valid password.",
    href: `${AJN_PDF}/unlock-pdf`,
    icon: ArchiveRestore,
    tone: "green",
  },
  {
    id: "sign-pdf",
    name: "Sign PDF",
    description: "Open the PDF signing workflow.",
    href: `${AJN_PDF}/sign-pdf`,
    icon: PenTool,
    tone: "amber",
  },
  {
    id: "add-text",
    name: "Add Text",
    description: "Place text on PDF pages.",
    href: `${AJN_PDF}/add-text`,
    icon: Type,
    tone: "blue",
  },
  {
    id: "watermark-pdf",
    name: "Watermark PDF",
    description: "Add a text watermark to a PDF.",
    href: `${AJN_PDF}/watermark-pdf`,
    icon: Stamp,
    tone: "red",
  },
];
