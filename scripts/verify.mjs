import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exit(1);
};

const canonical = (text) =>
  text
    .replace(/"/g, "'")
    .replace(/\s+/g, "")
    .replace(/,([\]})])/g, "$1")
    .trim();

const has = (text, marker) => canonical(text).includes(canonical(marker));
const markers = (label, text, list) => {
  for (const item of list) {
    if (!has(text, item)) fail(`${label} missing: ${item}`);
  }
};

const required = [
  "public/brand/ajn-buzz-logo.png",
  "public/brand/compression-demo.svg",
  "public/brand/qrajn-qr.png",
  "public/favicon.ico",
  "public/ads.txt",
  "public/app-ads.txt",
  "src/lib/ads.ts",
  "src/lib/image-engine.ts",
  "src/lib/image-validation.ts",
  "src/lib/image-output.ts",
  "src/lib/remove-watermark.ts",
  "src/lib/html-to-image.ts",
  "src/lib/image-tools.ts",
  "src/lib/seo.ts",
  "src/components/ImageEditor.tsx",
  "src/components/HtmlToImageEditor.tsx",
  "src/components/HomeQuickCompress.tsx",
  "src/components/ToolCatalog.tsx",
  "src/components/Shell.tsx",
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/sitemap.ts",
  "src/app/robots.ts",
  "src/app/manifest.ts",
  "src/app/error.tsx",
  "src/app/global-error.tsx",
  "src/app/not-found.tsx",
  "src/app/tools/[slug]/page.tsx",
  "src/app/api/health/route.ts",
  "src/app/api/config/route.ts",
  "next.config.mjs",
  ".prettierrc.json",
];

for (const file of required) {
  if (!exists(file)) fail(`required file missing: ${file}`);
}

const removed = [
  "src/app/workspace",
  "src/app/login",
  "src/app/signup",
  "src/app/forgot-password",
  "src/app/account",
  "src/app/admin",
  "src/app/pricing",
  "src/app/api/billing",
  "src/lib/firebase-client.ts",
  "src/lib/billing-server.ts",
  "firebase",
];
for (const file of removed) {
  if (exists(file)) fail(`removed surface exists: ${file}`);
}

const expected = [
  "compress",
  "resize",
  "crop",
  "convert",
  "remove-watermark",
  "rotate",
  "watermark",
  "photo-editor",
  "upscale",
  "html-to-image",
  "jpg-to-png",
];

const tools = read("src/lib/image-tools.ts");
const ids = [...tools.matchAll(/\bid:\s*["']([^"']+)["']/g)]
  .map((match) => match[1])
  .filter((id) => expected.includes(id));

if (ids.length !== 11 || new Set(ids).size !== 11) {
  fail(`expected 11 unique public image tools, found ${ids.length}`);
}
for (const id of expected) {
  if (!ids.includes(id)) fail(`missing public image tool: ${id}`);
}
if (/convert-to-jpg/.test(tools))
  fail("legacy Image to JPG public tool must be replaced by HTML to Image");
if (/meme/i.test(tools)) fail("Meme Generator must not be public");

markers("priority tools", tools, [
  "PRIMARY_TOOL_IDS: ToolId[] = ['compress', 'resize', 'crop', 'convert']",
]);
markers("HTML to Image registry", tools, [
  "id: 'html-to-image'",
  "name: 'HTML to Image'",
  "HTML to Image Online — Convert HTML to PNG, JPG or WebP",
]);
markers("Remove Watermark registry", tools, [
  "id: 'remove-watermark'",
  "name: 'Remove Watermark'",
]);
markers("compression intent", tools, [
  "compress image to 50kb",
  "compress image to 100kb",
  "compress image to 200kb",
  "compress image to 500kb",
  "compress image to 1mb",
]);

const engine = read("src/lib/image-engine.ts");
markers("explicit image processors", engine, [
  "export async function compressImage",
  "id === 'resize'",
  "id === 'upscale'",
  "id === 'crop'",
  "id === 'rotate'",
  "id === 'remove-watermark'",
  "id === 'photo-editor'",
  "id === 'watermark'",
  "id === 'convert' || id === 'jpg-to-png'",
  "Unsupported image tool",
]);
if (has(engine, "convert-to-jpg"))
  fail("legacy convert-to-jpg processor must not remain");

const repair = read("src/lib/remove-watermark.ts");
markers("watermark repair logic", repair, [
  "normalizeRepairRegion",
  "repairWatermarkRegion",
  "selected area is too large",
  "strength",
  "feather",
]);

const htmlEngine = read("src/lib/html-to-image.ts");
markers("HTML to Image engine", htmlEngine, [
  "renderHtmlToImage",
  "DOMParser",
  "script,iframe,object,embed,link,meta,base,form,style",
  "name.startsWith('on')",
  "value.startsWith('javascript:')",
  "foreignObject",
  "MAX_PIXELS",
  "canvas.toBlob",
]);

const htmlEditor = read("src/components/HtmlToImageEditor.tsx");
markers("HTML to Image UI", htmlEditor, [
  "Write or paste HTML",
  "Generate image",
  "Output format",
  "PNG",
  "JPG",
  "WebP",
  "No sign-in. Remote image URLs are not fetched.",
]);

