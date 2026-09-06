/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  Image as ImageIcon,
  Loader2,
  UploadCloud,
} from "lucide-react";
import {
  compressImage,
  type CompressionMode,
  type OutputFormat,
} from "@/lib/image-engine";

type Unit = "KB" | "MB";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function extension(type: OutputFormat) {
  return type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "png";
}

function baseName(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "image"
  );
}

function sourceFormat(file: File): OutputFormat {
  if (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
  ) {
    return file.type;
  }
  return "image/webp";
}

export function HomeQuickCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<CompressionMode>("target");
  const [target, setTarget] = useState(100);
  const [unit, setUnit] = useState<Unit>("KB");
  const [sourceUrl, setSourceUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [result, setResult] = useState<{
    size: number;
    width: number;
    height: number;
    type: OutputFormat;
    targetReached?: boolean;
  } | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceObjectUrl = useRef("");
  const resultObjectUrl = useRef("");

  useEffect(
    () => () => {
      if (sourceObjectUrl.current) URL.revokeObjectURL(sourceObjectUrl.current);
      if (resultObjectUrl.current) URL.revokeObjectURL(resultObjectUrl.current);
    },
    [],
  );

  const targetBytes = useMemo(
    () =>
      Math.round(Math.max(1, target) * (unit === "MB" ? 1024 * 1024 : 1024)),
    [target, unit],
  );

  function clearResult() {
    if (resultObjectUrl.current) {
      URL.revokeObjectURL(resultObjectUrl.current);
      resultObjectUrl.current = "";
    }
    setResultUrl("");
    setResult(null);
  }

  function choose(next: File | null) {
    setError("");
    clearResult();
    if (sourceObjectUrl.current) {
      URL.revokeObjectURL(sourceObjectUrl.current);
      sourceObjectUrl.current = "";
    }
    setSourceUrl("");
    setFile(null);

    if (!next) return;
    if (!next.type.startsWith("image/") || next.size <= 0) {
      setError("Choose a JPG, PNG, WebP or another browser-supported image.");
      return;
    }
    if (next.size > 30 * 1024 * 1024) {
      setError("Choose an image up to 30 MB.");
      return;
    }

    const url = URL.createObjectURL(next);
    sourceObjectUrl.current = url;
    setSourceUrl(url);
    setFile(next);
  }

  async function run() {
    if (!file) {
      setError("Choose an image first.");
      return;
    }
    if (mode === "target" && (!Number.isFinite(target) || target <= 0)) {
      setError("Enter a target size greater than 0.");
      return;
    }

    setWorking(true);
    setError("");
    clearResult();
    try {
      const output = await compressImage(file, {
        mode,
        targetBytes: mode === "target" ? targetBytes : undefined,
        format: mode === "target" ? "image/webp" : sourceFormat(file),
      });
      const url = URL.createObjectURL(output.blob);
      resultObjectUrl.current = url;
      setResultUrl(url);
      setResult({
        size: output.blob.size,
        width: output.width,
        height: output.height,
        type: output.type,
        targetReached: output.targetReached,
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Compression failed.",
      );
    } finally {
      setWorking(false);
    }
  }

  const reduction =
    file && result
      ? Math.max(
          0,
          Math.round((1 - result.size / Math.max(1, file.size)) * 100),
        )
      : 0;

  const downloadName =
    file && result
      ? `${baseName(file.name)}-compressed.${extension(result.type)}`
      : "ajn-buzz-compressed.webp";

  return (
    <section className="home-compress-card" id="quick-compress">
      <div className="home-compress-settings">
        <div className="home-section-title compact">
          <span className="home-tool-icon tone-green">
            <ImageIcon size={22} />
          </span>
          <div>
            <h2>Compress Image</h2>
            <p>Reduce image size to an exact target size.</p>
          </div>
        </div>

        <div className="home-compress-methods">
          <label>
            <input
              type="radio"
              name="home-compress-mode"
              checked={mode === "auto"}
              onChange={() => {
                setMode("auto");
                clearResult();
              }}
            />
            <span>
              <b>Auto</b>
              <small>Keep strong visual quality</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="home-compress-mode"
              checked={mode === "target"}
              onChange={() => {
                setMode("target");
                clearResult();
              }}
            />
            <span>
              <b>Compress file to</b>
              <small>Choose the size you need</small>
            </span>
          </label>
        </div>

        {mode === "target" ? (
          <>
            <div className="home-target-row">
              <input
                aria-label="Target compression size"
                type="number"
                min="1"
                value={target}
                onChange={(event) => {
                  setTarget(Number(event.target.value));
                  clearResult();
                }}
              />
              <select
                aria-label="Target compression unit"
                value={unit}
                onChange={(event) => {
                  setUnit(event.target.value as Unit);
                  clearResult();
                }}
              >
                <option value="KB">KB</option>
                <option value="MB">MB</option>
              </select>
            </div>
            <div
              className="home-target-presets"
              aria-label="Compression target presets"
            >
              {[
                ["50 KB", 50, "KB"],
                ["100 KB", 100, "KB"],
                ["200 KB", 200, "KB"],
                ["500 KB", 500, "KB"],
                ["1 MB", 1, "MB"],
              ].map(([label, value, targetUnit]) => (
                <button
                  type="button"
                  key={String(label)}
                  onClick={() => {
                    setTarget(Number(value));
                    setUnit(targetUnit as Unit);
                    clearResult();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <button
          type="button"
          className="btn primary home-compress-cta"
          disabled={!file || working}
          onClick={() => void run()}
        >
          {working ? (
            <>
              <Loader2 className="spin" size={18} /> Compressing…
            </>
          ) : (
            <>
              <Download size={18} /> Compress Image
            </>
          )}
        </button>

        {error ? (
          <div className="home-compress-error" role="alert">
            {error}
          </div>
        ) : null}

        {file ? (
          <div className="home-file-meta">
            <CheckCircle2 size={15} />
            <span>
              {file.name} · {formatBytes(file.size)}
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={`home-dropzone ${file ? "has-file" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          choose(event.dataTransfer.files?.[0] || null);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ")
            inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.svg"
          hidden
          onChange={(event) => {
            choose(event.target.files?.[0] || null);
            event.currentTarget.value = "";
          }}
        />
        {sourceUrl ? (
          <img src={sourceUrl} alt="Selected image preview" />
        ) : (
          <UploadCloud size={36} />
        )}
        <b>
          {file ? "Image ready to compress" : "Drag & drop your image here"}
        </b>
        <span>
          {file ? "Click to choose another image" : "or click to browse"}
        </span>
        <small>Supports JPG, PNG, WebP and more · 30 MB max</small>
      </div>

      <div className="home-compress-results">
        <h3>Your Images, Better Results</h3>
        {result && file ? (
          <>
            <div className="home-result-grid">
              <div>
                <span>Before</span>
                <b>{formatBytes(file.size)}</b>
              </div>
              <div>
                <span>After</span>
                <b>{formatBytes(result.size)}</b>
              </div>
              <div>
                <span>Reduced</span>
                <b>{reduction}%</b>
              </div>
              <div>
                <span>Output</span>
                <b>
                  {result.width}×{result.height}
                </b>
              </div>
            </div>
            {mode === "target" ? (
              <div
                className={`home-target-status ${result.targetReached ? "ok" : "warn"}`}
              >
                {result.targetReached
                  ? "Target reached"
                  : "Closest safe browser result"}
              </div>
            ) : null}
            <div className="home-result-actions">
              <a
                className="btn success"
                href={resultUrl}
                download={downloadName}
              >
                <Download size={16} /> Download
              </a>
              <a
                className="btn"
                href={resultUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Eye size={16} /> Preview
              </a>
            </div>
          </>
        ) : (
          <ul>
            <li>Exact KB / MB targeting</li>
            <li>Preserves aspect ratio</li>
            <li>Shows original and final size</li>
            <li>Runs locally in your browser</li>
          </ul>
        )}
      </div>
    </section>
  );
}
