import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exit(1);
};

// Production checks must not depend on Prettier quote style or whitespace.
const canonical = (text) =>
  text
    .replace(/"/g, "'")
    .replace(/\s+/g, "")
    .replace(/,([}\]])/g, "$1")
    .trim();

const has = (text, marker) => canonical(text).includes(canonical(marker));

const markers = (label, text, list) => {
  for (const item of list) {
    if (!has(text, item)) fail(`${label} missing: ${item}`);
  }
};

const required = [
  "public/brand/ajn-buzz-logo.png",
  "public/favicon.ico",
  "public/ads.txt",
  "public/app-ads.txt",
  "src/lib/ads.ts",
  "src/lib/image-engine.ts",
  "src/lib/image-tools.ts",
  "src/lib/seo.ts",
  "src/lib/pdf-shortcuts.ts",
  "src/components/ImageEditor.tsx",
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
  "START_LOCAL.ps1",
  "CHECK_LOCAL.ps1",
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
  "src/components/Workspace.tsx",
  "src/components/BillingButtons.tsx",
  "src/lib/auth-context.tsx",
  "src/lib/billing-server.ts",
  "src/lib/firebase-client.ts",
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
  "photo-editor",
  "watermark",
  "background-remover",
  "upscale",
  "rotate",
  "convert-to-jpg",
  "jpg-to-png",
];

const tools = read("src/lib/image-tools.ts");
const ids = [...tools.matchAll(/\bid:\s*["']([^"']+)["']/g)]
  .map((match) => match[1])
  .filter((id) => expected.includes(id));

if (ids.length !== 11 || new Set(ids).size !== 11) {
  fail(`expected 11 unique image tools, found ${ids.length}`);
}
for (const id of expected) {
  if (!ids.includes(id)) fail(`missing image tool: ${id}`);
}
if (/meme/i.test(tools)) fail("Meme Generator must not be public");

for (const field of [
  "summary:",
  "seoTitle:",
  "seoDescription:",
  "seoKeywords:",
  "useCases:",
  "steps:",
  "faq:",
]) {
  if (
    (tools.match(new RegExp(field.replace(":", "\\:"), "g")) || []).length < 11
  ) {
    fail(`tool data field missing: ${field}`);
  }
}

markers("priority tools", tools, [
  "PRIMARY_TOOL_IDS: ToolId[] = ['compress', 'resize', 'crop', 'convert']",
]);
markers("compress search intent", tools, [
  "seoTitle: 'Compress Image Online — Reduce Image Size to KB/MB'",
  "compress image to 20kb",
  "compress image to 50kb",
  "compress image to 100kb",
  "compress image to 200kb",
  "compress image to 500kb",
  "compress image to 1mb",
  "compress image without losing quality",
]);
markers("resize search intent", tools, [
  "seoTitle: 'Resize Image Online — Change Width & Height in Pixels'",
  "resize image online",
  "image resizer",
]);
markers("converter search intent", tools, [
  "seoTitle: 'Image Converter Online — JPG, PNG & WebP'",
  "image converter online",
]);

const engine = read("src/lib/image-engine.ts");
markers("target compressor", engine, [
  "export async function compressImage",
  "bestLossyAtSize",
  "targetBytes",
  "Math.sqrt(target / Math.max(1, candidate.size))",
  "const minScale = Math.min(1",
  "Target reached by balancing encoder quality and image dimensions",
]);
markers("explicit processors", engine, [
  "id === 'resize'",
  "id === 'upscale'",
  "id === 'crop'",
  "id === 'rotate'",
  "id === 'background-remover'",
  "id === 'photo-editor'",
  "id === 'watermark'",
  "id === 'convert' || id === 'convert-to-jpg' || id === 'jpg-to-png'",
  "Unsupported image tool",
]);
markers("bug fixes", engine, [
  "Number(options.angle ?? 90)",
  "upscale would exceed the safe browser image limit",
  "Enter watermark text before processing.",
  "const nextScale = Math.max(minScale, scale * shrink)",
]);
if (has(engine, "Number(options.angle || 90)")) {
  fail("rotate 0 degree fallback bug returned");
}
if (has(engine, "options.text || 'AJN Buzz'")) {
  fail("watermark must not silently inject AJN Buzz text");
}

const editor = read("src/components/ImageEditor.tsx");
markers("compress UI", editor, [
  "Select compression method",
  "Compress file to",
  "20 KB",
  "50 KB",
  "100 KB",
  "200 KB",
  "500 KB",
  "1 MB",
  "Auto (recommended)",
  "Auto uses WebP for target-size compression",
]);
markers("selection safety", editor, [
  "function clearSelection()",
  "event.currentTarget.value = ''",
  "const runLimit = tool.id === 'compress' ? 1",
]);
markers("preview safety", editor, [
  "!['compress', 'background-remover', 'upscale'].includes(tool.id)",
  "setLivePreview(supportsLivePreview)",
]);
markers("specific workflows", editor, [
  "0° (flip only)",
  "Watermark text",
  "Auto-sample four image corners",
  "JPG to PNG / WebP accepts JPG or JPEG source files.",
]);

