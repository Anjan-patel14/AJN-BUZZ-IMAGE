export type HtmlImageFormat = "image/png" | "image/jpeg" | "image/webp";

export type HtmlRenderOptions = {
  html: string;
  width: number;
  height: number;
  background: string;
  format: HtmlImageFormat;
  quality?: number;
};

export type HtmlRenderResult = {
  blob: Blob;
  width: number;
  height: number;
  type: HtmlImageFormat;
};

const MAX_EDGE = 5000;
const MAX_PIXELS = 20_000_000;
const MAX_HTML_LENGTH = 120_000;

function validateSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error("Enter valid image dimensions.");
  }
  const w = Math.round(width);
  const h = Math.round(height);
  if (w < 64 || h < 64) {
    throw new Error("Width and height must be at least 64 px.");
  }
  if (w > MAX_EDGE || h > MAX_EDGE || w * h > MAX_PIXELS) {
    throw new Error(
      "The requested image is too large for safe browser rendering.",
    );
  }
  return { width: w, height: h };
}

function sanitizeHtml(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter HTML to render.");
  if (trimmed.length > MAX_HTML_LENGTH) {
    throw new Error(
      "HTML is too large. Keep the markup under 120,000 characters.",
    );
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(
    `<div id="ajn-html-root">${trimmed}</div>`,
    "text/html",
  );
  const root = document.getElementById("ajn-html-root");
  if (!root) throw new Error("HTML could not be parsed.");

  root
    .querySelectorAll("script,iframe,object,embed,link,meta,base,form,style")
    .forEach((node) => node.remove());

  root.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on") || name === "srcdoc") {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (
        (name === "href" || name === "src" || name === "xlink:href") &&
        value.startsWith("javascript:")
      ) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (name === "src") {
        const raw = attribute.value.trim();
        if (!/^(data:image\/|blob:)/i.test(raw))
          element.removeAttribute(attribute.name);
        continue;
      }
      if (name === "style" && /url\s*\(|@import/i.test(attribute.value)) {
        element.setAttribute(
          "style",
          attribute.value
            .replace(/url\s*\([^)]*\)/gi, "none")
            .replace(/@import[^;]+;?/gi, ""),
        );
      }
    }
  });

  const serializer = new XMLSerializer();
  return Array.from(root.childNodes)
    .map((node) => serializer.serializeToString(node))
    .join("");
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  format: HtmlImageFormat,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size === 0) {
          reject(new Error("The browser could not encode the rendered image."));
          return;
        }
        if (blob.type && blob.type !== format) {
          reject(
            new Error("The browser returned an unexpected output format."),
          );
          return;
        }
        resolve(blob);
      },
      format,
      Math.min(1, Math.max(0.1, quality)),
    );
  });
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export async function renderHtmlToImage(
  options: HtmlRenderOptions,
): Promise<HtmlRenderResult> {
  if (typeof window === "undefined") {
    throw new Error("HTML rendering is available in the browser only.");
  }

  const { width, height } = validateSize(options.width, options.height);
  const safeHtml = sanitizeHtml(options.html);
  const background = options.background || "#ffffff";
  const format = options.format;
  const quality = options.quality ?? 0.92;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml"
             style="width:100%;height:100%;box-sizing:border-box;overflow:hidden;background:${escapeAttribute(background)};font-family:Inter,Arial,sans-serif;">
          ${safeHtml}
        </div>
      </foreignObject>
    </svg>`;

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = svgUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Canvas rendering is unavailable in this browser.");

    if (format === "image/jpeg") {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
    }

    context.drawImage(image, 0, 0, width, height);
    const blob = await encodeCanvas(canvas, format, quality);
    return { blob, width, height, type: format };
  } catch (reason) {
    if (reason instanceof Error) throw reason;
    throw new Error("The browser could not render this HTML.");
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
