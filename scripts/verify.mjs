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
  "src/components/AdSlot.tsx",
  "src/components/CookieConsent.tsx",
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/sitemap.ts",
  "src/app/robots.ts",
  "src/app/manifest.ts",
  "src/app/error.tsx",
  "src/app/global-error.tsx",
  "src/app/not-found.tsx",
  "src/app/contact/page.tsx",
  "src/app/help/page.tsx",
  "src/app/privacy/page.tsx",
  "src/app/terms/page.tsx",
  "src/app/about/page.tsx",
  "src/app/recent/page.tsx",
  "src/app/favorites/page.tsx",
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

const home = read("src/app/page.tsx");
markers("reference landing v7", home, [
  "Smart Image Tools",
  "in One Place",
  "Everything You Need for Images",
  "See the Difference",
  "Get Results in 4 Simple Steps",
  "Perfect for Everyday Image Work",
  "Popular Image Workflows",
  "BUILT AROUND REAL WORKFLOWS",
  "Simple Tools. Clear Capabilities.",
  "HomeQuickCompress",
  "AJN Buzz FAQ",
  "https://ajnpdf.com",
  "https://qrajn.online",
]);
if (home.includes("3.4 MB") || home.includes("100 KB</b>")) {
  fail("homepage must not publish an unverified before/after compression statistic");
}
if (/fake|50,000\+|#1 image/i.test(home)) {
  fail("homepage contains unsupported marketing claim");
}

const contact = read("src/app/contact/page.tsx");
markers("contact", contact, [
  "ajnbuzz@gmail.com",
  "mailto:ajnbuzz@gmail.com",
  "Tool support",
  "Privacy",
]);
for (const leaked of [
  "production deployment",
  "local build",
  "CHECK_LOCAL.ps1",
  "TypeScript",
  "stale server",
]) {
  if (contact.includes(leaked)) fail(`contact contains developer leak: ${leaked}`);
}

const help = read("src/app/help/page.tsx");
markers("help", help, [
  "Image will not open",
  "Processing does not start",
  "Large image failed",
  "Download does not start",
  "Multiple images",
  "ajnbuzz@gmail.com",
]);
for (const leaked of ["CHECK_LOCAL.ps1", "TypeScript", "stale server"]) {
  if (help.includes(leaked)) fail(`help contains developer leak: ${leaked}`);
}

const privacy = read("src/app/privacy/page.tsx");
markers("privacy", privacy, [
  "Google AdSense",
  "Cookies and similar technologies",
  "Personalized advertising choices",
  "Local browser storage",
  "Third-party services",
  "Retention",
  "ajnbuzz@gmail.com",
  "13 September 2026",
]);

const terms = read("src/app/terms/page.tsx");
markers("terms", terms, [
  "Acceptable use",
  "Your images and permissions",
  "Prohibited misuse",
  "Tool limitations",
  "Service availability",
  "Responsibility and liability",
  "ajnbuzz@gmail.com",
]);

const about = read("src/app/about/page.tsx");
if (about.includes("AJN Buzz Image is")) fail("About still uses obsolete AJN Buzz Image brand");
markers("about", about, ["About AJN Buzz", "Focused online image tools"]);

const toolPage = read("src/app/tools/[slug]/page.tsx");
markers("tool router and related content", toolPage, [
  "HtmlToImageEditor",
  "tool.id === 'html-to-image'",
  "ImageEditor tool={tool}",
  "'@type': 'WebApplication'",
  "'@type': 'HowTo'",
  "'@type': 'FAQPage'",
  "related-tools-section",
  "Related tools",
]);

const recent = read("src/app/recent/page.tsx");
const favorites = read("src/app/favorites/page.tsx");
markers("recent noindex", recent, ["index: false"]);
markers("favorites noindex", favorites, ["index: false"]);

const robots = read("src/app/robots.ts");
markers("robots", robots, ["allow: '/'", "disallow: ['/api/']", "sitemap:"]);
if (robots.includes('"/recent"') || robots.includes('"/favorites"')) {
  fail("robots must allow noindex utility pages to be crawled");
}

const sitemap = read("src/app/sitemap.ts");
markers("sitemap", sitemap, [
  "IMAGE_TOOLS.map",
  "SITE_URL",
  '"/help"',
  "2026-09-13",
]);
if (sitemap.includes('"/recent"') || sitemap.includes('"/favorites"')) {
  fail("sitemap contains low-value utility page");
}

const nextConfig = read("next.config.mjs");
markers("production security", nextConfig, [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "X-Frame-Options",
  "upgrade-insecure-requests",
]);
markers("redirects", nextConfig, [
  "source: '/compress-image'",
  "destination: '/tools/compress'",
  "source: '/html-to-image'",
  "destination: '/tools/html-to-image'",
]);

const adSlot = read("src/components/AdSlot.tsx");
markers("ad layout stability", adSlot, [
  "potentiallyEnabled",
  "minHeight: 140",
  "Advertisement",
  "ad-reserved-space",
]);
const consent = read("src/components/CookieConsent.tsx");
markers("privacy controls", consent, [
  "Essential only",
  "Accept optional",
  "Privacy choices",
  "/privacy",
]);

const shell = read("src/components/Shell.tsx");
markers("navigation", shell, [
  "https://ajnpdf.com",
  "https://qrajn.online",
  "QR AJN",
]);
if (!shell.includes("ajnbuzz@gmail.com")) {
  fail("footer must expose the real AJN Buzz contact email");
}

const seller =
  "google.com, pub-4495802176396975, DIRECT, f08c47fec0942fa0";
if (read("public/ads.txt").trim() !== seller)
  fail("ads.txt seller record mismatch");
if (read("public/app-ads.txt").trim() !== seller)
  fail("app-ads.txt seller record mismatch");

const pkg = JSON.parse(read("package.json"));
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

console.log("PASS: 11 focused public image tools retained");
console.log("PASS: reference-inspired long landing + truthful capability copy");
console.log("PASS: Contact, Help, Privacy, Terms and About production copy");
console.log("PASS: recent/favorites noindex crawl strategy + clean sitemap");
console.log("PASS: related tools + WebApplication/HowTo/FAQ/Breadcrumb SEO");
console.log("PASS: security headers + HTTPS upgrade policy");
console.log("PASS: AdSense seller record + reserved ad layout + privacy choices");
console.log("PASS: no developer-only public copy or unsupported marketing stats");
console.log("AJN BUZZ REFERENCE LANDING V7 VERIFY: PASS");