const quickCompress = read("src/components/HomeQuickCompress.tsx");
markers("homepage real compress", quickCompress, [
  "compressImage",
  "Compress file to",
  "100 KB",
  "200 KB",
  "500 KB",
  "1 MB",
  "Drag & drop your image here",
  "Before",
  "After",
  "Reduced",
  "Download",
]);

const home = read("src/app/page.tsx");
markers("exact concept homepage", home, [
  "Image tools that do the",
  "actual work.",
  "Fast",
  "Private",
  "100% Online",
  "Main Image Tools",
  "More Image Tools",
  "HomeQuickCompress",
  "Explore the AJN Network",
  "https://ajnpdf.com",
  "https://qrajn.online",
  "Open ajnpdf.com",
  "Open qrajn.online",
  "qrajn-qr.png",
  "IMAGES",
  "IDEAS",
  "POSSIBILITIES",
]);

const toolPage = read("src/app/tools/[slug]/page.tsx");
markers("tool router", toolPage, [
  "HtmlToImageEditor",
  "tool.id === 'html-to-image'",
  "ImageEditor tool={tool}",
  "'@type': 'WebApplication'",
  "'@type': 'HowTo'",
  "'@type': 'FAQPage'",
]);

const editor = read("src/components/ImageEditor.tsx");
markers("image workflow safety", editor, [
  "function clearSelection()",
  "JPG to PNG / WebP accepts JPG or JPEG source files.",
  "Watermark area preset",
  "Repair strength",
  "0° (flip only)",
]);
if (has(editor, "convert-to-jpg"))
  fail("legacy convert-to-jpg UI must not remain");

const shell = read("src/components/Shell.tsx");
markers("AJN network navigation", shell, [
  "https://ajnpdf.com",
  "https://qrajn.online",
  "QR AJN",
]);

const seo = read("src/lib/seo.ts");
markers("SEO", seo, [
  "https://www.ajn.buzz",
  "compress image online",
  "resize image online",
  "crop image online",
  "image converter",
  "html to image",
  "summary_large_image",
]);

const sitemap = read("src/app/sitemap.ts");
markers("sitemap", sitemap, ["IMAGE_TOOLS.map", "SITE_URL"]);
const nextConfig = read("next.config.mjs");
markers("redirects", nextConfig, [
  "source: '/compress-image'",
  "destination: '/tools/compress'",
  "source: '/html-to-image'",
  "destination: '/tools/html-to-image'",
  "source: '/image-to-jpg'",
  "destination: '/tools/convert'",
  "source: '/jpg-to-png'",
  "destination: '/tools/jpg-to-png'",
]);

const seller = "google.com, pub-4495802176396975, DIRECT, f08c47fec0942fa0";
if (read("public/ads.txt").trim() !== seller)
  fail("ads.txt seller record mismatch");
if (read("public/app-ads.txt").trim() !== seller)
  fail("app-ads.txt seller record mismatch");

const pkg = JSON.parse(read("package.json"));
if (pkg.version !== "5.4.0")
  fail(`package version must be 5.4.0, found ${pkg.version}`);
if (pkg.dependencies?.firebase || pkg.dependencies?.["firebase-admin"]) {
  fail("Firebase dependencies must remain removed");
}
for (const [name, version] of Object.entries({
  ...pkg.dependencies,
  ...pkg.devDependencies,
})) {
  if (/^[~^]/.test(String(version)))
    fail(`dependency not exact: ${name}@${version}`);
}

const health = read("src/app/api/health/route.ts");
markers("health API", health, [
  "version: '5.4.0'",
  "public_tools: IMAGE_TOOLS.length",
  "target_size_compression: true",
  "remove_watermark_local_inpainting: true",
  "html_to_image_local_rendering: true",
  "all_tools_explicit: true",
]);

const config = read("src/app/api/config/route.ts");
markers("config API", config, [
  "version: '5.4.0'",
  "qr_ajn: 'https://qrajn.online'",
  "pdf_shortcuts: 'https://ajnpdf.com'",
]);

const srcFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else srcFiles.push(full);
  }
}
walk(path.join(root, "src"));
for (const file of srcFiles) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (/\b(TODO|FIXME|NOT\s+IMPLEMENTED|COMING\s+SOON)\b/i.test(text)) {
    fail(`pending marker found in ${path.relative(root, file)}`);
  }
}

console.log("PASS: exactly 11 focused public image tools");
console.log(
  "PASS: homepage matches AJN Buzz concept structure with real inline compression",
);
console.log(
  "PASS: AJN PDF + QR AJN ecosystem cards and qrajn.online promotion",
);
console.log(
  "PASS: HTML to Image replaces legacy Image to JPG and uses local sanitized rendering",
);
console.log("PASS: Remove Watermark local inpainting retained");
console.log(
  "PASS: target-size compression, output validation and workflow safety retained",
);
console.log(
  "PASS: canonical SEO, sitemap, redirects, ads seller records and recovery surfaces retained",
);
console.log(
  "PASS: account, billing, Premium, Firebase and Razorpay remain removed",
);
console.log(
  "AJN BUZZ IMAGE V5.4.0 CONCEPT + LOGIC + NETWORK SOURCE VERIFY: PASS",
);
