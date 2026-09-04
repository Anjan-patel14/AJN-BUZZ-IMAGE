/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  Check,
  Download,
  Eye,
  FileArchive,
  Play,
  RefreshCcw,
  RotateCcw,
  Share2,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import {
  compressImage,
  imageDimensions,
  processImage,
  type CompressionMode,
  type ImageOptions,
  type ImageProcessResult,
  type OutputFormat,
} from "@/lib/image-engine";
import type { ImageTool } from "@/lib/image-tools";
import { markRecentTool } from "@/lib/tool-state";

function outputExt(type: string) {
  return type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "png";
}
function safeName(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "image"
  );
}
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
function sourceFormat(file: File): OutputFormat | null {
  return file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
    ? file.type
    : null;
}

type CompressOutput = "auto" | "keep" | OutputFormat;
type TargetUnit = "KB" | "MB";
type ProcessedItem = ImageProcessResult & {
  name: string;
  url: string;
  originalSize: number;
};

const DEFAULT_OPTIONS: ImageOptions = {
  quality: 0.9,
  format: "image/webp",
  angle: 90,
  flip: "none",
  amount: 42,
  opacity: 0.55,
  fontSize: 48,
  color: "#ffffff",
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  position: "center",
  width: 1200,
  height: 630,
};

export function ImageEditor({ tool }: { tool: ImageTool }) {
  const [files, setFiles] = useState<File[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [results, setResults] = useState<ProcessedItem[]>([]);
  const [batchUrl, setBatchUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [previewWorking, setPreviewWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const supportsLivePreview = ![
    "compress",
    "background-remover",
    "upscale",
  ].includes(tool.id);
  const [livePreview, setLivePreview] = useState(supportsLivePreview);
  const [lockAspect, setLockAspect] = useState(true);
  const [ratio, setRatio] = useState(1);
  const [autoBackground, setAutoBackground] = useState(true);
  const [options, setOptions] = useState<ImageOptions>({ ...DEFAULT_OPTIONS });
  const [compressMode, setCompressMode] = useState<CompressionMode>("auto");
  const [targetValue, setTargetValue] = useState(100);
  const [targetUnit, setTargetUnit] = useState<TargetUnit>("KB");
  const [compressOutput, setCompressOutput] = useState<CompressOutput>("auto");
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRun = useRef(0);
  const cancelled = useRef(false);
  const objectUrls = useRef<Set<string>>(new Set());
  const configuredMaxMb = Number(
    process.env.NEXT_PUBLIC_IMAGE_MAX_INPUT_MB || 30,
  );
  const maxMb = Number.isFinite(configuredMaxMb)
    ? Math.min(50, Math.max(1, configuredMaxMb))
    : 30;
  const configuredBatchRaw = Number(
    process.env.NEXT_PUBLIC_IMAGE_BATCH_LIMIT || 20,
  );
  const configuredBatch = Number.isFinite(configuredBatchRaw)
    ? Math.min(20, Math.max(1, Math.round(configuredBatchRaw)))
    : 20;
  const runLimit = tool.id === "compress" ? 1 : configuredBatch;

  const forcedType: OutputFormat | null =
    tool.id === "convert-to-jpg"
      ? "image/jpeg"
      : tool.id === "background-remover"
        ? "image/png"
        : null;

  useEffect(() => {
    markRecentTool(tool.id);
  }, [tool.id]);
  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    },
    [],
  );

  function makeObjectUrl(blob: Blob) {
    const url = URL.createObjectURL(blob);
    objectUrls.current.add(url);
    return url;
  }
  function revokeObjectUrl(url: string) {
    if (!url) return;
    URL.revokeObjectURL(url);
    objectUrls.current.delete(url);
  }
  function clearResults() {
    previewRun.current += 1;
    setPreviewUrl((current) => {
      if (current) revokeObjectUrl(current);
      return "";
    });
    setBatchUrl((current) => {
      if (current) revokeObjectUrl(current);
      return "";
    });
    setResults((current) => {
      current.forEach((item) => revokeObjectUrl(item.url));
      return [];
    });
  }

  function clearSelection() {
    setFiles([]);
    setSourceUrl((current) => {
      if (current) revokeObjectUrl(current);
      return "";
    });
    clearResults();
  }

  const effectiveOptions = useMemo<ImageOptions>(
    () => ({
      ...options,
      format: forcedType || options.format,
      ...(tool.id === "background-remover" && autoBackground
        ? { color: undefined }
        : {}),
    }),
    [options, forcedType, tool.id, autoBackground],
  );

  const targetBytes = useMemo(() => {
    const multiplier = targetUnit === "MB" ? 1024 * 1024 : 1024;
    return Math.round(Math.max(0, targetValue) * multiplier);
  }, [targetUnit, targetValue]);

  const processOne = useCallback(
    async (file: File): Promise<ImageProcessResult> => {
      if (tool.id === "compress") {
        if (
          compressMode === "target" &&
          (!Number.isFinite(targetValue) || targetValue <= 0)
        )
          throw new Error("Enter a target size greater than 0.");
        const format =
          compressOutput === "auto"
            ? compressMode === "target"
              ? "image/webp"
              : sourceFormat(file) || "image/webp"
            : compressOutput === "keep"
              ? sourceFormat(file) || "image/webp"
              : compressOutput;
        return compressImage(file, {
          mode: compressMode,
          targetBytes: compressMode === "target" ? targetBytes : undefined,
          format,
        });
      }
      return processImage(file, tool.id, effectiveOptions);
    },
    [
      tool.id,
      compressMode,
      targetValue,
      targetBytes,
      compressOutput,
      effectiveOptions,
    ],
  );

  async function choose(selectedFiles: File[]) {
    clearSelection();
    setError("");
    setMessage("");
    setProgress(0);
    let valid = selectedFiles.filter(
      (file) =>
        (file.type.startsWith("image/") || /\.svg$/i.test(file.name)) &&
        file.size > 0 &&
        file.size <= maxMb * 1024 * 1024,
    );
    if (tool.id === "jpg-to-png") {
      valid = valid.filter(
        (file) => file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name),
      );
      if (!valid.length) {
        setError("JPG to PNG / WebP accepts JPG or JPEG source files.");
        return;
      }
    }
    if (!valid.length) {
      setError(`Choose a supported image up to ${maxMb} MB.`);
      return;
    }
    if (tool.id === "compress" && valid.length > 1)
      setMessage(
        "Compress Image processes one image at a time; the first selected image was loaded.",
      );
    if (tool.id === "compress") valid = valid.slice(0, 1);
    else if (valid.length > runLimit) {
      setMessage(`Up to ${runLimit} images are processed per run.`);
      valid = valid.slice(0, runLimit);
    }

    const first = valid[0]!;
    try {
      const dimensions = await imageDimensions(first);
      setRatio(dimensions.width / dimensions.height);
      setOptions((current) => {
        const preserve = ![
          "convert",
          "convert-to-jpg",
          "jpg-to-png",
          "background-remover",
        ].includes(tool.id);
        const nextFormat = preserve
          ? sourceFormat(first) || current.format
          : current.format;
        return {
          ...current,
          ...(nextFormat ? { format: nextFormat } : {}),
          ...(tool.id === "resize"
            ? { width: dimensions.width, height: dimensions.height }
            : {}),
          ...(tool.id === "crop"
            ? {
                cropX: 0,
                cropY: 0,
                cropWidth: dimensions.width,
                cropHeight: dimensions.height,
              }
            : {}),
          ...(tool.id === "watermark"
            ? {
                fontSize: Math.min(
                  220,
                  Math.max(24, Math.round(dimensions.width / 18)),
                ),
              }
            : {}),
        };
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Image could not be decoded.",
      );
      return;
    }

    setSourceUrl((current) => {
      if (current) revokeObjectUrl(current);
      return makeObjectUrl(first);
    });
    setFiles(valid);
  }

  useEffect(() => {
    if (!livePreview || working || !files[0]) return;
    const runId = ++previewRun.current;
    const timer = window.setTimeout(
      () => {
        void (async () => {
          setPreviewWorking(true);
          try {
            const processed = await processOne(files[0]!);
            if (runId !== previewRun.current) return;
            const nextUrl = makeObjectUrl(processed.blob);
            setPreviewUrl((current) => {
              if (current) revokeObjectUrl(current);
              return nextUrl;
            });
          } catch {
            /* preview errors remain quiet while controls change */
          } finally {
            if (runId === previewRun.current) setPreviewWorking(false);
          }
        })();
      },
      tool.id === "compress" ? 650 : 320,
    );
    return () => window.clearTimeout(timer);
  }, [files, livePreview, processOne, tool.id, working]);

  async function run() {
    if (!files.length) {
      setError("Select an image first.");
      return;
    }
    setWorking(true);
    setError("");
    setMessage("");
    setProgress(0);
    cancelled.current = false;
    clearResults();
    try {
      const selected = files.slice(0, runLimit);
      const processedItems: ProcessedItem[] = [];
      for (let index = 0; index < selected.length; index++) {
        if (cancelled.current) throw new Error("Processing cancelled.");
        const file = selected[index]!;
        const processed = await processOne(file);
        processedItems.push({
          ...processed,
          name: `${safeName(file.name)}-${tool.id}.${outputExt(processed.type)}`,
          url: makeObjectUrl(processed.blob),
          originalSize: file.size,
        });
        setProgress(Math.round(((index + 1) / selected.length) * 82));
      }
      setResults(processedItems);
      if (processedItems.length > 1) {
        const zip = new JSZip();
        processedItems.forEach((item) => zip.file(item.name, item.blob));
        const zipped = await zip.generateAsync(
          {
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 },
          },
          (meta) => setProgress(82 + Math.round(meta.percent * 0.18)),
        );
        setBatchUrl(makeObjectUrl(zipped));
      }
      setProgress(100);
      const first = processedItems[0];
      if (tool.id === "compress" && first) {
        if (first.targetReached === false)
          setMessage(
            first.note ||
              "A smaller result was created, but the requested target was not reached.",
          );
        else
          setMessage(
            first.note ||
              `Compressed ${formatBytes(first.originalSize)} to ${formatBytes(first.blob.size)}.`,
          );
      } else
        setMessage(
          `Processed ${processedItems.length} image${processedItems.length === 1 ? "" : "s"} in this browser.`,
        );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Image processing failed.",
      );
    } finally {
      setWorking(false);
    }
  }

  function resetSettings() {
    setOptions((current) => ({
      ...DEFAULT_OPTIONS,
      format: current.format || DEFAULT_OPTIONS.format,
    }));
    setAutoBackground(true);
    setLockAspect(true);
    setCompressMode("auto");
    setTargetValue(100);
    setTargetUnit("KB");
    setCompressOutput("auto");
    setLivePreview(supportsLivePreview);
    setError("");
    setMessage("Settings reset.");
    clearResults();
    if (files[0])
      void imageDimensions(files[0])
        .then((d) => {
          setRatio(d.width / d.height);
          setOptions((current) => ({
            ...current,
            ...(tool.id === "resize"
              ? { width: d.width, height: d.height }
              : {}),
            ...(tool.id === "crop"
              ? { cropX: 0, cropY: 0, cropWidth: d.width, cropHeight: d.height }
              : {}),
          }));
        })
        .catch(() => undefined);
  }

  function processAnother() {
    cancelled.current = false;
    clearSelection();
    setError("");
    setMessage("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  function resizeWidth(value: number) {
    setOptions((current) => ({
      ...current,
      width: value,
      ...(lockAspect && ratio > 0
        ? { height: Math.max(1, Math.round(value / ratio)) }
        : {}),
    }));
  }
  function resizeHeight(value: number) {
    setOptions((current) => ({
      ...current,
      height: value,
      ...(lockAspect && ratio > 0
        ? { width: Math.max(1, Math.round(value * ratio)) }
        : {}),
    }));
  }
  const numberField = (
    key: keyof ImageOptions,
    label: string,
    min = 0,
    max?: number,
  ) => (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={String(options[key] ?? "")}
        onChange={(event) =>
          setOptions((current) => ({
            ...current,
            [key]: Number(event.target.value),
          }))
        }
      />
    </div>
  );
  const rangeField = (
    key: keyof ImageOptions,
    label: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <div className="field">
      <div className="label-row">
        <label>{label}</label>
        <span>{String(options[key] ?? "")}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number(options[key] ?? min)}
        onChange={(event) =>
          setOptions((current) => ({
            ...current,
            [key]: Number(event.target.value),
          }))
        }
      />
    </div>
  );

  async function shareResult(item: ProcessedItem) {
    const file = new File([item.blob], item.name, {
      type: item.blob.type || item.type,
      lastModified: Date.now(),
    });
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };
    try {
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          title: "AJN Buzz image result",
          text: `Processed with ${tool.name} on AJN Buzz`,
          files: [file],
        });
        setMessage("Share sheet opened.");
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setMessage(
        "File sharing is not supported here, so the tool link was copied.",
      );
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError")
        return;
      setMessage(
        "Sharing is unavailable in this browser. Download the result instead.",
      );
    }
  }

  const firstResult = results[0];
  const firstSource = files[0];
  const savings =
    firstResult && firstSource && firstSource.size > 0
      ? Math.round((1 - firstResult.blob.size / firstSource.size) * 100)
      : null;
  const selectedFormat = forcedType || effectiveOptions.format || "image/webp";
  const showQuality = tool.id !== "compress" && selectedFormat !== "image/png";
  const actionLabel =
    tool.id === "compress"
      ? compressMode === "target"
        ? `Compress to ${targetValue || 0} ${targetUnit}`
        : "Compress image"
      : files.length > 1
        ? `Process ${files.length} images`
        : "Process image";

  return (
    <div className="editor-shell">
      <section className="editor-main panel editor-panel">
        <div
          className="dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void choose(Array.from<File>(event.dataTransfer.files));
          }}
        >
          <input
            ref={inputRef}
            id="image-upload"
            type="file"
            multiple={runLimit > 1}
            accept="image/*,.svg"
            onChange={(event) => {
              const selected = Array.from<File>(
                event.currentTarget.files || [],
              );
              event.currentTarget.value = "";
              void choose(selected);
            }}
          />
          <UploadCloud size={32} />
          <div>
            <b>
              {tool.id === "compress" ? "Select an image" : "Select images"}
            </b>
            <span> or drop {tool.id === "compress" ? "it" : "them"} here</span>
          </div>
          <p>
            {maxMb} MB max{" "}
            {tool.id === "compress"
              ? "· 1 image"
              : `· up to ${runLimit} images`}
          </p>
        </div>

        {files.length ? (
          <div className="file-strip">
            {files.map((file, index) => (
              <div
                className="file-chip"
                key={`${file.name}-${file.lastModified}`}
              >
                <span>{index + 1}</span>
                <div>
                  <b>{file.name}</b>
                  <small>{formatBytes(file.size)}</small>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="preview-toolbar">
          <div>
            <b>Preview</b>
            <span>
              {previewWorking
                ? "Updating…"
                : livePreview
                  ? "Live preview on"
                  : tool.id === "compress"
                    ? "Press Compress to create the result"
                    : supportsLivePreview
                      ? "Live preview off"
                      : "Preview updates after processing"}
            </span>
          </div>
          {supportsLivePreview ? (
            <label className="switch-label">
              <input
                type="checkbox"
                checked={livePreview}
                onChange={(event) => setLivePreview(event.target.checked)}
              />
              <span>Live</span>
            </label>
          ) : (
            <span className="preview-mode-badge">On process</span>
          )}
        </div>
        <div className="compare-stage">
          {sourceUrl ? (
            <>
              <div className="preview-pane">
                <div className="preview-label">Original</div>
                <img src={sourceUrl} alt="Selected original image" />
              </div>
              <div className="preview-pane">
                <div className="preview-label">Result</div>
                {firstResult?.url || previewUrl ? (
                  <img
                    src={firstResult?.url || previewUrl}
                    alt="Processed image result"
                  />
                ) : (
                  <div className="preview-empty">
                    <Eye size={30} />
                    <span>
                      {tool.id === "compress"
                        ? "Choose a compression method and press Compress"
                        : "Adjust settings or press Process"}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="preview-empty large">
              <UploadCloud size={34} />
              <b>Choose an image</b>
              <span>Preview appears here.</span>
            </div>
          )}
        </div>

        {firstResult ? (
          <div className="result-summary">
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
                {firstResult.width} × {firstResult.height}
              </b>
            </div>
            <div>
              <span>Format</span>
              <b>{outputExt(firstResult.type).toUpperCase()}</b>
            </div>
            {savings !== null ? (
              <div>
                <span>Reduction</span>
                <b className={savings >= 0 ? "positive" : ""}>
                  {savings >= 0
                    ? `${savings}% smaller`
                    : `${Math.abs(savings)}% larger`}
                </b>
              </div>
            ) : null}
            {tool.id === "compress" && compressMode === "target" ? (
              <div>
                <span>Target</span>
                <b
                  className={
                    firstResult.targetReached ? "positive" : "target-miss"
                  }
                >
                  {firstResult.targetReached ? "Reached" : "Closest result"}
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
          <button
            className="icon-button"
            title="Reset settings"
            onClick={resetSettings}
          >
            <RotateCcw size={18} />
          </button>
        </div>
        <p className="muted small tool-control-summary">{tool.summary}</p>

        {tool.id === "compress" ? (
          <div className="compress-controls">
            <div className="field">
              <label>Select compression method</label>
              <div className="compression-methods">
                <label
                  className={`compression-method ${compressMode === "auto" ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="compression-mode"
                    checked={compressMode === "auto"}
                    onChange={() => setCompressMode("auto")}
                  />
                  <span>
                    <b>Auto</b>
                    <small>Smaller file with strong visual quality.</small>
                  </span>
                </label>
                <label
                  className={`compression-method ${compressMode === "target" ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="compression-mode"
                    checked={compressMode === "target"}
                    onChange={() => setCompressMode("target")}
                  />
                  <span>
                    <b>Compress file to</b>
                    <small>Enter the KB or MB limit you need.</small>
                  </span>
                </label>
              </div>
            </div>
            {compressMode === "target" ? (
              <>
                <div className="target-size-row">
                  <div className="field">
                    <label>Target size</label>
                    <input
                      type="number"
                      min="1"
                      max={targetUnit === "MB" ? 50 : 51200}
                      step="1"
                      value={targetValue}
                      onChange={(event) =>
                        setTargetValue(Number(event.target.value))
                      }
                    />
                  </div>
                  <div className="field unit-field">
                    <label>Unit</label>
                    <select
                      value={targetUnit}
                      onChange={(event) =>
                        setTargetUnit(event.target.value as TargetUnit)
                      }
                    >
                      <option value="KB">KB</option>
                      <option value="MB">MB</option>
                    </select>
                  </div>
                </div>
                <div
                  className="target-preset-row"
                  aria-label="Popular target sizes"
                >
                  {[
                    ["20 KB", 20, "KB"],
                    ["50 KB", 50, "KB"],
                    ["100 KB", 100, "KB"],
                    ["200 KB", 200, "KB"],
                    ["500 KB", 500, "KB"],
                    ["1 MB", 1, "MB"],
                  ].map(([label, value, unit]) => (
                    <button
                      type="button"
                      key={String(label)}
                      onClick={() => {
                        setTargetValue(Number(value));
                        setTargetUnit(unit as TargetUnit);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            <div className="field">
              <label>Output format</label>
              <select
                value={compressOutput}
                onChange={(event) =>
                  setCompressOutput(event.target.value as CompressOutput)
                }
              >
                <option value="auto">Auto (recommended)</option>
                <option value="keep">Keep original format</option>
                <option value="image/jpeg">JPG</option>
                <option value="image/webp">WebP</option>
                <option value="image/png">PNG</option>
              </select>
              <small>
                Auto uses WebP for target-size compression. JPG/WebP usually
                reach small photo targets better than PNG.
              </small>
            </div>
          </div>
        ) : null}

        {tool.id === "resize" ? (
          <>
            <label className="check">
              <input
                type="checkbox"
                checked={lockAspect}
                onChange={(event) => setLockAspect(event.target.checked)}
              />
              Lock aspect ratio
            </label>
            <div className="row">
              <div className="field">
                <label>Width px</label>
                <input
                  type="number"
                  min="1"
                  value={options.width || ""}
                  onChange={(event) => resizeWidth(Number(event.target.value))}
                />
              </div>
              <div className="field">
                <label>Height px</label>
                <input
                  type="number"
                  min="1"
                  value={options.height || ""}
                  onChange={(event) => resizeHeight(Number(event.target.value))}
                />
              </div>
            </div>
          </>
        ) : null}
        {tool.id === "crop" ? (
          <>
            <div className="row">
              {numberField("cropX", "X", 0)}
              {numberField("cropY", "Y", 0)}
            </div>
            <div className="row">
              {numberField("cropWidth", "Width", 1)}
              {numberField("cropHeight", "Height", 1)}
            </div>
          </>
        ) : null}
        {tool.id === "rotate" ? (
          <>
            <div className="field">
              <label>Rotate</label>
              <select
                value={options.angle}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    angle: Number(event.target.value),
                  }))
                }
              >
                <option value="0">0° (flip only)</option>
                <option value="90">90° clockwise</option>
                <option value="180">180°</option>
                <option value="270">270° clockwise</option>
              </select>
            </div>
            <div className="field">
              <label>Flip after rotation</label>
              <select
                value={options.flip || "none"}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    flip: event.target.value as
                      | "none"
                      | "horizontal"
                      | "vertical",
                  }))
                }
              >
                <option value="none">No flip</option>
                <option value="horizontal">Flip horizontally</option>
                <option value="vertical">Flip vertically</option>
              </select>
            </div>
          </>
        ) : null}
        {tool.id === "upscale" ? (
          <div className="field">
            <label>Scale</label>
            <select
              value={options.amount}
              onChange={(event) =>
                setOptions((current) => ({
                  ...current,
                  amount: Number(event.target.value),
                }))
              }
            >
              <option value="2">2×</option>
              <option value="3">3×</option>
              <option value="4">4×</option>
            </select>
            <small>
              High-quality resampling; this does not invent new detail with
              generative AI.
            </small>
          </div>
        ) : null}
        {tool.id === "watermark" ? (
          <>
            <div className="field">
              <label>Watermark text</label>
              <input
                maxLength={120}
                value={options.text || ""}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    text: event.target.value,
                  }))
                }
                placeholder="Your watermark text"
              />
            </div>
            <div className="field">
              <label>Position</label>
              <select
                value={options.position || "center"}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    position: event.target.value as ImageOptions["position"],
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
              {numberField("fontSize", "Font size", 12, 400)}
              <div className="field">
                <label>Colour</label>
                <input
                  type="color"
                  value={options.color || "#ffffff"}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      color: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            {rangeField("opacity", "Opacity", 0.05, 1, 0.05)}
          </>
        ) : null}
        {tool.id === "photo-editor" ? (
          <>
            {rangeField("brightness", "Brightness", 0, 200)}
            {rangeField("contrast", "Contrast", 0, 200)}
            {rangeField("saturation", "Saturation", 0, 200)}
            {rangeField("blur", "Blur", 0, 30)}
          </>
        ) : null}
        {tool.id === "background-remover" ? (
          <>
            <label className="check">
              <input
                type="checkbox"
                checked={autoBackground}
                onChange={(event) => setAutoBackground(event.target.checked)}
              />
              Auto-sample four image corners
            </label>
            {!autoBackground ? (
              <div className="field">
                <label>Background colour</label>
                <input
                  type="color"
                  value={options.color || "#ffffff"}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      color: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
            {rangeField("amount", "Tolerance", 5, 220)}
            <small className="muted">
              Best for plain or near-flat backgrounds.
            </small>
          </>
        ) : null}

        {tool.id !== "compress" ? (
          tool.id === "jpg-to-png" ? (
            <div className="field">
              <label>Output format</label>
              <select
                value={
                  options.format === "image/webp" ? "image/webp" : "image/png"
                }
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    format: event.target.value as OutputFormat,
                  }))
                }
              >
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
              </select>
            </div>
          ) : !forcedType ? (
            <div className="field">
              <label>Output format</label>
              <select
                value={options.format}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    format: event.target.value as OutputFormat,
                  }))
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
              <label>Output quality</label>
              <span>{Math.round(Number(options.quality || 0.9) * 100)}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={Math.round(Number(options.quality || 0.9) * 100)}
              onChange={(event) =>
                setOptions((current) => ({
                  ...current,
                  quality: Number(event.target.value) / 100,
                }))
              }
            />
          </div>
        ) : null}

        {working ? (
          <div className="progress" aria-label={`Processing ${progress}%`}>
            <span style={{ width: `${progress}%` }} />
          </div>
        ) : null}
        <button
          className="btn primary action-big"
          disabled={!files.length || working}
          onClick={() => void run()}
        >
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
          <button
            className="btn"
            onClick={() => {
              cancelled.current = true;
            }}
          >
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
            className={`notice ${firstResult?.targetReached === false ? "warning" : ""}`}
            aria-live="polite"
          >
            {message}
          </div>
        ) : null}

        {firstResult && results.length === 1 ? (
          <div className="result-actions">
            <a
              className="btn success"
              href={firstResult.url}
              download={firstResult.name}
            >
              <Download size={18} /> Download
            </a>
            <a
              className="btn"
              href={firstResult.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye size={18} /> Preview
            </a>
            <button
              className="btn"
              onClick={() => void shareResult(firstResult)}
            >
              <Share2 size={18} /> Share
            </button>
            <button className="btn" onClick={processAnother}>
              <RefreshCcw size={18} /> Process another
            </button>
          </div>
        ) : null}
        {batchUrl ? (
          <div className="result-actions">
            <a
              className="btn success"
              href={batchUrl}
              download={`ajn-buzz-${tool.id}-${Date.now()}.zip`}
            >
              <FileArchive size={18} /> Download {results.length} results as ZIP
            </a>
            <button className="btn" onClick={processAnother}>
              <RefreshCcw size={18} /> Process another
            </button>
          </div>
        ) : null}
        <div className="privacy-note">
          <ShieldMini />
          <div>
            <b>Browser processing</b>
            <span>No sign-in required.</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ShieldMini() {
  return <span className="shield-mini">✓</span>;
}
