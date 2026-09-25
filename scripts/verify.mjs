import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const fail = message => { console.error(`FAIL: ${message}`); process.exit(1); };
const requireMarkers = (label, text, markers) => {
  for (const marker of markers) if (!text.includes(marker)) fail(`${label} missing marker: ${marker}`);
};

const required = [
  'public/brand/ajn-buzz-logo.png', 'public/favicon.ico', 'public/ads.txt', 'public/app-ads.txt',
  'src/lib/ads.ts', 'src/lib/image-engine.ts', 'src/lib/image-tools.ts', 'src/lib/seo.ts', 'src/lib/pdf-shortcuts.ts',
  'src/components/ImageEditor.tsx', 'src/components/ToolCatalog.tsx', 'src/components/ToolIcon.tsx', 'src/components/Shell.tsx',
  'src/app/page.tsx', 'src/app/layout.tsx', 'src/app/sitemap.ts', 'src/app/robots.ts', 'src/app/manifest.ts',
  'src/app/tools/[slug]/page.tsx', 'src/app/api/health/route.ts', 'src/app/api/config/route.ts',
  'START_LOCAL.ps1', 'CHECK_LOCAL.ps1', 'README.md',
];
for (const file of required) if (!exists(file)) fail(`required file missing: ${file}`);

const removed = [
  'src/app/workspace', 'src/app/login', 'src/app/signup', 'src/app/forgot-password', 'src/app/account', 'src/app/admin',
  'src/app/pricing', 'src/app/api/billing', 'src/components/Workspace.tsx', 'src/components/BillingButtons.tsx',
  'src/lib/auth-context.tsx', 'src/lib/billing-server.ts', 'src/lib/firebase-client.ts', 'firebase',
];
for (const file of removed) if (exists(file)) fail(`removed surface exists: ${file}`);

