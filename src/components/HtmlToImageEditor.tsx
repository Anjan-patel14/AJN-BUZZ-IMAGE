/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Code2,
  Download,
  Eye,
  Play,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { renderHtmlToImage, type HtmlImageFormat } from "@/lib/html-to-image";
import type { ImageTool } from "@/lib/image-tools";
import { markRecentTool } from "@/lib/tool-state";

const SAMPLE_HTML = `<div style="width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,#eef5ff,#fff7fd);padding:48px;box-sizing:border-box;">
  <div style="width:100%;max-width:760px;background:white;border:1px solid #dfe7f4;border-radius:28px;padding:48px;box-sizing:border-box;box-shadow:0 20px 60px rgba(15,23,42,.10);">
    <div style="font-size:15px;font-weight:800;color:#2563eb;letter-spacing:.12em;text-transform:uppercase;">AJN Buzz</div>
    <h1 style="font-size:52px;line-height:1.04;margin:14px 0;color:#0f172a;">Turn HTML into an image.</h1>
    <p style="font-size:22px;line-height:1.5;margin:0;color:#64748b;">Create clean PNG, JPG or WebP graphics directly in your browser.</p>
  </div>
</div>`;

function extension(type: HtmlImageFormat) {
  return type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "png";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function HtmlToImageEditor({ tool }: { tool: ImageTool }) {
  const [html, setHtml] = useState(SAMPLE_HTML);
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(630);
  const [background, setBackground] = useState("#ffffff");
  const [format, setFormat] = useState<HtmlImageFormat>("image/png");
  const [quality, setQuality] = useState(92);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultSize, setResultSize] = useState(0);
  const objectUrl = useRef("");

  useEffect(() => {
    markRecentTool(tool.id);
  }, [tool.id]);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const qualityEnabled = format !== "image/png";
  const resultName = useMemo(
    () => `ajn-buzz-html-${width}x${height}.${extension(format)}`,
    [format, height, width],
  );

  function clearResult() {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = "";
    }
    setResultUrl("");
    setResultSize(0);
  }

  function reset() {
    clearResult();
    setHtml(SAMPLE_HTML);
    setWidth(1200);
    setHeight(630);
    setBackground("#ffffff");
    setFormat("image/png");
    setQuality(92);
    setError("");
  }

  async function render() {
    setWorking(true);
    setError("");
    clearResult();
    try {
      const result = await renderHtmlToImage({
        html,
        width,
        height,
        background,
        format,
        quality: quality / 100,
      });
      const url = URL.createObjectURL(result.blob);
      objectUrl.current = url;
      setResultUrl(url);
      setResultSize(result.blob.size);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "HTML could not be rendered.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="editor-shell html-image-editor">
      <section className="editor-main panel editor-panel">
        <div className="html-editor-head">
          <div>
            <span className="eyebrow">HTML source</span>
            <h2>Write or paste HTML</h2>
          </div>
          <Code2 size={22} />
        </div>
        <textarea
          className="html-source-input"
          value={html}
          onChange={(event) => {
            setHtml(event.target.value);
            clearResult();
          }}
          spellCheck={false}
          aria-label="HTML source"
        />

        <div className="preview-toolbar">
          <div>
            <b>Rendered preview</b>
            <span>
              {resultUrl
                ? `${width} × ${height} · ${formatBytes(resultSize)}`
                : "Generate an image to preview it here."}
            </span>
          </div>
          <span className="preview-mode-badge">Local browser</span>
        </div>

        <div className="compare-stage html-render-stage">
          {resultUrl ? (
            <img
              src={resultUrl}
              alt="Rendered HTML preview"
              className="html-render-preview"
            />
          ) : (
            <div className="preview-empty large">
              <Sparkles size={34} />
              <b>Your image appears here</b>
              <span>
                Scripts and unsafe markup are removed before rendering.
              </span>
            </div>
          )}
        </div>
      </section>

      <aside className="editor-controls panel editor-panel">
        <div className="controls-head">
          <div>
            <span className="eyebrow">Create</span>
            <h2>HTML to Image</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={reset}
            title="Reset settings"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
        <p className="muted small tool-control-summary">
          Render safe HTML to PNG, JPG or WebP.
        </p>

        <div className="row">
          <div className="field">
            <label>Width px</label>
            <input
              type="number"
              min="64"
              max="5000"
              value={width}
              onChange={(event) => {
                setWidth(Number(event.target.value));
                clearResult();
              }}
            />
          </div>
          <div className="field">
            <label>Height px</label>
            <input
              type="number"
              min="64"
              max="5000"
              value={height}
              onChange={(event) => {
                setHeight(Number(event.target.value));
                clearResult();
              }}
            />
          </div>
        </div>

        <div className="field">
          <label>Background</label>
          <input
            type="color"
            value={background}
            onChange={(event) => {
              setBackground(event.target.value);
              clearResult();
            }}
          />
        </div>

        <div className="field">
          <label>Output format</label>
          <select
            value={format}
            onChange={(event) => {
              setFormat(event.target.value as HtmlImageFormat);
              clearResult();
            }}
          >
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPG</option>
            <option value="image/webp">WebP</option>
          </select>
        </div>

        {qualityEnabled ? (
          <div className="field">
            <div className="label-row">
              <label>Quality</label>
              <span>{quality}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="1"
              value={quality}
              onChange={(event) => {
                setQuality(Number(event.target.value));
                clearResult();
              }}
            />
          </div>
        ) : null}

        <button
          className="btn primary action-big"
          type="button"
          disabled={working || !html.trim()}
          onClick={() => void render()}
        >
          {working ? (
            <>
              <Sparkles size={18} /> Rendering…
            </>
          ) : (
            <>
              <Play size={18} /> Generate image
            </>
          )}
        </button>

        {error ? (
          <div className="error" role="alert">
            {error}
          </div>
        ) : null}

        {resultUrl ? (
          <div className="result-actions">
            <a className="btn success" href={resultUrl} download={resultName}>
              <Download size={18} /> Download
            </a>
            <a
              className="btn"
              href={resultUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye size={18} /> Preview
            </a>
          </div>
        ) : null}

        <div className="privacy-note">
          <span className="shield-mini">
            <ShieldCheck size={15} />
          </span>
          <div>
            <b>Browser processing</b>
            <span>No sign-in. Remote image URLs are not fetched.</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