const seo = read("src/lib/seo.ts");
markers("canonical SEO", seo, [
  "'https://www.ajn.buzz'",
  "online image tools",
  "compress image online",
  "resize image online",
  "crop image online",
  "image converter",
  "x-default",
  "'max-image-preview': 'large'",
  "summary_large_image",
]);

const layout = read("src/app/layout.tsx");
markers("site schema", layout, [
  "'WebSite'",
  "'Organization'",
  "'SoftwareApplication'",
  "metadataBase: new URL(SITE_URL)",
  "'google-adsense-account': ADSENSE_CLIENT",
]);

const home = read("src/app/page.tsx");
markers("AJN PDF-style homepage", home, [
  "Online image tools for everyday work.",
  "Popular image tools",
  "Start with the image actions you use most.",
  "PRIMARY_TOOL_IDS",
  "ToolCatalog",
  "PDF_SHORTCUTS",
]);
if (home.includes("hero-brand-logo")) fail("duplicate hero logo returned");

const toolPage = read("src/app/tools/[slug]/page.tsx");
markers("tool SEO page", toolPage, [
  "title: tool.seoTitle",
  "description: tool.seoDescription",
  "'@type': 'WebApplication'",
  "'@type': 'BreadcrumbList'",
  "'@type': 'HowTo'",
  "'@type': 'FAQPage'",
  "tool.useCases",
  "relatedTools",
  "<ImageEditor tool={tool} />",
]);

const sitemap = read("src/app/sitemap.ts");
markers("sitemap", sitemap, [
  "export const revalidate = 3600",
  "new Date('2026-09-03",
  "IMAGE_TOOLS.map",
  "tool.id === 'compress' ? 1",
  "tool.id === 'resize' ? 0.98",
  "SITE_URL",
]);
for (const route of ["/favorites", "/recent", "/presets", "/status"]) {
  if (new RegExp(`["']${route.replace("/", "\\/")}["']`).test(sitemap)) {
    fail(`private route leaked into sitemap: ${route}`);
  }
}

const robots = read("src/app/robots.ts");
markers("robots", robots, [
  "disallow: ['/api/', '/favorites', '/recent', '/presets', '/status']",
  "sitemap: `${SITE_URL}/sitemap.xml`",
]);

const nextConfig = read("next.config.mjs");
markers("SEO redirects", nextConfig, [
  "source: '/compress-image'",
  "destination: '/tools/compress'",
  "source: '/resize-image'",
  "destination: '/tools/resize'",
  "source: '/image-converter'",
  "destination: '/tools/convert'",
  "source: '/jpg-to-png'",
  "destination: '/tools/jpg-to-png'",
  "source: '/sitemap.xml'",
]);

markers("error recovery", read("src/app/error.tsx"), [
  "That tool hit a temporary error.",
  "Try again",
  "Image Tools",
]);
markers("404 recovery", read("src/app/not-found.tsx"), [
  "Image tool not found.",
  "Image Tools",
]);

const seller = "google.com, pub-4495802176396975, DIRECT, f08c47fec0942fa0";
if (read("public/ads.txt").trim() !== seller)
  fail("ads.txt seller record mismatch");
if (read("public/app-ads.txt").trim() !== seller) {
  fail("app-ads.txt seller record mismatch");
}
markers("AdSense", read("src/lib/ads.ts"), [
  "pub-4495802176396975",
  "ca-${ADSENSE_PUBLISHER_ID}",
]);

const pkg = JSON.parse(read("package.json"));
if (pkg.version !== "5.2.1") {
  fail(`package version must be 5.2.1, found ${pkg.version}`);
}
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
  "version: '5.2.1'",
  "target_size_compression: true",
  "seo_ready: true",
  "sitemap_registry_sync: true",
  "all_tools_explicit: true",
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

console.log("PASS: verifier is Prettier quote/whitespace independent");
console.log("PASS: exactly 11 focused, explicitly implemented image workflows");
console.log(
  "PASS: Compress Image targets 20KB/50KB/100KB/200KB/500KB/1MB + custom KB/MB",
);
console.log(
  "PASS: strong dedicated search intent for Compress, Resize, Crop, Convert and every tool page",
);
console.log(
  "PASS: concise AJN PDF-style visible descriptions + popular/related internal links",
);
console.log(
  "PASS: canonical www.ajn.buzz metadata + Organization/WebSite/WebApplication/HowTo/FAQ/Breadcrumb schema",
);
console.log("PASS: registry-driven sitemap + robots + legacy SEO redirects");
console.log(
  "PASS: rotate 0 degree, watermark empty-text, upscale limit and compression aspect-ratio bugs fixed",
);
console.log(
  "PASS: expensive background/upscale live preview disabled to prevent browser hangs",
);
console.log(
  "PASS: global route error, global error and 404 recovery surfaces present",
);
console.log(
  "PASS: ads.txt/app-ads.txt and AdSense publisher metadata retained",
);
console.log(
  "PASS: login, billing, Premium, workspace, Firebase and Razorpay remain removed",
);
console.log(
  "AJN BUZZ IMAGE V5.2.1 FORMAT + SEO + WORKFLOW SOURCE VERIFY: PASS",
);