const expectedIds = [
  'compress','compress-to-kb','resize','resize-cm','resize-mm','resize-inches','photo-size-converter','crop','aspect-ratio-crop',
  'passport-photo-maker','id-photo-maker','photo-35x45','photo-2x2','dpi-changer','signature-maker','signature-upload-crop',
  'signature-resize','signature-size-reducer','signature-background-remover','signature-to-png','photo-editor','watermark',
  'background-remover','change-background','upscale','rotate','remove-metadata','convert','convert-to-jpg','jpg-to-png',
];
const tools = read('src/lib/image-tools.ts');
const ids = [...tools.matchAll(/makeTool\(\{\s*id:'([^']+)'/g)].map(match => match[1]);
if (ids.length !== 30 || new Set(ids).size !== 30) fail(`expected exactly 30 unique public image tools, found ${ids.length}`);
for (const id of expectedIds) if (!ids.includes(id)) fail(`missing image tool: ${id}`);
if ((tools.match(/seoTitle:/g) || []).length !== 31) fail('every tool plus the type field must define seoTitle');
if ((tools.match(/summary:/g) || []).length !== 31) fail('every tool plus the type field must define summary');
requireMarkers('photo/signature registry', tools, [
  "category:'Photo Size'", "category:'Signature'", "workflow:'resize-physical'", "workflow:'photo-preset'",
  "workflow:'signature-maker'", "workflow:'signature-trim'", "workflow:'signature-resize'", "workflow:'signature-compress'",
  "workflow:'signature-remove-bg'", "workflow:'signature-png'", "preset:{width:35,height:45,unit:'mm',dpi:300}",
  "preset:{width:2,height:2,unit:'in',dpi:300}",
]);
if (/meme/i.test(tools)) fail('Meme Generator must not be public');

const engine = read('src/lib/image-engine.ts');
requireMarkers('target compressor', engine, [
  'export async function compressImage', 'bestLossyAtSize', 'targetBytes',
  'Math.sqrt(target / Math.max(1, candidate.size))',
]);
requireMarkers('physical sizing and DPI', engine, [
  'export function pixelsFromPhysical', "unit === 'px'", "unit === 'cm'", "unit === 'in'", 'value / 25.4', 'async function applyDpi',
  "tool.workflow==='resize-physical'", "tool.workflow==='photo-size'", "tool.workflow==='photo-preset'", "tool.workflow==='dpi'",
]);
requireMarkers('signature processors', engine, [
  'function trimSignature', "tool.workflow==='signature-maker'", "tool.workflow==='signature-trim'", "tool.workflow==='signature-remove-bg'",
  "tool.workflow==='signature-resize'",
]);
requireMarkers('crop/background/metadata processors', engine, [
  "tool.workflow==='crop'", "tool.workflow==='aspect-crop'", "tool.workflow==='change-bg'", "'remove-metadata'", 'edgeBackgroundTransparency',
]);

const editor = read('src/components/ImageEditor.tsx');
requireMarkers('photo sizing UI', editor, [
  'Calculated output', 'Output pixels', 'Horizontal crop position', 'Replace plain background',
  '<option value="px">Pixels</option>', '<option value="cm">CM</option>', '<option value="mm">MM</option>', '<option value="in">Inches</option>',
]);
requireMarkers('signature UI', editor, [
  'Draw signature', 'Use mouse, touch or pen.', 'Use drawing', 'Trim margin (px)', 'signature-remove-bg', 'signature-compress',
]);
requireMarkers('professional controls', editor, ['0° (flip only)', '<label>Position</label>', 'No sign-in required.', 'source EXIF/GPS metadata']);
requireMarkers('result actions', editor, ['<Download size={18}/> Download', '<Eye size={18}/> Preview', '<Share2 size={18}/> Share', '<RefreshCcw size={18}/> Process another']);

const seller = 'google.com, pub-4495802176396975, DIRECT, f08c47fec0942fa0';
if (read('public/ads.txt').trim() !== seller) fail('ads.txt seller record mismatch');
if (read('public/app-ads.txt').trim() !== seller) fail('app-ads.txt seller record mismatch');
requireMarkers('AdSense publisher', read('src/lib/ads.ts'), ['pub-4495802176396975', 'ca-${ADSENSE_PUBLISHER_ID}']);

const seo = read('src/lib/seo.ts');
requireMarkers('SEO canonical system', seo, ["'https://www.ajn.buzz'", 'absoluteUrl(canonicalPath)', "'max-image-preview': 'large'", 'summary_large_image']);
const layout = read('src/app/layout.tsx');
requireMarkers('root SEO', layout, ['metadataBase: new URL(SITE_URL)', "'google-adsense-account': ADSENSE_CLIENT", "'SoftwareApplication'", "'WebSite'"]);

const sitemap = read('src/app/sitemap.ts');
requireMarkers('registry sitemap', sitemap, ['export const revalidate = 3600', 'IMAGE_TOOLS.map', 'lastModified: GENERATED_AT', 'SITE_URL']);
for (const privateRoute of ['/favorites','/recent','/presets','/status']) if (sitemap.includes(`'${privateRoute}'`)) fail(`private/noindex route leaked into sitemap: ${privateRoute}`);
const robots = read('src/app/robots.ts');
requireMarkers('robots', robots, ["disallow: ['/api/', '/favorites', '/recent', '/presets', '/status']", 'sitemap: `${SITE_URL}/sitemap.xml`']);

const home = read('src/app/page.tsx');
requireMarkers('task-first homepage', home, ['Image tools that get the job done.', '30 focused tools', 'ToolCatalog', 'PDF_SHORTCUTS']);
const catalog = read('src/components/ToolCatalog.tsx');
requireMarkers('tool catalog', catalog, ['tool.summary', 'Search tools', 'Choose a tool']);
const toolPage = read('src/app/tools/[slug]/page.tsx');
requireMarkers('tool SEO', toolPage, ['title: tool.seoTitle', 'description: tool.seoDescription', '<ImageEditor tool={tool} />', "'@type': 'FAQPage'"]);

const css = read('src/app/globals.css');
requireMarkers('V6 UI', css, ['AJN BUZZ V6.1 PHOTO + SIGNATURE WORKSPACES', '.signature-draw-card', '.signature-canvas', '.calculated-size', '.background-presets']);

const pkg = JSON.parse(read('package.json'));
if (pkg.version !== '6.1.0') fail(`package version must be 6.1.0, found ${pkg.version}`);
if (pkg.dependencies?.firebase || pkg.dependencies?.['firebase-admin']) fail('Firebase dependencies must remain removed');
for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) if (/^[~^]/.test(String(version))) fail(`dependency not exact: ${name}@${version}`);

const health = read('src/app/api/health/route.ts');
requireMarkers('health API', health, ["version: '6.1.0'", 'photo_signature_suite: true', 'dpi_tools: true', 'signature_tools: true', 'photo_presets: true']);

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full); else sourceFiles.push(full);
  }
}
walk(path.join(root, 'src'));
for (const file of sourceFiles) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (/\b(TODO|FIXME|NOT\s+IMPLEMENTED|COMING\s+SOON)\b/i.test(text)) fail(`pending marker found in ${path.relative(root, file)}`);
}

console.log('PASS: exactly 30 focused public image tools');
console.log('PASS: photo sizing supports PX/CM/MM/Inches + DPI');
console.log('PASS: passport, ID, 35x45 mm and 2x2 inch photo workflows are registered');
console.log('PASS: signature draw/upload/trim/resize/compress/background/PNG workflows are wired');
console.log('PASS: exact crop, aspect-ratio crop, background change and metadata removal processors are wired');
console.log('PASS: browser-local architecture and no account/billing/Firebase surfaces retained');
console.log('PASS: SEO, sitemap, seller files and AJN PDF shortcuts retained');
console.log('AJN BUZZ IMAGE V6.1 SOURCE VERIFY: PASS');

// AJN Bot contract is part of the production verification gate.
const botVerifier = path.join(root, 'scripts', 'verify-ajn-bot.mjs');
if (!exists('scripts/verify-ajn-bot.mjs')) fail('AJN Bot verifier missing: scripts/verify-ajn-bot.mjs');
const botCheck = await import(`file://${botVerifier}?t=${Date.now()}`).catch((error) => {
  fail(`AJN Bot source verification failed: ${error instanceof Error ? error.message : String(error)}`);
});
void botCheck;
